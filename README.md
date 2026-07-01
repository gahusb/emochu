# 이모추! (EmoChoo) 🧭

> **이번 주에 모하지, 추천** — 감정·동반자·사주 3축으로 짜는 AI 주말 나들이 코스 플래너

한국관광공사 **TourAPI 4.0**과 **Google Gemini**를 결합해, 위치·취향·동반자·기분(그리고 선택적으로 사주 기운)을 반영한 최적의 주말 나들이 코스를 설계해 주는 서비스입니다.

**2026 관광데이터 활용 공모전** (한국관광공사 · 웹·앱 개발 부문) 출품작 — 🎉 **예비심사 합격** (2026-05-18).

---

## ✨ 핵심 차별화

거리·평점 위주의 일반 여행 추천 앱과 달리, **감정·동반자·사주** 세 축으로 코스를 설계합니다.

| 축 | 설명 |
|----|------|
| 😌 **감정** | 피곤함/에너지/로맨틱/힐링/모험/맛집 6가지 기분을 코스 구성과 톤에 반영 |
| 👨‍👩‍👧 **동반자** | solo/couple/family/friends별 편의시설(유모차·키즈·주차·반려동물) 우선 반영 |
| 🔮 **사주** | 생년 기반 오행 기운을 코스 톤에 주입 *(이모추 단독 기능)* |

---

## 🎯 주요 기능

1. **AI 코스 생성** — 위치 + 취향 + 동반자 + 기분을 입력하면 Gemini AI가 최적 코스를 설계
2. **TourAPI 실시간 연동** — 관광지/음식점/축제/숙박 등 공공데이터 11종 API 실시간 호출
3. **날씨 반영** — 기상청 단기예보 API로 주말 날씨를 확인해 AI가 실내/실외 코스 조정
4. **축제 통합** — 주변에서 진행 중인 축제를 코스에 자동 반영
5. **1박2일 코스** — 숙박 연동으로 일차별 코스 분리 제공
6. **사주 기운 톤** — 생년 오행 → 감정 매핑으로 코스 설명 카피 변형 (운세 옵션 A)
7. **카카오맵 연동** — 코스 지도 표시, 내비게이션 연결, 카카오톡 공유
8. **코스 저장/공유** — Supabase에 저장 후 고유 URL로 공유

---

## 🛠 기술 스택

| 항목 | 기술 |
|------|------|
| Framework | **Next.js 16** (App Router, TypeScript strict) |
| UI | **React 19** + **Tailwind CSS v4** |
| AI 엔진 | **Google Gemini** (`gemini-2.5-flash` → `gemini-2.5-flash-lite` → `gemini-2.0-flash` 3단 폴백) |
| 관광 데이터 | 한국관광공사 **TourAPI 4.0** (KorService2) — 11개 API |
| 날씨 | 기상청 단기예보 API |
| DB | **Supabase** (코스 저장/공유) |
| 지도 | Kakao Maps SDK |
| 테스트 | **Vitest 4** (27 tests) |
| 배포 | Vercel |

---

## 🚀 시작하기

### 1. 환경변수 설정

`.env.local.example`를 복사해 `.env.local`을 만들고 값을 채웁니다.

```bash
cp .env.local.example .env.local
```

```env
TOUR_API_KEY=               # 한국관광공사 TourAPI 인증키
WEATHER_API_KEY=            # 기상청 단기예보 API 인증키
GEMINI_API_KEY=            # Google Gemini API 키
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_KAKAO_JS_KEY=  # Kakao JavaScript 앱 키
```

> ⚠️ API 키는 모두 서버사이드에서만 사용합니다. `NEXT_PUBLIC_` 접두사는 클라이언트 노출이 필요한 값(Supabase anon, Kakao JS key)에만 사용하세요.
> 커스텀 도메인 배포 시 Vercel에 `NEXT_PUBLIC_SITE_URL`을 실제 도메인으로 설정해야 robots/sitemap/OG가 올바른 도메인을 가리킵니다 (미설정 시 `emochu.vercel.app` 폴백).

### 2. 개발 서버 실행

```bash
npm install
npm run dev        # http://localhost:3000
```

### 3. 명령어

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 프로덕션 서버 |
| `npm run lint` | ESLint 9 (flat config) |
| `npm test` | Vitest 실행 (27 tests) |
| `npm run test:watch` | Vitest watch 모드 |

---

## 🧠 AI 엔진 로직 (`lib/weekend-ai.ts`)

```
① 후보 수집        TourAPI로 위치/지역 기반 관광지·음식점·숙박 후보 수집
② 사전 스코어링    역할(관광지/맛집/카페/문화/액티비티) × 취향 × 감정 × 편의시설 × 날씨 가중치
③ 편의시설 보강    detailIntro에서 유모차/반려동물/키즈/주차/운영시간 추출
④ AI 코스 생성     Gemini에 스코어링된 후보 + 조건 + 날씨 + 사주 톤 전달 → JSON 코스
⑤ 검증 & 폴백      contentId 유효성 · 시간순서 · 동선 거리 검증 → 실패 시 규칙 기반 폴백 코스
```

- **3단 모델 폴백**: `gemini-2.5-flash` → `gemini-2.5-flash-lite` → `gemini-2.0-flash`
- **contentId 자동 교정** + **규칙 기반 폴백 코스**로 라이브 데모 안정성 확보

---

## 🗺 TourAPI 활용 (11개 API)

`searchFestival2` · `locationBasedList2` · `areaBasedList2` · `detailCommon2` · `detailIntro2` · `detailImage2` · `detailInfo2` · `searchKeyword2` · `searchStay2` · `areaCode2` · `categoryCode2`

> 데이터 활용은 **OpenAPI 실시간 호출** 방식만 사용합니다 (`revalidate: 60`). 파일(Excel/CSV) 다운로드 활용 없음 — 공모전 규정 준수.

### 콘텐츠 타입 ID

| ID | 분류 | | ID | 분류 |
|----|------|---|----|------|
| 12 | 관광지 | | 28 | 레포츠 |
| 14 | 문화시설 | | 32 | 숙박 |
| 15 | 행사/축제 | | 39 | 음식점 |

---

## 📁 프로젝트 구조

```
app/
  layout.tsx              루트 레이아웃 (GlobalHeader, BottomTabBar, LocationProvider, KakaoSDK)
  page.tsx                / (Home — 매거진 레이아웃 + 3축 차별화 섹션)
  opengraph-image.tsx     브랜드 OG 카드 (ImageResponse)
  robots.ts · sitemap.ts  동적 SEO
  (pages)/
    course/               /course (Wizard), /course/[slug] (결과)
    festival/             /festival
  spot/[contentId]/       /spot/:id 상세 (server + generateMetadata OG)
  @modal/                 Parallel Route — 인터셉트된 spot 모달
  api/                    home · course · course/[slug] · spot · spot/images · festival · search
  components/
    ui/ nav/ home/ course/ festival/ spot/ ...
lib/
  weekend-ai.ts           Gemini 코스 생성 엔진
  tour-api.ts             TourAPI 4.0 클라이언트
  weather-api.ts          기상청 API 클라이언트
  saju.ts                 사주 오행 → 감정 매핑 (운세 옵션 A)
  course-role.ts          contentTypeId → stop role 매핑
  site-url.ts             베이스 URL 단일 출처
  supabase/               server · client · admin
tests/                    Vitest — 순수(saju/course-role/weekend-ai) + 모킹(api/generate)
docs/                     공모전 제안서 · 실행계획 · 설계 문서
```

전체 구조·컨텍스트는 [`CLAUDE.md`](./CLAUDE.md) 참조.

---

## 🧪 품질 & 테스트

| 영역 | 상태 |
|------|------|
| 빌드 | `npm run build` ✅ (정적 14/14, 에러 0) |
| 타입 | TypeScript `strict: true` ✅ |
| 린트 | ESLint 9 flat config ✅ (0 errors) |
| 테스트 | Vitest **27 passed** (6 files) ✅ |

**테스트 구성**
- **순수 로직**: `saju`(오행 결정성·상생상극), `course-role`(역할 매핑), `weekend-ai`(haversine·폴백 코스·카카오 내비 URL·공유 slug)
- **모킹 통합**: `api-search`(TourAPI 400/200/500), `api-course-slug`(Supabase 400/404/200), `generate-course`(Gemini 폴백 체인)

---

## 📅 공모전 진행 상황

| 단계 | 상태 |
|------|------|
| 예비심사 | 🎉 **합격** (2026-05-18) |
| 온라인 설명회(OT) | ✅ 종료 (2026-05-20) |
| 서비스 개발 기간 | ~ **2026-09-21** |
| **1차 심사 서류 제출** | 🚨 **2026-09-21(월) 16:00 마감** (기능심사) |
| 1차 합격자 발표 | 2026-10-21 |
| 최종 발표심사 | 2026-10-28 (상위 5팀) |
| 시상식 | 2026-11-05 |

**심사 배점**: 기획력(25) + 기술성(25) + 디자인(20) + 활용성(15) + 발전성(15) + 지역 특화(+2)

> 상세 실행계획은 [`docs/2026-06-29-실행계획-마스터.md`](./docs/2026-06-29-실행계획-마스터.md), 페이즈별 TODO는 [`TODOLIST.md`](./TODOLIST.md) 참조.

### 최근 진행 (2026-06-29)

- ✅ 운세 옵션 A(사주 오행 톤) end-to-end 완성 (`lib/saju.ts` + Wizard + 코스 프롬프트 주입)
- ✅ TourAPI 캐싱 규정 준수 (`revalidate: 60`, 파일 활용 없음)
- ✅ 배포/SEO 정리 (PWA 아이콘, `metadataBase`, robots/sitemap, 베이스 URL 단일화)
- ✅ ESLint 9 flat config 복구 (0 errors)
- ✅ Vitest 테스트 인프라 도입 (27 tests)
- ✅ 홈 첫인상 3축 차별화 디자인 (감정·동반자·사주)

---

## 👤 개발자

- **박재오** · bgg8988@gmail.com

## 📝 규칙

- `.env` 파일 절대 커밋 금지
- 모바일 퍼스트 디자인 (`max-w-lg` 기준)
- CookieRun 폰트(제목) + Pretendard 폰트(본문)
- 테마: 배경 `#FFF8F0`, 액센트 `orange-400~500`
