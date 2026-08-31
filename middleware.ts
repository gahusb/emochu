// Supabase 세션 갱신 미들웨어.
//
// 액세스 토큰은 짧게 만료된다. 서버 컴포넌트는 쿠키를 쓸 수 없으므로,
// 미들웨어가 매 요청에서 세션을 갱신해 쿠키를 다시 심어야 로그인이 유지된다.
//
// 🔴 로그인이 꺼져 있으면(NEXT_PUBLIC_AUTH_ENABLED != 'true') 아무것도 하지 않는다.
//    Supabase Auth 는 대시보드 설정(카카오 OAuth 등)이 선행되어야 하는데, 설정 전에
//    미들웨어가 인증을 시도하면 **모든 페이지가 느려지거나 깨진다.**
//    설정이 끝나기 전까지 서비스는 지금과 100% 동일하게 동작해야 한다.

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'true') {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods },
  );

  // 🔴 getUser() 를 불러야 토큰이 실제로 갱신된다. getSession() 은 쿠키를 읽기만 한다.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // 정적 자산과 이미지에는 걸지 않는다 — 세션 갱신이 필요 없고, 걸면 그냥 느려진다.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|otf|woff2?)$).*)'],
};
