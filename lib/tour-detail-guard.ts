/** 원문/URL/인증키 없이 전달하는 제한 오류. 429는 빈 관광정보가 아니다. */
export class TourDetailRateLimitError extends Error {
  constructor(public readonly retryAfterMs = 60_000) {
    super('TourAPI 상세 조회가 일시 제한됐습니다. 정보는 미확인으로 처리합니다.');
    this.name = 'TourDetailRateLimitError';
  }
}

export function retryAfterMs(raw: string | null, now = Date.now()): number {
  const value = raw?.trim() ?? '';
  const wait = /^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value) - now;
  // 자동 재시도가 아닌 같은 프로세스의 요청 억제 시간. 한도 해제 시각 보장이 아니다.
  return Number.isFinite(wait) && wait > 0 ? Math.min(86_400_000, Math.max(60_000, wait)) : 60_000;
}

/** 프로세스 내부: 동일 요청 합치기 + 정상 응답 60초 + 최대 4개 실행. 분산 한도 관리가 아니다. */
export function createTourDetailGuard<T>({ now = Date.now, concurrency = 4, capacity = 128, maxPending = 256 } = {}) {
  const cache = new Map<string, { expires: number; value: T }>();
  const pending = new Map<string, Promise<T>>();
  const queue: (() => void)[] = [];
  let active = 0, blockedUntil = 0;
  const acquire = () => new Promise<void>(resolve => {
    const enter = () => { active++; resolve(); };
    if (active < concurrency) enter(); else queue.push(enter);
  });
  const release = () => { active--; queue.shift()?.(); };
  return {
    async run(key: string, load: (signal: AbortSignal) => Promise<T>): Promise<T> {
      for (const [id, item] of cache) if (item.expires <= now()) cache.delete(id);
      const hit = cache.get(key);
      if (hit) return structuredClone(hit.value);
      const shared = pending.get(key);
      if (shared) return structuredClone(await shared);
      if (blockedUntil > now()) throw new TourDetailRateLimitError(blockedUntil - now());
      if (pending.size >= maxPending) throw new Error('TourAPI 상세 조회 대기 상한에 도달했습니다.');
      const deadline = now() + 7_000; // 대기도 총 7초에 포함. 생성 API의 보강 상한(8초) 뒤에 요청을 시작하지 않는다.
      const task = (async () => {
        await acquire();
        try {
          // 먼저 시작한 요청이 429를 받으면 뒤의 대기 요청은 외부로 보내지 않는다.
          if (blockedUntil > now()) throw new TourDetailRateLimitError(blockedUntil - now());
          const remaining = deadline - now();
          if (remaining <= 0) throw new Error('TourAPI 상세 조회 대기 시간이 초과됐습니다.');
          const value = await load(AbortSignal.timeout(Math.ceil(remaining)));
          if (cache.size >= capacity) cache.delete(cache.keys().next().value!);
          cache.set(key, { value: structuredClone(value), expires: now() + 60_000 });
          return value;
        } catch (error) {
          if (error instanceof TourDetailRateLimitError) blockedUntil = Math.max(blockedUntil, now() + error.retryAfterMs);
          throw error; // 실패는 정상 빈 결과로 캐시하지 않는다.
        } finally { release(); }
      })();
      pending.set(key, task);
      const clean = () => { pending.delete(key); };
      void task.then(clean, clean);
      return structuredClone(await task);
    },
  };
}
