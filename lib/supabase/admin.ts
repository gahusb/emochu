import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// 서비스 롤 키 사용 (RLS 우회, 서버 전용)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    // 서비스 롤 키 없으면 anon 키로 폴백 (RLS 제한 있음)
    return createSupabaseClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
