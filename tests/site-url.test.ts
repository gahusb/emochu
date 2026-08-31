import { describe, it, expect, afterEach } from 'vitest';
import { getSiteUrl } from '@/lib/site-url';

// 🔴 이 우선순위가 틀리면 조용히 망가진다. 2026-08-31 라이브에서 실제로 겪었다:
//    VERCEL_URL(배포별 호스트)로 떨어지자 Deployment Protection 때문에 그 주소가
//    외부에 302 를 줬고 → og:image 를 크롤러가 못 가져오고
//    → 같은 주소로 fetch 하는 generateMetadata 도 실패해 og:title 이 기본값이 됐다.
//    빌드도 테스트도 통과하는데 공유 카드만 조용히 죽는 종류의 결함이라 여기서 고정한다.

const KEYS = ['NEXT_PUBLIC_SITE_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL'] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function setEnv(values: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const k of KEYS) {
    if (values[k] === undefined) delete process.env[k];
    else process.env[k] = values[k];
  }
}

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('getSiteUrl 우선순위', () => {
  it('명시 설정이 가장 우선한다', () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: 'https://emochu.example.com',
      VERCEL_PROJECT_PRODUCTION_URL: 'emochu.vercel.app',
      VERCEL_URL: 'emochu-abc123.vercel.app',
    });
    expect(getSiteUrl()).toBe('https://emochu.example.com');
  });

  // 🔑 핵심 회귀 테스트. 둘 다 있으면 **표준 도메인**을 골라야 한다.
  it('표준 도메인이 배포별 호스트보다 우선한다', () => {
    setEnv({
      VERCEL_PROJECT_PRODUCTION_URL: 'emochu.vercel.app',
      VERCEL_URL: 'emochu-kp9e00418-gahusbs-projects.vercel.app',
    });
    expect(getSiteUrl()).toBe('https://emochu.vercel.app');
  });

  it('표준 도메인이 없으면 배포별 호스트로 떨어진다', () => {
    setEnv({ VERCEL_URL: 'emochu-abc123.vercel.app' });
    expect(getSiteUrl()).toBe('https://emochu-abc123.vercel.app');
  });

  it('아무것도 없으면 기본 도메인', () => {
    setEnv({});
    expect(getSiteUrl()).toBe('https://emochu.vercel.app');
  });

  it('후행 슬래시를 제거한다 — 이중 슬래시 URL 을 만들지 않는다', () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: 'https://emochu.example.com///' });
    expect(getSiteUrl()).toBe('https://emochu.example.com');
  });
});
