import { describe, it, expect } from 'vitest';
import { fetchBarrierFree } from '@/lib/barrier-free-api';
import { filterByAccessibility } from '@/lib/weekend-ai';

// 실제 무장애 API 를 호출하는 통합 테스트다.
//
// 실행:  set -a && . ./.env.local && set +a && npx vitest run tests/barrier-free-live.test.ts
//
// `npm test` 로는 skip 된다 — vitest 가 .env.local 을 자동 로드하지 않기 때문이다.
// 그래서 release-green 의 BASELINE(80)에도 포함하지 않는다. 어댑터 로직 자체는
// tests/barrier-free-api.test.ts 가 모킹으로 커버하고, 이 파일은 "실제 API 가
// 우리가 아는 그 모양인지"를 사람이 확인하고 싶을 때 돌린다.
const hasKey = Boolean(process.env.TOUR_API_KEY?.trim());

describe.skipIf(!hasKey)('무장애 API 실호출 통합', () => {
  it('경복궁의 무장애 정보를 실제로 가져온다', async () => {
    const info = await fetchBarrierFree(['126508']);
    const bf = info.get('126508');
    expect(bf).toBeDefined();
    expect(bf!.mobility).toBe(true);
    expect(bf!.details.exit).toContain('경사로');
  }, 20_000);

  it('정보 없는 콘텐츠는 Map 에 담기지 않는다', async () => {
    const info = await fetchBarrierFree(['1947036']); // 음식점, items 없음
    expect(info.has('1947036')).toBe(false);
  }, 20_000);

  it('필터가 확인된 곳을 앞으로 올린다', async () => {
    const ids = ['1947036', '126508']; // 정보없음, 확인됨 순서
    const info = await fetchBarrierFree(ids);
    const spots = ids.map((contentId) => ({ contentId }));
    const out = filterByAccessibility(spots, ['mobility'], info);
    expect(out[0].contentId).toBe('126508');
    expect(out).toHaveLength(2); // 미확인도 남는다
  }, 30_000);
});
