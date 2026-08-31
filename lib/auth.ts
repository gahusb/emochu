// 로그인 — 「내 코스가 기기를 바꿔도 남는다」를 위한 최소 인증.
//
// 왜 필요한가: 코스 소유권이 지금은 **브라우저 localStorage 의 편집 토큰**뿐이다.
// 시크릿창을 닫거나 폰을 바꾸면 내가 만든 코스에 접근할 방법이 사라진다.
// 로그인은 그 소유권을 계정으로 옮기는 장치다.
//
// 🔴 기본은 꺼져 있다(NEXT_PUBLIC_AUTH_ENABLED). Supabase 대시보드에서 OAuth 공급자
//    설정이 끝나기 전에 켜면 로그인 버튼이 에러만 뱉는다 — 없느니만 못하다.
//    꺼져 있는 동안 서비스는 지금과 100% 동일하게 동작한다.

import { createClient } from '@/lib/supabase/server';

/** 로그인 기능이 켜져 있는가. 클라이언트·서버 양쪽에서 같은 값을 본다. */
export function isAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
}

/**
 * 현재 로그인한 사용자 id. 로그인이 꺼져 있거나 비로그인이면 null.
 *
 * 🔴 여기서 절대 던지지 않는다. 이 함수는 코스 생성 같은 **핵심 경로**에서 불리는데,
 *    인증 설정이 어긋났다고 코스 생성이 실패하면 안 된다. 실패 = 비로그인으로 본다.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (!isAuthEnabled()) {
    console.warn('[이모추:auth] NEXT_PUBLIC_AUTH_ENABLED 가 true 가 아니다 — 비로그인으로 처리');
    return null;
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    // 🔴 세 갈래를 구분해서 남긴다. 예전엔 전부 null 로 뭉개져서
    //    「로그인했는데 내 코스에 안 뜬다」의 원인을 로그만 보고는 알 수 없었다.
    if (error) {
      console.warn('[이모추:auth] 세션 확인 실패:', error.message);
      return null;
    }
    if (!data.user) {
      console.warn('[이모추:auth] 요청에 세션 쿠키가 없다 (비로그인이거나 쿠키 미전달)');
      return null;
    }
    return data.user.id;
  } catch (err) {
    console.warn('[이모추:auth] 세션 확인 예외:', err);
    return null;
  }
}
