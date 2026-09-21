import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn(() => ({ server: true })) }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));
import { createAdminClient } from '@/lib/supabase/admin';

beforeEach(() => {
  createClient.mockClear();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.invalid');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'fixture-anonymous-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture-server-key');
});
afterEach(() => vi.unstubAllEnvs());

describe('createAdminClient — 서버 자격증명 필수', () => {
  it.each([undefined, '', '   '])('서버 키 %j이면 anon으로 대체하지 않는다', (key) => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', key);
    expect(() => createAdminClient()).toThrow('Supabase server configuration is missing.');
    expect(createClient).not.toHaveBeenCalled();
  });

  it.each([undefined, '', '   '])('URL %j이면 SDK 호출 전에 중단한다', (url) => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
    expect(() => createAdminClient()).toThrow('Supabase server configuration is missing.');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('서버 키에 공개 anon 키를 잘못 복사하면 값 노출 없이 중단한다', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '  fixture-anonymous-key  ');
    expect(() => createAdminClient()).toThrow('Supabase server credentials must not use the anonymous key.');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('서버 키로만 생성하고 세션 저장·자동 갱신을 사용하지 않는다', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '  fixture-server-key  ');
    expect(createAdminClient()).toEqual({ server: true });
    expect(createClient).toHaveBeenCalledExactlyOnceWith('https://example.invalid', 'fixture-server-key', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });
});
