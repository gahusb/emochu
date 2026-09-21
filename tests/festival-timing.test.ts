import { describe, expect, it } from 'vitest';
import { festivalClosedOn, festivalTimingStatus, parseFestivalTiming } from '@/lib/festival-timing';
import { repairFestivalDurations, repairFestivalSessions } from '@/lib/course-festival';
import { repairSchedule, scheduleWarnings } from '@/lib/course-timing';
import { finalizeCourse } from '@/lib/course-quality';
import type { CourseGenerationInput, FestivalCandidate, ScoredSpot } from '@/lib/weekend-ai';
import type { CourseData, CourseStop } from '@/lib/weekend-types';

const dates = ['2026-09-12', '2026-09-13'];
const festival = (id = 'f', playtime = '11:00 / 14:00※ 매주 월요일 휴무'): FestivalCandidate => ({ contentId: id, title: `원본 축제 ${id}`, latitude: 37.56505, longitude: 126.97657, addr1: '서울', eventStartDate: '20260901', eventEndDate: '20260930', playtime });
const stop = (id: string, timeStart: string, over: Partial<CourseStop> = {}): CourseStop => ({ contentId: id, title: id, latitude: 37.56505, longitude: 126.97657, day: 1, order: 1, timeStart, durationMin: 60, isFestival: false, description: '예전 설명', tip: '예전 팁', hook: '예전 시각', whyNow: '예전 추천', ...over });
const spot = (id: string, over: Partial<ScoredSpot> = {}): ScoredSpot => ({ contentId: id, title: id, contentTypeId: 12, latitude: 37.56505, longitude: 126.97657, addr1: '서울', cat1: 'A01', cat2: '', cat3: '', score: 0, distanceKm: 0, ...over });
const input = (over: Partial<CourseGenerationInput> = {}): CourseGenerationInput => ({
  departure: { name: '서울', lat: 37.56505, lng: 126.97657 }, duration: 'full_day', visitDay: 'sat', companion: 'couple', preferences: ['culture', 'food'], candidates: [], festivals: [], stays: [],
  weather: { saturday: { date: dates[0], sky: 'clear', precipitation: 'none', tempMin: 0, tempMax: 0, pop: 0, summary: '' }, sunday: { date: dates[1], sky: 'clear', precipitation: 'none', tempMin: 0, tempMax: 0, pop: 0, summary: '' }, recommendation: '', unavailable: true }, ...over,
});
const run = (stops: CourseStop[], data: CourseGenerationInput) => finalizeCourse({ title: '회귀용 일정', summary: '옛 요약', tip: '', totalDistanceKm: 0, estimatedCostWon: 1000, storyArc: '옛 일정 이야기', stops } as CourseData, data, new Date('2026-09-09T00:00:00Z'));

describe('공연 원문의 한정된 문법', () => {
  it('운영 구간과 회차당 시간은 읽되 회차 시작 목록으로 만들지 않는다', () => {
    expect(parseFestivalTiming('18:00~20:55(회차당 100분)')).toEqual({ window: { from: 1080, to: 1255 }, durationMin: 100 });
  });
  it('시간 목록과 휴무 요일을 원문 전체에서 읽는다', () => {
    expect(parseFestivalTiming('11:00 / 14:00※ 매주 월요일 휴무')).toEqual({ starts: [660, 840], closedWeekday: 1 });
    expect(parseFestivalTiming('14:00, 11:00, 14:00 (회차당 40분)')).toEqual({ starts: [660, 840], durationMin: 40 });
  });
  it('주간 운영 구간만으로 하루 종일 관람하는 체류시간을 만들지 않는다', () => {
    expect(parseFestivalTiming('매주 토요일 15:00~16:00')).toEqual({ onlyWeekday: 6, window: { from: 900, to: 960 } });
  });
  it('HTML 줄바꿈과 공백은 허용한다', () => {
    expect(parseFestivalTiming('11:00 /<br />&nbsp;14:00')).toEqual({ starts: [660, 840] });
  });
  it.each([
    undefined, '', '공연 별 상이', '- 10:00~22:00※ 8/24 14:00~22:00',
    '하절기(3월~9월) 20:00, 22:00 / 동절기(10월~2월) 19:00, 21:00',
    '토요일만 / 1회차 10시, 2회차 18시', '22:00~02:00', '24:30~25:00',
    '18:00~20:55(회차당 0분)', '18:00~20:55(회차당 300분)',
    '11:00 / 14:00 (현장 사정에 따라 변경)', '매주 토요일 15:00~16:00※ 매주 토요일 휴무',
  ])('불명확한 %s는 일부 시간만 추측하지 않는다', raw => {
    expect(parseFestivalTiming(raw)).toBeNull();
    expect(festivalTimingStatus(raw, dates[0], 660, 60)).toBe('unknown');
  });
  it('요일 조건을 배정 일차와 비교한다', () => {
    const timing = parseFestivalTiming('매주 토요일 15:00~16:00');
    expect(festivalClosedOn(timing, dates[0])).toBe(false);
    expect(festivalClosedOn(timing, dates[1])).toBe(true);
    expect(festivalTimingStatus('11:00 / 14:00※ 매주 월요일 휴무', '2026-09-14', 660, 40)).toBe('outside');
  });
  it('짧은 체류·회차 아닌 시작·운영 종료 초과를 잡는다', () => {
    expect(festivalTimingStatus('18:00~20:55(회차당 100분)', dates[0], 1080, 60)).toBe('outside');
    expect(festivalTimingStatus('18:00~20:55(회차당 100분)', dates[0], 1156, 100)).toBe('outside');
    expect(festivalTimingStatus('18:00~20:55(회차당 100분)', dates[0], 1155, 100)).toBe('within');
    expect(festivalTimingStatus('11:00 / 14:00', dates[0], 677, 40)).toBe('outside');
  });
});

describe('원본 기반 공연 시간 보완', () => {
  it('일반 시간 보완이 축제를 임의로 늦추지 않는다', () => {
    const stops = [stop('a', '10:30'), stop('f', '11:00', { isFestival: true })];
    expect(repairSchedule(stops, 'full_day')).toBe(0);
    expect(stops[1].timeStart).toBe('11:00');
    expect(scheduleWarnings(stops, 'full_day').join(' ')).toContain('겹칠');
  });
  it('명시된 회차당 시간까지 늘리고 예전 시간 카피를 제거한다', () => {
    const stops = [stop('f', '18:00', { isFestival: true })];
    expect(repairFestivalDurations(stops, [festival('f', '18:00~20:55(회차당 100분)')])).toEqual([{ kind: 'festival_timing', contentId: 'f', day: 1 }]);
    expect(stops[0].durationMin).toBe(100); expect(stops[0].hook).toBeUndefined(); expect(stops[0].tip).toBe('');
  });
  it('이미 충분한 체류시간을 짧게 만들지 않는다', () => {
    const stops = [stop('f', '18:00', { isFestival: true, durationMin: 120 })];
    expect(repairFestivalDurations(stops, [festival('f', '18:00~20:55(회차당 100분)')])).toEqual([]);
    expect(stops[0].durationMin).toBe(120);
  });
  it('앞뒤 일정에 들어가는 실제 시작 시각만 고른다', () => {
    const stops = [stop('a', '12:30'), stop('f', '13:45', { isFestival: true, durationMin: 40 }), stop('b', '15:00')];
    expect(repairFestivalSessions(stops, [festival()], dates, 'full_day')).toHaveLength(1);
    expect(stops.map(s => s.timeStart)).toEqual(['12:30', '14:00', '15:00']);
    expect(stops[1].hook).toBeUndefined();
  });
  it('다음 장소를 밀어야 하는 회차는 선택하지 않는다', () => {
    const stops = [stop('a', '12:30'), stop('f', '13:45', { isFestival: true, durationMin: 40 }), stop('b', '14:30')];
    expect(repairFestivalSessions(stops, [festival()], dates, 'full_day')).toEqual([]);
    expect(stops[1].timeStart).toBe('13:45');
  });
  it('이동시간을 확보하지 못하는 회차도 선택하지 않는다', () => {
    const stops = [stop('a', '13:00'), stop('f', '14:05', { isFestival: true })];
    expect(repairFestivalSessions(stops, [festival()], dates, 'full_day')).toEqual([]);
  });
  it('첫 장소를 앞당겨 전체 예산을 초과시키지 않는다', () => {
    const stops = [stop('f', '11:10', { isFestival: true, durationMin: 40 }), stop('b', '14:10')];
    expect(repairFestivalSessions(stops, [festival('f', '11:00')], dates, 'half_day')).toEqual([]);
  });
  it('마지막 장소를 늦춰 전체 예산을 초과시키지 않는다', () => {
    const stops = [stop('a', '10:00'), stop('f', '13:00', { isFestival: true, durationMin: 40 })];
    expect(repairFestivalSessions(stops, [festival('f', '14:00')], dates, 'half_day')).toEqual([]);
  });
  it('주간 운영 조건이 다른 일차의 행사를 제거하되 날짜를 바꾸지 않는다', () => {
    const out = run([stop('f', '15:00', { day: 2 })], input({ duration: 'overnight', festivals: [festival('f', '매주 토요일 15:00~16:00')] }));
    expect(out.stops).toEqual([]); expect(out.verification?.warnings.join(' ')).toContain('운영 요일');
  });
  it('운영 구간과 소요시간만 알면 시작 회차는 계속 미확인으로 알린다', () => {
    const out = run([stop('f', '18:00')], input({ festivals: [festival('f', '18:00~20:55(회차당 100분)')] }));
    expect(out.stops[0].durationMin).toBe(100); expect(out.stops[0].timeStart).toBe('18:00');
    expect(out.verification?.warnings.join(' ')).toContain('회차별 시작 시각은 미확인');
    expect(out.estimatedCostWon).toBeUndefined(); expect(out.storyArc).toBeUndefined();
  });
  it('체류와 시작 모두 바뀌어도 같은 공연의 배지는 한 번만 기록한다', () => {
    const out = run([stop('f', '11:10', { durationMin: 20 })], input({ festivals: [festival('f', '11:00 / 14:00 (회차당 40분)')] }));
    expect(out.stops[0]).toMatchObject({ timeStart: '11:00', durationMin: 40 });
    expect(out.verification?.adjustments).toHaveLength(1);
  });
});

describe('서울 9/9 실측 일정의 공연·저녁 충돌 회귀 (음식점 대안은 모의 후보)', () => {
  const festivals = [festival('292961'), festival('4106883', '- 10:00~22:00※ 8/24 14:00~22:00'), festival('2756396', '18:00~20:55(회차당 100분)')];
  const candidates = [spot('750982', { contentTypeId: 39 }), spot('2765510'), spot('3354907', { contentTypeId: 39, cat3: 'A05020900' })];
  const dinner = spot('fixture-dinner', { contentTypeId: 39, usetime: '11:00~21:00' });
  const itinerary = () => [stop('292961', '11:00', { durationMin: 40 }), stop('4106883', '11:50'), stop('750982', '13:00'), stop('2765510', '14:10', { durationMin: 50 }), stop('3354907', '15:10'), stop('2756396', '18:00')];
  it('겹치는 야간 축제만 저녁으로 바꾸고 다른 축제·카페·명소를 보존한다', () => {
    const out = run(itinerary(), input({ candidates, festivals, repairCandidates: [dinner] }));
    expect(out.stops.filter(s => s.isFestival).map(s => s.contentId)).toEqual(['292961', '4106883']);
    expect(out.stops.at(-1)).toMatchObject({ contentId: 'fixture-dinner', timeStart: '17:00', durationMin: 60, role: 'restaurant', source: 'tourapi' });
    expect(out.stops.some(s => s.role === 'cafe')).toBe(true); expect(out.stops.some(s => s.contentId === '2765510')).toBe(true);
    expect(out.verification?.adjustments).toEqual([{ kind: 'festival_meal', day: 1, contentId: 'fixture-dinner', previousContentId: '2756396', previousTitle: '원본 축제 2756396' }]);
    expect(out.verification?.warnings.join(' ')).toContain('식사 시간과 겹치는 축제 대신');
    expect(scheduleWarnings(out.stops, 'full_day')).toEqual([]);
    expect(out.verification?.warnings.join(' ')).not.toContain('음식점이 배치되지');
  });
  it.each([
    { ...dinner, usetime: '10:00~16:00' }, { ...dinner, closedWeekdays: [6] }, { ...dinner, longitude: 128 },
  ])('영업·휴무·거리 조건을 어기는 대안에는 축제를 삭제하지 않는다 (%j)', alternative => {
    const out = run(itinerary(), input({ candidates, festivals, repairCandidates: [alternative] }));
    expect(out.stops.find(s => s.contentId === '2756396')?.durationMin).toBe(100);
    expect(out.verification?.warnings.join(' ')).toContain('시간 예산');
    expect(out.verification?.adjustments?.some(a => a.kind === 'festival_meal')).toBe(false);
  });
  it('같은 날의 유일한 축제를 식사 때문에 없애지 않는다', () => {
    const stops = [stop('2765510', '11:00'), stop('750982', '12:15'), stop('3354907', '15:10'), stop('2756396', '18:00')];
    const out = run(stops, input({ candidates, festivals, repairCandidates: [dinner] }));
    expect(out.stops.some(s => s.contentId === '2756396')).toBe(true);
    expect(out.verification?.warnings.join(' ')).toContain('음식점이 배치되지');
  });
  it('식사 빈틈이 있으면 축제 대체보다 삽입을 우선한다', () => {
    const stops = itinerary(); stops[5].timeStart = '19:30'; stops[0].timeStart = '12:00';
    const out = run(stops, input({ duration: 'overnight', candidates, festivals, repairCandidates: [dinner] }));
    expect(out.stops.filter(s => s.isFestival)).toHaveLength(3);
    expect(out.verification?.adjustments?.some(a => a.kind === 'meal_added')).toBe(true);
  });
});
