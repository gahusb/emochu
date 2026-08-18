import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { normalizeBarrierFree, fetchBarrierFree } from '@/lib/barrier-free-api';

// 원시 필드명·값은 2026-08-18 실호출 관측치다.
// 근거: docs/tour-api-barrier-free-discovery.md 「2026-08-18 갱신」
describe('normalizeBarrierFree', () => {
  it('빈 문자열 필드는 details 에 담지 않는다', () => {
    const result = normalizeBarrierFree({ contentid: '1', route: '', exit: '' });
    expect(result.details).toEqual({});
    expect(result.mobility).toBeUndefined();
  });

  it('그룹 안에 하나라도 값이 있으면 그 그룹은 true 다', () => {
    const result = normalizeBarrierFree({
      contentid: '1',
      exit: '주출입구는 경사로가 있어 휠체어 접근 가능함',
    });
    expect(result.mobility).toBe(true);
    expect(result.details.exit).toBe('주출입구는 경사로가 있어 휠체어 접근 가능함');
  });

  it('wheelchair 는 "대여"라서 mobility 판정에 쓰지 않는다', () => {
    // 경복궁 실측: wheelchair="대여가능" 은 휠체어를 빌려준다는 뜻이지
    // 휠체어로 갈 수 있다는 뜻이 아니다. 혼동하면 못 가는 곳을 갈 수 있다고 속인다.
    const result = normalizeBarrierFree({ contentid: '1', wheelchair: '대여가능' });
    expect(result.mobility).toBeUndefined();
    expect(result.details.wheelchair).toBe('대여가능'); // 표시는 한다
  });

  it('그룹을 서로 섞지 않는다', () => {
    const result = normalizeBarrierFree({ contentid: '1', braileblock: '있음' });
    expect(result.visual).toBe(true);
    expect(result.mobility).toBeUndefined();
    expect(result.hearing).toBeUndefined();
    expect(result.infant).toBeUndefined();
  });

  it('contentid 는 details 에 넣지 않는다', () => {
    const result = normalizeBarrierFree({ contentid: '126508' });
    expect(result.details).toEqual({});
  });

  it('경복궁 실측 응답을 그대로 정규화한다', () => {
    const result = normalizeBarrierFree({
      contentid: '126508',
      parking: '장애인 주차장 있음(광화문 우측 옥외 주차장에 9개)_무장애 편의시설',
      wheelchair: '대여가능',
      exit: '주출입구는 경사로가 있어 휠체어 접근 가능함',
      restroom: '장애인 화장실 있음',
      audioguide: '음성안내 가이드 있음(티켓박스에서 음성안내기기와 PDA 대여가능)',
      stroller: '대여가능',
      braileblock: '',
      helpdog: '',
      signguide: '',
    });
    expect(result.mobility).toBe(true);   // parking·exit·restroom
    expect(result.visual).toBe(true);     // audioguide
    expect(result.infant).toBe(true);     // stroller
    expect(result.hearing).toBeUndefined(); // signguide 가 빈 문자열
    expect(Object.keys(result.details).sort()).toEqual(
      ['audioguide', 'exit', 'parking', 'restroom', 'stroller', 'wheelchair'].sort(),
    );
  });
});

describe('fetchBarrierFree', () => {
  // 🔴 키를 주입하지 않으면 getServiceKey 가 早期 return 해서 fetch 를 타지 않는다.
  //    그러면 403/타임아웃 테스트가 "빈 Map"만 보고 가짜로 통과한다.
  beforeEach(() => vi.stubEnv('TOUR_API_KEY', 'test-key'));
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('키가 없으면 fetch 하지 않고 빈 Map 을 준다 (설정 누락도 degrade)', async () => {
    vi.stubEnv('TOUR_API_KEY', '');
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    const result = await fetchBarrierFree(['126508']);
    expect(spy).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
  });

  it('빈 배열이면 fetch 를 호출조차 하지 않는다', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    const result = await fetchBarrierFree([]);
    expect(spy).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
  });

  it('403 이면 던지지 않고 빈 Map 을 준다 (코스 생성을 막지 않는다)', async () => {
    const spy = vi.fn().mockResolvedValue({ status: 403, ok: false });
    vi.stubGlobal('fetch', spy);
    const result = await fetchBarrierFree(['126508']);
    expect(spy).toHaveBeenCalledTimes(1); // 실제로 호출됐는지 확인 — 없으면 가짜 통과다
    expect(result.size).toBe(0);
  });

  it('타임아웃이면 빈 Map 을 준다', async () => {
    const spy = vi.fn().mockRejectedValue(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    );
    vi.stubGlobal('fetch', spy);
    const result = await fetchBarrierFree(['126508']);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.size).toBe(0);
  });

  it('items 가 없으면 Map 에 키를 만들지 않는다 (미확인과 정보없음을 구분한다)', async () => {
    // 음식점 1947036 실측: HTTP 200 + resultCode 0000 인데 items 가 아예 없다
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ response: { body: { items: '' } } }),
    }));
    const result = await fetchBarrierFree(['1947036']);
    expect(result.has('1947036')).toBe(false);
  });

  it('일부만 실패해도 성공한 것은 담는다', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          response: { body: { items: { item: { contentid: '1', exit: '경사로 있음' } } } },
        }),
      })
      .mockResolvedValueOnce({ status: 403, ok: false }));
    const result = await fetchBarrierFree(['1', '2']);
    expect(result.size).toBe(1);
    expect(result.get('1')?.mobility).toBe(true);
  });
});
