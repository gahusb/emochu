// 코스 편집 토큰의 브라우저 쪽 보관.
//
// 로그인이 없는 동안 「이 코스를 내가 만들었다」의 유일한 증거다.
// 🔴 그래서 이 값이 사라지면 편집도 사라진다 — 시크릿창을 닫거나 기기를 바꾸면 끝이다.
//    그 한계를 없애려면 로그인이 필요하고, 그건 별도 작업이다.

const PREFIX = 'emochu.edit_token.';

export function saveEditToken(slug: string, token: string): void {
  try {
    localStorage.setItem(PREFIX + slug, token);
  } catch {
    /* 저장소가 막혀 있으면 편집만 못 할 뿐, 코스는 그대로 쓸 수 있다 */
  }
}

export function getEditToken(slug: string): string | null {
  try {
    return localStorage.getItem(PREFIX + slug);
  } catch {
    return null;
  }
}
