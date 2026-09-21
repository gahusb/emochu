import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ search: vi.fn(), intro: vi.fn() }));
vi.mock('@/lib/tour-api', async original => ({ ...await original<typeof import('@/lib/tour-api')>(), searchFestival: mocks.search, detailIntro: mocks.intro }));
import { loadWeekendFestivals, nearbyFestivals, festivalCards, koreaToday } from '@/lib/festival-data';
import { collectFestivals } from '@/lib/course-candidates';
import { GET } from '@/app/api/festival/route';
import { buildUserMessage, type CourseGenerationInput } from '@/lib/weekend-ai';
import { finalizeCourse } from '@/lib/course-quality';
import type { FestivalItem } from '@/lib/tour-api';
import type { CourseData, Duration, VisitDay } from '@/lib/weekend-types';

const now = new Date('2026-09-09T01:00:00Z');
const item = (id = 'festival', over: Partial<FestivalItem> = {}): FestivalItem => ({ contentid: id, contenttypeid: '15', title: id, addr1: '서울', addr2: '', areacode: '', sigungucode: '', mapx: '126.978', mapy: '37.5665', firstimage: '', firstimage2: '', tel: '', eventstartdate: '20260912', eventenddate: '20260913', ...over });
beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now); mocks.search.mockResolvedValue([]); mocks.intro.mockResolvedValue(null); });
afterEach(() => vi.useRealTimers());

describe('축제 수집의 기간·좌표·조회 범위', () => {
  it('지역코드 없이 실제 주말 기간으로 조회한다', async () => {
    await loadWeekendFestivals();
    expect(mocks.search).toHaveBeenCalledExactlyOnceWith({ eventStartDate: '20260912', eventEndDate: '20260913', numOfRows: 200, pageNo: 1 });
  });
  it('첫 페이지 뒤의 행사도 수집한다', async () => {
    mocks.search.mockResolvedValueOnce(Array.from({ length: 200 }, (_, i) => item(String(i)))).mockResolvedValueOnce([item('later')]);
    const out = await loadWeekendFestivals();
    expect(out.items.at(-1)?.contentid).toBe('later'); expect(out.partial).toBe(false); expect(mocks.search).toHaveBeenCalledTimes(2);
  });
  it('상한에 도달하면 일부 범위 표시와 함께 멈춘다', async () => {
    mocks.search.mockResolvedValue(Array.from({ length: 200 }, (_, i) => item(String(i))));
    expect((await loadWeekendFestivals()).partial).toBe(true); expect(mocks.search).toHaveBeenCalledTimes(3);
  });
  it('뒷 페이지 실패는 앞 페이지를 보존하되 완전하다고 하지 않는다', async () => {
    mocks.search.mockResolvedValueOnce(Array.from({ length: 200 }, (_, i) => item(String(i)))).mockRejectedValueOnce(new Error('fail'));
    const out = await loadWeekendFestivals(); expect(out.items).toHaveLength(200); expect(out.partial).toBe(true);
  });
  it('첫 조회 실패는 빈 목록 성공이 아니다', async () => {
    mocks.search.mockRejectedValue(new Error('failure'));
    await expect(loadWeekendFestivals()).rejects.toThrow('failure');
  });
  it('기존 지역코드가 비어도 좌표가 있으면 포함한다', () => {
    expect(nearbyFestivals([item()], 37.5665, 126.978, 15, ['2026-09-12'])).toHaveLength(1);
  });
  it.each([
    { eventenddate: '20260911' }, { eventstartdate: '20260914' }, { eventstartdate: '20260931' },
    { eventstartdate: '' }, { mapx: '' }, { mapy: 'NaN' }, { mapy: '0' }, { mapx: '129' },
  ])('종료·미래·잘못된 날짜·좌표·원거리 제외 %j', over => {
    expect(nearbyFestivals([item('bad', over)], 37.5665, 126.978, 15, ['2026-09-12'])).toEqual([]);
  });
  it('장기 행사도 방문일이 기간 안이면 유지하고 중복을 없앤다', () => {
    const long = item('long', { eventstartdate: '20260101', eventenddate: '20261231' });
    expect(nearbyFestivals([long, long], 37.5665, 126.978, 15, ['2026-09-12']).map(f => f.contentid)).toEqual(['long']);
  });
  it('거리순으로 정렬한 후 UI 카드에 KST D-day를 붙인다', () => {
    const near = nearbyFestivals([item('far', { mapy: '37.6' }), item('near')], 37.5665, 126.978, 15, ['2026-09-12']);
    const cards = festivalCards(near, 37.5665, 126.978, '20260912', '20260913', new Date('2026-09-11T16:00:00Z'));
    expect(cards[0]).toMatchObject({ contentId: 'near', dDay: 1, urgencyTag: '올 주말 마지막!', distanceKm: 0 });
    expect(koreaToday(new Date('2026-09-11T16:00:00Z'))).toBe('20260912');
  });
  it.each(['half_day', 'full_day', 'leisurely', 'overnight'] as Duration[])('%s의 일요일 선택을 방문 일차에 맞게 대조한다', async duration => {
    mocks.search.mockResolvedValue([item('sat', { eventenddate: '20260912' }), item('sun', { eventstartdate: '20260913' })]);
    const result = await collectFestivals({ lat: 37.5665, lng: 126.978, duration, visitDay: 'sun', companion: 'solo', preferences: ['culture'], destinationType: 'city', cityAreaCode: 1 });
    expect(result.map(f => f.contentId)).toEqual(duration === 'overnight' ? ['sat', 'sun'] : ['sun']);
  });
  it('후보는 가까운 6곳, 행사 상세도 최대 6회이며 요금은 시간이 아니다', async () => {
    mocks.search.mockResolvedValue(Array.from({ length: 10 }, (_, i) => item(String(i))));
    mocks.intro.mockResolvedValue({ playtime: '18:00~21:00', usetimefestival: '유료' });
    const result = await collectFestivals({ lat: 37.5665, lng: 126.978, duration: 'full_day', companion: 'solo', preferences: ['culture'] });
    expect(result).toHaveLength(6); expect(mocks.intro).toHaveBeenCalledTimes(6); expect(result[0].playtime).toBe('18:00~21:00');
  });
});

describe('축제 API는 실패·부족·부분 성공을 구분한다', () => {
  const request = (query = '') => new NextRequest(`http://localhost/api/festival${query}`);
  it.each(['?lat=NaN', '?lng=0', '?radius=201', '?radius=-1'])('%s 잘못된 요청은 호출 전에 거부', async query => {
    expect((await GET(request(query))).status).toBe(400); expect(mocks.search).not.toHaveBeenCalled();
  });
  it('정상 빈 결과는 available', async () => {
    const response = await GET(request()); expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ dataStatus: 'available', festivals: [] });
  });
  it('기관 장애는 503, 내부 원문과 키는 숨긴다', async () => {
    mocks.search.mockRejectedValue(new Error('serviceKey=private-fixture'));
    const response = await GET(request()); expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store'); expect(await response.text()).not.toContain('private-fixture');
  });
  it('상한까지 찬 조회는 partial이며 끝난 행사는 표시하지 않는다', async () => {
    mocks.search.mockResolvedValue(Array.from({ length: 200 }, (_, i) => item(String(i), { eventenddate: '20260911' })));
    expect(await (await GET(request())).json()).toMatchObject({ dataStatus: 'partial', festivals: [] });
  });
});

describe('코스의 행사시간 원본과 설명', () => {
  const run = (playtime?: string, visitDay: VisitDay = 'sat') => {
    const festival = { contentId: 'f', title: '야간 행사', addr1: '', latitude: 37.5665, longitude: 126.978, eventStartDate: '20260912', eventEndDate: '20260913', playtime };
    const input: CourseGenerationInput = { departure: { name: '서울', lat: 37.5665, lng: 126.978 }, duration: 'half_day', companion: 'solo', preferences: ['culture'], candidates: [], festivals: [festival], stays: [], visitDay, weather: { saturday: { date: '', sky: 'clear', precipitation: 'none', tempMin: 0, tempMax: 0, pop: 0, summary: '' }, sunday: { date: '', sky: 'clear', precipitation: 'none', tempMin: 0, tempMax: 0, pop: 0, summary: '' }, recommendation: '', unavailable: true } };
    const course: CourseData = { title: 'fixture', summary: '', tip: '', totalDistanceKm: 0, stops: [{ contentId: 'f', title: 'fake', order: 1, timeStart: '10:00', durationMin: 60, description: '', tip: '', isFestival: false, latitude: 0, longitude: 0 }] };
    return { input, output: finalizeCourse(course, input, now) };
  };
  it('밤 행사를 낮에 배치하면 원문과 시간 불일치를 알린다', () => {
    const { output, input } = run('18:00~21:00');
    expect(output.stops[0].facilities?.operatingHours).toBe('18:00~21:00');
    expect(output.verification?.warnings.join(' ')).toContain('원본 행사시간과 맞지');
    expect(buildUserMessage(input)).toContain('18:00~21:00');
  });
  it('시간 원문이 없거나 복합 회차이면 매일 운영한다고 단정하지 않는다', () => {
    for (const time of [undefined, '토요일만 / 1회차 10시, 2회차 18시']) {
      const { output } = run(time); expect(output.verification?.warnings.join(' ')).toContain('매일 열리는 것은 아니에요');
    }
  });
});
