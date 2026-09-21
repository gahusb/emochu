// TourAPI 분류 코드 → 카드 배지(라벨·색·이모지).
//
// 🔴 2026-09-21 제출 후 배포본에서 홈 추천 카드 4장(세종문화회관·교보문고·신문박물관·
//    이화여고100주년기념관)이 **전부 「공연」** 으로 떴다. 원인은 중분류 `A0206` 을
//    통째로 「공연」으로 매핑한 것이다. `A0206` 은 **「문화시설」** 이고(근거:
//    `docs/weekend-app-design.md:526` → `cats: ['A02', 'A0206'], // 인문관광, 문화시설`),
//    공연장은 그 아래 **소분류 하나**(`A02060600`)일 뿐이다.
//    → 박물관·도서관·미술관·기념관이 전부 「공연」이 되고 있었다.
//
// 그래서 두 가지를 한다.
//  1) 중분류 라벨을 공사 분류 이름에 맞춘다(A0202 휴양 · A0205 건축물 · A0206 문화시설 · A0208 공연·행사).
//  2) **소분류(cat3)가 있으면 그걸 먼저 쓴다** — 「문화시설」보다 「박물관」이 정확하다.
//
// 🔑 이 표는 **화면 라벨 전용**이다. 점수는 `lib/weekend-ai.ts` 의 `boostCat3` 가
//    cat3 코드를 직접 읽으므로 여기를 고쳐도 스코어링은 변하지 않는다.
//    (SpotCard 는 이 모듈만 읽고, 이 모듈은 어떤 점수 함수도 부르지 않는다.)

export type BadgeVariant = 'brand' | 'mocha' | 'success' | 'warning' | 'outline';

export interface SpotCategoryMeta {
  label: string;
  variant: BadgeVariant;
  gradient: string;
  emoji: string;
}

/** 중분류(cat2). 이름은 한국관광공사 분류 체계를 따른다. */
const CAT2_META: Record<string, SpotCategoryMeta> = {
  A0101: { label: '자연',       variant: 'success', gradient: 'from-green-800 via-emerald-700 to-green-500',    emoji: '🌿' },
  A0102: { label: '관광지',     variant: 'success', gradient: 'from-sky-800 via-blue-700 to-cyan-500',          emoji: '🏞️' },
  A0201: { label: '역사',       variant: 'mocha',   gradient: 'from-stone-800 via-amber-800 to-amber-600',      emoji: '🏛️' },
  // A0202 는 휴양관광지다(공원·테마공원·온천·유람선). 「체험」은 A0203 쪽이다.
  A0202: { label: '휴양',       variant: 'mocha',   gradient: 'from-teal-800 via-emerald-700 to-teal-500',      emoji: '🌳' },
  A0203: { label: '체험',       variant: 'mocha',   gradient: 'from-violet-800 via-purple-700 to-indigo-500',   emoji: '🎨' },
  A0204: { label: '산업',       variant: 'mocha',   gradient: 'from-slate-700 via-zinc-600 to-slate-500',       emoji: '🏭' },
  // A0205 는 건축/조형물이다(전망대·다리·기념탑·유명건물).
  A0205: { label: '건축물',     variant: 'mocha',   gradient: 'from-slate-800 via-stone-700 to-amber-600',      emoji: '🗼' },
  // 🔴 A0206 = 문화시설. 「공연」이 아니다.
  A0206: { label: '문화시설',   variant: 'mocha',   gradient: 'from-rose-800 via-pink-700 to-rose-500',         emoji: '🖼️' },
  A0207: { label: '축제',       variant: 'brand',   gradient: 'from-orange-700 via-amber-600 to-yellow-500',    emoji: '🎉' },
  // 진짜 공연은 여기다(연극·뮤지컬·콘서트·전시회).
  A0208: { label: '공연·행사',  variant: 'brand',   gradient: 'from-orange-700 via-amber-600 to-yellow-500',    emoji: '🎪' },
  A0301: { label: '레포츠',     variant: 'brand',   gradient: 'from-teal-700 via-cyan-600 to-sky-500',          emoji: '🏄' },
  A0302: { label: '수상레포츠', variant: 'brand',   gradient: 'from-blue-700 via-sky-600 to-cyan-400',          emoji: '🚣' },
  A0303: { label: '항공레포츠', variant: 'brand',   gradient: 'from-indigo-700 via-blue-600 to-sky-400',        emoji: '🪂' },
  A0304: { label: '레포츠',     variant: 'brand',   gradient: 'from-teal-700 via-cyan-600 to-sky-500',          emoji: '⛺' },
  A0401: { label: '쇼핑',       variant: 'mocha',   gradient: 'from-pink-700 via-rose-600 to-fuchsia-500',      emoji: '🛍️' },
  A0502: { label: '맛집',       variant: 'warning', gradient: 'from-orange-700 via-amber-600 to-yellow-400',    emoji: '🍽️' },
};

/**
 * 소분류(cat3) 라벨. **확실한 코드만** 적는다 — 모르는 코드는 중분류 라벨로 떨어지는 게
 * 틀린 이름을 붙이는 것보다 낫다. 코드는 `lib/weekend-ai.ts` 의 metal boostCat3 주석과
 * 같은 근거(categoryCode2 실호출 덤프)를 쓴다.
 */
const CAT3_LABELS: Record<string, string> = {
  A02060100: '박물관',
  A02060200: '기념관',
  A02060300: '전시관',
  A02060500: '미술관',
  A02060600: '공연장',
  A02060900: '도서관',
  A02061000: '서점',
  A02061100: '문화전수시설',
  A02061200: '영화관',
};

export const DEFAULT_SPOT_CATEGORY_META: SpotCategoryMeta = {
  label: '관광',
  variant: 'outline',
  gradient: 'from-stone-700 via-warm-gray-600 to-stone-500',
  emoji: '📍',
};

/**
 * 배지 메타. 소분류가 있으면 라벨만 소분류로 바꾸고 색·이모지는 중분류를 따른다
 * — 같은 문화시설끼리 카드 색이 제각각이면 목록이 시끄러워진다.
 */
export function getSpotCategoryMeta(cat2: string, cat3?: string): SpotCategoryMeta {
  const base = CAT2_META[cat2] ?? DEFAULT_SPOT_CATEGORY_META;
  const fine = cat3 ? CAT3_LABELS[cat3] : undefined;
  return fine ? { ...base, label: fine } : base;
}
