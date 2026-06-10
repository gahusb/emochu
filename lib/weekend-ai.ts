// ============================================================
// 이모추! AI 코스 생성 엔진 (Gemini)
// 설계서: docs/weekend-ai-engine-design.md
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  CourseData,
  CourseStop,
  Duration,
  Companion,
  Preference,
  Feeling,
  WeekendWeather,
} from './weekend-types';

// ─── 타입 ───

export interface CompanionFacilities {
  babyCarriage?: boolean;   // 유모차 대여
  pet?: boolean;            // 반려동물 동반 가능
  kidsFacility?: boolean;   // 키즈시설
  parking?: boolean;        // 주차 가능
  restroom?: boolean;       // 화장실
}

export interface ScoredSpot {
  contentId: string;
  contentTypeId: number;
  title: string;
  addr1: string;
  cat1: string;
  cat2: string;
  cat3: string;
  latitude: number;
  longitude: number;
  firstImage?: string;
  overview?: string;
  distanceKm: number;
  score: number;
  facilities?: CompanionFacilities;   // detailIntro에서 조회한 편의시설 정보
  usetime?: string;                   // 운영시간 (detailIntro에서 조회)
}

export interface FestivalCandidate {
  contentId: string;
  title: string;
  addr1: string;
  latitude: number;
  longitude: number;
  eventStartDate: string;
  eventEndDate: string;
  aiSummary?: string;
}

export interface StayCandidate {
  contentId: string;
  title: string;
  addr1: string;
  latitude: number;
  longitude: number;
  firstImage?: string;
  tel?: string;
}

export interface CourseGenerationInput {
  departure: { name: string; lat: number; lng: number };
  duration: Duration;
  companion: Companion;
  preferences: Preference[];
  feeling?: Feeling;
  candidates: ScoredSpot[];
  festivals: FestivalCandidate[];
  stays: StayCandidate[];     // 숙박 후보 (overnight일 때만 사용)
  weather: WeekendWeather;
}

// ─── 상수 ───

const MODELS = [
  { id: 'gemini-2.5-flash',      maxTokens: 8192, temp: 0.7 },
  { id: 'gemini-2.5-flash-lite', maxTokens: 8192, temp: 0.7 },
  { id: 'gemini-2.0-flash',      maxTokens: 8192, temp: 0.7 },
] as const;

const DURATION_DETAIL: Record<Duration, string> = {
  half_day: '반나절 (3~4시간). 장소 3~4개. 오전 10시 시작. 점심 1회 필수.',
  full_day: '하루 (6~8시간). 장소 5~7개. 오전 9시 시작. 점심+카페+저녁 필수.',
  leisurely: '느긋하게 (5~6시간). 장소 4~5개. 오전 10시 시작. 점심+카페 필수.',
  overnight: '1박 2일. 장소 7~10개. 1일차 오전 9시 시작, 숙박 후 2일차 오전 10시 시작. 점심2회+카페2회+저녁1회+숙박1곳 필수.',
};

const COMPANION_DETAIL: Record<Companion, string> = {
  solo: '혼자. 웨이팅 부담 없고 조용히 즐기기 좋은 곳 선호.',
  couple: '연인. 분위기 있고 사진 찍기 좋은 곳. 저녁 야경도 좋음.',
  family: '가족+어린이. 아이 편의시설 중요. 이동거리 최소화. 체험형 우선.',
  friends: '친구들. 맛집 필수. 활동적이고 재미있는 코스.',
};

const PREFERENCE_KOREAN: Record<Preference, string> = {
  nature: '자연·산책',
  food: '맛집투어',
  culture: '전시·문화',
  cafe: '카페감성',
  activity: '액티비티',
  photo: '사진명소',
};

const FEELING_DETAIL: Record<Feeling, string> = {
  tired: '피곤하고 지쳐서 쉬고 싶은 상태. 조용하고 편안한 장소, 카페에서 여유롭게 쉬기, 자극 적은 코스 선호.',
  excited: '에너지 넘치고 활동적인 상태. 액티비티, 체험, 놀이, 모험적인 코스 선호.',
  romantic: '로맨틱한 분위기를 원하는 상태. 예쁜 카페, 야경, 전망 좋은 곳, 분위기 있는 레스토랑 선호.',
  healing: '힐링이 필요한 상태. 자연, 숲, 바다, 산책, 명상, 조용한 자연 속 코스 선호.',
  adventurous: '새로운 경험을 원하는 상태. 이색 체험, 특별한 활동, 평소 안 가는 곳 선호.',
  foodie: '맛있는 음식을 찾아가고 싶은 상태. 현지 맛집, 시장, 디저트 카페, 먹방 코스 선호.',
};

const SEASON_NAME: Record<number, string> = {
  1: '한겨울', 2: '늦겨울', 3: '초봄', 4: '봄',
  5: '늦봄', 6: '초여름', 7: '한여름', 8: '한여름',
  9: '초가을', 10: '가을', 11: '늦가을', 12: '초겨울',
};

// ─── 시스템 프롬프트 ───

const SYSTEM_INSTRUCTION = `당신은 대한민국 최고의 여행 매거진 편집장이자 AI 코스 플래너입니다.
단순한 장소 나열이 아닌, 읽는 사람이 "당장 짐 싸고 싶어지는" 여행 코스를 설계하는 것이 목표입니다.

## 핵심 원칙

### 마케팅 글쓰기 원칙 (최우선)
- 모든 장소 설명은 "왜 지금, 이 사람이, 이 장소에 가야 하는가"를 설득해야 합니다
- hook: 인스타그램 캡션처럼 짧고 강렬하게 (15자 이내, 예: "서울 숨은 뷰맛집", "현지인만 아는 골목")
- whyNow: 이 계절·날씨·시점에 특별히 가야 하는 구체적 이유 (예: "5월에만 피는 장미 정원이 절정이에요")
- description: 친구가 카톡으로 강력 추천하는 것처럼 — 실제 체험을 묘사하고 감각적 디테일 포함 (3~4문장)
- storyArc: 코스 전체를 하나의 이야기로 — "아침의 설렘 → 점심의 만족 → 저녁의 여운"을 담은 편집장 추천사 (3~5문장, 독자를 설득하는 어조)

### 필수 규칙
- 제공된 후보 목록 중에서만 선택. 없는 장소를 창작하지 마세요.
- 레포츠·등산·자전거 등 체력 소모 활동은 feeling이 adventurous/excited일 때만 포함
- 각 장소에 대해 "지금 왜 좋은지"를 구체적으로 설명합니다

## ★ 코스 구성 필수 규칙

### 카테고리 밸런스 — 한 종류만 나열 금지!
코스는 반드시 다양한 종류의 장소를 조합해야 합니다.
같은 종류(관광지만, 산만, 음식점만)를 연속 배치하면 안 됩니다.

**반나절 코스 (3~4곳):** 관광지/명소 1~2곳 + 맛집 1곳 + 카페/디저트 1곳
**하루 코스 (5~7곳):** 관광지/명소 2~3곳 + 점심(11:30~13:00) + 카페(14:00~15:30) + 저녁(17:30~19:00) [+ 선택: 마무리]
**느긋한 코스 (4~5곳):** 관광지/명소 2곳 + 점심 + 카페 [+ 선택: 마무리]
**1박 2일 (7~10곳):** [1일차] 관광 2~3 + 점심 + 카페 + 저녁 + 숙박(isStay:true, timeStart:"20:00") / [2일차] 아침 or 관광 + 관광 1~2 + 점심 + 카페

### 시간표 규칙
- 운영시간 반영 필수: 후보 목록의 "운영:" 정보 안에 방문 배치
- 이동시간 반영: 10km≈20분, 20km≈35분, 30km≈45분
- 식사 시간대: 점심 11:30~13:00, 카페 14:00~15:30, 저녁 17:30~19:00
- 체류: 관광지 60~120분, 식사 60~90분, 카페 40~60분

### 동선 최적화
- 출발 위치에서 가까운 곳부터 시작
- 장소 간 이동 자동차 40분(20km) 초과 금지
- 같은 방향 장소끼리 묶어 왕복 최소화

### 동반자별 배려
- solo: 혼자 편한 곳, 웨이팅 적은 곳, 감성적 공간 우선
- couple: 분위기 있는 곳, 사진 찍기 좋은 곳, 야경, 분위기 레스토랑
- family: [유모차O], [키즈시설O] 태그 최우선. 이동거리 최소화. 체험형 우선.
- friends: 맛집 필수, 인생사진 포인트, 활기찬 동네

### 감정/컨디션 반영 (매우 중요!)
- tired: 이동 최소화, 조용하고 편안한 장소, 카페 비중 높이기
- excited: 활동적, 체험형, 이동거리 OK
- romantic: 야경, 분위기 레스토랑, 예쁜 카페
- healing: 자연, 숲, 바다, 느린 템포
- adventurous: 이색 체험, 특별한 활동, 평소 안 가는 곳
- foodie: 맛집·시장·디저트 비중 극대화, 식도락 코스

### 편의시설 태그 활용
[유모차O], [반려동물O], [키즈시설O], [주차O] 태그가 있는 장소를 family 코스에서 최우선 선택.

### 날씨 대응
- 비(강수확률 50%+): 실내 위주 (미술관, 박물관, 실내 시장)
- 맑음: 야외 적극 포함

## 출력
반드시 아래 JSON 구조로만 응답하세요. JSON 외 텍스트는 절대 포함하지 마세요.

\`\`\`
{
  "title": "코스 제목 (감성적이고 구체적으로. 예: '성수동 골목 감성 반나절, 커피 한 잔의 여유')",
  "summary": "코스 한 줄 요약 — 이 코스의 핵심 매력을 한 문장으로 (예: '도심 속 숨은 카페 골목부터 강변 산책까지, 서울의 조용한 오후')",
  "storyArc": "이 코스를 선택한 이유와 하루의 흐름을 편집장이 독자에게 추천하듯 3~5문장으로. 왜 이 조합인지, 어떤 감정의 흐름이 있는지 설득하세요.",
  "totalDistanceKm": 숫자,
  "estimatedCostWon": 숫자 (1인 기준 입장료+식사+카페 합산, 무료면 0),
  "difficulty": "easy|moderate|active",
  "tip": "전체 코스 실용 꿀팁 한 줄 (주차, 웨이팅, 필수 예약 등)",
  "stops": [
    {
      "order": 1,
      "contentId": "후보 목록의 contentId 그대로",
      "title": "장소명",
      "hook": "15자 이내 강렬한 후크 카피 (예: '노을 명당', '줄 서서 먹는 현지 맛집')",
      "whyNow": "지금 이 계절/날씨/시점에 특별히 가야 하는 이유 1문장",
      "timeStart": "HH:MM",
      "durationMin": 숫자,
      "description": "친구가 강력 추천하듯 감각적이고 구체적으로 3~4문장. 어떤 경험을 할 수 있는지, 어떤 감정이 드는지 묘사하세요.",
      "tip": "실용적 꿀팁 1문장 (메뉴 추천, 포토존, 주차, 웨이팅 팁 등)",
      "latitude": 숫자,
      "longitude": 숫자,
      "imageUrl": "이미지 URL 또는 빈 문자열",
      "isFestival": boolean,
      "isStay": boolean,
      "day": 숫자 (1박2일일 때만, 당일은 생략),
      "contentTypeId": "문자열 (예: \"12\", \"39\", \"15\", \"32\")"
    }
  ]
}
\`\`\``;

// ─── 사전 스코어링 ───

import { PREFERENCE_CAT_MAP } from './tour-api';

const COMPANION_KEYWORDS: Record<Companion, { preferred: string[]; avoided: string[] }> = {
  solo: {
    preferred: ['카페', '미술관', '서점', '공원', '산책', '도서관'],
    avoided: ['놀이공원', '키즈', '워터파크'],
  },
  couple: {
    preferred: ['카페', '야경', '전시', '산책로', '포토존', '레스토랑', '데이트'],
    avoided: ['키즈', '아동', '체험학습'],
  },
  family: {
    preferred: ['체험', '키즈', '공원', '동물원', '놀이', '무장애', '어린이'],
    avoided: ['바', '클럽', '주점'],
  },
  friends: {
    preferred: ['맛집', '액티비티', '이색체험', '카페', '전시', '펍'],
    avoided: [],
  },
};

const SEASON_KEYWORDS: Record<number, string[]> = {
  1: ['눈', '겨울', '온천', '스키', '빙어'], 2: ['매화', '설경', '온천'],
  3: ['벚꽃', '매화', '봄꽃', '개나리', '유채'], 4: ['벚꽃', '튤립', '봄', '꽃축제', '철쭉'],
  5: ['장미', '수국', '초여름'], 6: ['수국', '계곡', '바다'],
  7: ['계곡', '바다', '워터', '물놀이'], 8: ['계곡', '바다', '피서'],
  9: ['코스모스', '억새', '가을'], 10: ['단풍', '억새', '은행'],
  11: ['단풍', '낙엽', '국화'], 12: ['눈', '겨울', '온천', '스키'],
};

// 감정 → 선호 카테고리·키워드 매핑
const FEELING_PREFERENCE_MAP: Record<Feeling, {
  boostContentTypes: number[];
  boostKeywords: string[];
  boostRoles: SpotRole[];
}> = {
  tired: {
    boostContentTypes: [14, 39],
    boostKeywords: ['카페', '온천', '스파', '힐링', '휴식', '공원', '산책', '조용'],
    boostRoles: ['cafe', 'culture'],
  },
  excited: {
    boostContentTypes: [28, 12],
    boostKeywords: ['액티비티', '체험', '놀이', '어드벤처', '래프팅', '서핑', '짚라인', '놀이공원'],
    boostRoles: ['activity', 'attraction'],
  },
  romantic: {
    boostContentTypes: [12, 14],
    boostKeywords: ['야경', '전망', '포토존', '데이트', '레스토랑', '와인', '카페', '산책로', '해변'],
    boostRoles: ['attraction', 'cafe'],
  },
  healing: {
    boostContentTypes: [12],
    boostKeywords: ['자연', '숲', '계곡', '호수', '산', '바다', '해변', '공원', '힐링', '명상', '템플'],
    boostRoles: ['attraction'],
  },
  adventurous: {
    boostContentTypes: [28, 14],
    boostKeywords: ['체험', '이색', '특별', 'VR', '탈출', '서핑', '다이빙', '패러글라이딩'],
    boostRoles: ['activity', 'culture'],
  },
  foodie: {
    boostContentTypes: [39],
    boostKeywords: ['맛집', '한식', '해물', '고기', '시장', '먹거리', '디저트', '빵', '카페'],
    boostRoles: ['restaurant', 'cafe'],
  },
};

function feelingScore(spot: ScoredSpot, feeling?: Feeling): number {
  if (!feeling) return 0;
  const mapping = FEELING_PREFERENCE_MAP[feeling];
  if (!mapping) return 0;

  let score = 0;
  // 콘텐츠 타입 매칭
  if (mapping.boostContentTypes.includes(spot.contentTypeId)) score += 5;
  // 키워드 매칭
  const text = `${spot.title} ${spot.cat2} ${spot.cat3 ?? ''} ${spot.overview ?? ''}`.toLowerCase();
  if (mapping.boostKeywords.some(kw => text.includes(kw))) score += 5;
  // 역할 매칭
  const role = classifySpotRole(spot);
  if (mapping.boostRoles.includes(role)) score += 3;

  return score;
}

function preferenceScore(spot: ScoredSpot, preferences: Preference[]): number {
  let maxMatch = 0;
  for (const pref of preferences) {
    const mapping = PREFERENCE_CAT_MAP[pref];
    if (!mapping) continue;
    if (mapping.contentTypeIds.includes(spot.contentTypeId)) maxMatch = Math.max(maxMatch, 0.6);
    if (mapping.cat1?.includes(spot.cat1)) maxMatch = Math.max(maxMatch, 0.8);
    if (mapping.cat2?.includes(spot.cat2)) maxMatch = Math.max(maxMatch, 1.0);
  }
  return maxMatch;
}

function companionScore(spot: ScoredSpot, companion: Companion): number {
  const { preferred, avoided } = COMPANION_KEYWORDS[companion];
  const text = `${spot.title} ${spot.cat2} ${spot.cat3 ?? ''} ${spot.overview ?? ''}`.toLowerCase();

  let score = 0.5;
  if (preferred.some(kw => text.includes(kw))) score = 0.7;
  if (avoided.some(kw => text.includes(kw))) score = 0.2;
  return score;
}

function weatherScore(spot: ScoredSpot, weather: WeekendWeather): number {
  const isOutdoor = ['A01', 'A03'].includes(spot.cat1);
  const isIndoor = ['A02', 'A05'].includes(spot.cat1);
  const rainy = weather.saturday.pop > 50;

  if (rainy && isOutdoor) return 0.2;
  if (rainy && isIndoor) return 0.9;
  if (!rainy && isOutdoor) return 0.9;
  return 0.6;
}

function distanceScore(distanceKm: number, duration: Duration): number {
  // 도시/분위기 선택 시 원거리 후보도 포함되므로 거리 제한 넉넉히
  const maxKm: Record<Duration, number> = { half_day: 40, full_day: 80, leisurely: 60, overnight: 120 };
  const max = maxKm[duration];
  if (distanceKm > max) return 0.1; // 완전 제외하지 않고 낮은 점수
  return 1 - (distanceKm / max) * 0.8; // 거리가 멀어도 기본 0.2 보장
}

function seasonBonus(spot: ScoredSpot, month: number): number {
  const text = `${spot.title} ${spot.overview ?? ''}`.toLowerCase();
  const keywords = SEASON_KEYWORDS[month] ?? [];
  return keywords.some(kw => text.includes(kw)) ? 0.3 : 0;
}

// 콘텐츠타입ID → 역할 분류
type SpotRole = 'attraction' | 'restaurant' | 'cafe' | 'activity' | 'culture';

function classifySpotRole(spot: ScoredSpot): SpotRole {
  // 39=음식점
  if (spot.contentTypeId === 39) {
    // 카페/디저트 구분: cat2 A0502=카페 or 제목에 카페/커피 포함
    const text = `${spot.title} ${spot.cat2} ${spot.cat3 ?? ''}`.toLowerCase();
    if (spot.cat2 === 'A0502' || text.includes('카페') || text.includes('커피') || text.includes('디저트') || text.includes('베이커리')) {
      return 'cafe';
    }
    return 'restaurant';
  }
  // 14=문화시설
  if (spot.contentTypeId === 14) return 'culture';
  // 28=레포츠
  if (spot.contentTypeId === 28) return 'activity';
  // 12=관광지, 기타
  return 'attraction';
}

// duration별 카테고리 슬롯 배분
const ROLE_SLOTS: Record<Duration, Record<SpotRole, number>> = {
  half_day: { attraction: 2, restaurant: 1, cafe: 1, activity: 1, culture: 1 },
  full_day: { attraction: 3, restaurant: 3, cafe: 2, activity: 2, culture: 2 },
  leisurely: { attraction: 2, restaurant: 2, cafe: 2, activity: 1, culture: 1 },
  overnight: { attraction: 5, restaurant: 4, cafe: 3, activity: 3, culture: 3 },
};

export function scoreAndRankCandidates(
  candidates: ScoredSpot[],
  preferences: Preference[],
  companion: Companion,
  duration: Duration,
  weather: WeekendWeather,
  feeling?: Feeling,
): ScoredSpot[] {
  const month = new Date().getMonth() + 1;

  const scored = candidates.map(spot => {
    const pScore = preferenceScore(spot, preferences) * 35;
    const cScore = companionScore(spot, companion) * 20;
    const wScore = weatherScore(spot, weather) * 15;
    const dScore = distanceScore(spot.distanceKm, duration) * 20;
    const sBonus = seasonBonus(spot, month) * 10;
    const fBonus = facilityBonus(spot, companion);
    const feelBonus = feelingScore(spot, feeling);

    return { ...spot, score: pScore + cScore + wScore + dScore + sBonus + fBonus + feelBonus };
  });

  return diversifyByRole(scored, duration, feeling);
}

function diversifyByRole(scored: ScoredSpot[], duration: Duration, feeling?: Feeling): ScoredSpot[] {
  const base = ROLE_SLOTS[duration];
  // activity(레포츠) 슬롯은 모험적/에너지 기분일 때만 포함. 그 외엔 0으로 줄여 등산·레포츠 추천을 차단
  const isActiveMode = feeling === 'adventurous' || feeling === 'excited';
  const slots: Record<SpotRole, number> = isActiveMode ? base : { ...base, activity: 0 };

  // 역할별 버킷 (점수순 정렬)
  const buckets: Record<SpotRole, ScoredSpot[]> = {
    attraction: [],
    restaurant: [],
    cafe: [],
    activity: [],
    culture: [],
  };

  for (const s of scored) {
    const role = classifySpotRole(s);
    buckets[role].push(s);
  }

  for (const role of Object.keys(buckets) as SpotRole[]) {
    buckets[role].sort((a, b) => b.score - a.score);
  }

  // 각 역할에서 슬롯 수만큼 뽑기
  const result: ScoredSpot[] = [];
  const seenIds = new Set<string>();

  for (const role of Object.keys(slots) as SpotRole[]) {
    const count = slots[role];
    for (const spot of buckets[role]) {
      if (result.filter(r => classifySpotRole(r) === role).length >= count) break;
      if (!seenIds.has(spot.contentId)) {
        seenIds.add(spot.contentId);
        result.push(spot);
      }
    }
  }

  // 슬롯이 안 채워진 역할이 있으면 다른 역할의 높은 점수 후보로 보충
  const targetTotal = Object.values(slots).reduce((a, b) => a + b, 0);
  if (result.length < targetTotal) {
    const allSorted = [...scored].sort((a, b) => b.score - a.score);
    for (const spot of allSorted) {
      if (result.length >= targetTotal) break;
      if (!seenIds.has(spot.contentId)) {
        seenIds.add(spot.contentId);
        result.push(spot);
      }
    }
  }

  return result;
}

// ─── AI 코스 생성 ───

/** 편의시설 + 운영시간 정보를 텍스트로 포맷 */
function formatFacilities(spot: ScoredSpot): string {
  const parts: string[] = [];

  // 운영시간
  if (spot.usetime) parts.push(`운영: ${spot.usetime}`);

  // 편의시설 태그
  if (spot.facilities) {
    const tags: string[] = [];
    if (spot.facilities.babyCarriage) tags.push('유모차O');
    if (spot.facilities.pet) tags.push('반려동물O');
    if (spot.facilities.kidsFacility) tags.push('키즈시설O');
    if (spot.facilities.parking) tags.push('주차O');
    if (tags.length > 0) parts.push(`[${tags.join(', ')}]`);
  }

  return parts.length > 0 ? ` | ${parts.join(' | ')}` : '';
}

function buildUserMessage(input: CourseGenerationInput): string {
  const month = new Date().getMonth() + 1;

  return `## 사용자 조건
- 출발: ${input.departure.name} (위도 ${input.departure.lat}, 경도 ${input.departure.lng})
- 시간 예산: ${DURATION_DETAIL[input.duration]}
- 동반자: ${COMPANION_DETAIL[input.companion]}
- 취향: ${input.preferences.map(p => PREFERENCE_KOREAN[p]).join(', ')}${input.feeling ? `\n- 🎭 오늘의 기분: ${FEELING_DETAIL[input.feeling]}` : ''}
- 현재: ${month}월 (${SEASON_NAME[month]})${(input.feeling !== 'adventurous' && input.feeling !== 'excited') ? '\n⚠️ 레포츠·등산·자전거 등 체력 소모 활동은 포함하지 마세요. 관광·맛집·카페·문화 중심 코스를 설계하세요.' : ''}

## 이번 주말 날씨
- 토요일: ${input.weather.saturday.summary} (강수확률 ${input.weather.saturday.pop}%)
- 일요일: ${input.weather.sunday.summary} (강수확률 ${input.weather.sunday.pop}%)
- ${input.weather.recommendation}

## 이번 주말 근처 축제
${input.festivals.length > 0
  ? input.festivals.map(f =>
      `- [축제][${f.contentId}] ${f.title} | ${f.addr1} | ~${f.eventEndDate}${f.aiSummary ? ` | ${f.aiSummary}` : ''} | 위도 ${f.latitude} 경도 ${f.longitude}`
    ).join('\n')
  : '근처 진행 중 축제 없음'}

## 후보 장소 목록 (이 목록에서만 선택하세요)

### 🏔️ 관광지·명소
${input.candidates.filter(c => classifySpotRole(c) === 'attraction').map((c, i) =>
  `${i + 1}. [${c.contentId}][타입:${c.contentTypeId}] ${c.title} | ${c.addr1} | ${c.distanceKm.toFixed(1)}km | 위도 ${c.latitude} 경도 ${c.longitude}${formatFacilities(c)}${c.overview ? ` | ${c.overview.slice(0, 80)}` : ''}`
).join('\n') || '(없음)'}

### 🍽️ 음식점·맛집
${input.candidates.filter(c => classifySpotRole(c) === 'restaurant').map((c, i) =>
  `${i + 1}. [${c.contentId}][타입:${c.contentTypeId}] ${c.title} | ${c.addr1} | ${c.distanceKm.toFixed(1)}km | 위도 ${c.latitude} 경도 ${c.longitude}${formatFacilities(c)}${c.overview ? ` | ${c.overview.slice(0, 80)}` : ''}`
).join('\n') || '(없음)'}

### ☕ 카페·디저트
${input.candidates.filter(c => classifySpotRole(c) === 'cafe').map((c, i) =>
  `${i + 1}. [${c.contentId}][타입:${c.contentTypeId}] ${c.title} | ${c.addr1} | ${c.distanceKm.toFixed(1)}km | 위도 ${c.latitude} 경도 ${c.longitude}${formatFacilities(c)}${c.overview ? ` | ${c.overview.slice(0, 80)}` : ''}`
).join('\n') || '(없음)'}

### 🎨 문화시설
${input.candidates.filter(c => classifySpotRole(c) === 'culture').map((c, i) =>
  `${i + 1}. [${c.contentId}][타입:${c.contentTypeId}] ${c.title} | ${c.addr1} | ${c.distanceKm.toFixed(1)}km | 위도 ${c.latitude} 경도 ${c.longitude}${formatFacilities(c)}${c.overview ? ` | ${c.overview.slice(0, 80)}` : ''}`
).join('\n') || '(없음)'}

### 🏄 액티비티·레포츠
${input.candidates.filter(c => classifySpotRole(c) === 'activity').map((c, i) =>
  `${i + 1}. [${c.contentId}][타입:${c.contentTypeId}] ${c.title} | ${c.addr1} | ${c.distanceKm.toFixed(1)}km | 위도 ${c.latitude} 경도 ${c.longitude}${formatFacilities(c)}${c.overview ? ` | ${c.overview.slice(0, 80)}` : ''}`
).join('\n') || '(없음)'}
${input.stays.length > 0 ? `
### 🏨 숙박시설
${input.stays.map((s, i) =>
  `${i + 1}. [${s.contentId}] ${s.title} | ${s.addr1} | 위도 ${s.latitude} 경도 ${s.longitude}${s.tel ? ` | ${s.tel}` : ''}`
).join('\n')}` : ''}

위 조건과 후보를 기반으로 최적의 코스를 JSON으로 만들어주세요.`;
}

// ─── JSON 파싱 & 검증 ───

function parseCourseJSON(raw: string): CourseData {
  let cleaned = raw.trim();

  // 코드블록 제거
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  }

  // JSON 시작/끝 찾기 (코드블록 없이 JSON만 온 경우)
  if (!cleaned.startsWith('{')) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      cleaned = cleaned.slice(start, end + 1);
    }
  }

  const parsed = JSON.parse(cleaned);
  validateCourseSchema(parsed);
  return parsed as CourseData;
}

function validateCourseSchema(data: unknown): asserts data is CourseData {
  const d = data as Record<string, unknown>;

  if (!d.title || typeof d.title !== 'string') throw new Error('title 누락 또는 타입 오류');
  if (!d.summary || typeof d.summary !== 'string') throw new Error('summary 누락');
  if (!Array.isArray(d.stops) || d.stops.length === 0) throw new Error('stops 빈 배열');

  // estimatedCostWon: optional 숫자, 음수 방지
  if (d.estimatedCostWon !== undefined) {
    const cost = Number(d.estimatedCostWon);
    d.estimatedCostWon = isNaN(cost) || cost < 0 ? undefined : cost;
  }
  // difficulty: optional 열거형
  if (d.difficulty !== undefined && !['easy', 'moderate', 'active'].includes(d.difficulty as string)) {
    d.difficulty = undefined;
  }
  // storyArc: optional 문자열 — 있으면 그대로 유지
  if (d.storyArc !== undefined && typeof d.storyArc !== 'string') {
    d.storyArc = undefined;
  }

  for (const stop of d.stops as Record<string, unknown>[]) {
    if (!stop.contentId) throw new Error(`stop: contentId 누락`);
    if (!stop.title) throw new Error(`stop: title 누락`);
    if (!stop.timeStart || typeof stop.timeStart !== 'string') throw new Error(`stop: timeStart 누락`);
    if (typeof stop.durationMin !== 'number' || stop.durationMin < 10) {
      throw new Error(`stop ${stop.title}: durationMin 부적절 (${stop.durationMin})`);
    }
    if (typeof stop.latitude !== 'number' || typeof stop.longitude !== 'number') {
      throw new Error(`stop ${stop.title}: 좌표 누락`);
    }

    // 한국 좌표 범위 검증
    if ((stop.latitude as number) < 33 || (stop.latitude as number) > 43) {
      throw new Error(`stop ${stop.title}: 위도 범위 오류 (${stop.latitude})`);
    }
    if ((stop.longitude as number) < 124 || (stop.longitude as number) > 132) {
      throw new Error(`stop ${stop.title}: 경도 범위 오류 (${stop.longitude})`);
    }

    // hook, whyNow: optional 문자열 — 있으면 그대로 유지
    if (stop.hook !== undefined && typeof stop.hook !== 'string') stop.hook = undefined;
    if (stop.whyNow !== undefined && typeof stop.whyNow !== 'string') stop.whyNow = undefined;
  }

  // 시간 순서 검증 (같은 일차 내에서만 — 1박2일 코스는 day 전환 시 리셋)
  const stops = d.stops as { timeStart: string; title: string; day?: number }[];
  for (let i = 1; i < stops.length; i++) {
    const prevDay = stops[i - 1].day ?? 1;
    const currDay = stops[i].day ?? 1;
    // 일차가 바뀌면 시간이 리셋되므로 비교 스킵
    if (currDay > prevDay) continue;
    if (stops[i].timeStart <= stops[i - 1].timeStart) {
      throw new Error(`시간 순서 역전: ${stops[i - 1].title}(${stops[i - 1].timeStart}) → ${stops[i].title}(${stops[i].timeStart})`);
    }
  }
}

function crossValidateContentIds(
  stops: CourseStop[],
  candidates: ScoredSpot[],
  festivals: FestivalCandidate[],
  stays: StayCandidate[] = [],
): void {
  const validIds = new Set([
    ...candidates.map(c => c.contentId),
    ...festivals.map(f => f.contentId),
    ...stays.map(s => s.contentId),
  ]);

  for (const stop of stops) {
    if (!validIds.has(stop.contentId)) {
      // 후보 중 제목이 가장 비슷한 것으로 교체
      const match = candidates.find(c =>
        c.title.includes(stop.title) || stop.title.includes(c.title)
      );
      if (match) {
        console.warn(`[이모추AI] contentId 교정: ${stop.contentId} → ${match.contentId} (${match.title})`);
        stop.contentId = match.contentId;
        stop.latitude = match.latitude;
        stop.longitude = match.longitude;
      }
    }
  }
}

// ─── 동행자 편의시설 enrichment (detailIntro 활용) ───

import { detailIntro } from './tour-api';

/** detailIntro에서 편의시설 정보를 추출 */
function parseCompanionFacilities(
  intro: Record<string, string>,
  contentTypeId: number,
): CompanionFacilities {
  const f: CompanionFacilities = {};

  // 유모차 (관광지 12, 문화시설 14)
  const babyField = intro.chkbabycarriage ?? '';
  if (babyField) {
    f.babyCarriage = /가능|있|대여|무료/i.test(babyField) && !/불가|없|안됨/i.test(babyField);
  }

  // 반려동물 (관광지 12, 문화시설 14)
  const petField = intro.chkpet ?? '';
  if (petField) {
    f.pet = /가능|있|허용/i.test(petField) && !/불가|없|안됨|금지/i.test(petField);
  }

  // 키즈시설 (음식점 39)
  const kidsField = intro.kidsfacility ?? '';
  if (kidsField) {
    f.kidsFacility = /있|가능|Y/i.test(kidsField) && !/없|불가|N/i.test(kidsField);
  }

  // 주차 (다양한 필드명)
  const parkingField = intro.parking ?? intro.parkingfood ?? '';
  if (parkingField) {
    f.parking = /있|가능|무료|주차장/i.test(parkingField) && !/없|불가/i.test(parkingField);
  }

  return f;
}

/**
 * 상위 후보들의 detailIntro를 병렬 조회하여 편의시설 정보 보강.
 * API 호출 최소화를 위해 상위 N개만 조회.
 */
export async function enrichWithFacilities(
  spots: ScoredSpot[],
  maxEnrich: number = 20,
): Promise<void> {
  const targets = spots.slice(0, maxEnrich);

  const results = await Promise.allSettled(
    targets.map(spot =>
      detailIntro({
        contentId: spot.contentId,
        contentTypeId: spot.contentTypeId,
      })
    )
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value) {
      const intro = result.value as Record<string, string>;
      targets[i].facilities = parseCompanionFacilities(intro, targets[i].contentTypeId);

      // 운영시간 추출 (콘텐츠 타입별 필드명이 다름)
      const rawTime = intro.usetime ?? intro.opentimefood ?? intro.usetimefestival ?? '';
      if (rawTime.trim()) {
        targets[i].usetime = rawTime
          .replace(/<br\s*\/?>/gi, ', ')
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ')
          .trim()
          .slice(0, 120); // 프롬프트 토큰 절약
      }
    }
  }
}

/** companion 조건에 따른 편의시설 보너스/페널티 점수 */
export function facilityBonus(spot: ScoredSpot, companion: Companion): number {
  if (!spot.facilities) return 0;
  const f = spot.facilities;

  switch (companion) {
    case 'family': {
      let bonus = 0;
      if (f.babyCarriage) bonus += 8;
      if (f.kidsFacility) bonus += 10;
      if (f.parking) bonus += 3;
      // 반려동물 불가는 가족에게 중립
      return bonus;
    }
    case 'couple': {
      let bonus = 0;
      if (f.parking) bonus += 2;
      // 가족 편의시설은 커플에게 중립~약간 마이너스 (키즈카페 분위기)
      if (f.kidsFacility) bonus -= 3;
      return bonus;
    }
    case 'solo': {
      let bonus = 0;
      if (f.parking) bonus += 2;
      return bonus;
    }
    case 'friends': {
      let bonus = 0;
      if (f.parking) bonus += 3;
      return bonus;
    }
    default:
      return 0;
  }
}

// ─── 동선 검증 ───

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateTotalDistance(stops: CourseStop[]): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    total += haversineKm(
      stops[i - 1].latitude, stops[i - 1].longitude,
      stops[i].latitude, stops[i].longitude,
    );
  }
  return Math.round(total * 10) / 10;
}

// ─── 폴백 코스 (AI 실패 시) ───

function generateFallbackCourse(
  candidates: ScoredSpot[],
  duration: Duration,
  departure: { lat: number; lng: number },
): CourseData {
  // 카테고리 밸런스 보장: 관광지 → 식당 → 카페 → 관광지 순서
  const attractions = candidates.filter(c => classifySpotRole(c) === 'attraction');
  const restaurants = candidates.filter(c => classifySpotRole(c) === 'restaurant');
  const cafes = candidates.filter(c => classifySpotRole(c) === 'cafe');
  const others = candidates.filter(c => ['activity', 'culture'].includes(classifySpotRole(c)));

  // duration별 코스 템플릿 (역할 순서)
  type SlotRole = 'attraction' | 'restaurant' | 'cafe' | 'other';
  const templates: Record<Duration, SlotRole[]> = {
    half_day: ['attraction', 'restaurant', 'cafe'],
    full_day: ['attraction', 'restaurant', 'cafe', 'attraction', 'restaurant'],
    leisurely: ['attraction', 'restaurant', 'cafe', 'other'],
    overnight: ['attraction', 'restaurant', 'cafe', 'attraction', 'restaurant', 'attraction', 'restaurant', 'cafe'],
  };

  const template = templates[duration];
  const pools: Record<SlotRole, ScoredSpot[]> = {
    attraction: [...attractions],
    restaurant: [...restaurants],
    cafe: [...cafes],
    other: [...others, ...attractions], // fallback to attractions
  };

  // 템플릿 순서대로 가장 가까운 후보 선택 (Greedy)
  const ordered: ScoredSpot[] = [];
  const usedIds = new Set<string>();
  let current = { lat: departure.lat, lng: departure.lng };

  for (const role of template) {
    const pool = pools[role].filter(s => !usedIds.has(s.contentId));
    if (pool.length === 0) {
      // 해당 역할 후보 없으면 아무거나
      const any = candidates.filter(s => !usedIds.has(s.contentId));
      if (any.length === 0) break;
      pool.push(...any);
    }

    let minDist = Infinity;
    let best = pool[0];
    for (const s of pool) {
      const dist = haversineKm(current.lat, current.lng, s.latitude, s.longitude);
      if (dist < minDist) { minDist = dist; best = s; }
    }

    ordered.push(best);
    usedIds.add(best.contentId);
    current = { lat: best.latitude, lng: best.longitude };
  }

  // 시간 배분: 역할에 따라 체류시간 차등
  const startMin = duration === 'full_day' ? 9 * 60 : 10 * 60;
  let currentTime = startMin;

  const stops: CourseStop[] = ordered.map((spot, i) => {
    // 이전 장소와의 이동시간 (첫 장소는 출발지에서)
    if (i > 0) {
      const travelKm = haversineKm(ordered[i-1].latitude, ordered[i-1].longitude, spot.latitude, spot.longitude);
      const travelMin = Math.max(10, Math.round(travelKm * 1.5 * 2)); // 대략 km당 3분
      currentTime += travelMin;
    }

    const role = classifySpotRole(spot);
    const dur = role === 'restaurant' ? 70 : role === 'cafe' ? 40 : 60;

    const h = Math.floor(currentTime / 60);
    const m = currentTime % 60;
    const timeStart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    currentTime += dur;

    return {
      order: i + 1,
      contentId: spot.contentId,
      title: spot.title,
      timeStart,
      durationMin: dur,
      description: spot.overview?.slice(0, 100) ?? spot.title,
      tip: '',
      latitude: spot.latitude,
      longitude: spot.longitude,
      imageUrl: spot.firstImage ?? '',
      isFestival: false,
    };
  });

  return {
    title: `${duration === 'half_day' ? '반나절' : duration === 'full_day' ? '하루' : duration === 'overnight' ? '1박 2일' : '느긋한'} 코스`,
    summary: '관광 + 맛집 + 카페를 동선에 맞게 정리한 코스예요.',
    totalDistanceKm: calculateTotalDistance(stops),
    tip: '',
    stops,
  };
}

// ─── AI 요약 유틸 (gemini-2.5-flash-lite) ───

async function callGeminiLite(prompt: string, maxTokens = 100): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return '';

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  const models = ['gemini-2.5-flash-lite', 'gemini-2.0-flash'];
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      if (text) return text;
    } catch {
      continue;
    }
  }
  return '';
}

export async function generateFestivalSummary(
  title: string,
  overview: string | undefined
): Promise<string> {
  if (!overview || overview.length < 20) return '';
  const prompt = `한국 축제 정보를 한 줄(30자 이내)로 요약해주세요. "왜 지금 가야 하는지"를 담아주세요.
축제명: ${title}
설명: ${overview.slice(0, 300)}
응답은 요약 문장만 출력하세요. 따옴표나 설명 없이.`;
  return callGeminiLite(prompt, 60);
}

export async function generateSpotWhyNow(
  title: string,
  cat2: string,
  overview: string | undefined,
  weather: { sky: string; tempMax: number } | undefined,
  month: number
): Promise<string> {
  const seasonContext = SEASON_NAME[month] || '봄';
  const weatherContext = weather ? `날씨: ${weather.sky}, 최고 ${weather.tempMax}°C` : '';
  const prompt = `한국 관광지를 한 줄(30자 이내)로 "지금 가면 좋은 이유"를 써주세요.
장소: ${title} (${cat2})
계절: ${seasonContext}
${weatherContext}
${overview ? `설명: ${overview.slice(0, 200)}` : ''}
응답은 문장만 출력하세요. 따옴표나 설명 없이. ~요체.`;
  return callGeminiLite(prompt, 60);
}

export async function generateCourseFortuneMessage(
  courseTitle: string,
  feeling: string | undefined,
  weatherSummary: string | undefined
): Promise<string> {
  const prompt = `주말 나들이 코스를 시작하는 사용자에게 "오늘의 나들이 운세" 감성 한마디(50자 이내)를 써주세요.
코스: ${courseTitle}
${feeling ? `기분: ${feeling}` : ''}
${weatherSummary ? `날씨: ${weatherSummary}` : ''}
재미있고 긍정적인 톤으로. 이모지 1개 포함. 응답은 문장만 출력하세요.`;
  return callGeminiLite(prompt, 80);
}

// ─── B 변형용 추가 지시 ───

const VARIANT_B_HINT = `

## ★ 이 코스는 "이색 발견" 버전입니다
위 후보 목록에서 최대한 새로운 조합을 시도하세요:
- 인기 명소보다는 후보 목록 중간~하위 장소를 적극 활용하세요.
- 문화시설·체험·액티비티 비중을 높이고, 의외의 경험을 줄 수 있는 장소를 우선하세요.
- 동선도 기본 코스와 다른 방향으로 잡아 새로운 지역을 탐험하게 해주세요.
- 코스 제목에 "(이색)", "(발견)" 같은 태그를 붙이지 마세요. 제목 자체로 매력을 표현하세요.`;

// ─── 메인 생성 함수 ───

export async function generateCourse(
  input: CourseGenerationInput,
  variant: 'a' | 'b' = 'a',
): Promise<CourseData> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[이모추AI] GEMINI_API_KEY 미설정 → 폴백 코스 생성');
    return generateFallbackCourse(input.candidates, input.duration, input.departure);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const baseMessage = buildUserMessage(input);
  const userMessage = variant === 'b' ? baseMessage + VARIANT_B_HINT : baseMessage;

  // B 변형은 온도를 높여 더 창의적인 결과 유도
  const models = variant === 'b'
    ? MODELS.map(m => ({ ...m, temp: Math.min(parseFloat((m.temp + 0.2).toFixed(1)), 1.0) }))
    : MODELS;

  for (const { id: modelId, maxTokens, temp } of models) {
    // 최대 2회 시도 (JSON 파싱 실패 시 1회 재시도)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[이모추AI] ${modelId} variant=${variant} 시도 (attempt ${attempt + 1})`);

        const model = genAI.getGenerativeModel({
          model: modelId,
          systemInstruction: SYSTEM_INSTRUCTION,
          generationConfig: {
            temperature: temp,
            topP: 0.9,
            maxOutputTokens: maxTokens,
          },
        });

        const retryHint = attempt > 0
          ? '\n\n중요: 반드시 유효한 JSON만 출력하세요. 마크다운이나 설명 텍스트를 포함하지 마세요.'
          : '';

        const result = await model.generateContent(userMessage + retryHint);
        const text = result.response.text();

        if (!text || text.trim().length < 50) {
          throw new Error('응답이 너무 짧습니다');
        }

        // JSON 파싱 + 스키마 검증
        const course = parseCourseJSON(text);

        // contentId 교차 검증
        crossValidateContentIds(course.stops, input.candidates, input.festivals, input.stays);

        // 총 이동거리 재계산 (AI 수치 신뢰하지 않음)
        course.totalDistanceKm = calculateTotalDistance(course.stops);

        // 중복 장소 제거
        const seenIds = new Set<string>();
        course.stops = course.stops.filter(s => {
          if (seenIds.has(s.contentId)) return false;
          seenIds.add(s.contentId);
          return true;
        });

        // order 재정렬
        course.stops.forEach((s, i) => { s.order = i + 1; });

        console.log(`[이모추AI] ${modelId} 성공 — ${course.stops.length}개 장소`);
        return course;

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[이모추AI] ${modelId} attempt ${attempt + 1} 실패: ${msg.slice(0, 200)}`);

        // API 키 / 권한 오류 → 즉시 폴백
        if (msg.includes('API_KEY') || msg.includes('PERMISSION_DENIED')) {
          console.warn('[이모추AI] API 인증 오류 → 폴백 코스 생성');
          return generateFallbackCourse(input.candidates, input.duration, input.departure);
        }

        // 할당량 초과 (429) → 다음 모델로
        if (msg.includes('429') || msg.includes('quota')) {
          console.warn(`[이모추AI] ${modelId} 할당량 초과 → 다음 모델`);
          break;
        }

        // 서버 과부하 (503) → 3초 대기 후 같은 모델 재시도
        if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand')) {
          console.warn(`[이모추AI] ${modelId} 서버 과부하 → ${attempt < 1 ? '3초 후 재시도' : '다음 모델'}`);
          if (attempt < 1) {
            await new Promise(r => setTimeout(r, 3000));
            continue;
          }
          break;
        }

        // JSON 파싱 실패 → 재시도
        if (msg.includes('JSON') || msg.includes('Unexpected token')) {
          continue;
        }

        // 기타 에러 → 다음 모델로
        break;
      }
    }
  }

  // 모든 모델 실패 → 규칙 기반 폴백
  console.warn('[이모추AI] 모든 모델 실패 → 폴백 코스 생성');
  return generateFallbackCourse(input.candidates, input.duration, input.departure);
}

// ─── 카카오맵 URL 생성 ───

export function buildKakaoNaviUrl(stops: CourseStop[]): string {
  if (stops.length === 0) return '';

  // 카카오맵 웹 길찾기 URL (앱 미설치 시에도 동작)
  // 여러 장소를 마커로 표시하는 멀티마커 URL 사용
  if (stops.length === 1) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(stops[0].title)},${stops[0].latitude},${stops[0].longitude}`;
  }

  // 멀티마커 지도 (모든 장소 표시)
  const markers = stops
    .map(s => `${encodeURIComponent(s.title)},${s.latitude},${s.longitude}`)
    .join('/');

  return `https://map.kakao.com/link/map/${markers}`;
}

/** 카카오맵 앱 딥링크 (모바일 앱 설치 시 경유지 포함 길안내) */
export function buildKakaoNaviDeeplink(stops: CourseStop[]): string {
  if (stops.length < 2) return '';

  const origin = stops[0];
  const dest = stops[stops.length - 1];
  const vias = stops.slice(1, -1);

  let url = `kakaomap://route?sp=${origin.latitude},${origin.longitude}&ep=${dest.latitude},${dest.longitude}`;
  vias.forEach((v, i) => {
    url += `&via${i + 1}=${v.latitude},${v.longitude}`;
  });

  return url;
}

// ─── 공유 slug 생성 ───

export function generateShareSlug(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}
