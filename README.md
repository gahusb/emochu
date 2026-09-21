# 이모추! (EmoChoo) 🧭

최신 배포: [9/13 축제 사진 전체 보기](docs/2026-09-13-축제사진-전체보기-개발결과.md). 대표 사진·썸네일 클릭으로 원본 비율 보기, 이전·다음과 원본 새 탭 열기, 중첩 화면의 포커스·스크롤 복구를 추가했습니다. 기능 6개 파일만 `5c7e757`로 커밋해 Vercel Production 반영 및 운영 UI 검증 완료. 전체 로컬 537 tests / lint / build, 격리 배포 커밋 234 tests / lint / build 통과. **iPhone 실기기 확인은 남아 있습니다.**

최신 배포: [9/12 카카오 공유 수정·운영 반영](docs/2026-09-12-카카오공유-수정-배포결과.md). 공유 수정과 테스트 두 파일만 `075b160`으로 커밋·푸시했습니다. 격리 배포 소스 221 tests 통과(공유 회귀 8개 포함), lint 오류 0, 빌드 성공. Vercel 배포 성공과 실제 운영 JS의 전체 코스 주소 변환, 기존 코스 페이지/API 200을 확인했습니다. **iPhone에서 새로 공유한 메시지의 ‘코스 보기’ 최종 확인은 남아 있습니다.** 다른 누적 변경과 DB 권한은 이번에 배포·변경하지 않았습니다.

최신 보안 확인: [9/11 DB 권한 보완 결과](docs/2026-09-11-DB-권한-보완-적용안.md). 사용자 017 실행 성공 보고 후 **23:20 KST 메타데이터에서 anon/authenticated의 대상 테이블·뷰·편집 토큰·사용량 함수 직접 접근 차단과 서버 권한 유지**를 확인했습니다. 기존 공개 조회 정책은 제거됐습니다. 실제 앱 공유·내 코스·편집 회귀 검사, 기존 토큰 처리 결정과 앱 배포는 남아 있습니다. 최신 로컬 게이트는 **22:18, 516 tests / lint / build GREEN**, 별도 격리 SQL 14개 통과입니다. 이번에는 메타데이터 검토·문서 갱신만 했으며 운영 호출이나 테스트 재실행은 하지 않았습니다.

이전 UI 개발: [9/11 운영시간 안내 수정](docs/2026-09-11-운영안내-수정-배포전점검.md). 단정 문구 2곳 수정, 1박2일 미확인 안내와 4개 폭·8개 상태 확인. [최신 배포 체크리스트](docs/weekend-deploy-checklist.md).

최신 검증: [9/11 iPhone 17 수동 검사](docs/2026-09-11-iPhone17-수동검증-결과.md). 사용자가 기본 조작에 특이사항 없음을 보고했고, 사진 5장에서 홈 확대·축제 필터 변경·상세 지도·최종 취향 입력을 확인했습니다. **AI 생성 이후 저장·공유의 실기기 검증은 남아 있습니다.**

[9/10 한도 회복·AI 재실측](docs/2026-09-10-한도회복-재실측-실서비스-검증.md)은 관광 상세 66/66 HTTP 200, 서울 AI 성공 후 강릉 429로 추가 호출 중단입니다. 최종 3조건은 AI 1/규칙 2, 운영시간 7/12 미확인입니다. viewport·작은 버튼·수정 문구의 배포 반영은 별도이며, iPhone에서는 확대된 화면을 확인했습니다. 이전 [상세 조회 보호·운영시간 표시 개발](docs/2026-09-10-상세조회-한도-운영시간-보완.md)과 [24조건 실측](docs/2026-09-09-24조건-검증-개발결과.md)은 보존합니다.

> **이번 주에 모하지, 추천** — 감정·동반자·사주 3축으로 짜는 AI 주말 나들이 코스 플래너

한국관광공사 **TourAPI 4.0**과 **Google Gemini**를 결합해, 위치·취향·동반자·기분(그리고 선택적으로 사주 기운)을 반영한 최적의 주말 나들이 코스를 설계해 주는 서비스입니다.

9/21 제출 대비 최신 검토·개발 계획: [2026-09-08 검토 보고서](docs/2026-09-08-제출대비-검토-개발계획.md). 생성일이 아닌 **KST 여행일** 기준으로 관광정보와 선택형 오행 테마를 대조합니다. 원본 확인은 실시간 영업·예약 가능 보장이 아니며, 거리와 이동시간은 추정입니다.

후속 개발: [9/9 식사·동선 보완 결과](docs/2026-09-09-식사-동선-보완-결과.md) · [9/9 초기 실데이터 검증](docs/2026-09-09-실데이터-검증-개발결과.md) · [최신 기능설명서 내용안](docs/2026-09-09-기능설명서-내용안.md). 실제 API 품질 측정은 `node scripts/verify-live-course.mjs`로 별도 실행하며, 실행당 AI 최대 3회·운영 DB 미사용입니다. `--replay report-날짜.json`은 같은 주말의 기존 일정을 관광정보로 재검증하며 AI를 호출하지 않습니다. 일반 테스트는 유료 AI를 호출하지 않습니다.

**2026 관광데이터 활용 공모전** (한국관광공사 · 웹·앱 개발 부문) 출품작 — 🎉 **예비심사 합격** (2026-05-18).

---

## ✨ 핵심 차별화

거리·평점 위주의 일반 여행 추천 앱과 달리, **감정·동반자·사주** 세 축으로 코스를 설계합니다.

| 축 | 설명 |
|----|------|
| 😌 **감정** | 피곤함/에너지/로맨틱/힐링/모험/맛집 6가지 기분을 코스 구성과 톤에 반영 |
| 👨‍👩‍👧 **동반자** | solo/couple/family/friends별 편의시설(유모차·키즈·주차·반려동물) 우선 반영 |
| 🔮 **사주 테마** | 출생연도 오행과 여행일 기운을 조합한 재미용 테마. 사용자 조건이 우선이며 비슷한 장소 후보에 최대5점 가산 |

---

## 🎯 주요 기능

1. **AI 코스 생성** — 위치 + 취향 + 동반자 + 기분을 입력하면 Gemini AI가 최적 코스를 설계
2. **TourAPI 연동** — 관광공사 2개 서비스 제품(KorService2·KorWithService2)의 12개 오퍼레이션 활용. 조회 실패·정보 없음은 미확인으로 처리
3. **날씨 반영** — 기상청 단기예보 API로 주말 날씨를 확인해 AI가 실내/실외 코스 조정
4. **축제 통합** — 주변 행사를 방문 날짜·시간표와 대조하여 코스 후보로 활용하고 식사와의 충돌을 보완
5. **1박2일 코스** — 숙박 연동으로 일차별 코스 분리 제공
6. **오행 테마** — 사용자가 고른 기분과 분리해, 여행일 기준 약한 후보 가산점과 설명에 반영
7. **카카오맵 연동** — 코스 지도 표시, 내비게이션 연결, 카카오톡 공유
8. **코스 저장/공유** — Supabase에 저장 후 고유 URL로 공유

---

## 🛠 기술 스택

| 항목 | 기술 |
|------|------|
| Framework | **Next.js 16** (App Router, TypeScript strict) |
| UI | **React 19** + **Tailwind CSS v4** |
| AI 엔진 | **Google Gemini** (코스 생성: `gemini-3.6-flash` → `gemini-3.5-flash` → `gemini-2.5-flash` 3단 폴백) |
| 관광 데이터 | 한국관광공사 **TourAPI 4.0** — 2개 상품·12개 오퍼레이션 (KorService2·KorWithService2) |
| 날씨 | 기상청 단기예보 API |
| DB | **Supabase** (코스 저장/공유) |
| 지도 | Kakao Maps SDK |
| 테스트 | **Vitest 4** (2026-09-11 22:18: 516 통과), 별도 격리 SQL 14개 통과 |
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
| 빌드 | Next 프로덕션 빌드 ✅ (2026-09-10 09:58 release-green) |
| 타입 | TypeScript `strict: true` ✅ |
| 린트 | ESLint 9 flat config ✅ (0 errors) |
| 테스트 | Vitest **500 passed / 기존 실연동 4 skip** ✅ |

**테스트 구성**

- **순수 로직**: `saju`(오행 결정성·상생상극), `course-role`(역할 매핑), `weekend-ai`(haversine·폴백 코스·카카오 내비 URL·공유 slug)
- **모킹 통합**: `api-search`(TourAPI 400/200/500), `api-course-slug`(Supabase 400/404/200), `generate-course`(Gemini 폴백 체인)
- **코스 품질 회귀**: 여행일·날씨 범위·운영/공연 시간·식사·이동·시간 예산, 24조건 정의·집계 분모·진단 호출 제한. 일반 테스트는 외부 AI를 호출하지 않습니다.

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
