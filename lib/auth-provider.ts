// 로그인 공급자 선택 — 클라이언트에서도 쓰이므로 서버 전용 모듈을 import 하지 않는다.
//
// 🔴 왜 환경변수로 뺐나 (2026-08-31):
//    카카오 로그인이 `KOE205 — Unset consent item(s): account_email` 로 막혔다.
//    Supabase 의 Kakao provider 는 `account_email` scope 를 **고정으로** 붙이는데
//    (실측: signInWithOAuth 의 scopes 옵션은 교체가 아니라 **추가**로 동작한다),
//    그 동의항목은 카카오 **비즈 앱**에서만 쓸 수 있다.
//
//    비즈 앱 전환은 사업자등록번호 없이도 가능하지만(개인 개발자 비즈 앱 —
//    본인인증 + 약관 동의), 심사를 기다리는 동안 로그인이 통째로 막힌다.
//    1차 심사 마감이 2026-09-21 이라 그 대기가 곧 위험이다.
//
//    그래서 공급자를 코드가 아니라 **설정**으로 뺐다. 카카오가 열리면 값만 바꾸면 되고,
//    막혀 있는 동안은 다른 공급자로 열어둘 수 있다.

export type AuthProvider = 'kakao' | 'google';

const RAW = process.env.NEXT_PUBLIC_AUTH_PROVIDER;

/** 로그인에 쓸 OAuth 공급자. 지정이 없으면 카카오(주 이용자층이 한국이다). */
export const AUTH_PROVIDER: AuthProvider = RAW === 'google' ? 'google' : 'kakao';

/** 버튼에 쓸 이름. 「Google로 시작하기」인데 카카오 로고가 뜨면 사용자가 멈칫한다. */
export const AUTH_PROVIDER_LABEL: Record<AuthProvider, string> = {
  kakao: '카카오',
  google: 'Google',
};

export const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
