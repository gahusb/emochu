// 서버사이드 사이트 베이스 URL 단일 출처.
// 우선순위: NEXT_PUBLIC_SITE_URL > VERCEL_URL(프리뷰/배포 자동 주입) > 기본 도메인.
// 후행 슬래시는 제거해 `new URL()`·문자열 연결에서 이중 슬래시를 방지한다.
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://emochu.vercel.app');
  return raw.replace(/\/+$/, '');
}
