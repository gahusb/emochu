// 서버사이드 사이트 베이스 URL 단일 출처.
// 후행 슬래시는 제거해 `new URL()`·문자열 연결에서 이중 슬래시를 방지한다.
//
// 🔴 2026-08-31 실측으로 우선순위를 고쳤다.
//    예전엔 VERCEL_URL(배포별 호스트, 예: emochu-kp9e00418-….vercel.app)로 떨어졌는데,
//    Deployment Protection 이 켜져 있으면 그 주소는 외부에 **302** 를 준다.
//    실제로 라이브 코스 페이지의 og:image 가 그 주소로 나가 크롤러가 못 가져왔고,
//    같은 주소로 fetch 하는 generateMetadata 도 실패해 **og:title 이 코스 제목이 아니라
//    사이트 기본값**으로 나갔다. 두 증상이 한 뿌리였다.
//
//    Vercel 문서도 못박는다 —
//      VERCEL_URL: "cannot be used in conjunction with Standard Deployment Protection"
//      VERCEL_PROJECT_PRODUCTION_URL: "always set, even in preview deployments.
//        This is useful to reliably generate links that point to production such as OG-image URLs."
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  // 표준 프로덕션 도메인. 프리뷰 배포에서도 항상 채워진다.
  const canonical = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (canonical) return `https://${canonical}`.replace(/\/+$/, '');

  // 마지막 수단. 보호 설정에 따라 외부에서 못 열 수 있다는 걸 알고 쓴다.
  const deployment = process.env.VERCEL_URL;
  if (deployment) return `https://${deployment}`.replace(/\/+$/, '');

  return 'https://emochu.vercel.app';
}
