// 「랜덤」 선택지의 실제 뽑기.
//
// 🔑 뽑은 결과를 **사용자에게 보여준다.** 블랙박스로 두면 "랜덤"이 아니라
//    "내가 뭘 고른 건지 모르겠는 버튼"이 된다 — 그건 지금 고치려는 문제 그 자체다.
//    화면은 "제주가 뽑혔어요" 라고 말하고 다시 뽑을 기회를 준다.
//
// rng 를 주입받는 이유: Math.random 을 직접 부르면 "정말 균등한가 · 다시 뽑으면
// 반드시 다른 게 나오는가"를 테스트로 확정할 수 없다.

export type Rng = () => number;

/** 균등 추출. 빈 배열은 애초에 넘기지 않는다(옵션 상수는 컴파일 타임에 정해져 있다). */
export function pickRandom<T>(items: readonly T[], rng: Rng = Math.random): T {
  if (items.length === 0) throw new Error('pickRandom: 빈 목록에서는 뽑을 수 없어요');
  const idx = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[idx];
}

/**
 * 「다시 뽑기」용. 지금 뽑혀 있는 것을 뺀 나머지에서 고른다.
 *
 * 🔴 같은 게 또 나오면 사용자는 버튼이 고장 났다고 생각한다. 확률적으로는
 *    정상이지만, 이 버튼의 목적은 무작위성 시연이 아니라 **다른 후보 보기**다.
 *    후보가 하나뿐이면 어쩔 수 없이 그것을 돌려준다.
 */
export function pickRandomExcept<T>(
  items: readonly T[],
  current: T | null,
  rng: Rng = Math.random,
  isSame: (a: T, b: T) => boolean = (a, b) => a === b,
): T {
  if (current === null) return pickRandom(items, rng);
  const rest = items.filter((it) => !isSame(it, current));
  if (rest.length === 0) return current;
  return pickRandom(rest, rng);
}

/** Fisher–Yates. 원본을 건드리지 않는다. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
