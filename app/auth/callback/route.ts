// ============================================================
// GET /auth/callback — OAuth 로그인 후 돌아오는 자리
// ============================================================
//
// 공급자(카카오 등)가 code 를 붙여 돌려보내면 여기서 세션 쿠키로 바꾼다.
// 🔴 next 파라미터로 아무 데나 보내지 않는다 — 외부 URL 을 넣으면 오픈 리다이렉트가 된다.
//    같은 사이트의 경로(/로 시작)만 허용한다.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAuthEnabled } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/';
  // 경로만 허용. '//evil.com' 같은 스킴 상대 URL 도 막는다.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  // 🔴 이 라우트는 조용히 리다이렉트만 하고 있었다. 그래서 로그인이 안 될 때
  //    「콜백이 오긴 왔는가 / code 는 있었는가 / 교환에서 깨졌는가」를 구분할 수 없었다.
  //    셋을 다 남긴다.
  console.log(`[이모추:auth] 콜백 수신 — code=${code ? '있음' : '🔴 없음'} ` +
    `enabled=${isAuthEnabled()} next=${next} params=[${[...searchParams.keys()].join(',')}]`);

  if (!isAuthEnabled() || !code) {
    console.warn('[이모추:auth] 교환을 건너뛰고 홈으로 보낸다 — ' +
      (!isAuthEnabled() ? 'NEXT_PUBLIC_AUTH_ENABLED 가 true 가 아니다' : 'code 파라미터가 없다'));
    return NextResponse.redirect(`${origin}/`);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    console.log(`[이모추:auth] ✅ 세션 발급 완료 user=${data.user?.id?.slice(0, 8)}… → ${next}`);
    return NextResponse.redirect(`${origin}${next}`);
  } catch (err) {
    console.warn('[이모추:auth] 🔴 세션 교환 실패:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(`${origin}/?auth=failed`);
  }
}
