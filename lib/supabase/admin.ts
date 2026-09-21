import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// 서비스 롤 키 사용 (RLS 우회, 서버 전용)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  // 서버 설정 오류를 익명 권한 확대로 해결하지 않는다. 값은 오류에 포함하지 않는다.
  if (!url || !serviceKey) {
    throw new Error('Supabase server configuration is missing.');
  }
  if (serviceKey === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    throw new Error('Supabase server credentials must not use the anonymous key.');
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
