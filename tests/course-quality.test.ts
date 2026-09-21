import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildUserMessage, crossValidateContentIds, generateFallbackCourse, scoreAndRankCandidates, type CourseGenerationInput, type ScoredSpot } from '@/lib/weekend-ai';
import { finalizeCourse, scheduleWarnings } from '@/lib/course-quality';
import { festivalRunsOn, getTripDates, getTripSaju } from '@/lib/trip-context';
import { getNextWeekend, formatDateYMD } from '@/lib/tour-api';
import type { CourseData, CourseStop } from '@/lib/weekend-types';

const now = new Date('2026-09-08T01:00:00Z');
const spot = (id = '1', over: Partial<ScoredSpot> = {}): ScoredSpot => ({
  contentId: id, contentTypeId: 12, title: `원본 장소${id}`, addr1: '서울', cat1: 'A01', cat2: '', cat3: '',
  latitude: 37.5, longitude: 127, score: 0, distanceKm: 1, ...over,
});
const stop = (id = '1', over: Partial<CourseStop> = {}): CourseStop => ({
  contentId: id, title: 'AI 제목', order: 1, latitude: 36, longitude: 126, timeStart: '10:00', durationMin: 60,
  description: '제안', tip: '', isFestival: false, ...over,
});
const input = (over: Partial<CourseGenerationInput> = {}): CourseGenerationInput => ({
  departure: { name: '서울', lat: 37.5, lng: 127 }, duration: 'half_day', companion: 'solo', preferences: ['nature'],
  candidates: [spot()], festivals: [], stays: [], visitDay: 'sat',
  weather: {
    saturday: { date: '2026-09-12', sky: 'clear', precipitation: 'none', tempMin: 20, tempMax: 25, pop: 10, summary: '토요일 예보' },
    sunday: { date: '2026-09-13', sky: 'overcast', precipitation: 'rain', tempMin: 19, tempMax: 22, pop: 80, summary: '일요일 예보' },
    recommendation: '',
  }, ...over,
});
const course = (stops: CourseStop[]): CourseData => ({ title: '코스', summary: '원래 요약', tip: '', totalDistanceKm: 9999, stops });
afterEach(() => vi.useRealTimers());

describe('여행 날짜와 오행', () => {
  it('UTC 금요일 밤에도 KST 토요일과 일치한다', () => {
    const moment = new Date('2026-09-11T16:00:00Z');
    expect(getTripDates('overnight', 'sat', moment)).toEqual(['2026-09-12', '2026-09-13']);
    expect(formatDateYMD(getNextWeekend(moment).saturday)).toBe('20260912');
  });
  it('일요일 당일은 이번 주말을 유지한다', () => {
    expect(getTripDates('half_day', 'sun', new Date('2026-09-12T16:00:00Z'))).toEqual(['2026-09-13']);
  });
  it('일요일 선택은 일요일 오행, 1박2일은 토요일 오행이다', () => {
    expect(getTripSaju('wood', 'half_day', 'sun', now).basisDate).toBe('2026-09-13');
    expect(getTripSaju('wood', 'overnight', 'sun', now).basisDate).toBe('2026-09-12');
    expect(getTripSaju('wood', 'half_day', 'sun', now).message).not.toContain('오늘');
  });
  it.each([
    ['20260912', '20260913', '2026-09-12', true],
    ['20260913', '20260913', '2026-09-13', true],
    ['20260801', '20260911', '2026-09-12', false],
    ['20260914', '20261001', '2026-09-13', false],
    ['20260931', '20261003', '2026-10-01', false],
    ['', '20260913', '2026-09-12', false],
    ['20260914', '20260912', '2026-09-13', false],
  ])('축제 개최기간 %s~%s, 방문 %s', (start, end, date, valid) => {
    expect(festivalRunsOn(start, end, date)).toBe(valid);
  });
});

describe('장소 원본 대조와 방문일 최종 검증', () => {
  it('정기휴무 아님과 운영시간 미확인을 최종 응답에 따로 남긴다', () => {
    const out = finalizeCourse(course([stop()]), input({ candidates: [spot('1', { closedWeekdays: [] })] }), now);
    expect(out.stops[0]).toMatchObject({ openStatus: 'open', hoursStatus: 'unknown' });
    expect(out.verification?.warnings.join(' ')).toContain('1곳의 운영시간은 미확인');
  });
  it('최종 원본 대조 후 제안 시간의 일치·불일치를 계산한다', () => {
    for (const [usetime, hoursStatus] of [['09:00~18:00', 'within'], ['12:00~18:00', 'outside']] as const) {
      const out = finalizeCourse(course([stop()]), input({ candidates: [spot('1', { usetime })] }), now);
      expect(out.stops[0].hoursStatus).toBe(hoursStatus);
    }
  });
  it('오행 테마 일치 배지는 실제 후보 매칭 규칙이 맞는 곳에만 붙인다', () => {
    const data = finalizeCourse(course([stop('1'), stop('2')]), input({
      saju: getTripSaju('metal', 'half_day', 'sat', now),
      candidates: [spot('1', { title: '숲 산책길' }), spot('2', { title: '시립미술관' })],
    }), now);
    expect(data.stops[0].themeMatched).toBe(true);
    expect(data.stops[1].themeMatched).toBe(false);
  });
  it('제목이 같아도 목록 밖 ID를 추측해서 연결하지 않는다', () => {
    expect(() => crossValidateContentIds([stop('unknown', { title: '원본 장소1' })], [spot()], [])).toThrow('contentId');
  });
  it('ID만 맞는 응답의 제목·좌표·이미지·타입·시설을 원본으로 복구한다', () => {
    const output = stop('1', { imageUrl: 'https://fake.test/x.png', contentTypeId: '32', isStay: true, facilities: { parking: true } });
    crossValidateContentIds([output], [spot()], []);
    expect(output).toMatchObject({ title: '원본 장소1', latitude: 37.5, longitude: 127, contentTypeId: '12', isStay: false, source: 'tourapi' });
    expect(output.imageUrl).toBeUndefined();
    expect(output.facilities?.parking).toBeUndefined();
  });
  it('축제·숙박 역할도 원본에서 판정한다', () => {
    const f = { contentId: 'f', title: '축제', addr1: '', latitude: 37.5, longitude: 127, eventStartDate: '20260912', eventEndDate: '20260913' };
    const out = stop('f', { isStay: true });
    crossValidateContentIds([out], [], [f]);
    expect(out).toMatchObject({ isFestival: true, isStay: false, contentTypeId: '15' });
  });
  it('일요일 휴무 장소는 2일차에서 제거하고 토요일에서는 유지한다', () => {
    const data = finalizeCourse(course([stop('1', { day: 1 }), stop('2', { day: 2 })]), input({ duration: 'overnight', candidates: [spot('1', { closedWeekdays: [0] }), spot('2', { closedWeekdays: [0] })] }), now);
    expect(data.stops.map(s => s.contentId)).toEqual(['1']);
    expect(data.verification?.warnings.join(' ')).toContain('정기 휴무');
  });
  it('휴무 카페를 같은 39번인 식당으로 잘못 대체하지 않는다', () => {
    const data = finalizeCourse(course([stop()]), input({ candidates: [spot('1', { title: '카페', contentTypeId: 39, closedWeekdays: [6] }), spot('2', { title: '식당', contentTypeId: 39 })] }), now);
    expect(data.stops).toHaveLength(0);
  });
  it('같은 역할의 대체 후 이전 카피와 비용은 버린다', () => {
    const data = finalizeCourse({ ...course([stop()]), storyArc: '옛 장소 이야기', estimatedCostWon: 5000 }, input({ candidates: [spot('1', { closedWeekdays: [6] }), spot('2')] }), now);
    expect(data.stops[0].contentId).toBe('2');
    expect(data.storyArc).toBeUndefined();
    expect(data.estimatedCostWon).toBeUndefined();
  });
  it('주말 중 하루만 열리는 축제는 배정 일차에서도 대조한다', () => {
    const f = { contentId: 'f', title: '일요축제', addr1: '', latitude: 37.5, longitude: 127, eventStartDate: '20260913', eventEndDate: '20260913' };
    expect(finalizeCourse(course([stop('f', { day: 1 })]), input({ duration: 'overnight', festivals: [f] }), now).stops).toHaveLength(0);
    expect(finalizeCourse(course([stop('f', { day: 2 })]), input({ duration: 'overnight', festivals: [f] }), now).stops).toHaveLength(1);
  });
  it('중복 제거·좌표 복구 후 총거리를 계산한다', () => {
    const data = finalizeCourse(course([stop(), stop(), stop('2')]), input({ candidates: [spot(), spot('2', { latitude: 37.51 })] }), now);
    expect(data.stops).toHaveLength(2);
    expect(data.totalDistanceKm).toBeCloseTo(1.1);
    expect(data.stops[1].transitInfo).toContain('추정');
  });
  it('무장애 데이터 없는 장소를 확인됐다고 표시하지 않는다', () => {
    const data = finalizeCourse(course([stop('1', { accessibilityStatus: 'confirmed' })]), input({ accessibility: ['mobility'] }), now);
    expect(data.stops[0].accessibilityStatus).toBe('unverified');
  });
  it('겹치는 체류·이동시간은 경고한다', () => {
    expect(scheduleWarnings([stop(), stop('2', { timeStart: '10:30' })], 'half_day').join(' ')).toContain('겹칠');
  });
});

describe('대체 일정과 프롬프트', () => {
  it('1박2일 규칙 코스는 이틀과 실제 숙박을 포함한다', () => {
    const candidates = Array.from({ length: 8 }, (_, i) => spot(String(i)));
    const out = generateFallbackCourse(candidates, 'overnight', { lat: 37.5, lng: 127 }, [{ contentId: 'stay', title: '숙소', addr1: '', latitude: 37.5, longitude: 127 }]);
    expect(new Set(out.stops.map(s => s.day))).toEqual(new Set([1, 2]));
    expect(out.stops.find(s => s.isStay)?.contentId).toBe('stay');
    expect(out.generationMode).toBe('rules');
  });
  it('없는 숙소를 창작하지 않고 안내한다', () => {
    const out = generateFallbackCourse([spot()], 'overnight', { lat: 37.5, lng: 127 });
    expect(out.stops.some(s => s.isStay)).toBe(false);
    expect(out.tip).toContain('숙소');
  });
  it('비활동 조건의 후보 보충에서도 레포츠를 배제한다', () => {
    const out = scoreAndRankCandidates([spot(), spot('2', { contentTypeId: 28 })], ['nature'], 'solo', 'full_day', input().weather, 'tired');
    expect(out.some(s => s.contentTypeId === 28)).toBe(false);
  });
  it('선택한 일요일 예보만 전달한다', () => {
    const prompt = buildUserMessage(input({ visitDay: 'sun' }));
    expect(prompt).toContain('일요일 예보');
    expect(prompt).not.toContain('토요일 예보');
  });
  it('날씨 실패 시 가짜 맑음 수치를 프롬프트에 넣지 않는다', () => {
    const data = input(); data.weather.unavailable = true;
    expect(buildUserMessage(data)).toContain('예보 조회 실패');
    expect(buildUserMessage(data)).not.toContain('강수확률 10%');
  });
  it('접근성 원문을 후보별로 전달한다', () => {
    const prompt = buildUserMessage(input({ candidates: [spot('1', { barrierFree: { mobility: true, details: { exit: '출입구에 계단 있음' } } })] }));
    expect(prompt).toContain('출입구에 계단 있음');
    expect(prompt).toContain('정보 유무≠이용 보장');
  });
});
