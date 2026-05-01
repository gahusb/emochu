import type { Feeling } from './weekend-types';

export type Element5 = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

// 천간(天干): (year - 4) % 10 → index → 5행
const STEM_ELEMENTS: Element5[] = [
  'wood',  // 甲
  'wood',  // 乙
  'fire',  // 丙
  'fire',  // 丁
  'earth', // 戊
  'earth', // 己
  'metal', // 庚
  'metal', // 辛
  'water', // 壬
  'water', // 癸
];

// 일주(日柱) 기준: 2000-01-01 = 甲 (index 0)
const REF_DATE = new Date(2000, 0, 1).getTime();

export function getYearElement(birthYear: number): Element5 {
  const idx = ((birthYear - 4) % 10 + 10) % 10;
  return STEM_ELEMENTS[idx];
}

export function getTodayElement(date: Date = new Date()): Element5 {
  const days = Math.floor((date.getTime() - REF_DATE) / 86_400_000);
  return STEM_ELEMENTS[((days % 10) + 10) % 10];
}

// 5행 상생(生): 木→火→土→金→水→木
const GENERATES: Record<Element5, Element5> = {
  wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
};
// 5행 상극(克): 木克土, 土克水, 水克火, 火克金, 金克木
const CONTROLS: Record<Element5, Element5> = {
  wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
};

export type Relation = 'same' | 'generates' | 'generated' | 'controls' | 'controlled';

export function getRelation(birth: Element5, today: Element5): Relation {
  if (birth === today) return 'same';
  if (GENERATES[birth] === today) return 'generates';
  if (GENERATES[today] === birth) return 'generated';
  if (CONTROLS[birth] === today) return 'controls';
  return 'controlled';
}

export const ELEMENT_META: Record<Element5, { name: string; emoji: string; color: string }> = {
  wood:  { name: '木 (목)', emoji: '🌿', color: 'text-green-600 bg-green-50 border-green-200' },
  fire:  { name: '火 (화)', emoji: '🔥', color: 'text-red-500 bg-red-50 border-red-200' },
  earth: { name: '土 (토)', emoji: '🌏', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  metal: { name: '金 (금)', emoji: '✨', color: 'text-slate-500 bg-slate-50 border-slate-200' },
  water: { name: '水 (수)', emoji: '💧', color: 'text-blue-500 bg-blue-50 border-blue-200' },
};

export interface SajuResult {
  birthElement: Element5;
  todayElement: Element5;
  relation: Relation;
  feeling: Feeling;
  headline: string;   // "木이 火를 만나는 날"
  message: string;    // 설명 2~3문장
}

// (birth, relation) → feeling
const FEELING_MAP: Record<Element5, Record<Relation, Feeling>> = {
  wood:  { same: 'healing',   generates: 'excited',  generated: 'healing',  controls: 'adventurous', controlled: 'romantic'  },
  fire:  { same: 'excited',   generates: 'foodie',   generated: 'excited',  controls: 'romantic',    controlled: 'healing'   },
  earth: { same: 'foodie',    generates: 'romantic',  generated: 'foodie',   controls: 'healing',     controlled: 'excited'   },
  metal: { same: 'romantic',  generates: 'healing',  generated: 'romantic', controls: 'excited',     controlled: 'foodie'    },
  water: { same: 'healing',   generates: 'romantic',  generated: 'tired',    controls: 'foodie',      controlled: 'adventurous'},
};

const MESSAGES: Record<Element5, Record<Relation, { headline: string; message: string }>> = {
  wood: {
    same:       { headline: '木 기운이 넘치는 날', message: '자연과 하나되는 에너지가 가득해요. 초록빛 풍경 속에서 마음을 비우는 코스가 딱 맞아요.' },
    generates:  { headline: '木이 火를 살리는 날', message: '당신의 木 기운이 오늘의 火를 북돋우는 힘 있는 날이에요. 활기차고 에너지 넘치는 코스로 그 열정을 발산해보세요!' },
    generated:  { headline: '水가 木을 키우는 날', message: '오늘은 水 기운이 당신의 木을 풍성하게 채워주는 날이에요. 자연 속에서 깊이 숨 쉬며 에너지를 충전하세요.' },
    controls:   { headline: '木이 土를 다스리는 날', message: '당신의 木 기운이 오늘을 이끄는 주도적인 날이에요. 새로운 곳을 탐험하는 이색 체험 코스가 잘 맞아요.' },
    controlled: { headline: '金이 木을 만나는 날', message: '오늘은 차분히 흐름에 맡기는 게 좋은 날이에요. 감성적이고 세련된 공간에서 여유로운 시간을 보내세요.' },
  },
  fire: {
    same:       { headline: '火 기운이 활활 타는 날', message: '열정과 에너지가 최고조인 날이에요. 활동적이고 신나는 체험으로 그 기운을 마음껏 발산해보세요!' },
    generates:  { headline: '火가 土를 따뜻하게 하는 날', message: '당신의 火 기운이 오늘의 풍요로움을 만들어내는 날이에요. 맛있는 음식과 함께하는 식도락 코스로 오감을 만족시켜 보세요.' },
    generated:  { headline: '木이 火를 더 빛나게 하는 날', message: '오늘은 당신의 火 기운이 더욱 빛나는 날이에요. 활동적이고 특별한 경험으로 에너지를 발산하세요!' },
    controls:   { headline: '火가 金을 녹이는 날', message: '당신의 화끈한 기운이 빛을 발하는 날이에요. 분위기 있고 세련된 공간에서 특별한 순간을 만들어보세요.' },
    controlled: { headline: '水가 火를 만나는 날', message: '오늘은 에너지를 조금 아끼고 자연 속에서 힐링하는 게 좋은 날이에요. 천천히 걷고 쉬어가는 코스를 추천해요.' },
  },
  earth: {
    same:       { headline: '土 기운이 가득한 날', message: '안정적이고 풍요로운 에너지가 흐르는 날이에요. 맛있는 음식과 따뜻한 공간에서 행복을 느껴보세요.' },
    generates:  { headline: '土가 金을 빛나게 하는 날', message: '당신의 土 기운이 오늘의 세련됨을 더해주는 날이에요. 감성적이고 분위기 있는 공간이 잘 어울려요.' },
    generated:  { headline: '火가 土를 풍성하게 하는 날', message: '오늘은 특별히 풍요로운 에너지가 넘치는 날이에요. 현지 맛집을 탐방하며 오감을 만족시켜 보세요!' },
    controls:   { headline: '土가 水를 다스리는 날', message: '당신의 土 기운이 안정감을 주는 날이에요. 몸과 마음을 채우는 자연 속 힐링 코스를 추천해요.' },
    controlled: { headline: '木이 土를 만나는 날', message: '오늘은 차분히 일상에서 벗어나 새로운 자극을 찾는 게 좋은 날이에요. 이색 체험으로 활력을 불어넣어 보세요.' },
  },
  metal: {
    same:       { headline: '金 기운이 빛나는 날', message: '세련되고 예리한 감각이 살아나는 날이에요. 감성적이고 특별한 분위기의 공간에서 로맨틱한 시간을 보내세요.' },
    generates:  { headline: '金이 水를 만드는 날', message: '당신의 金 기운이 감성을 흘러넘치게 하는 날이에요. 여유롭게 걷고 쉬는 힐링 코스로 내면을 채워보세요.' },
    generated:  { headline: '土가 金을 빛내주는 날', message: '오늘은 당신의 金 기운이 더욱 빛나는 특별한 날이에요. 세련되고 분위기 있는 곳에서 로맨틱한 하루를 보내보세요.' },
    controls:   { headline: '金이 木을 다스리는 날', message: '당신의 金 기운이 날카롭게 빛나는 날이에요. 활기찬 공간에서 새로운 에너지를 발산해보세요.' },
    controlled: { headline: '火가 金을 만나는 날', message: '오늘은 맛있는 것을 먹으며 에너지를 충전하는 게 좋아요. 현지 맛집과 디저트로 기분 전환해보세요.' },
  },
  water: {
    same:       { headline: '水 기운이 흐르는 날', message: '감수성이 풍부하고 여유로운 에너지가 흐르는 날이에요. 천천히 걷고 쉬며 내면의 목소리에 귀 기울여보세요.' },
    generates:  { headline: '水가 木을 키우는 날', message: '당신의 水 기운이 새로운 성장을 만들어내는 날이에요. 자연 속에서 여유롭게 힐링하는 코스를 추천해요.' },
    generated:  { headline: '金이 水를 풍성하게 하는 날', message: '오늘은 감성이 더욱 풍부해지는 특별한 날이에요. 분위기 있는 공간에서 로맨틱한 시간을 보내보세요.' },
    controls:   { headline: '水가 火를 만나는 날', message: '당신의 水 기운이 오늘을 차분하게 이끄는 날이에요. 맛집 탐방으로 오감을 자극하며 즐거운 하루를 만들어보세요.' },
    controlled: { headline: '土가 水를 만나는 날', message: '오늘은 평소와 다른 이색 체험으로 새로운 자극을 찾는 게 좋아요. 도전적인 코스로 활력을 되찾아보세요!' },
  },
};

export function calcSaju(birthYear: number, today: Date = new Date()): SajuResult {
  const birthElement = getYearElement(birthYear);
  const todayElement = getTodayElement(today);
  const relation = getRelation(birthElement, todayElement);
  const feeling = FEELING_MAP[birthElement][relation];
  const { headline, message } = MESSAGES[birthElement][relation];

  return { birthElement, todayElement, relation, feeling, headline, message };
}
