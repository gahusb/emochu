import { afterEach, describe, expect, it, vi } from 'vitest';
import { getWeekendForecast } from '@/lib/weather-api';
import { summarizeWeekendWeather } from '@/lib/weekend-summary';
import { hasForecast } from '@/lib/weather-coverage';
import { buildUserMessage, enrichWithFacilities, scoreAndRankCandidates, type CourseGenerationInput, type ScoredSpot } from '@/lib/weekend-ai';
import { finalizeCourse, repairSchedule, scheduleWarnings } from '@/lib/course-quality';
import { validateComposition } from '@/lib/course-composition';
import type { CourseStop, WeekendWeather } from '@/lib/weekend-types';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const day = { date: '20260912', sky: 'cloudy' as const, precipitation: 'none' as const, tempMin: 17, tempMax: 27, pop: 20, summary: '구름많음' };
const partial: WeekendWeather = { saturday: day, sunday: { ...day, date: '20260913', tempMin: 999, tempMax: 999, unavailable: true }, recommendation: '' };
const source = (id: string): ScoredSpot => ({ contentId: id, contentTypeId: 12, title: id, cat1: 'A01', cat2: '', cat3: '', addr1: '', latitude: 37.5, longitude: 127, distanceKm: 1, score: 0 });
const stop = (over: Partial<CourseStop> = {}): CourseStop => ({ contentId: '1', title: '장소', latitude: 37.5, longitude: 127, order: 1, day: 1, timeStart: '10:00', durationMin: 60, role: 'attraction', isFestival: false, description: '', tip: '', ...over });
const input = (over: Partial<CourseGenerationInput> = {}): CourseGenerationInput => ({ departure: { name: '테스트', lat: 37.5, lng: 127 }, duration: 'half_day', companion: 'solo', preferences: ['nature'], candidates: [source('1'), source('2'), source('3')], festivals: [], stays: [], weather: partial, visitDay: 'sat', ...over });
const frames = (date: string, times = ['0900', '1200', '1800']) => times.flatMap(fcstTime => Object.entries({ SKY: '3', PTY: '0', POP: '20', TMP: '22' }).map(([category, fcstValue]) => ({ fcstDate: date, fcstTime, category, fcstValue })));
const forecast = async (items: ReturnType<typeof frames>) => {
  vi.stubEnv('WEATHER_API_KEY', 'test-key');
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ response: { body: { items: { item: items } } } })));
  return getWeekendForecast({ lat: 37.5, lng: 127, saturdayDate: '20260912', sundayDate: '20260913' });
};

describe('9/9 실측 회귀 — 일부 예보를 하루 전체 예보로 오독하지 않는다', () => {
  it('일요일 00시 한 건만 있으면 토요일 예보를 살리고 일요일만 미확인이다', async () => {
    const out = await forecast([...frames('20260912'), ...frames('20260913', ['0000'])]);
    expect(out.unavailable).toBe(false);
    expect(out.saturday.unavailable).toBeUndefined();
    expect(out.sunday.unavailable).toBe(true);
    expect(out.recommendation).not.toContain('주말 내내');
  });
  it('이틀 모두 나들이 시간대 데이터가 있어야 전체 예보로 표시한다', async () => {
    const out = await forecast([...frames('20260912'), ...frames('20260913')]);
    expect(out.saturday.unavailable).toBeUndefined(); expect(out.sunday.unavailable).toBeUndefined();
  });
  it.each(['', 'NaN', 'Infinity'])('기온 값 %s를 실제 0도나 정상 수치로 취급하지 않는다', async value => {
    const items = frames('20260912').map(i => i.category === 'TMP' ? { ...i, fcstValue: value } : i);
    expect((await forecast(items)).saturday.unavailable).toBe(true);
  });
  it('낮 12시 예보가 없으면 맑음으로 기본 설정하지 않는다', async () => {
    expect((await forecast(frames('20260912', ['0900', '1800']))).saturday.unavailable).toBe(true);
  });
  it('일요일만 확인돼도 그 날짜의 예보는 유지한다', async () => {
    const out = await forecast(frames('20260913'));
    expect(out.saturday.unavailable).toBe(true); expect(out.sunday.unavailable).toBeUndefined();
  });
  it('홈 요약은 미확인 날짜의 가짜 온도를 섞지 않는다', () => {
    const summary = summarizeWeekendWeather(partial);
    expect(summary.text).toContain('일요일 예보 미확인'); expect(summary.temp).toBe('17~27°');
  });
  it('옛 저장 데이터의 전체 unavailable도 계속 존중한다', () => {
    expect(hasForecast({ ...partial, unavailable: true }, day)).toBe(false);
  });
  it('AI에는 선택한 날짜별로 예보와 미확인을 구분해서 전달한다', () => {
    expect(buildUserMessage(input())).not.toContain('예보 조회 실패');
    const message = buildUserMessage(input({ duration: 'overnight' }));
    expect(message).toContain('강수확률 20%'); expect(message).toContain('예보 조회 실패'); expect(message).not.toContain('999');
  });
  it('미선택 일요일 예보 때문에 토요일 결과에 날씨 경고를 붙이지 않는다', () => {
    const data = { title: '코스', summary: '', tip: '', totalDistanceKm: 0, stops: [stop()] };
    expect(finalizeCourse(data, input()).verification?.warnings.join(' ')).not.toContain('날씨');
    expect(finalizeCourse(data, input({ visitDay: 'sun' })).verification?.warnings.join(' ')).toContain('날씨');
  });
  it('미확인 날씨가 맑거나 비오는 자리표시자든 후보 점수는 같다', () => {
    const rank = (weather: WeekendWeather) => scoreAndRankCandidates([source('1')], ['nature'], 'solo', 'half_day', weather, 'healing', 'sun')[0].score;
    expect(rank(partial)).toBe(rank({ ...partial, sunday: { ...partial.sunday, pop: 100, precipitation: 'rain' } }));
  });
});

describe('9/9 실측 회귀 — 숙박·시간표·일차별 식사', () => {
  it('1일차 20시부터 10시간 숙박은 정상적인 다음 날 체류다', () => {
    const warnings = scheduleWarnings([stop({ isStay: true, timeStart: '20:00', durationMin: 600 }), stop({ contentId: '2', day: 2, timeStart: '10:30' })], 'overnight');
    expect(warnings.join(' ')).not.toContain('하루 범위'); expect(warnings.join(' ')).not.toContain('겹칠');
  });
  it('숙박이 끝나기 전 2일차 출발은 날짜가 달라도 겹침이다', () => {
    const warnings = scheduleWarnings([stop({ isStay: true, timeStart: '23:00', durationMin: 600 }), stop({ day: 2, timeStart: '08:00' })], 'overnight');
    expect(warnings.join(' ')).toContain('겹칠');
  });
  it('2일차의 밤샘 숙박은 1박2일 범위로 허용하지 않는다', () => {
    expect(scheduleWarnings([stop({ day: 2, isStay: true, timeStart: '20:00', durationMin: 600 })], 'overnight').join(' ')).toContain('하루 범위');
  });
  it('관광지의 밤샘을 숙박으로 허용하지 않는다', () => {
    expect(scheduleWarnings([stop({ timeStart: '20:00', durationMin: 600 })], 'overnight').join(' ')).toContain('하루 범위');
  });
  it('겹친 일정은 체류시간을 유지하며 이동시간만큼 뒤로 보정한다', () => {
    const stops = [stop(), stop({ contentId: '2', timeStart: '10:30', hook: '10시 카피' }), stop({ contentId: '3', timeStart: '11:00' })];
    expect(repairSchedule(stops, 'half_day')).toBe(2);
    expect(stops.map(s => s.timeStart)).toEqual(['10:00', '11:10', '12:20']);
    expect(stops.map(s => s.durationMin)).toEqual([60, 60, 60]); expect(stops[1].hook).toBeUndefined();
    expect(scheduleWarnings(stops, 'half_day').join(' ')).not.toContain('겹칠');
  });
  it('보정이 날짜를 넘기면 방문일을 몰래 바꾸지 않고 경고를 남긴다', () => {
    const stops = [stop({ timeStart: '23:00' }), stop({ contentId: '2', timeStart: '23:30' })];
    expect(repairSchedule(stops, 'overnight')).toBe(0); expect(stops[1].day).toBe(1);
    expect(scheduleWarnings(stops, 'overnight').join(' ')).toContain('겹칠');
  });
  it('보정 후 시간 예산 초과를 숨기지 않는다', () => {
    const stops = [stop({ durationMin: 120 }), stop({ contentId: '2', timeStart: '11:00', durationMin: 120 }), stop({ contentId: '3', timeStart: '12:00' })];
    repairSchedule(stops, 'half_day');
    expect(scheduleWarnings(stops, 'half_day').join(' ')).toContain('시간 예산');
  });
  it('기존 정상 시간표에는 손대지 않는다', () => {
    const stops = [stop(), stop({ timeStart: '12:00', hook: '유효 카피' })];
    expect(repairSchedule(stops, 'half_day')).toBe(0); expect(stops[1].hook).toBe('유효 카피');
  });
  it('시간 보정 사실을 결과에 공개하고 이전 시각의 요약을 제거한다', () => {
    const out = finalizeCourse({ title: '코스', summary: '이전 시간표 요약', tip: '', storyArc: '이전 동선', estimatedCostWon: 100, totalDistanceKm: 0, stops: [stop(), stop({ contentId: '2', timeStart: '10:30' })] }, input());
    expect(out.verification?.warnings.join(' ')).toContain('조정했어요'); expect(out.storyArc).toBeUndefined(); expect(out.summary).not.toContain('이전 시간표');
  });
  it('1일차 음식점만 있어도 2일차 점심 누락을 잡는다', () => {
    const out = validateComposition([stop({ role: 'restaurant', timeStart: '12:00' }), stop({ role: 'restaurant', timeStart: '18:00' }), stop({ day: 2, role: 'attraction', timeStart: '12:00', title: '찜닭골목' })], 'overnight', new Set(['restaurant', 'attraction']));
    expect(out.problems).toEqual(['2일차 점심(11:00~14:00)에 음식점이 배치되지 않았습니다.']);
  });
  it('이틀 점심과 첫날 저녁이 있으면 통과한다', () => {
    expect(validateComposition([stop({ role: 'restaurant', timeStart: '12:00' }), stop({ role: 'restaurant', timeStart: '18:00' }), stop({ day: 2, role: 'restaurant', timeStart: '12:00' })], 'overnight', new Set(['restaurant'])).ok).toBe(true);
  });
});

describe('운영시간 필드 보강', () => {
  it('문화시설의 별도 이용시간 필드와 빈 일반 필드를 지원한다', async () => {
    vi.stubEnv('TOUR_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ response: { header: { resultCode: '0000' }, body: { items: { item: [{ usetime: '', usetimeculture: '09:00~18:00', restdate: '', restdateculture: '월요일' }] } } } })));
    const candidates = [{ ...source('1'), contentTypeId: 14 }];
    await enrichWithFacilities(candidates);
    expect(candidates[0].usetime).toBe('09:00~18:00'); expect(candidates[0].closedWeekdays).toEqual([1]);
  });
});
