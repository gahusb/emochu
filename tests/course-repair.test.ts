import { describe, expect, it } from 'vitest';
import { earliestOperatingStart, operatingWindowStatus, parseOperatingWindow } from '@/lib/operating-window';
import { repairCandidatePool, repairLongLegs, repairMeals } from '@/lib/course-repair';
import { finalizeCourse, scheduleWarnings } from '@/lib/course-quality';
import { buildUserMessage, crossValidateContentIds, type CourseGenerationInput, type ScoredSpot } from '@/lib/weekend-ai';
import { validateComposition } from '@/lib/course-composition';
import type { CourseData, CourseStop } from '@/lib/weekend-types';

const dates = ['2026-09-12', '2026-09-13'];
const point = (id: string, over: Partial<ScoredSpot> = {}): ScoredSpot => ({ contentId: id, title: id, contentTypeId: 12, latitude: 37.5, longitude: 127, distanceKm: 1, score: 0, addr1: '검증용 주소', cat1: 'A01', cat2: '', cat3: '', ...over });
const food = (id = 'food', over: Partial<ScoredSpot> = {}) => point(id, { contentTypeId: 39, usetime: '11:00~21:00', ...over });
const stop = (c: ScoredSpot, timeStart: string, over: Partial<CourseStop> = {}): CourseStop => {
  const s: CourseStop = { order: 1, contentId: c.contentId, title: c.title, latitude: c.latitude, longitude: c.longitude, timeStart, durationMin: 60, day: 1, description: '이전 설명', tip: '이전 팁', isFestival: false, ...over };
  crossValidateContentIds([s], [c], [], []); return s;
};
const input = (candidates: ScoredSpot[], over: Partial<CourseGenerationInput> = {}): CourseGenerationInput => ({
  departure: { name: '서울', lat: 37.5, lng: 127 }, duration: 'full_day', visitDay: 'sat', companion: 'solo', preferences: ['nature'], candidates, festivals: [], stays: [],
  weather: { saturday: { date: dates[0], sky: 'cloudy', precipitation: 'none', tempMin: 0, tempMax: 0, pop: 0, summary: '' }, sunday: { date: dates[1], sky: 'cloudy', precipitation: 'none', tempMin: 0, tempMax: 0, pop: 0, summary: '' }, recommendation: '', unavailable: true }, ...over,
});
const course = (stops: CourseStop[]): CourseData => ({ title: '검증용 코스', summary: '옛 요약', storyArc: '옛 이야기', tip: '옛 추천', estimatedCostWon: 1000, totalDistanceKm: 0, stops });
const run = (stops: CourseStop[], data: CourseGenerationInput) => finalizeCourse(course(stops), data, new Date('2026-09-09T00:00:00Z'));

describe('단순 운영시간을 확실한 경우에만 해석한다', () => {
  it.each(['월~금 09:00~18:00 / 토·일 10:00~17:00', '09:00~18:00 (하절기)', '22:00~02:00', '24:30~25:00', '영업시간 문의', '09:00~18:00, 매주 토요일 휴무'])('%s는 부분 추정하지 않는다', raw => {
    expect(parseOperatingWindow(raw)).toBeNull();
  });
  it.each(['상시 개방', '24시간 운영', '00:00~24:00'])('%s는 하루 전체 구간', raw => {
    expect(operatingWindowStatus(raw, 720, 60)).toBe('within');
  });
  it('체류가 문 닫는 시간에 끝나면 허용하고 넘으면 제외한다', () => {
    expect(operatingWindowStatus('10:00~18:00', 1020, 60)).toBe('within');
    expect(operatingWindowStatus('10:00~18:00', 1021, 60)).toBe('outside');
  });
  it('준비시간에 걸친 방문은 쉬는 시간이 끝난 후로 옮긴다', () => {
    expect(earliestOperatingStart('10:30~20:00 (준비 시간 15:30~17:00)', 900, 1080, 60)).toEqual({ start: 1020, status: 'within' });
  });
  it('마지막 주문 이후 입장을 허용하지 않는다', () => {
    expect(operatingWindowStatus('08:30~19:00 (마지막 주문 17:30)', 1060, 60)).toBe('outside');
  });
  it('정보 없음은 영업 가능으로 단정하지 않는다', () => {
    expect(operatingWindowStatus(undefined, 720, 60)).toBe('unknown');
  });
});

describe('식사 보완 — 시간·원본·방문일 경계', () => {
  it('하루 저녁 누락은 가까운 예비 음식점으로 보완한다', () => {
    const a = point('a'), b = food('lunch'), c = point('c'), dinner = food('dinner');
    const out = run([stop(a, '11:00'), stop(b, '12:15'), stop(c, '16:20', { durationMin: 80 })], input([a, b, c], { repairCandidates: [dinner] }));
    expect(out.stops.at(-1)?.contentId).toBe('dinner'); expect(out.stops.at(-1)?.timeStart).toBe('17:50');
    expect(out.verification?.adjustments).toEqual([{ kind: 'meal_added', day: 1, contentId: 'dinner', previousContentId: undefined }]);
    expect(out.estimatedCostWon).toBeUndefined(); expect(out.storyArc).toBeUndefined(); expect(out.tip).not.toBe('옛 추천');
    expect(out.stops.at(-1)?.source).toBe('tourapi');
  });
  it('보완용 후보를 AI에게 준 것처럼 허용하지 않는다', () => {
    const a = point('a'), reserve = food('ONLY_RESERVE');
    const data = input([a], { repairCandidates: [reserve] });
    expect(buildUserMessage(data)).not.toContain('ONLY_RESERVE');
    expect(() => run([stop(reserve, '12:00')], data)).toThrow('contentId');
  });
  it('2일차에만 닫는 예비 식당은 2일차 점심에 쓰지 않는다', () => {
    const a = point('a'), b = point('b'), f = food('closed', { closedWeekdays: [0] });
    const stops = [stop(a, '10:00'), stop(b, '10:00', { day: 2 })], data = input([a, b], { duration: 'overnight', repairCandidates: [f] });
    repairMeals(stops, data, repairCandidatePool(data), dates);
    expect(stops.filter(s => s.day === 2).some(s => s.contentId === 'closed')).toBe(false);
  });
  it('이미 식사한 식당을 다른 날에도 중복 사용하지 않는다', () => {
    const f = food(), a = point('a'); const data = input([f, a], { duration: 'overnight' });
    const stops = [stop(f, '12:00'), stop(a, '10:00', { day: 2 })]; repairMeals(stops, data, repairCandidatePool(data), dates);
    expect(stops.filter(s => s.contentId === f.contentId)).toHaveLength(1);
  });
  it('영업 종료·준비시간 때문에 체류가 안 들어가면 넣지 않는다', () => {
    const a = point('a'), f = food('closed', { usetime: '10:00~12:00' }); const data = input([a, f], { duration: 'half_day' });
    const stops = [stop(a, '10:30')]; expect(repairMeals(stops, data, repairCandidatePool(data), dates)).toEqual([]);
  });
  it('기존 영업시간 밖 방문도 최종 경고로 드러낸다', () => {
    const f = food('식당', { usetime: '10:00~17:00' });
    expect(run([stop(f, '18:00')], input([f])).verification?.warnings.join(' ')).toContain('원본 운영시간');
  });
  it('시간 예산을 늘려서 식사를 억지로 추가하지 않는다', () => {
    const a = point('a'), f = food(); const data = input([a, f], { duration: 'half_day' });
    const stops = [stop(a, '10:00', { durationMin: 240 })];
    expect(repairMeals(stops, data, repairCandidatePool(data), dates)).toEqual([]); expect(stops).toHaveLength(1);
  });
  it('빈 코스를 식당 하나로 만들어 성공 처리하지 않는다', () => {
    const data = input([food()]); expect(repairMeals([], data, repairCandidatePool(data), dates)).toEqual([]);
  });
  it('관광 슬롯이 중복되고 꽉 찼으면 하나를 식사로 바꾼다', () => {
    const a = point('a'), b = point('b'), c = point('c'), cafe = point('cafe', { contentTypeId: 39, cat3: 'A05020900' }), f = food();
    const data = input([a, b, c, cafe, f], { duration: 'half_day' });
    const stops = [stop(a, '10:00', { durationMin: 30 }), stop(b, '11:00', { durationMin: 30 }), stop(c, '12:00', { durationMin: 30 }), stop(cafe, '13:15', { durationMin: 30 })];
    const changes = repairMeals(stops, data, repairCandidatePool(data), dates);
    expect(changes[0].previousContentId).toBeTruthy(); expect(stops).toHaveLength(4);
    expect(stops.some(s => s.role === 'cafe')).toBe(true); expect(stops.filter(s => s.role === 'attraction').length).toBeGreaterThan(0);
  });
  it('정보가 있는 접근성 식당을 우선하되 이용 가능 보장은 하지 않는다', () => {
    const a = point('a'), unknown = food('unknown'), known = food('known', { barrierFree: { mobility: true, details: { exit: '계단 있음' } } });
    const out = run([stop(a, '10:00')], input([a, unknown, known], { duration: 'half_day', accessibility: ['mobility'] }));
    const chosen = out.stops.find(s => s.role === 'restaurant');
    expect(chosen?.contentId).toBe('known'); expect(chosen?.facilities?.barrierFree?.details.exit).toBe('계단 있음');
  });
  it('보완 식당이 멀면 새 20km 초과 구간을 만들지 않는다', () => {
    const a = point('a'), far = food('far', { longitude: 128 }); const data = input([a, far]);
    const stops = [stop(a, '10:00')]; expect(repairMeals(stops, data, repairCandidatePool(data), dates)).toEqual([]);
  });
  it('예비 후보의 잘못된 좌표·비활동 모드 레포츠를 배제한다', () => {
    const a = point('a'), bad = food('bad', { longitude: NaN }), sport = point('sport', { contentTypeId: 28 });
    expect(repairCandidatePool(input([a], { repairCandidates: [bad, sport] })).map(c => c.contentId)).toEqual(['a']);
  });
});

describe('장거리 보완 — 같은 역할·시간·접근성 보존', () => {
  const a = point('a'), far = food('far', { longitude: 127.4 }), b = point('b'), near = food('near', { longitude: 127.01 });
  const itinerary = () => [stop(a, '10:00'), stop(far, '12:00'), stop(b, '15:00')];
  it('같은 음식점 역할로 20km 이상 왕복 구간을 줄인다', () => {
    const data = input([a, far, b], { repairCandidates: [near] }), stops = itinerary();
    expect(repairLongLegs(stops, data, repairCandidatePool(data), dates)).toEqual([{ kind: 'shorter_leg', day: 1, contentId: 'near', previousContentId: 'far' }]);
    expect(stops[1].timeStart).toBe('12:00'); expect(stops[1].role).toBe('restaurant');
    expect(scheduleWarnings(stops, 'full_day').join(' ')).not.toContain('20km');
  });
  it('가까운 카페를 식당 대체로 쓰지 않는다', () => {
    const cafe = { ...near, cat3: 'A05020900' }, data = input([a, far, b], { repairCandidates: [cafe] });
    expect(repairLongLegs(itinerary(), data, repairCandidatePool(data), dates)).toEqual([]);
  });
  it('원본 휴무나 영업시간에 걸린 대체 후보를 쓰지 않는다', () => {
    for (const candidate of [{ ...near, closedWeekdays: [6] }, { ...near, usetime: '17:00~22:00' }]) {
      const data = input([a, far, b], { repairCandidates: [candidate] }); expect(repairLongLegs(itinerary(), data, repairCandidatePool(data), dates)).toEqual([]);
    }
  });
  it('접근성 정보 개수가 같아도 기존에 확인된 조건을 잃으면 대체하지 않는다', () => {
    const old = { ...far, barrierFree: { mobility: true, details: {} } }, next = { ...near, barrierFree: { visual: true, details: {} } };
    const data = input([a, old, b], { repairCandidates: [next], accessibility: ['mobility', 'visual'] });
    expect(repairLongLegs(itinerary(), data, repairCandidatePool(data), dates)).toEqual([]);
  });
  it('가까운 대체 후보가 없으면 먼 장소를 몰래 삭제하지 않는다', () => {
    const data = input([a, far, b]), stops = itinerary();
    expect(repairLongLegs(stops, data, repairCandidatePool(data), dates)).toEqual([]); expect(stops[1].contentId).toBe('far');
  });
  it('변경된 최종 코스의 식사·원본·동선·순번을 다시 검증한다', () => {
    const dinner = food('dinner');
    const out = run(itinerary(), input([a, far, b], { repairCandidates: [near, dinner] }));
    expect(out.stops.every(s => s.source === 'tourapi')).toBe(true);
    expect(out.stops.map(s => s.order)).toEqual(out.stops.map((_, i) => i + 1));
    expect(new Set(out.stops.map(s => s.contentId)).size).toBe(out.stops.length);
    expect(validateComposition(out.stops, 'full_day', new Set(['restaurant', 'attraction'])).ok).toBe(true);
    expect(out.totalDistanceKm).toBeLessThan(5);
  });
});


describe('긴 이동 구간 — 가족+아이는 기준을 좁힌다', () => {
  // 2026-09-21 관찰(매헌시민의숲 → 강남, 차로 37분 12.5km)을 좌표로 옮긴 모양이다.
  const first = point('first', { latitude: 37.5, longitude: 127 });
  const far = point('far', { latitude: 37.62, longitude: 127 });     // 앞 구간 약 13km
  const last = point('last', { latitude: 37.51, longitude: 127 });
  const near = point('near', { latitude: 37.505, longitude: 127 });  // 같은 역할·가까움
  const legs = () => [
    stop(first, '10:00', { order: 1, role: 'attraction' }),
    stop(far, '12:00', { order: 2, role: 'attraction' }),
    stop(last, '14:00', { order: 3, role: 'attraction' }),
  ];

  it('가족+아이면 13km 구간을 더 가까운 같은 역할 후보로 바꾼다', () => {
    const data = input([first, far, last], { companion: 'family', repairCandidates: [near] });
    const stops = legs();
    const changes = repairLongLegs(stops, data, repairCandidatePool(data), dates);
    expect(stops[1].contentId).toBe('near');
    expect(changes).toEqual([{ kind: 'shorter_leg', day: 1, contentId: 'near', previousContentId: 'far' }]);
  });

  it('다른 동반자는 기존 20km 기준 그대로 — 같은 코스를 건드리지 않는다', () => {
    for (const companion of ['solo', 'couple', 'friends'] as const) {
      const data = input([first, far, last], { companion, repairCandidates: [near] });
      const stops = legs();
      expect(repairLongLegs(stops, data, repairCandidatePool(data), dates)).toEqual([]);
      expect(stops[1].contentId).toBe('far');
    }
  });

  it('마땅한 후보가 없으면 가족이어도 코스를 망가뜨리지 않는다', () => {
    const data = input([first, far, last], { companion: 'family', repairCandidates: [] });
    const stops = legs();
    expect(repairLongLegs(stops, data, repairCandidatePool(data), dates)).toEqual([]);
    expect(stops.map(s => s.contentId)).toEqual(['first', 'far', 'last']);
  });
});
