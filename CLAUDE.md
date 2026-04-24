# 이모추! (EmoChoo) — AI 주말 나들이 코스 플래너

## 프로젝트 개요
**이모추!**(이번 주에 모하지 추천)는 한국관광공사 TourAPI와 AI를 활용한 주말 나들이 코스 추천 서비스.
2026 관광데이터 활용 공모전 출품작 (마감: 2026.5.6)

## 개발자
- 이름: 박재오
- 이메일: bgg8988@gmail.com

## 기술 스택
| 항목 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| AI 엔진 | Google Gemini (gemini-2.5-flash → gemini-2.5-flash-lite → gemini-2.0-flash) |
| 관광 데이터 | 한국관광공사 TourAPI 4.0 (KorService2) — 11개 API 활용 |
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

## TourAPI 활용 현황 (11개 API)
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

## 공모전 정보
- 대회: 2026 관광데이터 활용 공모전 (한국관광공사)
- 마감: 2026.5.6
- 필수: TourAPI 3개 이상 활용, 상용 서비스 런칭, 콘텐츠랩 회원가입
- 심사: 기획력(25) + 기술성(25) + 디자인(20) + 활용성(15) + 발전성(15) + 지역(2)
