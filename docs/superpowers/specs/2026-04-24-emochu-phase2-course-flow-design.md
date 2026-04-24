# 이모추 Phase 2 — 코스 플로우 재디자인 (Wizard · Loading · Result · Map)

- **상태**: Approved (Brainstorming 완료, 2026-04-24)
- **Phase**: 2 of 3 (전체 UX/UI 리팩토링의 두 번째 단계)
- **선행**: Phase 1 완료 (Phase 1 spec `docs/superpowers/specs/2026-04-23-emochu-phase1-redesign-design.md`)
- **다음 단계**: writing-plans 스킬로 구현 plan 작성

## 1. 배경 & 목표

Phase 1에서 디자인 시스템(토큰 · UI 프리미티브 · 글로벌 네비) + Home을 재디자인했으나, 코스 플로우(`/course`, `/course/[slug]`)는 옛 톤 그대로 남아 있다.

현재 상태:
- `CourseWizard.tsx` (562줄): 5단계 위저드, 이모지 다량(🕐🌅🛋️🏨 등), 옛 오렌지-핑크 톤, 데스크톱·모바일 동일 레이아웃
- `CourseResult.tsx` (543줄): 타임라인, `from-orange-400 to-pink-400` 계열 7종 그라데이션 하드코딩, 지도는 접힘(탭으로 확장)
- `CourseMap.tsx` (199줄): 카카오맵 마커 컬러 7개 헥사 하드코딩

Phase 2는 이 3개 화면을 Phase 1 토큰·UI 프리미티브·글로벌 네비 위에 **재구축**하고, 데스크톱에서도 에디토리얼 코스 큐레이션 감각을 준다.

### 목표
1. CourseWizard / Loading / CourseResult + CourseMap 을 Phase 1 토큰·프리미티브 위에 재구축
2. 데스크톱에서는 위저드·결과 모두 **split view** 로 가로 공간 활용
3. **역할 기반 컬러** + **타임라인 프리뷰 스켈레톤 로딩** 으로 공모전 디자인·기술성 점수 강화
4. Phase 1 Backlog Important 중 코스 플로우에 해당하는 항목(Button 실적용 · 카드 키보드 접근성 · `aria-current` · `next/image` 복원 · 불필요한 `'use client'`)을 **Phase 2 내에서 함께 흡수**

### 비목표 (Phase 3 또는 Backlog)
- `SpotDetailModal`, `FestivalList`, `FacilityBadges`, `ImageGallery` 재디자인 → Phase 3
- 저장한 코스 마이페이지, PDF/OG 이미지 공유, 다국어, 코스 수정(드래그 재정렬) → Backlog

## 2. 디자인 결정 사항

| 항목 | 결정 |
|------|------|
| 위저드 데스크톱 레이아웃 | **2-column** (좌: 세로 스테퍼, 우: 현재 단계 질문) |
| 위저드 모바일 레이아웃 | 기존 풀스크린 전환 유지, 상단 슬림 프로그레스 바 추가 |
| 결과 데스크톱 레이아웃 | **Split view** — 좌: 타임라인(8col), 우: sticky top-20 카카오맵(4col) |
| 결과 모바일 레이아웃 | 단일 컬럼, 지도는 접힘(탭으로 확장) — 기존 유지 |
| 로딩 UX | **타임라인 프리뷰 스켈레톤** — 결과 레이아웃이 미리 깔리고 스톱 카드가 순차 fade-in. AI 응답 도착 시 실제 데이터로 crossfade 교체 |
| 스톱 컬러링 | **5색 역할 기반** (`contentTypeId` + `isFestival`/`isStay`). 타임라인 뱃지·지도 마커 동일 팔레트 |
| 1박2일 코스 | **`1일차 / 2일차` 탭 분리**, 한 번에 한 일차만 타임라인·지도에 표시. 당일 코스면 탭 미표시 |
| 이모지 | 전부 Lucide 아이콘으로 교체 |
| 옛 컬러 클래스 | `orange-*`/`pink-*`/`sky-*`/`emerald-*`/`violet-*`/`amber-*`/`rose-*`/`cyan-*` 전면 제거 → 토큰만 참조 |
| Button 프리미티브 | 모든 CTA·공유 버튼·위저드 네비에 적용 (Phase 1 Backlog Important #1 흡수) |
| 카드 키보드 접근성 | StopCard · 위저드 선택 카드 `role="button"` + `onKeyDown` (Enter/Space) (Backlog #2 흡수) |
| 이미지 | `next/image` + `sizes`/`priority` (Backlog #5 흡수) |

## 3. 디자인 시스템 확장

### 3.1 새로 추가할 토큰 (`app/globals.css` `@theme inline`)

```css
/* Stop role palette — 타임라인 뱃지·지도 마커 공통 */
--color-role-spot:     #C5532D   /* 관광지/문화/액티비티 (= brand 재사용) */
--color-role-food:     #8B5E3C   /* 맛집 (= mocha 재사용) */
--color-role-cafe:     #A8421F   /* 카페 (= brand-hover 톤) */
--color-role-festival: #B8860B   /* 축제 (= warning 재사용) */
--color-role-stay:     #4A6B8A   /* 숙박 (= info 재사용) */
```

대부분 기존 토큰 재사용, `role-cafe` 만 신규 (brand-hover와 같은 값이라 사실상 별칭).

### 3.2 역할 판정 규칙 (`lib/course-role.ts`)

우선순위 순:
1. `isStay === true` → `stay`
2. `isFestival === true` → `festival`
3. `contentTypeId === '39'` AND (`title` / `description` 에 `"카페"` OR `"coffee"` OR `"커피"` 키워드 포함) → `cafe`
4. `contentTypeId === '39'` → `food`
5. `contentTypeId === '12' | '14' | '28'` → `spot`
6. 그 외 (contentTypeId 누락 포함) → `spot` (fallback)

TourAPI `cat3` 코드(`CE0530100` 카페/전통찻집)는 `lib/tour-api.ts` 리스트 응답에 포함될 때만 있고 모든 응답에 보장되지 않으므로, Phase 2 에서는 **키워드 기반 규칙 3** 을 primary 로, cat3 는 future enhancement 로 둔다.

반환 값: `{ role: Role, colorVar: string, colorHex: string, label: string }`
- `colorVar` : CSS 변수명 (ex. `var(--color-role-food)`)
- `colorHex` : 카카오맵 marker 주입용 헥사 상수
- `label`   : 한국어 라벨 ("관광지", "맛집", "카페", "축제", "숙박")
- `Role = 'spot' | 'food' | 'cafe' | 'festival' | 'stay'`

## 4. 스키마 변경

### 4.1 `lib/weekend-types.ts`

```ts
export interface CourseStop {
  ...기존 필드 유지...
  contentTypeId?: string;   // Phase 2 신규, optional — "12"|"14"|"15"|"28"|"32"|"39"
}
```

- optional 이므로 기존 Supabase 저장 코스는 fallback 경로(§3.2 rule 5)로 정상 표시
- AI 응답 JSON 스키마에도 optional 로 정의

### 4.2 `lib/weekend-ai.ts` (Gemini 프롬프트)

코스 생성 JSON 스키마의 stops 항목에 `contentTypeId` 필드 추가 요구. 후보 관광지 데이터를 프롬프트에 넘길 때도 각 후보의 `contentTypeId` 를 함께 전달.

### 4.3 `app/api/course/route.ts`

AI 응답 validation:
- `contentTypeId` 누락 시 에러 아님 (optional)
- validation 시 후보 원본에서 `contentId` 매칭 → `fallbackContentTypeId` 주입 (후보에 있는 값 사용)

## 5. 라우팅 & 컴포넌트 구조

### 5.1 신규 파일

```
app/components/course/
  wizard/
    WizardShell.tsx               — 반응형 래퍼 (lg: 2-column, mobile: 전환형)
    WizardStepper.tsx             — 좌측 세로 스테퍼 (lg only)
    WizardProgressBar.tsx         — 상단 슬림 프로그레스 (mobile only)
    WizardNav.tsx                 — 이전/다음 버튼 (Button 프리미티브)
    steps/
      StepDestination.tsx         — 0: 목적지
      StepFeeling.tsx             — 1: 기분
      StepDuration.tsx            — 2: 시간
      StepCompanion.tsx           — 3: 동반자
      StepPreferences.tsx         — 4: 취향 (다중 선택)

  loading/
    CourseLoading.tsx             — 타임라인 프리뷰 스켈레톤
    SkeletonStopCard.tsx          — 스켈레톤 스톱 카드

  result/
    CourseResultShell.tsx         — lg: split view 래퍼
    CourseSummary.tsx             — 제목·요약·총거리 블록 (Card sunken)
    DayTabs.tsx                   — 1박2일 탭 (조건부 렌더)
    Timeline.tsx                  — 좌측 타임라인 컨테이너
    StopCard.tsx                  — 개별 스톱 카드 (Card 프리미티브)
    CourseTip.tsx                 — AI 꿀팁 카드
    SaveShareBar.tsx              — 카카오 공유 / 링크 복사 (Button 프리미티브)
    CourseMapPane.tsx             — 우측 sticky 지도 (기존 CourseMap 리팩토링)

lib/
  course-role.ts                  — contentTypeId + 플래그 → role + 컬러 매핑
  use-course-generation.ts        — POST /api/course + 로딩 단계 관리 훅
  use-active-stop.ts              — 타임라인 카드 ↔ 지도 마커 연동 상태 훅
```

### 5.2 수정 파일

```
app/globals.css                   — role 팔레트 토큰 추가 (§3.1)
app/(pages)/course/page.tsx       — <WizardShell /> 마운트만
app/(pages)/course/[slug]/page.tsx — <CourseResultShell courseData={...} /> 마운트만
lib/weekend-types.ts              — CourseStop.contentTypeId 추가
lib/weekend-ai.ts                 — Gemini 프롬프트 스키마에 contentTypeId
app/api/course/route.ts           — fallbackContentTypeId 주입
next.config.ts                    — images.remotePatterns에 TourAPI 호스트 추가
```

### 5.3 삭제 파일

```
app/components/CourseWizard.tsx   — wizard/ 하위로 분해
app/components/CourseResult.tsx   — result/ 하위로 분해
app/components/CourseMap.tsx      — CourseMapPane으로 리팩토링
```

### 5.4 Phase 3 대상 (이번 Phase 2에서 손대지 않음)

- `app/components/SpotDetailModal.tsx` — StopCard 클릭 시 여전히 오픈, 현재 톤 유지
- `app/components/FestivalList.tsx`
- `app/components/FacilityBadges.tsx`, `ImageGallery.tsx`

Phase 2 결과 페이지에서 SpotDetailModal은 그대로 재사용하되, 모달이 옛 톤이어도 결과 페이지와 시각적으로 크게 충돌하지 않도록 StopCard 쪽에서만 topology 통일.

## 6. CourseWizard — 상세 UI

### 6.1 데스크톱 (≥lg) — 2-column

```
[GlobalHeader]
┌────────────────────────────────────────────────────────────────────────┐
│   max-w-5xl mx-auto px-8 py-12                                         │
│                                                                        │
│   ┌───────────────────────┐   ┌──────────────────────────────────────┐ │
│   │  WizardStepper        │   │  현재 단계 (우측 8col)                │ │
│   │  max-w-xs             │   │                                      │ │
│   │                       │   │  [h2 Gmarket Sans 28/36]             │ │
│   │  ✔ 1 목적지            │   │  어디로 떠나볼까요?                   │ │
│   │    └ 서울 근교         │   │  [서브 ink-3]                        │ │
│   │  ✔ 2 기분              │   │  가고 싶은 스타일을 골라주세요.        │ │
│   │    └ 힐링              │   │                                      │ │
│   │  ● 3 시간     ← 현재   │   │  ┌─ 선택지 그리드 ─────────────────┐ │ │
│   │  ○ 4 동반자            │   │  │ [Card] [Card] [Card]           │ │ │
│   │  ○ 5 취향              │   │  │ [Card] [Card] [Card]           │ │ │
│   │                       │   │  └──────────────────────────────┘ │ │
│   └───────────────────────┘   │                                      │ │
│                               │  [Button secondary 이전] [Button primary 다음] │
│                               └──────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

**WizardStepper 상태별 스타일**
- `completed`: `bg-brand-soft` 번호 + `Check` 아이콘 + 단계명 ink-2 + 선택 답 요약 caption(ink-3)
- `active`: `bg-brand text-white` 번호 + 단계명 `font-bold text-ink-1`
- `upcoming`: `bg-surface-elevated border border-line text-ink-4` 번호 + 단계명 ink-4

단계 사이는 2px `bg-line` 세로선. **완료된 이전 단계 클릭 시 해당 단계로 이동 가능** (수정 기능, 신규).

### 6.2 모바일 (<lg) — 전체 화면 전환

```
[GlobalHeader]
[WizardProgressBar — h-1 bg-line, fill bg-brand width=(step+1)/5*100%]
[현재 단계 (풀스크린)]
  [h2 Gmarket Sans 24/32] 질문
  [ink-3 body] 보조
  [선택지 2열 그리드]
[Sticky 하단 Nav — safe-area-inset-bottom]
  [Button secondary 이전] [Button primary 다음]
```

### 6.3 선택지 카드 (모든 단계 공통)

- Card 프리미티브 `variant="sunken"` (베이지 배경) 기본, 선택 시 `variant="elevated"` + `ring-2 ring-brand`
- 내부: Lucide 아이콘(24~32px, ink-2) + 라벨(Pretendard SemiBold 15/24) + 선택 시 sub-label (optional)
- 키보드 접근성: `<button type="button">` 요소. `aria-pressed={selected}` 추가
- 그리드: 데스크톱 3열, 모바일 2열. 터치 타겟 최소 `min-h-24`

### 6.4 아이콘 매핑 (이모지 → Lucide)

| 사용처 | 이모지 → Lucide |
|--------|----------------|
| Duration (4종) | 🕐→`Clock`, 🌅→`Sun`, 🛋️→`Coffee`, 🏨→`Moon` |
| Feeling (6종) | 피곤→`Battery`, 에너지→`Zap`, 로맨틱→`Heart`, 힐링→`Leaf`, 모험→`Compass`, 맛집→`UtensilsCrossed` |
| Companion (4종) | solo→`User`, couple→`Users2`, family→`Baby`, friends→`PartyPopper` |
| Preferences (6종) | nature→`TreePine`, food→`UtensilsCrossed`, culture→`Landmark`, cafe→`Coffee`, activity→`Waves`, photo→`Camera` |
| Destination Type | 도시→`Building2`, 자연→`Mountain`, 근교→`MapPin` |
| 로딩 단계 | 🔍`Search` · AI·계산 → `Sparkles`/`Brain` · 날씨·동선 → `Wind`/`Route` · 마무리 → `Wand2` |

기존 상수(`COMPANION_ICONS`, `PREFERENCE_ICONS`)는 `lib/weekend-types.ts` 에서 Lucide 컴포넌트 참조로 교체. 이모지 자체는 파일에서 제거하고, display 시 `<Icon />` 컴포넌트 직접 import.

## 7. CourseLoading — 타임라인 프리뷰 스켈레톤

### 7.1 동작 흐름

1. Wizard 제출 → `use-course-generation` 훅이 POST `/api/course` 호출, `loading=true` 설정
2. 같은 라우트(`/course`)에서 조건부로 `<CourseLoading />` 렌더 (라우팅 변경 없음)
3. CourseLoading 마운트 즉시 결과 페이지와 동일한 split view 레이아웃 렌더
4. 좌측 Timeline 영역에 `SkeletonStopCard` 5개를 800ms 간격 순차 fade-in
5. 5개 전부 등장 후엔 shimmer 루프 지속
6. AI 응답 도착 → `router.replace(/course/${slug})` 호출, 페이지는 `<CourseResultShell />` 로 자연스럽게 교체 (shell 구조 동일해서 flicker 최소)

### 7.2 레이아웃 (결과 페이지와 동일 골격)

**데스크톱**
```
[GlobalHeader]
[CourseSummary — 스켈레톤 h1 shimmer bar + 서브 shimmer]
┌─────────────────────────────┬────────────────────────┐
│ 좌측 Timeline                │ 우측 지도 자리          │
│   SkeletonStopCard × 5       │  회색 shimmer + 카피   │
│   (800ms 간격 순차 fade-in)  │  "코스가 완성되면       │
│                              │   지도가 나타나요"      │
└─────────────────────────────┴────────────────────────┘
```

**모바일** — 단일 컬럼. 지도 영역은 접힌 카드 shimmer.

### 7.3 상단 고정 상태 영역

- h2 "코스를 설계하고 있어요" (Gmarket Sans Bold)
- 서브 "평균 15~25초 소요" (ink-3)
- `Loader2` 스피너 (Lucide, `animate-spin`)
- **단계 멘트 (4줄 crossfade 순환, 8초 간격, 이모지·퍼센트 없음)**:
  1. "주변 관광지를 살펴보고 있어요"
  2. "AI가 코스 순서를 계산하는 중이에요"
  3. "실시간 날씨와 동선을 반영하고 있어요"
  4. "마지막으로 다듬는 중이에요"
- 30초 초과 시 4번 문구 유지

### 7.4 Skeleton 키프레임

Phase 1 globals.css 의 기존 `.skeleton` + `shimmer` 키프레임 재사용 (Phase 1 Task 1에서 보존됨).

### 7.5 옛 로딩 로직 제거

- 기존 `LOADING_STEPS` 10단계 배열 삭제
- 기존 `loadingStep` / `loadingDone` state 제거 (훅 내부로 이동, 단일 상태)

## 8. CourseResult — 상세 UI

### 8.1 레이아웃

**데스크톱 (≥lg)** — Split view
```
[GlobalHeader]
[CourseSummary — max-w-7xl, 풀폭 배너]
┌────────────────────────────────────────┬────────────────────────┐
│ 8col 좌측 본문                          │ 4col 우측 sticky top-20 │
│   [DayTabs — 1박2일만]                 │   [CourseMapPane]      │
│   [Timeline]                           │   h-[calc(100vh-5rem)] │
│     StopCard × N                       │                        │
│   [CourseTip]                          │                        │
│   [SaveShareBar inline]                │                        │
└────────────────────────────────────────┴────────────────────────┘
```

**모바일 (<lg)** — 단일 컬럼
- CourseSummary → DayTabs(조건부) → Timeline → CourseMapPane(접힘, 탭하여 풀스크린 확장) → CourseTip → SaveShareBar

### 8.2 CourseSummary

Card `variant="sunken"` 기반 상단 배너:
- h1 Gmarket Sans Bold 36/44 (lg) / 28/36 (mobile) — 코스 제목
- 서브 body ink-2 한 문단 — AI 요약
- micro 정보 — 총거리(`Route` 아이콘 + 텍스트) · 일자 · 위치
- 우측(데스크톱) / 하단(모바일): SaveShareBar 분리 배치 가능 (하지만 기본은 본문 하단에 통합)

### 8.3 StopCard

```
┌── 번호 뱃지 ──┐  ┌──── 카드 본문 (Card default) ────┐
│ [bg-role-    │  │ [이미지 h-36, next/image]         │
│  {role}]     │  │ [RoleChip bg-role-{role}]         │
│  3           │──│ [h3 Pretendard SemiBold] 장소명    │
│   ↓ 세로선   │  │ [caption ink-3] 10:00~11:30 · 90분 │
│  (bg-line)   │  │ [body ink-2 line-clamp-3] 설명     │
│              │  │ [ink-3] 차로 15분 · 4.2km          │
│              │  │ [tip Lightbulb+mocha-soft] 꿀팁    │
└──────────────┘  └──────────────────────────────────┘
```

- 번호 뱃지: `w-8 h-8 rounded-full bg-role-{role} text-white text-xs font-bold`
- 세로선: 번호 하단에서 다음 카드 위까지 `w-px bg-line`
- 카드 컨테이너: **`<button type="button">`** 으로 감싸 전체 클릭 영역 키보드 접근 가능. `aria-label={`${stop.order}번째 코스: ${stop.title}`}`
- 이미지: `next/image`, `sizes="(max-width: 1024px) 100vw, 60vw"`, `onError` 시 role 컬러 배경 placeholder

**Role chip (`RoleChip` — StopCard 내부 간단 컴포넌트 또는 inline `<span>`)**
Phase 1 Badge 프리미티브의 variant 는 `brand|mocha|success|warning|outline` 5종이며 `stay`(info 컬러) 대응이 없고 `cafe`(brand-hover 톤) 대응도 없다. Phase 2 에서 Badge 프리미티브를 확장하지 않고, 대신 StopCard 내부에 간단한 inline chip 을 사용한다:
```tsx
<span className={`inline-flex items-center gap-1 text-xs font-semibold text-white px-2 py-0.5 rounded-md bg-role-${role}`}>
  {roleLabel}
</span>
```
Festival / Stay 서브 뱃지도 동일 `RoleChip` 으로 이미지 좌상단 오버레이 처리.

### 8.4 타임라인 ↔ 지도 쌍방향 연동 (`lib/use-active-stop.ts`)

| 액션 | 결과 |
|------|------|
| StopCard 클릭 | `setActive(i)` → 지도 `map.setCenter(marker[i])` + 마커 ring 오버레이 + StopCard `ring-2 ring-brand` |
| 지도 마커 클릭 | `setActive(i)` → `StopCardRef[i].scrollIntoView({ behavior: 'smooth', block: 'center' })` + 하이라이트 |
| IntersectionObserver (데스크톱 only) | 카드 뷰포트 진입 → `setActive(i)` → 지도 자동 `panTo` |
| StopCard 클릭 두 번째 (이미 active) | SpotDetailModal 오픈 |

모바일에서는 자동 pan 비활성. 탭 기반 명시적 상호작용만.

### 8.5 DayTabs

조건: `stops.some(s => s.day === 2)` 가 true 일 때만 렌더. 당일 코스(day 필드 없음 또는 모두 1) 시 `DayTabs` 자체 숨김.

```
┌──────────────────────┐
│ [1일차]   2일차       │  active: ink-1 + 하단 2px bg-brand underline
└──────────────────────┘  inactive: ink-3 hover:ink-1
```

선택된 탭의 `day` 로 필터된 stops 만 Timeline + 지도 마커·bounds 에 반영.

### 8.6 CourseMapPane (옛 CourseMap 리팩토링)

**변경**
- 마커 컬러: 하드코딩 7색 제거 → `lib/course-role.ts` 의 `getRoleColor(stop).colorHex` 사용
- Active 마커: `kakao.maps.CustomOverlay` 로 마커 위에 `ring-2 ring-brand` div 추가
- Bounds: 현재 표시 중인 `day` 의 stops 만으로 `LatLngBounds` 재계산 (DayTabs 전환 시)
- `expanded` 상태: 모바일용으로 유지 (데스크톱 sticky 에선 항상 펼침)
- SDK 로드 대기 로직은 기존 유지

**새로 추가**
- `activeStopIndex` prop 받아 해당 마커 중앙 이동 + ring 효과
- `onMarkerClick(i)` 콜백 → `use-active-stop` 의 setActive 호출

### 8.7 SaveShareBar

```
[Button secondary iconLeft=Share2] 카카오톡 공유
[Button ghost iconLeft=Link2]      링크 복사
```

- 카카오톡 공유: 기존 Kakao SDK 로직 재사용
- 링크 복사: `navigator.clipboard.writeText` + Toast (간단한 상단 알림, `aria-live="polite"`)

## 9. Phase 1 Backlog Important 흡수 항목

Phase 2 작업 중 **함께 처리**하는 Phase 1 리뷰 이관 항목:

| # | 항목 | Phase 2 내 흡수 위치 |
|---|------|---------------------|
| 1 | Button primitive 실적용 | Wizard Nav, SaveShareBar, CourseSummary 공유, HomeHero CTA, HomeView AI 코스 카드, LocationModal 버튼 |
| 2 | 카드 키보드 접근성 | Phase 2 StopCard, Wizard 선택 카드. 추가로 Phase 1 HomeView `<div onClick>` 도 정리 |
| 3 | `aria-current="page"` | GlobalHeader 메뉴 링크, BottomTabBar 탭 |
| 4 | LocationSelector aria | `aria-label` + `aria-haspopup="dialog"` + `aria-expanded` |
| 5 | `next/image` 복원 | `next.config.ts` TourAPI 호스트 추가 후 Phase 2 StopCard/이미지 + Phase 1 HomeHero/HomeView/SpotCard/FestivalBadge 복원 |
| 6 | 불필요한 `'use client'` | WeatherCard, FestivalSideList |

Nice-to-have 3건 (LocationModal 포커스 트랩, `focus-visible:ring`, `useHomeData` loading 무한 방지)은 본 Phase 2 범위 외로 유지 (Phase 3 또는 Backlog).

## 10. 검증 전략

### 10.1 자동 검증
- `npm run build` 0 에러
- 옛 컬러 클래스 grep (`from-orange-`, `via-pink-`, `to-violet-`, `sky-400`, `emerald-400`, `amber-400`, `rose-400`, `cyan-400`) → `app/components/course/` 영역 0건
- 이모지 잔존 grep (wizard · loading · result 파일 대상 유니코드 범위 검사)
- Dead import grep (`CourseWizard`, `CourseResult`, `CourseMap` 루트 경로)

### 10.2 수동 시각 검증 (4 브레이크포인트 1440 / 1024 / 768 / 375)
- Wizard 5단계 완주 (데스크톱 2-column 스테퍼 / 모바일 프로그레스바)
- 완료된 이전 단계 클릭 시 수정 가능
- 로딩: 결과 레이아웃 즉시 깔리고 스켈레톤 카드 순차 fade-in, 실제 응답 crossfade 교체 자연스러움
- Result 데스크톱: StopCard 클릭 → 지도 마커 focus + ring / 마커 클릭 → 카드 scrollIntoView
- Result 모바일: CourseMapPane 탭하여 풀스크린 확장, 원복 버튼 정상
- 1박2일 탭 전환 → Timeline + 지도 마커·bounds 동시 필터

### 10.3 회귀 체크리스트
- 기존 Supabase 저장 코스(contentTypeId 없음) 조회 시 fallback 3색 정상
- AI 응답이 contentTypeId 누락 시 fallback 정상
- 카카오맵 SDK 로드 지연 시 placeholder 정상 표시, 로드 후 정상 렌더
- SpotDetailModal(Phase 3 대상) 정상 오픈
- `/festival` 라우트(Phase 3 대상) 옛 톤 유지, 새 GlobalHeader 와 충돌 없음

## 11. 위험 & 완화

| 위험 | 완화 |
|------|------|
| 기존 저장 코스에 `contentTypeId` 없음 | `course-role.ts` 의 fallback 규칙 (§3.2 rule 5) |
| AI 응답에서 `contentTypeId` 누락 | `app/api/course/route.ts` 에서 후보 원본 매칭 → `fallbackContentTypeId` 주입 |
| 카카오맵 마커 컬러 주입 | `course-role.ts` 에 헥사 상수 + CSS 변수명 2세트 export. 마커는 헥사 상수 사용 (CSS 변수 동적 변경 영향 받지 않음) |
| 로딩 crossfade 타이밍 어색 | SkeletonStopCard `opacity-50` + shimmer → 실제 카드 `opacity-100` transition 300ms. router.replace 로 shell 유지 |
| 스켈레톤 수 ≠ 실제 코스 수 | 고정 5개 스켈레톤. 실제 응답이 3~8개라도 교체 시 자연스럽게 DOM 재구성 |
| TourAPI 이미지 CORS / `next/image` domains | `next.config.ts` remotePatterns 추가 + `<img onError>` fallback 으로 큐레이션 이미지 또는 role 컬러 플레이스홀더 |
| 자동 panTo 모바일 스크롤 충돌 | 모바일에선 `IntersectionObserver` 자동 pan 비활성, 탭 기반 상호작용만 |
| Wizard 이전 단계 수정 후 다음 단계 상태 오염 | 수정 시 후속 단계의 선택이 현재 조건과 호환되지 않으면 `null` 로 리셋 + UI 힌트 (ex "이전 선택이 바뀌어 이 단계 선택이 초기화되었어요") |

## 12. Backlog (Phase 2 이후)

### 시각 / 상호작용
- 코스 수정 UX (StopCard 드래그 재정렬, 특정 장소 교체 요청)
- 결과 PDF / 이미지 OG 공유 카드 생성
- 코스 난이도 / 예상 비용 표시
- Wizard 중간 저장 (localStorage draft)

### 기능
- 저장한 코스 마이페이지 (mobile 4번째 탭 / desktop 헤더 우측)
- 코스별 리뷰 · 방문 체크 · 사진 업로드
- AI 응답 streaming (SSE) — 현재 await 완료 기반
- 다국어 (코스 설명 자동 번역)

### 기술
- 시각 회귀 자동화 (Playwright + 스냅샷)
- 접근성 WCAG AA 감사
- 이미지 AVIF 튜닝
- Phase 1 Nice-to-have 3건 (LocationModal 포커스 트랩, `focus-visible:ring`, `useHomeData` loading 무한 방지)

### 다음 Phase
- **Phase 3**: 보조 페이지 & 공통 컴포넌트 정리 (FestivalList · SpotDetailModal · FacilityBadges · ImageGallery)

## 13. 진행 순서 (writing-plans 입력)

```
Task 1. 디자인 토큰 확장 + 스키마 변경
  - globals.css: role 팔레트 토큰 5개
  - weekend-types.ts: CourseStop.contentTypeId?: string
  - lib/course-role.ts 신설
  - weekend-ai.ts Gemini 프롬프트 스키마
  - app/api/course/route.ts: fallbackContentTypeId 주입
  - next.config.ts: images.remotePatterns

Task 2. lib 훅 신설
  - lib/use-course-generation.ts
  - lib/use-active-stop.ts

Task 3. Wizard 재구축
  - app/components/course/wizard/ (10개 파일)
  - Button 프리미티브 · 카드 키보드 접근성 · Lucide 아이콘
  - app/(pages)/course/page.tsx 단순화

Task 4. Loading 재구축
  - app/components/course/loading/ (2개 파일)
  - 옛 LOADING_STEPS / loadingStep state 제거

Task 5. Result + Map 재구축
  - app/components/course/result/ (8개 파일)
  - Timeline↔Map 쌍방향 연동
  - StopCard 전체 키보드 접근성 + next/image
  - 옛 CourseResult.tsx / CourseMap.tsx / CourseWizard.tsx 삭제
  - app/(pages)/course/[slug]/page.tsx 단순화

Task 6. Phase 1 Backlog Important 흡수
  - GlobalHeader · BottomTabBar aria-current
  - LocationSelector aria 속성
  - WeatherCard / FestivalSideList 'use client' 제거
  - Home 영역 next/image 복원
  - HomeView 카드 키보드 접근성

Task 7. 정리 & 최종 검증
  - 옛 컬러 / 이모지 / dead import grep 0건
  - rm -rf .next && npm run build

Task 8. 리뷰 (code-reviewer 에이전트)
  - Phase 2 전체 범위 리뷰
  - Critical/Important 즉시 수정, 나머지 spec Backlog 이관
```
