import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTourDetailGuard, retryAfterMs, TourDetailRateLimitError } from '@/lib/tour-detail-guard';
import { detailIntro, searchFestival } from '@/lib/tour-api';

let sequence = 0;
beforeEach(() => { vi.stubEnv('TOUR_API_KEY', `local-fixture-${++sequence}`); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
const body = (item: unknown) => Response.json({ response: { header: { resultCode: '0000' }, body: { items: { item } } } });

describe('상세정보 요청 합치기·짧은 캐시·한도 차단', () => {
  it('동일 장소의 동시 요청 20개는 한 번만 실행하고 객체는 분리한다', async () => {
    const guard = createTourDetailGuard<{ text: string }>();
    const wait = deferred<{ text: string }>(), load = vi.fn(() => wait.promise);
    const pending = Array.from({ length: 20 }, () => guard.run('same', load));
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    wait.resolve({ text: '원본' });
    const results = await Promise.all(pending);
    results[0].text = '변경'; expect(results[1].text).toBe('원본');
    expect(await guard.run('same', load)).toEqual({ text: '원본' });
    expect(load).toHaveBeenCalledTimes(1);
  });
  it('정상 빈 응답도 60초만 재사용하고 만료 후 다시 조회한다', async () => {
    let time = 0; const guard = createTourDetailGuard<null>({ now: () => time });
    const load = vi.fn(async () => null);
    await guard.run('empty', load); time = 59_999; await guard.run('empty', load);
    expect(load).toHaveBeenCalledTimes(1);
    time = 60_000; await guard.run('empty', load); expect(load).toHaveBeenCalledTimes(2);
  });
  it('캐시 크기를 제한하고 가장 먼저 저장한 항목을 제거한다', async () => {
    const guard = createTourDetailGuard<number>({ capacity: 2 }); const load = vi.fn(async () => 1);
    for (const key of ['a', 'b', 'c', 'a']) await guard.run(key, load);
    expect(load).toHaveBeenCalledTimes(4);
  });
  it('503·실패는 빈 성공으로 저장하지 않고 다음 명시적 호출을 허용한다', async () => {
    const guard = createTourDetailGuard<number>();
    const load = vi.fn().mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce(1);
    await expect(guard.run('a', load)).rejects.toThrow('503');
    expect(await guard.run('a', load)).toBe(1); expect(load).toHaveBeenCalledTimes(2);
  });
  it('동시 실행은 4개 이하이고 대기 요청은 앞 요청이 끝난 뒤 시작한다', async () => {
    const guard = createTourDetailGuard<number>(), waits = Array.from({ length: 8 }, () => deferred<number>());
    const load = vi.fn((i: number) => waits[i].promise);
    const requests = waits.map((_, i) => guard.run(String(i), () => load(i)));
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(4));
    waits.slice(0, 4).forEach(w => w.resolve(1));
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(8));
    waits.slice(4).forEach(w => w.resolve(1)); await Promise.all(requests);
  });
  it('20개가 대기해도 첫 429 뒤 아직 시작하지 않은 16개는 보내지 않는다', async () => {
    const guard = createTourDetailGuard<number>();
    const load = vi.fn(async () => { throw new TourDetailRateLimitError(); });
    const results = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => guard.run(String(i), load)));
    expect(load).toHaveBeenCalledTimes(4); expect(results.every(r => r.status === 'rejected')).toBe(true);
    await expect(guard.run('new', load)).rejects.toThrow('제한'); expect(load).toHaveBeenCalledTimes(4);
  });
  it('제한 중에는 유효한 정상 캐시만 제공하고 자동 재시도는 하지 않는다', async () => {
    let time = 0; const guard = createTourDetailGuard<number>({ now: () => time });
    const good = vi.fn(async () => 1), limited = vi.fn(async () => { throw new TourDetailRateLimitError(120_000); });
    await guard.run('good', good); await expect(guard.run('limited', limited)).rejects.toThrow('제한');
    expect(await guard.run('good', good)).toBe(1);
    time = 60_000; await expect(guard.run('good', good)).rejects.toThrow('제한');
    time = 120_000; expect(good).toHaveBeenCalledTimes(1); // 시간이 지났다고 스스로 호출하지 않음
    expect(await guard.run('good', good)).toBe(1); expect(good).toHaveBeenCalledTimes(2);
  });
  it('대기가 7초를 넘은 요청은 뒤늦게 외부로 보내지 않는다', async () => {
    let time = 0; const guard = createTourDetailGuard<number>({ now: () => time, concurrency: 1 });
    const first = deferred<number>(), firstLoad = vi.fn(() => first.promise), second = vi.fn(async () => 2);
    const requests = Promise.allSettled([guard.run('a', firstLoad), guard.run('b', second)]);
    await vi.waitFor(() => expect(firstLoad).toHaveBeenCalledTimes(1));
    time = 7_000; first.resolve(1); const result = await requests;
    expect(second).not.toHaveBeenCalled(); expect(result[1].status).toBe('rejected');
  });
  it('대기 상한은 무한 메모리 증가를 막는다', async () => {
    const guard = createTourDetailGuard<number>({ maxPending: 1 }), wait = deferred<number>();
    const pending = guard.run('a', () => wait.promise);
    await expect(guard.run('b', async () => 2)).rejects.toThrow('대기 상한');
    wait.resolve(1); await pending;
  });
  it.each([null, '', 'invalid', '-10', '0', '0.5'])('잘못되거나 짧은 Retry-After %s는 60초', raw => {
    expect(retryAfterMs(raw, Date.parse('2026-09-10T00:00:00Z'))).toBe(60_000);
  });
  it('초·HTTP 날짜·최대 하루 억제를 지원한다', () => {
    const now = Date.parse('2026-09-10T00:00:00Z');
    expect(retryAfterMs('120', now)).toBe(120_000);
    expect(retryAfterMs('Thu, 10 Sep 2026 00:03:00 GMT', now)).toBe(180_000);
    expect(retryAfterMs('99999999', now)).toBe(86_400_000);
  });
});

describe('실제 TourAPI 클라이언트 경계 — 네트워크는 고정 응답', () => {
  it('contentId+유형이 같은 소개 요청을 합치고 다른 유형은 분리한다', async () => {
    const fetch = vi.fn(async () => body({ contentid: 'a', contenttypeid: '12', usetime: '09:00~18:00' })); vi.stubGlobal('fetch', fetch);
    await Promise.all([detailIntro({ contentId: 'a', contentTypeId: 12 }), detailIntro({ contentId: 'a', contentTypeId: 12 })]);
    await detailIntro({ contentId: 'a', contentTypeId: 39 }); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('429 이후 상세만 억제하며 축제 목록을 성공한 빈 목록으로 위장하지 않는다', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 429, headers: { 'retry-after': '120' } })); vi.stubGlobal('fetch', fetch);
    await expect(detailIntro({ contentId: 'a', contentTypeId: 12 })).rejects.toThrow('제한');
    await expect(detailIntro({ contentId: 'b', contentTypeId: 12 })).rejects.toThrow('제한'); expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockImplementation(async () => body([]));
    expect(await searchFestival({ eventStartDate: '20260912', eventEndDate: '20260913' })).toEqual([]); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('인증키 변경은 기존 캐시·제한 상태와 분리한다', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 429 })); vi.stubGlobal('fetch', fetch);
    await expect(detailIntro({ contentId: 'a', contentTypeId: 12 })).rejects.toThrow('제한');
    vi.stubEnv('TOUR_API_KEY', 'another-local-fixture'); fetch.mockImplementation(async () => body([]));
    expect(await detailIntro({ contentId: 'a', contentTypeId: 12 })).toBeNull(); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('대기 중 인증키가 바뀌어도 이전 요청은 처음의 계정으로 전송한다', async () => {
    const originalCredential = process.env.TOUR_API_KEY;
    const fetch = vi.fn(async (url: string) => {
      expect(new URL(url).searchParams.get('serviceKey')).toBe(originalCredential);
      return body([]);
    }); vi.stubGlobal('fetch', fetch);
    const previous = detailIntro({ contentId: 'a', contentTypeId: 12 });
    vi.stubEnv('TOUR_API_KEY', 'changed-before-fetch');
    await previous; expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('기관 오류·형식 오류는 캐시하지 않고 인증키·원문을 오류에 포함하지 않는다', async () => {
    const fetch = vi.fn(async () => Response.json({ response: { header: { resultCode: '22', resultMsg: 'sensitive-fixture' } } })); vi.stubGlobal('fetch', fetch);
    const request = () => detailIntro({ contentId: 'a', contentTypeId: 12 });
    await expect(request()).rejects.toThrow('응답 오류');
    await expect(request()).rejects.not.toThrow('sensitive-fixture'); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('요청 전체 대기 예산에 연결된 취소 신호를 fetch에 전달한다', async () => {
    const fetch = vi.fn(async (_url, init) => { expect(init.signal).toBeInstanceOf(AbortSignal); return body([]); }); vi.stubGlobal('fetch', fetch);
    await detailIntro({ contentId: 'a', contentTypeId: 12 }); expect(fetch).toHaveBeenCalledTimes(1);
  });
});
