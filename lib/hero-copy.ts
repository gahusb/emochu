// 히어로 사진을 계절로 고르기 위한 최소 유틸.
//
// 🔴 2026-09-04. 여기 있던 카피 생성기(getHeroCopy·HERO_DIFF_TAGLINE·HERO_VALUE_LINE)와
//    주말 라벨(getWeekendLabel)은 지웠다. 홈 히어로가 새로 쓰이면서 사용처가 0이 됐고,
//    주말 라벨은 **로컬 시간대**로 계산해 Vercel(UTC)과 브라우저(KST)가 다른 날짜를
//    그리는 문제가 있었다. 대체재는 lib/weekend-summary.ts 의 weekendDateLabel —
//    KST 고정 계산인 getWeekendElements 를 그대로 쓴다.

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export function getSeason(date: Date = new Date()): Season {
  const m = date.getMonth() + 1; // 1~12
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}
