// ============================================================
// "이모추!" 공용 타입 정의
// ============================================================

// ─── TourAPI 관련 ───

export interface TourSpot {
  contentId: string;
  contentTypeId: number;
  title: string;
  addr1: string;
  addr2?: string;
  areaCode: number;
  sigunguCode: number;
  cat1: string;
  cat2: string;
  cat3: string;
  mapX: number;      // 경도
  mapY: number;      // 위도
  firstImage?: string;
  overview?: string;
  tel?: string;
}

export interface TourFestival {
  contentId: string;
  title: string;
  addr1: string;
  areaCode: number;
  sigunguCode: number;
  mapX: number;
  mapY: number;
  firstImage?: string;
  eventStartDate: string;  // YYYYMMDD
  eventEndDate: string;
  tel?: string;
  overview?: string;
  aiSummary?: string;
}

// ─── 날씨 ───

export type SkyCondition = 'clear' | 'cloudy' | 'overcast';
export type PrecipitationType = 'none' | 'rain' | 'snow' | 'mixed';

export interface DayWeather {
  date: string;           // YYYY-MM-DD
  sky: SkyCondition;
  precipitation: PrecipitationType;
  tempMin: number;
  tempMax: number;
  pop: number;            // 강수확률 %
  summary: string;        // "맑고 따뜻, 나들이 최적"
}

export interface WeekendWeather {
  saturday: DayWeather;
  sunday: DayWeather;
  recommendation: string; // "토요일이 외출 적기예요"
}

// ─── 코스 생성 ───

export type Duration = 'half_day' | 'full_day' | 'leisurely' | 'overnight';
export type Companion = 'solo' | 'couple' | 'family' | 'friends';
export type Preference = 'nature' | 'food' | 'culture' | 'cafe' | 'activity' | 'photo';

// 목적지 선택 방식
export type DestinationType = 'nearby' | 'city' | 'mood';
export type MoodType = 'mountain' | 'sea' | 'valley' | 'urban' | 'countryside';

// TourAPI 지역 코드 매핑
export interface CityOption {
  name: string;
  areaCode: number;
  lat: number;
  lng: number;
  emoji: string;
}

export const CITY_OPTIONS: CityOption[] = [
  { name: '서울',   areaCode: 1,  lat: 37.5665, lng: 126.9780, emoji: '🏙️' },
  { name: '부산',   areaCode: 6,  lat: 35.1796, lng: 129.0756, emoji: '🌊' },
  { name: '제주',   areaCode: 39, lat: 33.4996, lng: 126.5312, emoji: '🍊' },
  { name: '강릉',   areaCode: 32, lat: 37.7519, lng: 128.8761, emoji: '🏖️' },
  { name: '경주',   areaCode: 35, lat: 35.8562, lng: 129.2247, emoji: '🏛️' },
  { name: '전주',   areaCode: 37, lat: 35.8242, lng: 127.1480, emoji: '🏘️' },
  { name: '여수',   areaCode: 38, lat: 34.7604, lng: 127.6622, emoji: '🚢' },
  { name: '속초',   areaCode: 32, lat: 38.2070, lng: 128.5918, emoji: '⛰️' },
  { name: '대구',   areaCode: 4,  lat: 35.8714, lng: 128.6014, emoji: '🌸' },
  { name: '인천',   areaCode: 2,  lat: 37.4563, lng: 126.7052, emoji: '✈️' },
  { name: '대전',   areaCode: 3,  lat: 36.3504, lng: 127.3845, emoji: '🔬' },
  { name: '광주',   areaCode: 5,  lat: 35.1595, lng: 126.8526, emoji: '🎨' },
];

export interface MoodOption {
  type: MoodType;
  label: string;
  emoji: string;
  description: string;
  areaCodes: number[];   // 관련 지역 코드들
  cat1Codes: string[];   // TourAPI 대분류
}

export const MOOD_OPTIONS: MoodOption[] = [
  {
    type: 'mountain', label: '산·숲',    emoji: '🏔️',
    description: '푸른 산과 숲에서 힐링',
    areaCodes: [32, 33, 35],  // 강원, 충북, 경북
    cat1Codes: ['A01'],
  },
  {
    type: 'sea',      label: '바다·해변', emoji: '🏖️',
    description: '파도 소리와 함께 여유롭게',
    areaCodes: [6, 32, 34, 38, 39],  // 부산, 강원, 충남, 전남, 제주
    cat1Codes: ['A01'],
  },
  {
    type: 'valley',   label: '계곡·호수', emoji: '💧',
    description: '시원한 물소리 가득한 곳',
    areaCodes: [32, 33, 35],
    cat1Codes: ['A01'],
  },
  {
    type: 'urban',    label: '도심·핫플', emoji: '🌃',
    description: '트렌디한 도시 탐방',
    areaCodes: [1, 6, 4, 39],  // 서울, 부산, 대구, 제주
    cat1Codes: ['A02', 'A05'],
  },
  {
    type: 'countryside', label: '시골·전원', emoji: '🌾',
    description: '한적한 시골길 드라이브',
    areaCodes: [33, 34, 36, 37],  // 충북, 충남, 전북, 전남(일부)
    cat1Codes: ['A01'],
  },
];

export const MOOD_LABELS: Record<MoodType, string> = {
  mountain: '산·숲',
  sea: '바다·해변',
  valley: '계곡·호수',
  urban: '도심·핫플',
  countryside: '시골·전원',
};

// 감정/컨디션 기반 추천
export type Feeling =
  | 'tired'       // 지쳐서 쉬고 싶어요
  | 'excited'     // 에너지 넘쳐요!
  | 'romantic'    // 로맨틱한 기분
  | 'healing'     // 힐링이 필요해요
  | 'adventurous' // 새로운 걸 해보고 싶어요
  | 'foodie';     // 맛있는 게 먹고 싶어요

export interface FeelingOption {
  type: Feeling;
  label: string;
  emoji: string;
  description: string;
}

export const FEELING_OPTIONS: FeelingOption[] = [
  { type: 'tired',       label: '쉬고 싶어요',       emoji: '😴', description: '조용하고 평화로운 곳에서 여유롭게' },
  { type: 'excited',     label: '에너지 넘쳐요!',    emoji: '⚡', description: '활동적이고 신나는 코스로' },
  { type: 'romantic',    label: '로맨틱한 기분',      emoji: '💕', description: '분위기 있고 예쁜 곳으로' },
  { type: 'healing',     label: '힐링이 필요해요',    emoji: '🌿', description: '자연 속에서 마음의 안정을' },
  { type: 'adventurous', label: '새로운 경험!',       emoji: '🎯', description: '평소에 안 해본 특별한 체험' },
  { type: 'foodie',      label: '맛집 탐방',          emoji: '🍜', description: '현지 맛집을 찾아 먹방 여행' },
];

export interface CourseRequest {
  lat: number;
  lng: number;
  duration: Duration;
  companion: Companion;
  preferences: Preference[];
  feeling?: Feeling;
  destinationType?: DestinationType;
  cityAreaCode?: number;
  mood?: MoodType;
}

// ─── 편의시설 정보 ───

export interface FacilityInfo {
  parking?: boolean;
  babyCarriage?: boolean;
  kidsFacility?: boolean;
  pet?: boolean;
  operatingHours?: string;
}

export interface CourseStop {
  order: number;
  contentId: string;
  title: string;
  timeStart: string;       // "10:00"
  durationMin: number;
  description: string;
  tip: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  isFestival: boolean;
  hook?: string;            // 15자 이내 후크 카피 (예: "서울 숨은 뷰맛집")
  whyNow?: string;          // 지금 이 시즌에 가야 하는 이유 1문장
  isStay?: boolean;         // 숙박 장소 여부
  day?: number;             // 1박2일 시 1일차/2일차 (1 or 2)
  images?: string[];
  facilities?: FacilityInfo;
  transitInfo?: string;         // "차로 15분 (4.2km)"
  contentTypeId?: string;  // Phase 2: "12"|"14"|"15"|"28"|"32"|"39" — optional (기존 저장 코스 하위호환)
}

export type CourseDifficulty = 'easy' | 'moderate' | 'active';

export interface CourseData {
  title: string;
  summary: string;
  totalDistanceKm: number;
  tip: string;
  stops: CourseStop[];
  estimatedCostWon?: number;    // 1인 기준 총 예상 비용 (원)
  difficulty?: CourseDifficulty; // easy | moderate | active
  storyArc?: string;            // 코스 전체 내러티브 3~5문장 (편집장 추천 스타일)
}

export interface CourseResponse {
  courseId: string;
  shareUrl: string;
  course: CourseData;
  courseB?: CourseData;   // A/B 비교용 이색 발견 코스
  kakaoNaviUrl: string;
  fortuneMessage?: string;
}

// ─── 홈 화면 ───

export interface SpotCard {
  contentId: string;
  title: string;
  addr1: string;
  firstImage?: string;
  cat2: string;
  reason: string;          // AI 생성 추천 이유
  distanceKm?: number;
  whyNow?: string;              // AI "지금 가면 좋은 이유"
  facilities?: FacilityInfo;
  images?: string[];
}

export interface FestivalCard {
  contentId: string;
  title: string;
  addr1: string;
  firstImage?: string;
  eventStart: string;
  eventEnd: string;
  aiSummary?: string;
  urgencyTag?: string;     // "올 주말 마지막!", "오늘 시작!"
  distanceKm?: number;
  facilities?: FacilityInfo;
  images?: string[];
  dDay?: number;
}

export interface HomeData {
  festivals: FestivalCard[];
  recommended: SpotCard[];
  weather: WeekendWeather;
  weekendDates: {
    saturday: string;
    sunday: string;
  };
}

// ─── UI 상수 ───

export const DURATION_LABELS: Record<Duration, string> = {
  half_day: '반나절 (3~4시간)',
  full_day: '하루 (6~8시간)',
  leisurely: '느긋하게',
  overnight: '1박 2일',
};

export const COMPANION_LABELS: Record<Companion, string> = {
  solo: '혼자',
  couple: '연인',
  family: '가족+아이',
  friends: '친구들',
};

export const PREFERENCE_LABELS: Record<Preference, string> = {
  nature: '자연·산책',
  food: '맛집투어',
  culture: '전시·문화',
  cafe: '카페감성',
  activity: '액티비티',
  photo: '사진명소',
};

export const COMPANION_ICONS: Record<Companion, string> = {
  solo: '🎧',
  couple: '💑',
  family: '👨‍👩‍👧',
  friends: '👯',
};

export const PREFERENCE_ICONS: Record<Preference, string> = {
  nature: '🌿',
  food: '🍽️',
  culture: '🎨',
  cafe: '☕',
  activity: '🏄',
  photo: '📸',
};

export interface SubCategorySelection {
  preference: Preference;
  subLabels: string[];
}
