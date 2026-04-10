# "이번 주말" — 기술 설계 초안

> 공모전 제출 & 실제 구현을 위한 기술 설계서
> 마감: 2026.5.6 16:00 / 구현 목표: 5~9월

---

## 1. 프로젝트 구조

기존 `jaengseung-made` 모노레포 안에 `/weekend` 경로로 추가합니다.
별도 레포 분리 없이 기존 인프라(Vercel, Supabase, 도메인)를 그대로 활용합니다.

```
jaengseung-made/
├── app/
│   ├── weekend/                    ← 새로 추가되는 "이번 주말" 서비스
│   │   ├── page.tsx                ← 홈: 이번 주말 축제 + 추천 관광지
│   │   ├── layout.tsx              ← 전용 레이아웃 (사이드바 없음, 모바일 퍼스트)
│   │   ├── course/
│   │   │   ├── page.tsx            ← 코스 생성 3단계 선택 화면
│   │   │   └── [id]/page.tsx       ← 생성된 코스 상세 (공유 가능 URL)
│   │   ├── spot/
│   │   │   └── [contentId]/page.tsx ← 관광지 상세 (시의성 정보)
│   │   ├── festival/
│   │   │   └── page.tsx            ← 이번 주말 축제 전체 목록
│   │   └── components/
│   │       ├── WeekendHome.tsx      ← 홈 화면 클라이언트 컴포넌트
│   │       ├── CourseWizard.tsx     ← 3단계 선택 위자드
│   │       ├── CourseResult.tsx     ← 생성된 코스 카드 뷰
│   │       ├── SpotCard.tsx         ← 관광지 카드 (홈/코스 공용)
│   │       ├── FestivalBadge.tsx    ← 축제 긴급성 태그 ("올 주말 마지막!")
│   │       ├── WeatherBar.tsx       ← 주말 날씨 요약 바
│   │       ├── KakaoMapButton.tsx   ← 카카오맵 연동 버튼
│   │       └── SajuTip.tsx          ← 사주 한 줄 코멘트
│   │
│   └── api/weekend/                ← API Route Handlers
│       ├── home/route.ts           ← GET: 홈 화면 데이터 조합
│       ├── course/route.ts         ← POST: AI 코스 생성
│       ├── course/[id]/route.ts    ← GET: 저장된 코스 조회
│       ├── spot/[contentId]/route.ts ← GET: 관광지 상세 + 시의성
│       ├── festivals/route.ts      ← GET: 축제 목록
│       └── saju-tip/route.ts       ← POST: 사주 한 줄 코멘트
│
├── lib/
│   ├── tour-api.ts                 ← TourAPI 4.0 클라이언트 (공용)
│   ├── weather-api.ts              ← 기상청 단기예보 API 클라이언트
│   ├── weekend-ai.ts               ← Gemini AI 코스 생성 로직
│   └── weekend-types.ts            ← 공용 타입 정의
│
├── supabase/
│   └── migrations/
│       └── 010_weekend_tables.sql  ← DB 스키마
│
└── public/
    └── manifest-weekend.json       ← PWA manifest (이번 주말 전용)
```

### 왜 모노레포 내부?

| 장점 | 설명 |
|------|------|
| 인프라 재사용 | Vercel 배포, Supabase 인스턴스, 도메인 SSL 그대로 사용 |
| 코드 재사용 | `lib/saju-*.ts` 사주 엔진, Supabase 클라이언트 등 공유 |
| 빠른 구현 | 별도 프로젝트 세팅 시간 제거 → 공모전 마감에 유리 |
| 분리 용이 | 추후 성장 시 `/weekend` 폴더만 별도 레포로 추출 가능 |

---

## 2. 데이터베이스 스키마 (Supabase / PostgreSQL)

### 2-1. 테이블 설계

```sql
-- ============================================================
-- Migration 010: "이번 주말" 서비스 테이블
-- ============================================================

-- ① 관광지 캐시 테이블 (TourAPI 데이터 로컬 캐시)
create table public.wk_spots (
  content_id    text primary key,           -- TourAPI contentId
  content_type  int2 not null,              -- 12:관광지 14:문화 15:행사 25:여행코스 28:레포츠 32:숙박 38:쇼핑 39:음식
  title         text not null,
  addr1         text,
  addr2         text,
  area_code     int2,                       -- 시도 코드
  sigungu_code  int2,                       -- 시군구 코드
  cat1          text,                       -- 대분류
  cat2          text,                       -- 중분류
  cat3          text,                       -- 소분류
  mapx          double precision,           -- 경도
  mapy          double precision,           -- 위도
  first_image   text,                       -- 대표 이미지 URL
  overview      text,                       -- 상세 설명 (detailCommon)
  tel           text,
  homepage      text,
  synced_at     timestamptz default now(),  -- 마지막 동기화 시점
  extra         jsonb default '{}'          -- 영업시간, 편의시설 등 확장 데이터
);

create index idx_spots_area on public.wk_spots (area_code, sigungu_code);
create index idx_spots_type on public.wk_spots (content_type);
create index idx_spots_cat on public.wk_spots (cat1, cat2);
create index idx_spots_geo on public.wk_spots using gist (
  st_setsrid(st_makepoint(mapx, mapy), 4326)
);

-- ② 축제·행사 테이블 (searchFestival 기반, 일일 동기화)
create table public.wk_festivals (
  content_id    text primary key,
  title         text not null,
  addr1         text,
  area_code     int2,
  sigungu_code  int2,
  mapx          double precision,
  mapy          double precision,
  first_image   text,
  event_start   date not null,              -- 행사 시작일
  event_end     date not null,              -- 행사 종료일
  tel           text,
  overview      text,                       -- AI 요약용 원문
  ai_summary    text,                       -- Gemini가 생성한 한 줄 요약
  synced_at     timestamptz default now()
);

create index idx_fest_dates on public.wk_festivals (event_start, event_end);
create index idx_fest_area on public.wk_festivals (area_code);

-- ③ AI 생성 코스 테이블
create table public.wk_courses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id),  -- null = 비로그인 사용자
  
  -- 입력 조건
  latitude      double precision not null,
  longitude     double precision not null,
  duration      text not null,              -- 'half_day' | 'full_day' | 'leisurely'
  companion     text not null,              -- 'solo' | 'couple' | 'family' | 'friends'
  preferences   text[] not null,            -- ['nature', 'cafe', 'food', 'culture', ...]
  
  -- AI 생성 결과
  course_data   jsonb not null,             -- 코스 전체 JSON (아래 스키마 참조)
  weather_info  jsonb,                      -- 생성 시점 날씨 정보
  
  -- 메타
  created_at    timestamptz default now(),
  share_slug    text unique,                -- 공유용 짧은 URL slug
  view_count    int default 0
);

create index idx_courses_user on public.wk_courses (user_id);
create index idx_courses_slug on public.wk_courses (share_slug);

-- ④ 날씨 캐시 (기상청 API 호출 최소화)
create table public.wk_weather_cache (
  area_code     int2 not null,
  forecast_date date not null,
  fetched_at    timestamptz default now(),
  data          jsonb not null,             -- 기상청 응답 원본
  primary key (area_code, forecast_date)
);
```

### 2-2. `course_data` JSON 스키마

```typescript
interface CourseData {
  title: string;              // "토요일 반나절 코스 (서울 강남 출발)"
  summary: string;            // AI 생성 한 줄 요약
  total_distance_km: number;  // 전체 이동거리
  tip: string;                // 전체 코스 꿀팁
  
  stops: CourseStop[];
}

interface CourseStop {
  order: number;              // 1, 2, 3...
  content_id: string;         // TourAPI contentId (관광지 연결)
  title: string;
  time_start: string;         // "10:00"
  duration_min: number;       // 체류 시간 (분)
  description: string;        // AI 생성 장소 설명
  tip: string;                // AI 생성 장소별 꿀팁
  latitude: number;
  longitude: number;
  image_url?: string;
  is_festival: boolean;       // 축제 편입 여부
}
```

---

## 3. API 설계

### 3-1. 프론트엔드 API Routes (`/app/api/weekend/`)

Next.js Route Handler로 구현합니다. 외부 API 키를 서버사이드에서 안전하게 관리합니다.

#### `GET /api/weekend/home`

홈 화면에 필요한 데이터를 한 번에 조합하여 반환합니다.

```typescript
// Query Parameters
interface HomeParams {
  lat: number;      // 사용자 위도
  lng: number;      // 사용자 경도
  radius?: number;  // 반경 km (기본 30)
}

// Response
interface HomeResponse {
  festivals: Festival[];       // 이번 주말 진행 중 축제 (최대 10개)
  recommended: SpotCard[];     // 지금 가면 좋은 관광지 (최대 8개)
  weather: WeekendWeather;     // 토·일 날씨 요약
  weekend_dates: {             // 이번 주말 날짜
    saturday: string;          // "2026-04-11"
    sunday: string;            // "2026-04-12"
  };
}
```

**내부 로직:**
1. GPS → `areaCode` 매핑 (가장 가까운 시도/시군구)
2. `wk_festivals` 에서 이번 주말 포함 축제 조회 (DB 캐시 우선)
3. `wk_spots` 에서 위치 기반 관광지 조회 (PostGIS 거리 계산)
4. `wk_weather_cache` 에서 날씨 조회 (캐시 미스 → 기상청 API 호출)
5. 계절 + 날씨 + 카테고리 기반 추천 점수 계산 → 상위 8개

#### `POST /api/weekend/course`

AI 코스 생성 요청을 처리합니다.

```typescript
// Request Body
interface CourseRequest {
  lat: number;
  lng: number;
  duration: 'half_day' | 'full_day' | 'leisurely';
  companion: 'solo' | 'couple' | 'family' | 'friends';
  preferences: string[];  // ['nature', 'cafe', 'food', 'culture', 'activity', 'photo']
}

// Response
interface CourseResponse {
  course_id: string;         // UUID (공유·저장용)
  share_url: string;         // /weekend/course/{share_slug}
  course: CourseData;         // 코스 상세
  kakao_navi_url: string;    // 카카오맵 경유지 URL
}
```

**내부 로직 (파이프라인):**
```
① 위치 + 반경 → TourAPI locationBasedList (or DB 캐시) → 후보 관광지 15~20개
② 이번 주말 → wk_festivals 테이블에서 근처 축제 조회
③ preferences → cat1/cat2/cat3 매핑 → 후보 필터링
④ companion → 특성 매칭 (family → 체험형·무장애 가산점)
⑤ 날씨 → 맑음=야외 가산, 비=실내 가산
⑥ 필터링된 후보 + 축제 + 날씨 → Gemini AI 프롬프트 조합
⑦ AI 응답 → JSON 파싱 → DB 저장 → 응답
```

#### `GET /api/weekend/spot/[contentId]`

관광지 상세 + 시의성 정보를 조합합니다.

```typescript
// Response
interface SpotDetailResponse {
  spot: SpotFull;              // 관광지 기본 정보
  timeliness: {
    season_point: string;      // "벚꽃 만개 시즌입니다"
    best_time: string;         // "오전 10시 이전 방문 추천"
    crowd_estimate: string;    // "주말 오후 혼잡 예상"
  };
  nearby_festivals: Festival[];  // 반경 내 진행 중 축제
  next_spots: SpotCard[];       // "여기 다음에 어디?" 추천
  weather: DayWeather;          // 해당 지역 주말 날씨
}
```

#### `GET /api/weekend/festivals`

이번 주말 축제 전체 목록 (지역 필터 가능).

```typescript
// Query Parameters
interface FestivalParams {
  lat?: number;
  lng?: number;
  radius?: number;        // 기본 50km
  area_code?: number;     // 특정 지역만
}
```

#### `POST /api/weekend/saju-tip`

사주 기반 한 줄 여행 코멘트.

```typescript
// Request
interface SajuTipRequest {
  birth_year: number;
  birth_month: number;
  birth_day: number;
  birth_hour?: number;    // 선택
}

// Response
interface SajuTipResponse {
  tip: string;            // "이번 달은 물 기운이 강해요. 호수나 바다 근처가 좋겠어요."
  element: string;        // "수(水)"
  theme: string;          // "water"
}
```

---

## 4. 외부 API 연동 상세

### 4-1. TourAPI 4.0 클라이언트 (`lib/tour-api.ts`)

```typescript
// TourAPI 기본 설정
const TOUR_API_BASE = 'https://apis.data.go.kr/B551011/KorService1';

interface TourApiConfig {
  serviceKey: string;     // 환경변수 TOUR_API_KEY
  MobileOS: 'ETC';
  MobileApp: '이번주말';
  _type: 'json';
  numOfRows: number;
}

// 핵심 API 함수들
export async function searchFestival(params: {
  eventStartDate: string;  // YYYYMMDD
  eventEndDate: string;
  areaCode?: number;
  arrange?: 'A' | 'C' | 'D' | 'O' | 'Q' | 'R';  // 정렬
}): Promise<FestivalItem[]>;

export async function locationBasedList(params: {
  mapX: number;           // 경도
  mapY: number;           // 위도
  radius: number;         // 미터 단위
  contentTypeId?: number; // 12, 14, 15, 25, 28, 32, 38, 39
  arrange?: string;
}): Promise<SpotItem[]>;

export async function detailCommon(params: {
  contentId: string;
  defaultYN?: 'Y';
  overviewYN?: 'Y';
  addrinfoYN?: 'Y';
  mapinfoYN?: 'Y';
}): Promise<DetailCommonItem>;

export async function detailIntro(params: {
  contentId: string;
  contentTypeId: number;
}): Promise<DetailIntroItem>;

export async function areaCode(params?: {
  areaCode?: number;      // 없으면 시도 목록, 있으면 시군구 목록
}): Promise<AreaCodeItem[]>;

export async function categoryCode(params?: {
  cat1?: string;
  cat2?: string;
}): Promise<CategoryItem[]>;
```

### 4-2. 기상청 단기예보 (`lib/weather-api.ts`)

```typescript
const WEATHER_API_BASE = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';

// 핵심: 기상청은 격자 좌표(nx, ny) 사용 → GPS 좌표를 격자로 변환 필요
export function gpsToGrid(lat: number, lng: number): { nx: number; ny: number };

export async function getWeekendForecast(params: {
  lat: number;
  lng: number;
}): Promise<WeekendWeather> {
  // 1. GPS → 격자 변환
  // 2. getVilageFcst (동네예보) 호출
  // 3. 토·일 날씨만 추출하여 가공
}

interface WeekendWeather {
  saturday: DayWeather;
  sunday: DayWeather;
  recommendation: string;   // "토요일이 외출 적기예요"
}

interface DayWeather {
  date: string;
  sky: 'clear' | 'cloudy' | 'overcast';  // 맑음/구름많음/흐림
  precipitation: 'none' | 'rain' | 'snow' | 'mixed';
  temp_min: number;
  temp_max: number;
  pop: number;              // 강수확률 %
  summary: string;          // "맑고 따뜻, 나들이 최적"
}
```

### 4-3. 카카오맵 연동

프론트엔드에서 직접 사용합니다 (서버 프록시 불필요).

```typescript
// 카카오맵 경유지 내비게이션 URL 생성
export function buildKakaoNaviUrl(stops: CourseStop[]): string {
  // 카카오맵 공유 URL 스키마:
  // https://map.kakao.com/link/to/{name},{lat},{lng}
  
  // 경유지 포함 URL (카카오내비 딥링크)
  // kakaomap://route?sp={출발lat},{출발lng}&ep={도착lat},{도착lng}&via1={경유lat},{경유lng}
  
  const origin = stops[0];
  const dest = stops[stops.length - 1];
  const vias = stops.slice(1, -1);
  
  let url = `kakaomap://route?sp=${origin.latitude},${origin.longitude}`;
  url += `&ep=${dest.latitude},${dest.longitude}`;
  vias.forEach((v, i) => {
    url += `&via${i + 1}=${v.latitude},${v.longitude}`;
  });
  
  return url;
}

// 카카오맵 JavaScript SDK (관광지 상세 지도 표시용)
// <script src="//dapi.kakao.com/v2/maps/sdk.js?appkey={KEY}"></script>
```

---

## 5. AI 코스 생성 로직 (`lib/weekend-ai.ts`)

### 5-1. Gemini 프롬프트 설계

```typescript
export async function generateCourse(input: {
  candidates: SpotCandidate[];   // 필터링된 관광지 후보 10~15개
  festivals: Festival[];          // 이번 주말 근처 축제 2~3개
  weather: WeekendWeather;
  duration: string;
  companion: string;
  preferences: string[];
  departure: { lat: number; lng: number; name: string };
}): Promise<CourseData> {
  
  const systemPrompt = `당신은 한국 주말 나들이 코스 전문 플래너입니다.

## 규칙
- 사용자의 출발 위치에서 가까운 곳부터 시작하여 효율적인 동선을 구성하세요.
- 각 장소 사이 이동시간이 자동차 기준 30분을 넘지 않도록 하세요.
- 식사 시간(12:00~13:00, 18:00~19:00)에는 음식점을 배치하세요.
- 축제가 진행 중이면 코스에 자연스럽게 편입하세요.
- 날씨가 나쁘면 실내 위주로 구성하세요.
- 동반자 유형에 맞는 장소를 우선 배치하세요:
  - solo: 카페, 서점, 미술관 등 혼자 즐기기 좋은 곳
  - couple: 분위기 좋은 카페, 산책로, 포토존
  - family: 체험 시설, 공원, 아이 편의시설 있는 곳
  - friends: 맛집, 액티비티, 이색 체험

## 시간 예산
- half_day: 3~4시간, 장소 3~4개
- full_day: 6~8시간, 장소 5~7개
- leisurely: 시간 제한 없이 여유롭게, 장소 4~6개

## 출력 형식
반드시 아래 JSON 형식으로만 응답하세요. 설명이나 마크다운 없이 JSON만.`;

  const userMessage = `## 조건
- 출발: ${input.departure.name} (${input.departure.lat}, ${input.departure.lng})
- 시간: ${durationLabel(input.duration)}
- 동반자: ${companionLabel(input.companion)}
- 취향: ${input.preferences.join(', ')}

## 이번 주말 날씨
${formatWeather(input.weather)}

## 이번 주말 축제
${input.festivals.map(f => `- ${f.title} (${f.addr1}, ~${f.event_end})`).join('\n') || '근처 축제 없음'}

## 관광지 후보
${input.candidates.map(c => 
  `- [${c.content_id}] ${c.title} (${c.cat2}) — ${c.addr1} — 출발지에서 ${c.distance_km}km`
).join('\n')}

위 후보 중에서 최적의 코스를 만들어주세요.`;

  // Gemini 호출 (기존 saju 패턴과 동일: systemInstruction + user message 분리)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    systemInstruction: systemPrompt,
  });
  
  const result = await model.generateContent(userMessage);
  return parseCourseResponse(result.response.text());
}
```

### 5-2. 카테고리 매핑 (취향 → TourAPI cat 코드)

```typescript
// 사용자 선택 → TourAPI 카테고리 매핑
const PREFERENCE_TO_CAT: Record<string, { contentTypes: number[]; cats: string[] }> = {
  nature: {
    contentTypes: [12],           // 관광지
    cats: ['A01', 'A0101'],       // 자연관광, 자연관광지
  },
  cafe: {
    contentTypes: [39],           // 음식점
    cats: ['A05', 'A0502'],       // 음식, 카페/찻집
  },
  food: {
    contentTypes: [39],           // 음식점
    cats: ['A05'],                // 음식
  },
  culture: {
    contentTypes: [14],           // 문화시설
    cats: ['A02', 'A0206'],       // 인문관광, 문화시설
  },
  activity: {
    contentTypes: [28],           // 레포츠
    cats: ['A03'],                // 레포츠
  },
  photo: {
    contentTypes: [12, 14],       // 관광지, 문화시설
    cats: ['A01', 'A02'],         // 자연관광, 인문관광
  },
};
```

---

## 6. 데이터 동기화 전략

### 6-1. 스케줄 (Vercel Cron Jobs)

```typescript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-festivals",
      "schedule": "0 3 * * *"        // 매일 새벽 3시: 축제 데이터 동기화
    },
    {
      "path": "/api/cron/sync-spots",
      "schedule": "0 4 * * 1"        // 매주 월요일 새벽 4시: 관광지 데이터 동기화
    },
    {
      "path": "/api/cron/cache-weather",
      "schedule": "0 6 * * 5"        // 매주 금요일 새벽 6시: 주말 날씨 프리캐싱
    }
  ]
}
```

### 6-2. 축제 동기화 로직 (`/api/cron/sync-festivals`)

```typescript
// 매일 실행: 향후 2주간 축제 데이터를 TourAPI에서 가져와 DB 업서트
async function syncFestivals() {
  const today = new Date();
  const twoWeeksLater = addDays(today, 14);
  
  // TourAPI searchFestival: 전 지역 조회
  const festivals = await tourApi.searchFestival({
    eventStartDate: formatDate(today),
    eventEndDate: formatDate(twoWeeksLater),
    numOfRows: 500,
  });
  
  // DB 업서트 (upsert on content_id)
  await supabase.from('wk_festivals').upsert(
    festivals.map(f => ({
      content_id: f.contentid,
      title: f.title,
      addr1: f.addr1,
      area_code: f.areacode,
      sigungu_code: f.sigungucode,
      mapx: parseFloat(f.mapx),
      mapy: parseFloat(f.mapy),
      first_image: f.firstimage,
      event_start: f.eventstartdate,
      event_end: f.eventenddate,
      tel: f.tel,
      synced_at: new Date().toISOString(),
    })),
    { onConflict: 'content_id' }
  );
  
  // AI 요약이 없는 축제에 대해 Gemini로 한 줄 요약 생성
  const noSummary = await supabase
    .from('wk_festivals')
    .select('content_id, title, overview')
    .is('ai_summary', null)
    .limit(20);
    
  // 배치로 AI 요약 생성 (비용 절약을 위해 batch)
  // ...
}
```

### 6-3. 관광지 동기화 로직 (`/api/cron/sync-spots`)

```typescript
// 주 1회: 주요 지역 관광지 데이터 동기화
// 전국 5만개를 한 번에 가져오지 않고, 주요 시도별 점진적 동기화
const PRIORITY_AREAS = [1, 2, 3, 4, 5, 6, 7, 8, 31, 32]; // 서울~경남, 충청

async function syncSpots() {
  for (const areaCode of PRIORITY_AREAS) {
    const spots = await tourApi.areaBasedList({
      areaCode,
      contentTypeId: 12,  // 관광지
      numOfRows: 1000,
    });
    
    // DB 업서트
    await supabase.from('wk_spots').upsert(/* ... */);
    
    // API 호출 간격 조절 (TourAPI 일일 호출 제한 대응)
    await delay(500);
  }
}
```

---

## 7. 프론트엔드 핵심 화면 설계

### 7-1. 전용 레이아웃 (`/weekend/layout.tsx`)

기존 사이드바 레이아웃을 사용하지 않고, 모바일 퍼스트 독립 레이아웃을 사용합니다.

```
┌─────────────────────────────┐
│  🏖 이번 주말    [📍 위치]    │  ← 최소 헤더 (로고 + 위치 설정)
├─────────────────────────────┤
│                             │
│       (콘텐츠 영역)          │  ← 풀 스크린 콘텐츠
│                             │
├─────────────────────────────┤
│  [홈]  [코스만들기]  [저장됨]  │  ← 하단 탭 바 (모바일 네이티브 느낌)
└─────────────────────────────┘
```

### 7-2. 홈 화면 (`/weekend/page.tsx`)

```
┌──────────────────────────────┐
│  이번 주말                    │
│  4월 12~13일 · 서울 강남      │
│                              │
│  ┌────────────────────────┐  │
│  │  🌤 토요일 22° 맑음     │  │  ← WeatherBar
│  │  🌧 일요일 15° 오후 비  │  │
│  │  → 토요일이 외출 적기!  │  │
│  └────────────────────────┘  │
│                              │
│  📍 이번 주말 근처 축제       │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │서울숲 │ │한강  │ │성수  │ │  ← 가로 스크롤 FestivalBadge
│  │플리마켓│ │야시장│ │마켓  │ │
│  │오늘마감│ │D-2  │ │이번주│ │
│  └──────┘ └──────┘ └──────┘ │
│                              │
│  ┌────────────────────────┐  │
│  │  ✨ 코스 만들어줘       │  │  ← 메인 CTA 버튼
│  │  3가지 선택 → 10초 완성  │  │
│  └────────────────────────┘  │
│                              │
│  🌸 지금 가면 좋은 곳        │
│  ┌──────────┐ ┌──────────┐  │
│  │ 서울숲    │ │ 올림픽   │  │  ← SpotCard 2열 그리드
│  │ 겹벚꽃   │ │ 공원     │  │
│  │ 만개     │ │ 장미원   │  │
│  └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐  │
│  │ 남산타워  │ │ 북촌    │  │
│  │ 야경추천  │ │ 한옥마을│  │
│  └──────────┘ └──────────┘  │
└──────────────────────────────┘
```

### 7-3. 코스 생성 위자드 (`/weekend/course/page.tsx`)

3단계 카드 선택 UI → 로딩 → 결과

```
Step 1/3 — 얼마나 쓸 수 있어요?
┌────────┐  ┌────────┐  ┌────────┐
│ 반나절  │  │ 하루   │  │ 느긋하게│
│ 3~4시간 │  │ 6~8시간│  │ 여유롭게│
└────────┘  └────────┘  └────────┘

Step 2/3 — 누구랑 가요?
┌────────┐  ┌────────┐
│ 혼자   │  │ 연인   │
└────────┘  └────────┘
┌────────┐  ┌────────┐
│ 가족   │  │ 친구들 │
└────────┘  └────────┘

Step 3/3 — 뭐가 좋아요? (복수 선택)
┌────────┐  ┌────────┐  ┌────────┐
│ 자연   │  │ 맛집   │  │ 전시   │
└────────┘  └────────┘  └────────┘
┌────────┐  ┌────────┐  ┌────────┐
│ 카페   │  │ 액티비티│  │ 사진   │
└────────┘  └────────┘  └────────┘

[코스 만들기 →]
```

### 7-4. 코스 결과 화면 (`/weekend/course/[id]/page.tsx`)

```
┌──────────────────────────────┐
│  🗓 토요일 반나절 코스         │
│  서울 강남 출발 · 3.2km       │
│                              │
│  ○ 10:00 ────────────────    │
│  │ 서울숲 산책 (1시간)       │
│  │ 겹벚꽃 만개. 사슴방사장   │
│  │ 옆 길이 포토존            │
│  │ 📷                       │
│  │                          │
│  ○ 11:30 ────────────────    │
│  │ 성수동 카페 (1시간)       │
│  │ 도보 10분. 주말 웨이팅    │
│  │ 적은 곳 위주              │
│  │                          │
│  ○ 13:00 ────────────────    │
│  │ 뚝섬 맛집거리 (1시간)    │
│  │ 점심 피크 전 도착 추천    │
│  │                          │
│  ○ 14:30 ────────────────    │
│  │ 🎉 서울숲 플리마켓 (자유) │
│  │ 오늘 10시~17시. 빈티지    │
│  │ 올 주말 마지막!           │
│  │                          │
│  ────────────────────────    │
│  💡 서울숲 2번 출구 쪽       │
│     주차장이 가장 여유        │
│                              │
│  ┌────────────────────────┐  │
│  │  🗺 카카오맵으로 열기    │  │  ← KakaoMapButton
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │  🔗 코스 공유하기       │  │  ← 카카오톡/링크 복사
│  └────────────────────────┘  │
│                              │
│  ─── 참고 ──────────────     │
│  사주상 이번 달은 자연 속     │
│  활동에서 좋은 기운을 받을    │
│  수 있는 시기예요.           │  ← SajuTip (작고 가벼운 배치)
└──────────────────────────────┘
```

---

## 8. PWA 설정

### 8-1. manifest (`public/manifest-weekend.json`)

```json
{
  "name": "이번 주말 — AI 나들이 코스 플래너",
  "short_name": "이번 주말",
  "description": "매주 금요일 열어보는 주말 나들이 AI 코스 플래너",
  "start_url": "/weekend",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "/icons/weekend-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/weekend-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 8-2. 금요일 알림 (Push Notification)

```
매주 금요일 18:00 → "이번 주말 근처에서 뭐하지? 🎉 축제 3개 진행 중!"
```

Web Push API + Service Worker로 구현. Supabase에 구독 정보 저장.
(1단계에서는 생략, 4단계에서 구현)

---

## 9. 환경변수

```env
# TourAPI
TOUR_API_KEY=                     # data.go.kr에서 발급

# 기상청
WEATHER_API_KEY=                  # data.go.kr에서 발급

# 카카오
NEXT_PUBLIC_KAKAO_MAP_KEY=        # 프론트엔드 지도 표시용
KAKAO_REST_KEY=                   # 서버사이드 길찾기 API용

# AI (기존 환경변수 재사용)
GOOGLE_GENERATIVE_AI_API_KEY=     # 이미 있음 (사주 서비스용)

# 한국천문연구원 (선택)
SUNRISE_API_KEY=                  # 일출일몰 API
```

---

## 10. 구현 우선순위 & 마일스톤

### Phase 1: 데이터 기반 (공모전 제출 전 — ~5월 초)

**목표: 데모 가능한 최소 동작 화면**

- [ ] `lib/tour-api.ts` — TourAPI 클라이언트 구현
- [ ] `lib/weather-api.ts` — 기상청 API 클라이언트
- [ ] Supabase 테이블 생성 (`010_weekend_tables.sql`)
- [ ] `/api/cron/sync-festivals` — 축제 데이터 수집
- [ ] `/weekend/page.tsx` — 홈 화면 (축제 + 날씨)
- [ ] 기본 UI 컴포넌트 (SpotCard, FestivalBadge, WeatherBar)

### Phase 2: AI 코스 MVP (5~6월)

- [ ] `lib/weekend-ai.ts` — Gemini 코스 생성 로직
- [ ] `/api/weekend/course` — 코스 생성 API
- [ ] `/weekend/course/page.tsx` — 3단계 위자드
- [ ] `/weekend/course/[id]/page.tsx` — 코스 결과 화면
- [ ] 카카오맵 연동 (KakaoMapButton)
- [ ] 코스 공유 (카카오톡 + URL)

### Phase 3: 상세 & 부가 (7~8월)

- [ ] `/weekend/spot/[contentId]/page.tsx` — 관광지 상세
- [ ] 시의성 정보 (계절, 시간대, 혼잡도)
- [ ] 사주 코멘트 (`SajuTip`)
- [ ] PWA manifest + Service Worker
- [ ] 코스 저장·즐겨찾기

### Phase 4: 고도화 (9월)

- [ ] Push 알림 (금요일 18시)
- [ ] 다양한 지역 테스트 & 데이터 품질 개선
- [ ] 성능 최적화 (이미지 lazy load, API 캐싱)
- [ ] 사용자 피드백 반영

---

## 11. 비용 추정 (월간)

| 항목 | 비용 | 비고 |
|------|------|------|
| Vercel Pro | $20 | 이미 사용 중 |
| Supabase Free | $0 | Free 티어 (500MB DB) |
| TourAPI | 무료 | 공공데이터 (일 1,000건 이하) |
| 기상청 API | 무료 | 공공데이터 |
| Gemini AI | ~$5~10 | 코스 생성당 ~0.01$ × 일 500건 가정 |
| 카카오맵 | 무료 | 일 30만건 이하 |
| **합계** | **~$25~30/월** | |

---

## 12. 리스크 & 대응

| 리스크 | 확률 | 대응 |
|--------|------|------|
| TourAPI 일일 호출 제한 | 중 | DB 캐싱으로 API 호출 최소화, 일일 동기화 패턴 |
| Gemini 응답 지연 (>10초) | 중 | 로딩 UX + 타임아웃 30초 + 폴백 (flash 모델) |
| TourAPI 데이터 품질 (빈 필드) | 높음 | overview 없으면 AI가 title+주소로 추론, 이미지 없으면 카테고리별 기본 이미지 |
| 위치 정보 거부 | 중 | 수동 지역 선택 UI (시도/시군구 드롭다운) |
| 공모전 마감 전 완성 부담 | 중 | Phase 1만 완성하고 제출, 나머지는 스크린샷/기획서로 보완 |
