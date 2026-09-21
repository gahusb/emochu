import { describe, expect, it } from 'vitest';
import { repairTimeBudget } from '@/lib/course-budget';
import { finalizeCourse } from '@/lib/course-quality';
import type { CourseGenerationInput } from '@/lib/weekend-ai';
import type { CourseStop } from '@/lib/weekend-types';

const itinerary = (): CourseStop[] => [
  { id: 'festival', time: '10:00', duration: 80, festival: true, role: undefined },
  { id: 'meal', time: '11:30', duration: 60, festival: false, role: 'restaurant' as const },
  { id: 'cafe', time: '12:40', duration: 50, festival: false, role: 'cafe' as const },
  { id: 'park', time: '13:40', duration: 80, festival: false, role: 'attraction' as const },
].map((s, i) => ({ contentId: s.id, title: s.id, latitude: 37.5, longitude: 127, order: i + 1, day: 1, timeStart: s.time, durationMin: s.duration, isFestival: s.festival, role: s.role, description: '', tip: '' }));

describe('선택 관광을 빼는 시간 예산 보완', () => {
  const fullDay = (): CourseStop[] => ['attraction', 'restaurant', 'activity', 'cafe', 'culture', 'restaurant'].map((role, i) => ({ ...itinerary()[0], contentId: String(i), title: String(i), isFestival: false, role: role as CourseStop['role'], timeStart: ['11:00', '12:15', '13:30', '15:47', '16:57', '18:07'][i], durationMin: [60, 60, 120, 50, 60, 60][i] }));
  it('하루 일정의 여유 간격만 줄이고 방문 순서·체류·식사를 보존한다', () => {
    const stops = fullDay(), before = structuredClone(stops);
    expect(repairTimeBudget(stops, 'full_day').every(a => a.kind === 'time_compacted')).toBe(true);
    expect(stops).toHaveLength(6); expect(stops.map(s => s.durationMin)).toEqual(before.map(s => s.durationMin));
    expect(stops.at(-1)?.timeStart).toBe('17:40'); expect(stops.map(s => s.contentId)).toEqual(before.map(s => s.contentId));
  });
  it('공연 시작을 앞당겨 시간을 확보하지 않는다', () => {
    const stops = fullDay(); stops[4].isFestival = true; const before = structuredClone(stops);
    expect(repairTimeBudget(stops, 'full_day')).toEqual([]); expect(stops).toEqual(before);
  });
  it('영업 시작 전으로 옮기지 않고 해결되지 않은 시도는 원복한다', () => {
    const stops = fullDay();
    stops[3].timeStart = '16:00'; stops[4].timeStart = '17:00'; stops[5].timeStart = '18:10';
    const before = structuredClone(stops);
    const candidate = { contentId: '2', title: '2', latitude: 37.5, longitude: 127, addr1: '', contentTypeId: 28, cat1: '', cat2: '', cat3: '', score: 0, distanceKm: 0, usetime: '13:30~18:00' };
    // 추가로 카페를 16시에 여는 조건을 주면 저녁까지 예산을 맞출 수 없다.
    expect(repairTimeBudget(stops, 'full_day', [candidate, { ...candidate, contentId: '3', usetime: '16:00~22:00' }])).toEqual([]);
    expect(stops).toEqual(before);
  });
  it('저녁을 17시 이전으로 당기지 않는다', () => {
    const stops = fullDay(); stops[2].durationMin = 60;
    const changes = repairTimeBudget(stops, 'full_day'); expect(changes.length).toBeGreaterThan(0); expect(stops.at(-1)?.timeStart).toBe('17:00');
  });
  it('최종 생성 경계에서도 보완 기록과 예전 요약·비용 무효화를 적용한다', () => {
    const data: CourseGenerationInput = {
      departure: { name: '검증', lat: 37.5, lng: 127 }, duration: 'half_day', companion: 'solo', visitDay: 'sat', preferences: ['culture'], stays: [],
      festivals: [{ contentId: 'festival', title: 'festival', latitude: 37.5, longitude: 127, addr1: '', eventStartDate: '20260901', eventEndDate: '20260930' }],
      candidates: ['meal', 'cafe', 'park'].map(id => ({ contentId: id, title: id, contentTypeId: id === 'park' ? 12 : 39, cat1: '', cat2: '', cat3: id === 'cafe' ? 'A05020900' : '', latitude: 37.5, longitude: 127, addr1: '', distanceKm: 0, score: 0 })),
      weather: { saturday: { date: '20260912', sky: 'clear', precipitation: 'none', tempMin: 0, tempMax: 0, pop: 0, summary: '' }, sunday: { date: '20260913', sky: 'clear', precipitation: 'none', tempMin: 0, tempMax: 0, pop: 0, summary: '' }, recommendation: '' },
    };
    const out = finalizeCourse({ title: '검증', summary: '옛 요약', tip: '', totalDistanceKm: 0, estimatedCostWon: 1000, storyArc: '옛 이야기', stops: itinerary() }, data, new Date('2026-09-09T00:00:00Z'));
    expect(out.stops).toHaveLength(3); expect(out.verification?.adjustments?.[0].kind).toBe('budget_trim');
    expect(out.estimatedCostWon).toBeUndefined(); expect(out.storyArc).toBeUndefined(); expect(out.verification?.warnings.join(' ')).toContain('마지막 선택 관광을 제외');
  });
  it('서울 예비 실측의 5시간 일정을 기존 공연·식사·카페 그대로 3시간 30분으로 보완한다', () => {
    const stops = itinerary(), original = structuredClone(stops);
    expect(repairTimeBudget(stops, 'half_day')).toEqual([{ kind: 'budget_trim', day: 1, contentId: 'cafe', previousContentId: 'park', previousTitle: 'park' }]);
    expect(stops).toEqual(original.slice(0, -1));
  });
  it('이미 예산 안이면 불필요하게 빼지 않는다', () => {
    const stops = itinerary(); stops[3].timeStart = '13:00'; stops[3].durationMin = 60;
    expect(repairTimeBudget(stops, 'half_day')).toEqual([]);
  });
  it.each(['festival', 'stay', 'restaurant', 'cafe', 'activity'])('마지막 %s를 임의로 삭제하지 않는다', kind => {
    const stops = itinerary();
    if (kind === 'festival') stops[3].isFestival = true;
    else if (kind === 'stay') stops[3].isStay = true;
    else stops[3].role = kind as CourseStop['role'];
    expect(repairTimeBudget(stops, 'half_day')).toEqual([]);
  });
  it('최소 장소 수보다 짧게 만들지 않는다', () => {
    const stops = itinerary().slice(1); expect(repairTimeBudget(stops, 'half_day')).toEqual([]);
  });
  it('다른 볼거리 없이 식사·카페만 남기지 않는다', () => {
    const stops = itinerary(); stops[0].isFestival = false; stops[0].role = 'cafe';
    expect(repairTimeBudget(stops, 'half_day')).toEqual([]);
  });
  it('남은 일정의 시간 겹침이 있으면 해결된 것으로 처리하지 않는다', () => {
    const stops = itinerary(); stops[1].timeStart = '11:00'; expect(repairTimeBudget(stops, 'half_day')).toEqual([]);
  });
  it('1박2일을 하루 예산으로 자르지 않는다', () => {
    expect(repairTimeBudget(itinerary(), 'overnight')).toEqual([]);
  });
});
