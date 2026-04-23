# 이모추 Phase 1 — 디자인 시스템 + 글로벌 네비 + Home 재디자인

- **상태**: Approved (Brainstorming 완료, 2026-04-23)
- **Phase**: 1 of 3 (전체 UX/UI 리팩토링의 첫 단계)
- **다음 단계**: writing-plans 스킬로 구현 plan 작성

## 1. 배경 & 목표

이모추는 한국관광공사 TourAPI + Gemini AI를 활용한 주말 나들이 코스 추천 서비스. 현재 UI는 기능적으로는 작동하지만:

- 오렌지+핑크+바이올렛 그라데이션, glassmorphism, 다수의 이모지 사용으로 "AI가 만든 듯한 톤"이 강함
- `max-w-lg` 모바일 전용 레이아웃 → 데스크톱에서 가운데 좁은 영역만 사용, "웹에서 앱을 보는 답답함"
- 데스크톱과 모바일이 동일 레이아웃 → 데스크톱의 가로 공간 활용 0

### 목표
1. 신뢰감 있는 에디토리얼 톤(매거진 스타일) 으로 전환 → "제대로 만든 서비스" 인상
2. 진정한 반응형 — 데스크톱은 풍부하고 넓게, 모바일은 모든 기능 유지
3. AI 느낌 신호(그라데이션 / 이모지 / 과한 glassmorphism) 제거
4. 사진을 적극 활용하여 콘텐츠 가치 전달

### 비목표 (Out of scope, Phase 2/3로 이관)
- CourseWizard / CourseResult / CourseMap 재디자인 → Phase 2
- FestivalList / SpotDetailModal 재디자인 → Phase 3
- 저장한 코스 기능, 다국어, 다크 모드, 비디오 hero, 손그림 일러스트, 온보딩 → Backlog

## 2. 디자인 결정 사항

| 항목 | 결정 |
|------|------|
| 톤 | 따뜻한 에디토리얼 (마이리얼트립 / Airbnb) |
| 컬러 | 베이지(#FAF7F2) + 딥 테라코타(#C5532D) + 모카(#8B5E3C). 그라데이션 / 핑크 / 바이올렛 전부 제거 |
| 타이포 | 헤드라인 Gmarket Sans Bold, 본문 Pretendard, 로고만 CookieRun 유지 |
| 아이콘 | Lucide React 통일, 이모지 전부 제거 |
| 네비 (데스크톱) | 상단 글로벌 네비(로고+메뉴+검색+위치) + 페이지 내부 컨텍스트 사이드바 |
| 네비 (모바일) | 상단 헤더(로고+위치) + 하단 탭바 (현 구조 유지, 톤만 새로 입힘) |
| 검색바 | 데스크톱: 헤더 우측 / 모바일: home 페이지 안 (현재 위치) |
| 위치 셀렉터 | 데스크톱: 헤더 우측 끝 / 모바일: 상단 헤더 우측 (현재 위치) |
| Hero | 풀폭 에디토리얼 사진 (TourAPI 필터링 + 큐레이션 5장 폴백) + 날씨/시즌 기반 카피 |
| Home 데스크톱 | 매거진 8/4 분할 — 본문 좌측 (관광지 → AI CTA → 축제) / 사이드바 우측 sticky (날씨 → 축제 사이드 리스트 → 위치 패널) |
| Home 모바일 | 단일 컬럼, 사이드바 콘텐츠 본문 흐름에 합류 (기능 누락 0) |
| 위치 변경 모달 | Phase 1에 신규 — 검색 + GPS + 자주 쓴 위치(localStorage) |

## 3. 디자인 시스템 토큰

### 3.1 Color tokens (globals.css `@theme inline`에 추가)

```css
/* Surface */
--color-surface-base       #FAF7F2   /* 페이지 배경, 따뜻한 오프화이트 */
--color-surface-elevated   #FFFFFF   /* 카드 */
--color-surface-sunken     #F2EBE0   /* 섹션 구분, 위크엔드 베이지 */

/* Brand & Accent */
--color-brand              #C5532D   /* 딥 테라코타, 핵심 CTA·링크 */
--color-brand-hover        #A8421F
--color-brand-soft         #F5E0D5   /* 테라코타 8% 톤, 뱃지·셀렉트 배경 */

/* Neutral (warm brown) */
--color-ink-1              #2A241F   /* 제목 */
--color-ink-2              #4A4038   /* 본문 */
--color-ink-3              #7A6E62   /* 보조 텍스트 */
--color-ink-4              #A8917A   /* placeholder, 캡션 */
--color-line               #E8DFD2   /* 구분선, 카드 테두리 */

/* Functional */
--color-mocha              #8B5E3C   /* 보조 강조 */
--color-success            #5A7A4F   /* 운영 중 */
--color-warning            #B8860B   /* 마감 임박 */
--color-info               #4A6B8A   /* 날씨 정보 */
```

기존 `orange-400/500` 직접 사용, `from-orange-400 via-pink-400 to-violet-400` 그라데이션, `pink-*`, `violet-*`, `shadow-orange-200/50` 등은 home 영역과 글로벌 chrome에서 모두 제거.

### 3.2 Typography scale

```
Logo:          CookieRun Bold (브랜드 자산만 유지)
Headline (h1): Gmarket Sans Bold 36/44 (데스크톱), 28/36 (모바일)
Headline (h2): Gmarket Sans Bold 24/32
Title:         Pretendard SemiBold 18/26
Body:          Pretendard Regular 15/24
Caption:       Pretendard Medium 13/20
Micro:         Pretendard Medium 11/16
```

폰트 자산:
- `public/fonts/GmarketSansBold.otf`
- `public/fonts/GmarketSansMedium.otf`
- 기존 CookieRun 폰트 그대로 보존
- 라이선스: Gmarket Sans 무료 상업적 이용 가능

### 3.3 Spacing & Radius & Shadow

```
Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64 / 96 px (Tailwind 기본)
Radius:        sm 8px, md 12px, lg 16px, xl 24px
Shadow:
  --shadow-soft:    0 1px 2px rgba(42,36,31,0.04)
  --shadow-raised:  0 4px 12px rgba(42,36,31,0.06)
  /* 컬러드 섀도우(shadow-orange-200/50 등) 사용 금지 */
```

### 3.4 Breakpoints

```
sm  640px   (큰 모바일)
md  768px   (태블릿)
lg  1024px  (데스크톱 진입점, 사이드바 출현)
xl  1280px  (와이드 데스크톱)
2xl 1536px  (max-w-7xl 컨테이너 제한)
```

## 4. UI 프리미티브

`app/components/ui/` 하위에 5개 신규 생성. 각 컴포넌트는 토큰만 참조하며, 임의 컬러/사이즈를 직접 받지 않음.

| 컴포넌트 | 변형 / API |
|---------|----------|
| `Button` | variant: `primary` (테라코타 fill) / `secondary` (테라코타 아웃라인) / `ghost` (배경 없음). size: `sm` / `md` / `lg`. icon 슬롯 left/right 지원 |
| `Card` | variant: `default` (white + line) / `sunken` (베이지) / `elevated` (shadow-raised). children 그대로 |
| `Badge` | variant: `brand` / `mocha` / `success` / `warning` / `outline`. size: `sm` / `md` |
| `Container` | `max-w-7xl mx-auto px-5 lg:px-8` 단순 래퍼 |
| `SectionHeader` | h2(Gmarket) + 보조 설명(Pretendard ink-3) + 우측 "더보기 →" 슬롯 |

## 5. 글로벌 네비게이션

### 5.1 데스크톱 상단 네비 (≥lg)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [logo] 이모추        홈 · 코스 만들기 · 축제           [🔍 검색바] [📍서울 ▾] │
└─────────────────────────────────────────────────────────────────────────┘
   max-w-7xl, h-16, bg-surface-base/95 + backdrop-blur, border-b border-line
```

- **로고**: 작은 라인 일러스트(여행 가방, Lucide `Briefcase` 또는 자체 SVG) + "이모추" CookieRun Bold
- **메뉴**: 가로 텍스트 메뉴 3개 (홈 / 코스 만들기 / 축제). active: ink-1 + 하단 2px 테라코타 underline. inactive: ink-3 hover:ink-1
- **검색바**: 가운데~우측, `min-w-72`, Lucide `Search` 아이콘 + placeholder "장소·축제 검색". 포커스 시 width 280→400px transition. 클릭 시 SearchBar의 기존 로직 재사용
- **위치 셀렉터**: 우측 끝, Lucide `MapPin` + 도시명 + `ChevronDown`. 클릭 시 `LocationModal` 오픈
- 스크롤 시 `shadow-soft` 추가 (색상 변동 없음)

### 5.2 모바일 상단 헤더 (<lg)

```
┌──────────────────────────────────┐
│ [logo] 이모추            [📍서울 ▾] │
└──────────────────────────────────┘
   max-w-lg, h-14, bg-surface-base/90 + backdrop-blur
```

- 데스크톱 헤더의 축약형 — 메뉴는 하단 탭바로, 검색은 home 페이지 안으로 분산
- 위치 버튼: 둥근 pill → 사각 칩(`rounded-md`)으로 정돈

### 5.3 모바일 하단 탭바 (<lg)

```
   🏠 홈     ✨ 코스    🎉 축제
```
→ Lucide 아이콘으로 교체 (`Home` / `Sparkles` / `PartyPopper`)

- bg-surface-base/95 + backdrop-blur, border-t border-line
- active: 테라코타 fill 아이콘 + ink-1 텍스트 + 상단 2px 테라코타 막대
- inactive: ink-4 stroke 아이콘 + ink-3 텍스트
- 데스크톱(lg+)에서는 `lg:hidden`

### 5.4 위치 변경 모달 (Phase 1 신규)

현재 `WeekendHeader`의 `onLocationClick={() => {/* TODO */}}`를 채움.

- **구성 요소**:
  - 검색 입력 (주소/도시명) — Kakao 주소검색 또는 단순 텍스트→geocoding 호출
  - "현재 위치 사용" 버튼 (GPS 재요청)
  - 자주 가는 위치 5개 (localStorage 키 `emochu.recent_locations`, 최근 사용 순)
- **레이아웃**:
  - 데스크톱: 가운데 모달 max-w-md
  - 모바일: 바텀시트 (max-h-60vh, 키보드 올라와도 input 가려지지 않게 스크롤 보정)
- **동작**: 위치 변경 시 home 페이지의 weather / festival / spots 자동 refetch

### 5.5 컴포넌트 파일

```
app/components/nav/
  GlobalHeader.tsx         (반응형으로 데스크톱+모바일 한 컴포넌트에서 분기)
  BottomTabBar.tsx         (기존 파일 리스타일 + lg:hidden)
  LocationSelector.tsx     (위치 칩 + 모달 트리거)
  LocationModal.tsx        (위치 변경 모달)
  GlobalSearchBar.tsx      (데스크톱 헤더용)
```

기존 `WeekendHeader.tsx`는 삭제. `app/layout.tsx`에 `<GlobalHeader />`, `<BottomTabBar />` 마운트.

## 6. Home 페이지 레이아웃

### 6.1 데스크톱 (≥lg) — 매거진 레이아웃

```
[GlobalHeader]
┌──────────────────────────────────────────────────────────────────────────┐
│  [HERO 60vh — 풀폭 에디토리얼 사진]                                       │
│  좌하단 오버레이:                                                          │
│    "11월 1~2일 · 서울 근처"                                               │
│    이번 주말, 어디로 떠나볼까요?                                            │
│    [→ AI 코스 만들기]    [→ 추천 둘러보기]                                  │
└──────────────────────────────────────────────────────────────────────────┘
                       (max-w-7xl 컨테이너 시작)
┌─────────────────────────────────────────────┬────────────────────────────┐
│ 8col 본문                                    │ 4col 사이드바 (sticky top-20) │
│                                             │                            │
│ [SectionHeader: 지금 가면 좋은 곳]            │ [WeatherCard]              │
│ [SpotCard 그리드 3열 × 2행]                  │                            │
│                                             │ [축제 사이드 리스트 3개]      │
│ [큰 AI 코스 CTA 카드]                        │                            │
│                                             │ [위치 변경 패널]              │
│ [SectionHeader: 이번 주말 근처 축제]          │                            │
│ [축제 가로 스크롤 매거진 카드 5~6개]           │                            │
└─────────────────────────────────────────────┴────────────────────────────┘
                       [서비스 소개 한 줄 풀폭 밴드]
```

**섹션 순서 (좌측 본문)**
1. SectionHeader "지금 가면 좋은 곳" → SpotCard 3열 × 2행 = 6개
2. AI 코스 CTA — 큰 가로 카드 (16:9 사진 배경 + 카피 + 버튼)
3. SectionHeader "이번 주말 근처 축제" → 가로 스크롤 매거진 카드 5~6개
4. (Footer 위 한 줄) 서비스 소개 한 문장

**우측 사이드바 (sticky top-20, max-h-[calc(100vh-5rem)] overflow-auto)**
1. WeatherCard — 토/일 2일 한 카드, 라인 아이콘, 한 줄 추천 카피
2. 축제 사이드 리스트 — 텍스트 위주 3개 + 더보기 링크
3. 위치 변경 패널 — 현재 위치 + 갱신/변경 액션

### 6.2 모바일 (<lg) — 단일 컬럼 흐름

```
[GlobalHeader]
[HERO 50vh (오버레이 카피 동일, 폰트 ↓)]
[→ AI 코스 만들기 풀폭 버튼]
[위크엔드 라벨 + 위치]
[SearchBar — 모바일 전용]
[WeatherCard — 한 카드]
[SectionHeader "지금 가면 좋은 곳"]
[SpotCard 2열 그리드, 4~6개]
[AI 코스 CTA 큰 카드]
[SectionHeader "근처 축제"]
[축제 가로 스크롤 카드]
[서비스 소개 한 줄]
[BottomTabBar]
```

**핵심 원칙**: 데스크톱 사이드바의 모든 콘텐츠는 모바일 본문 흐름에 자연 합류.
- WeatherCard → 모바일은 hero 바로 아래
- 축제 사이드 리스트 → 모바일은 가로 스크롤 카드(현재 형식)로 통합
- 위치 변경 패널 → 모바일은 헤더 위치 버튼이 그 역할

### 6.3 Hero 카피 시스템 (`lib/hero-copy.ts`)

날씨 + 시즌 룩업 (AI 호출 없음):

```
맑음 + 봄/가을:  "이번 주말, 햇살 따라 어디로 떠나볼까요?"
맑음 + 여름:    "이번 주말, 시원한 곳으로 떠나볼까요?"
맑음 + 겨울:    "이번 주말, 따뜻한 풍경 보러 갈까요?"
흐림/비:       "이번 주말, 비 와도 좋은 곳 찾아드릴게요"
눈:            "이번 주말, 눈 내리는 풍경 보러 갈까요?"
```

`weather-api` 응답 + `Date` 기반 시즌 판단으로 결정.

### 6.4 Hero 이미지 소스 결정 트리 (`lib/hero-image.ts`)

```
1. 추천 관광지 첫 장(SpotCard 1번)의 firstImage
   └─ landscape(가로≥세로) + 해상도 ≥ 1200x700 검증
2. 통과 못하면 → 두 번째 spot 시도 (최대 5번)
3. 모두 실패 → 큐레이션 시즌 사진 풀(5장)에서 시즌+날씨 매칭
```

**큐레이션 사진 풀** (Unsplash 무료, `public/hero/`에 직접 보관):
- `spring-clear.jpg`
- `summer-clear.jpg`
- `autumn-clear.jpg`
- `winter-clear.jpg`
- `rain.jpg`
- `snow.jpg` (눈 카피용, 6.3절과 정합)

## 7. 컴포넌트 리팩토링 매핑

### 7.1 신규 생성

| 파일 | 역할 |
|------|------|
| `app/components/ui/Button.tsx` | primary/secondary/ghost · sm/md/lg |
| `app/components/ui/Card.tsx` | default/sunken/elevated 변형 |
| `app/components/ui/Badge.tsx` | brand/mocha/success/warning/outline |
| `app/components/ui/Container.tsx` | `max-w-7xl mx-auto px-5 lg:px-8` |
| `app/components/ui/SectionHeader.tsx` | h2 + 보조 + 더보기 |
| `app/components/nav/GlobalHeader.tsx` | 반응형 헤더 |
| `app/components/nav/LocationSelector.tsx` | 위치 칩 |
| `app/components/nav/LocationModal.tsx` | 위치 변경 모달 |
| `app/components/nav/GlobalSearchBar.tsx` | 데스크톱 검색 |
| `app/components/home/HomeHero.tsx` | 풀폭 hero |
| `app/components/home/MagazineGrid.tsx` | 8/4 분할 컨테이너 |
| `app/components/home/WeatherCard.tsx` | 사이드바용 카드 |
| `app/components/home/FestivalSideList.tsx` | 사이드바 리스트 |
| `lib/hero-copy.ts` | hero 카피 룩업 |
| `lib/hero-image.ts` | hero 이미지 소스 결정 |

### 7.2 리스타일 (인터페이스 동일, 내부 톤만 교체)

| 파일 | 변경 |
|------|------|
| `BottomTabBar.tsx` | Lucide 아이콘, 컬러 토큰, `lg:hidden` 추가 |
| `SpotCard.tsx` | 토큰 적용, 이모지 제거, 라인 아이콘 사용 |
| `FestivalBadge.tsx` | 매거진 카드 톤 (큰 사진 + 제목 + D-day 뱃지), 그라데이션 제거 |
| `SearchBar.tsx` | 모바일 home에서 그대로 쓰되 톤만 정제 |
| `app/globals.css` | 토큰화, 그라데이션·shadow-orange-* 제거 |
| `app/layout.tsx` | `<GlobalHeader />`, `<BottomTabBar />` 마운트, 폰트 import |
| `app/page.tsx` | `<HomeHero />` + `<MagazineGrid>` 구조로 교체 |
| `app/components/WeekendHome.tsx` | 데이터 fetch 로직을 `lib/use-home-data.ts` 훅으로 분리 후 파일 삭제. JSX는 새 `HomeHero` + `MagazineGrid` 구조로 `app/page.tsx` 또는 신규 `HomeView.tsx`로 이전 |

### 7.3 삭제

| 파일 | 이유 |
|------|------|
| `WeekendHeader.tsx` | `GlobalHeader`로 대체 |
| `WeatherBar.tsx` | home은 새 `WeatherCard` 사용. 단, 다른 페이지 사용처 확인 후 결정 (사용처 0이면 삭제, 있으면 Phase 3까지 보존) |

### 7.4 그대로 유지 (Phase 1에서 손대지 않음)

- `CourseWizard.tsx`, `CourseResult.tsx`, `CourseMap.tsx` — Phase 2
- `FestivalList.tsx` — Phase 3
- `SpotDetailModal.tsx` — Phase 3 (단 home에서 호출되므로 색만 토큰 매칭)
- `FacilityBadges.tsx`, `ImageGallery.tsx`, `KakaoSDK.tsx` — Phase 3 또는 변경 불필요

### 7.5 옛 페이지와의 호환성

`CourseWizard`, `CourseResult`, `FestivalList`는 손대지 않으며, 기존 옛 톤 유지. 사용자에게는 "Home부터 새 디자인이 깔리고, 다른 페이지도 곧 따라옵니다" 식의 자연스러운 전환. Phase 2/3 진행 시 grep으로 일괄 교체.

## 8. 진행 순서 (writing-plans 입력)

```
1. 디자인 시스템 토큰 + 폰트 + Lucide 도입
   - globals.css 토큰화
   - Gmarket Sans @font-face 추가, public/fonts/ 자산 배치
   - npm install lucide-react

2. UI 프리미티브 5개
   - Button / Card / Badge / Container / SectionHeader

3. 글로벌 네비
   - GlobalHeader (반응형)
   - BottomTabBar 리스타일
   - LocationSelector + LocationModal
   - GlobalSearchBar
   - app/layout.tsx 마운트
   - WeekendHeader.tsx 삭제

4. Home 페이지 재구축
   - HomeHero + lib/hero-copy + lib/hero-image
   - public/hero/ 큐레이션 사진 5장 추가
   - MagazineGrid + WeatherCard + FestivalSideList
   - SpotCard / FestivalBadge 리스타일
   - app/page.tsx + WeekendHome.tsx 재작성

5. 정리 & 검증
   - 옛 클래스(orange-400, from-orange-*, pink-*, violet-*) home 영역 grep 0건 확인
   - WeatherBar.tsx 사용처 점검 후 정리
   - build + 시각 회귀 체크 (4 브레이크포인트)
```

## 9. 검증 전략

### 자동 검증
- `npm run build` 0 에러
- `npm run lint` (있으면) 통과
- Dead import 0건 (grep)

### 수동 시각 검증 (4 브레이크포인트)
- 1440px / 1024px / 768px / 375px
- 각 브레이크포인트에서:
  - hero 사진 로드 + 카피 가독성
  - 사이드바 ↔ 본문 흐름 합류 (모바일 누락 콘텐츠 0)
  - 위치 변경 모달 동작 (검색/GPS/저장)
  - 새 톤이 옛 페이지(course/festival)와 시각적 충돌 없음

### 회귀 체크리스트
- TourAPI 데이터 안 와도 폴백 작동 (DEMO + 큐레이션 사진)
- GPS 거부해도 서울 기본값으로 동작
- SpotCard 클릭 → SpotDetailModal 정상 (Phase 1에서 모달 자체는 손 안 댐)
- `/course`, `/festival` 라우트 정상 이동 (옛 디자인 유지)

## 10. 위험 & 완화

| 위험 | 완화 |
|------|------|
| Hero 사진 로딩 실패/느림 | `next/image` blur placeholder + 큐레이션 폴백 즉시 표시 |
| Gmarket Sans FOUT | `font-display: swap`, 본문은 Pretendard라 영향 적음 |
| Sticky 사이드바 짧은 페이지 어색함 | `top-20` + `max-h-[calc(100vh-5rem)] overflow-auto` |
| 옛 페이지와 톤 차이 도드라짐 | 옛 `bg-white`는 새 `surface-base`와 충돌 적음. 심하면 임시 wrapper로 옛 배경(#FFF8F0) 보존 |
| 위치 모달 모바일 키보드 가림 | 바텀시트 max-h 60vh, focus 시 스크롤 보정 |

## 11. Backlog (Phase 1 이후 검토)

### 시각·디자인
- 손그림 일러스트 시스템 (섹션 타이틀 / 빈 상태 / 온보딩)
- 비디오 hero (5~10초 무음 루프, Pexels/Coverr 활용)
- 큐레이션 hero 사진 풀 확장 (5장 → 시즌×날씨×시간대 매트릭스로 20+장)
- 빈 상태 일러스트
- 온보딩 플로우 (위치 권한 안내 등)

### 기능
- 저장한 코스 기능 (마이페이지, 모바일 4번째 탭 슬롯, 데스크톱 헤더 우측 슬롯)
- 다크 모드 (토큰 기반이라 dark variant 추가 용이)
- 다국어 (영어/일본어, 외국인 관광객 타겟)
- PWA / 홈 화면 추가

### 기술
- 시각 회귀 자동화 (Playwright + 스냅샷, 4 브레이크포인트)
- 접근성 a11y 감사 (WCAG AA 대비, 키보드 네비, sr 레이블, focus-visible)
- 이미지 최적화 (`next/image` priority/sizes 정밀 튜닝, AVIF)

### 다음 Phase
- **Phase 2**: 코스 플로우 재디자인 (CourseWizard / CourseResult / CourseMap)
- **Phase 3**: 보조 페이지 + 컴포넌트 정리 (FestivalList / SpotDetailModal / 공통 컴포넌트)
