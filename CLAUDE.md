# 이모추! (EmoChoo) — AI 주말 나들이 코스 플래너

## 프로젝트 개요
**이모추!**(이번 주에 모하지 추천)는 한국관광공사 TourAPI와 AI를 활용한 주말 나들이 코스 추천 서비스.
2026 관광데이터 활용 공모전 출품작 — 웹·앱 개발 부문 (1차 심사자료 접수 ~2026-09-21 16:00)

> 🎯 **킥 = 사주(오행).** 근거·실측은 `docs/2026-08-29-킥-사주-인수인계.md`.
> **홈의 기준 축은 「이번 주말」이다**(2026-09-03) — 주말 나들이 서비스라 오늘 기준이면 어긋난다.
> `getWeekendElements()` 가 토·일 오행을 주고, **같으면 합쳐 크게 / 다르면 나란히** 두 상태를 그린다
> (연속 이틀이 같을 확률이 절반이라 둘 다 흔하다). 시안: `design/` · 캔버스 아티팩트.
> **두 축은 분리돼 있다**: 기분은 **사용자가 직접** 고르고(`SET_FEELING`), 사주는 **조언**이며 오늘의 오행이 `elementScore()` 로 **장소 점수**에 얹힌다(최대 5점). 사주는 feeling 을 정하지 않는다.
> `getTodayElement()` 가 일주 기준이라 **날마다 답이 바뀐다** — 그게 리텐션 장치다.
> 🔴 남은 것: **육안 확인**(playwright 없음) · **홈 화면 「오늘의 기운」 노출**.
> ⏳ **제출이 킥보다 먼저다** — 마감 2026-09-21 16:00. 하네스·루프는 `docs/2026-08-13-하네스-작업-인수인계.md`.

> 💰 **실서비스 과금·저장·공유는 `docs/2026-08-31-실서비스-과금-저장-공유-설계.md`.**
> 🔴 **배포 전에 마이그레이션을 `013 → 014 → 015` 순서로 실행한다** — 순서가 뒤바뀌면 공유 링크가 404 가 된다.
> 코스 생성은 이제 **1회 생성**(B는 눌러야 만들어짐)이고, 개인·전체 **일일 상한**이 걸려 있다.
> 코스 편집(장소 교체·순서)은 **편집 토큰**으로 권한을 가른다. 로그인은 `NEXT_PUBLIC_AUTH_ENABLED` 로 **기본 꺼짐**.

## 개발자
- 이름: 박재오
- 이메일: bgg8988@gmail.com

## 기술 스택
| 항목 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| AI 엔진 | Google Gemini (gemini-2.5-flash → gemini-2.5-flash-lite → gemini-2.0-flash) |
| 관광 데이터 | 한국관광공사 **OpenAPI 2종 · 오퍼레이션 12개** (KorService2 11 + KorWithService2 1) |
| 날씨 데이터 | 기상청 단기예보 API |
| DB | Supabase (코스 저장/공유) |
| 지도 | Kakao Maps SDK |
| Deployment | Vercel (예정) |

## 핵심 기능
1. **AI 코스 생성**: 위치+취향+동반자+기분 → Gemini AI가 최적 코스 설계
2. **TourAPI 연동**: 관광지/음식점/축제/숙박 등 실시간 공공데이터 활용
3. **날씨 반영**: 기상청 API로 주말 날씨 확인, AI가 날씨 고려한 코스 추천
4. **축제 통합**: 주변 진행 중 축제를 코스에 자동 반영
5. **1박2일 코스**: 숙박 연동, 일차별 코스 분리
6. **감정 기반 추천**: 피곤함/에너지/로맨틱/힐링/모험/맛집 6가지 기분 반영
7. **동반자 맞춤**: solo/couple/family/friends별 편의시설(유모차/키즈/주차) 반영
8. **카카오맵 연동**: 코스 지도 표시, 내비게이션 연결, 카카오톡 공유
9. **코스 저장/공유**: Supabase에 저장, 고유 URL로 공유

## 환경변수
```
TOUR_API_KEY=         # 한국관광공사 TourAPI 인증키
WEATHER_API_KEY=      # 기상청 단기예보 API 인증키
GEMINI_API_KEY=       # Google Gemini API 키
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_KAKAO_JS_KEY=  # Kakao JavaScript 앱 키

# 운영 파라미터 (없으면 기본값. 상세: docs/2026-08-31-실서비스-과금-저장-공유-설계.md)
COURSE_DAILY_LIMIT_PER_CLIENT=20   # 한 사람당 하루 코스 생성 수
COURSE_DAILY_LIMIT_GLOBAL=500      # 서비스 전체 하루 상한 = 하루 최대 지출
USAGE_HASH_SALT=                   # IP 해시 솔트. 운영에선 지정 권장
COURSE_TTL_DAYS=30                 # 공유·저장 안 한 코스의 보관 기간
NEXT_PUBLIC_AUTH_ENABLED=          # 로그인 스위치. OAuth 공급자 설정 후에만 true
NEXT_PUBLIC_AUTH_PROVIDER=         # kakao(기본) | google. 카카오가 KOE205로 막히면 google 로 우회
```

## 파일 구조 (Phase 1·2·3 재디자인 반영)
```
app/
  layout.tsx                        — 루트 레이아웃 (GlobalHeader, BottomTabBar, LocationProvider, {modal} slot, KakaoSDK)
  page.tsx                          — / (Home — 매거진 레이아웃)
  globals.css                       — 토큰(@theme inline) + 폰트 + shimmer/fadeIn 키프레임
  (pages)/
    course/page.tsx                 — /course (Wizard 마운트)
    course/[slug]/page.tsx          — /course/:slug (CourseResultShell)
    festival/page.tsx               — /festival (FestivalPageShell)
  spot/[contentId]/page.tsx         — /spot/:id 전용 페이지 (server, generateMetadata OG)
  @modal/
    default.tsx                     — Parallel Route 빈 slot
    (.)spot/[contentId]/page.tsx    — 인터셉트된 모달 (client)
  api/
    home/route.ts                   — GET 홈 데이터 (날씨+축제+추천)
    course/route.ts                 — POST AI 코스 생성
    course/[slug]/route.ts          — GET 저장된 코스
    spot/route.ts                   — GET 장소 상세
    spot/images/route.ts            — GET 장소 이미지
    festival/route.ts               — GET 축제 목록
    search/route.ts                 — GET 검색
  components/
    ui/                             — Phase 1 프리미티브 (Button, Card, Badge, Container, SectionHeader)
    nav/                            — GlobalHeader, BottomTabBar, LocationContext/Selector/Modal, GlobalSearchBar
    home/                           — HomeHero, MagazineGrid, HomeView, WeatherCard, FestivalSideList
    course/
      wizard/                       — WizardShell, Stepper, ProgressBar, Nav, steps/Step*.tsx
      loading/                      — CourseLoading, SkeletonStopCard
      result/                       — CourseResultShell, Summary, DayTabs, Timeline, StopCard, CourseTip, SaveShareBar, CourseMapPane
    festival/                       — FestivalPageShell, Header, FilterBar, Radius, RegionFilter, Grid, Card, Skeleton, Empty
    spot/                           — SpotDetail, SpotDetailSkeleton, SpotDetailModalFrame, SpotPageBackButton
    SpotCard.tsx                    — Home 관광지 카드
    FestivalBadge.tsx               — Home 축제 카드 (가로 스크롤)
    FacilityBadges.tsx              — 편의시설 뱃지 (Lucide + size API)
    ImageGallery.tsx                — 가로 스크롤 갤러리 (next/image)
    SearchBar.tsx                   — Home 검색 입력
    KakaoSDK.tsx                    — Kakao SDK 로더
lib/
  weekend-types.ts                  — 공용 타입 정의
  weekend-ai.ts                     — Gemini 코스 생성 엔진
  tour-api.ts                       — TourAPI 4.0 클라이언트
  weather-api.ts                    — 기상청 API 클라이언트
  course-role.ts                    — stop role 매핑 (contentTypeId → spot/food/cafe/festival/stay)
  hero-copy.ts · hero-image.ts      — Home Hero 카피/이미지 선택
  use-course-generation.ts          — Wizard → AI 호출 + 로딩 메시지 훅
  use-active-stop.ts                — Timeline ↔ Map 연동 상태
  use-home-data.ts                  — Home 데이터 fetch
  supabase/
    server.ts · client.ts · admin.ts
docs/
  superpowers/specs/                — Phase 1·2·3 spec 문서
  superpowers/plans/                — Phase 1·2·3 plan 문서
  weekend-app-design.md · weekend-ai-engine-design.md · weekend-deploy-checklist.md
```

## TourAPI 활용 현황 — **OpenAPI 2종 · 오퍼레이션 12개**

> 🔴 **서류에는 「12개」로 적는다.** 2026-08-18 무장애 활용신청이 승인되어 상품이 2종이 됐다.
> 「11개」로 적으면 **과소 신고**이고, 데이터 활용 배점(20점)에서 손해다.
| API | 용도 |
|-----|------|
| searchFestival2 | 주변 축제 검색 |
| locationBasedList2 | 위치 기반 관광지/음식점/숙박 검색 |
| areaBasedList2 | 지역 기반 관광지 검색 |
| detailCommon2 | 장소 공통 상세정보 |
| detailIntro2 | 소개 상세정보 (운영시간, 편의시설) |
| detailImage2 | 이미지 목록 |
| detailInfo2 | 반복 정보 (코스, 객실 등) |
| searchKeyword2 | 키워드 검색 |
| searchStay2 | 숙박 검색 |
| areaCode2 | 지역 코드 조회 |
| categoryCode2 | 분류 코드 조회 |

**별도 API 상품** (상품ID 15101897, 서비스ID `KorWithService2`)

| API | 용도 |
|-----|------|
| detailWithTour2 | 무장애 여행 정보 — 휠체어·시각·청각·영유아 4그룹 29개 필드 |

## 콘텐츠 타입 ID
| ID | 분류 |
|----|------|
| 12 | 관광지 |
| 14 | 문화시설 |
| 15 | 행사/축제 |
| 28 | 레포츠 |
| 32 | 숙박 |
| 39 | 음식점 |

## AI 엔진 핵심 로직 (`lib/weekend-ai.ts`)
1. **후보 수집**: TourAPI로 위치/지역 기반 관광지 후보 수집
2. **사전 스코어링**: 역할(관광지/맛집/카페/문화/액티비티)별 + 취향 + 감정 + 편의시설 + 날씨 가중치 점수 계산
3. **편의시설 보강**: detailIntro에서 유모차/반려동물/키즈/주차/운영시간 정보 추출
4. **AI 코스 생성**: Gemini에 스코어링된 후보 + 조건 + 날씨를 전달, JSON 코스 생성
5. **검증**: contentId 유효성, 시간순서, 동선 거리 검증 → 실패 시 폴백 코스 자동 생성

## 개발 규칙
- `.env` 파일 절대 커밋 금지
- API 키는 모두 서버사이드에서만 사용 (NEXT_PUBLIC_ 접두사 사용 주의)
- 모바일 퍼스트 디자인 (max-w-lg 기준)
- CookieRun 폰트 (제목), Pretendard 폰트 (본문)
- 테마 색상: 배경 #FFF8F0, 액센트 orange-400~500

## 공모전 정보 (2026-08-10 갱신)
- 대회: 2026 관광데이터 활용 공모전 (한국관광공사) — **웹·앱 개발 부문**, 예비심사 **합격**
- **1차 심사자료 접수: 2026-08-10 ~ 09-21 16:00 정각** (제출 후에도 마감 전까지 수정 가능)
- 제출처: 한국관광 콘텐츠랩 `api.visitkorea.or.kr` → 공모전 접수확인
- 1차 배점: 기획력 30 + 완성도 30 + 데이터 활용 20 + 발전성 20 (가점: Start-up NEST·지역특화 각 +2)
- 필수: 공사 **OpenAPI 형태만 인정**(파일 데이터 불가) · 개발 완료된 완성 서비스
- 제출 필수 = **인증키(인코딩·디코딩)** / 운영계정 신청은 **선택**
- 🔴 **인증키로 「개발 기간 내 호출건수」를 검증**한다 → 캐시로 때우면 이력이 안 남는다
- 출처 표기: `출처: ⓒ한국관광공사` (**`TourAPI` 단독 표기 지양**, 로고 불가·텍스트만)
- 상세: 옵시디언 위키 `프로젝트-이모추`

## 🔁 Loops
- 🔖 **하네스 작업을 이어받는다면 `docs/2026-08-13-하네스-작업-인수인계.md` 부터 읽어라** — 남은 일·순서·되풀이하지 말 것이 거기 있다
- **먼저 해당 Loop 의 `PROGRESS.md` 를 읽어라.** 상태·다음 할 일·`Do Not Repeat` 이 거기 있다
- `loops/tourapi-watch/` — KorService2 **11개 오퍼레이션** 실호출 감시 + 폐기 예정 API 경보 (`node loops/tourapi-watch/smoke.mjs`)
  - 무장애(`KorWithService2`)는 이 루프가 아니라 `submission-check` 의 `barrier-free` 항목이 본다
- `loops/release-green/` — test·lint·build 배포 가능 상태 (`node loops/release-green/gate.mjs`)
- `loops/submission-check/` — 1차 제출 항목 9종 (`node loops/submission-check/check.mjs`)
- 공통: 스크립트가 **검사 단일 경유점**. 권한 **사다리 1단계**(읽기+리포트). 소스 수정·commit·push 금지
- ⚠️ **권한 정책 (2026-08-13)**: `.claude/settings.json` 에서 `git commit`·`git push` 는 **deny 가 아니라 ask** 다. 예전엔 deny 라 레포의 **모든** 세션이 막혔다(Loop 세션만이 아니다). 이제 실행은 되지만 **매번 사람 승인**을 거친다 — 🔴 특히 `git push` 는 **Vercel 배포를 트리거**하므로 프롬프트를 습관적으로 넘기지 말 것. Loop 의 commit·push 금지는 각 `LOOP_INSTRUCTIONS.md` 의 Safety Rules 가 지킨다 — 도구가 대신 막아주지 않는다
