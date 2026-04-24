# 이모추 Phase 3 — FestivalList · Spot 상세 재디자인 + Intercepting Routes

- **상태**: Approved (Brainstorming 완료, 2026-04-24)
- **Phase**: 3 of 3 (전체 UX/UI 리팩토링의 마지막 단계)
- **선행**:
  - Phase 1 spec `docs/superpowers/specs/2026-04-23-emochu-phase1-redesign-design.md` (완료)
  - Phase 2 spec `docs/superpowers/specs/2026-04-24-emochu-phase2-course-flow-design.md` (완료)
- **다음 단계**: writing-plans 스킬로 구현 plan 작성

## 1. 배경 & 목표

Phase 1 (디자인 시스템 · Home · 글로벌 네비) + Phase 2 (코스 플로우 3화면) 이후 남은 옛 톤 영역을 정리한다. 대상은 4개 파일 총 913줄:

- `app/components/FestivalList.tsx` (467줄): `/festival` 페이지 전체. 옛 pink/violet/sky/emerald/amber 그라데이션 플레이스홀더 5종 + 🎪🎭🎵🎨🎉 이모지 + `badge-pulse`
- `app/components/SpotDetailModal.tsx` (342줄): 장소 상세 모달. orange 테마 + SVG 직접 삽입 + 😢 에러 이모지
- `app/components/FacilityBadges.tsx` (42줄): 편의시설 뱃지. 🅿️👶🧒🐾⏰ + bg-orange-50
- `app/components/ImageGallery.tsx` (62줄): 가로 스크롤 갤러리. raw `<img>` + orange-pink 그라데이션 fallback

Phase 3 는 이 4개 파일을 Phase 1/2 토큰·프리미티브·Lucide 위로 이전하고, 특히 **SpotDetailModal 을 Next.js App Router 의 Intercepting Routes + Parallel Routes 패턴**(Instagram 사진 모달 스타일)으로 전환하여 공유 가능한 URL + 모달 UX 를 동시에 제공한다.

### 목표

1. FestivalList: 데스크톱 **매거진 그리드** (max-w-7xl, 3~4열). 모바일은 기존 단일 컬럼 유지
2. SpotDetailModal: 모달 **폐기**하고 Intercepting Routes 기반 하이브리드 라우트로 재구성
   - 링크 클릭 = 인터셉트된 2-column 모달 오버레이
   - 새로고침/직접 접속 = 전용 `/spot/[contentId]` 페이지 (공유·SEO)
3. FacilityBadges · ImageGallery: Phase 1/2 톤으로 단순 리스타일
4. 호출처 3곳(Home · Result · FestivalList)의 `setContentId` 패턴 제거 → `<Link>` 전환

### 비목표 (Phase 3 이후 Backlog)

- Festival split view (좌 목록 / 우 sticky 지도 + 선택된 축제)
- SpotDetail 내 지도 미니뷰 임베드
- 이미지 full-screen viewer (탭하여 확대)
- 저장한 코스 마이페이지
- `/search?q=...` 전용 검색 페이지
- 시각 회귀 자동화 (Playwright)

## 2. 핵심 결정 사항

| 항목 | 결정 |
|------|------|
| FestivalList 데스크톱 | **매거진 그리드** (max-w-7xl, 3열 lg / 4열 xl), 상단 풀폭 필터 바 |
| FestivalList 모바일 | 단일 컬럼 + 필터 UI 가로 스크롤 |
| SpotDetail 라우팅 | **Intercepting Routes + Parallel Routes** — 링크 클릭 = 모달, 새로고침/직접 접속 = 전용 페이지 |
| SpotDetail 레이아웃 | 데스크톱 2-column (좌 이미지 / 우 정보, max-w-5xl), 모바일 bottom-sheet |
| SpotDetail 데이터 fetch | 전용 페이지 = 서버 컴포넌트 fetch + generateMetadata / 모달 = 클라이언트 fetch |
| 호출처 전환 | `onClick={setContentId}` → `<Link href={`/spot/${id}`}>`. 3곳 전부 (Home · Result StopCard · FestivalCard) |
| FacilityBadges | 이모지 → Lucide (`ParkingSquare`·`Baby`·`ToyBrick`·`Dog`·`Clock`), `bg-brand-soft text-brand` 토큰 |
| ImageGallery | `next/image` + `unoptimized={http}` fallback, `bg-surface-sunken + ImageOff` placeholder |
| 이모지 | 전량 제거 (FestivalList 5종 · FacilityBadges 5종 · SpotDetailModal 1종) |

## 3. 토큰 · 라우팅 정비

### 3.1 디자인 토큰

추가 없음. Phase 1/2 확립 토큰이 충분:
- 축제 카드·뱃지 → `--color-role-festival`(#B8860B) + `--color-warning-soft`
- 편의시설 뱃지 → `--color-brand-soft` / `--color-mocha-soft`
- fallback 배경 → `--color-surface-sunken` / `--color-hero-fallback-*`
- 상태 뱃지 → success/warning/brand-soft 재사용

### 3.2 신규 라우트

```
app/
  spot/
    [contentId]/
      page.tsx              # 전용 페이지 (서버 컴포넌트, SEO·공유)
  @modal/                   # Parallel Route slot
    default.tsx             # 빈 slot (non-modal 경로에서 렌더)
    (.)spot/
      [contentId]/
        page.tsx            # 인터셉트된 모달 (클라이언트)
  layout.tsx                # {modal} slot 마운트 (수정)
```

`(.)spot` 의 `(.)` 는 "같은 레벨 intercept" 규칙. `/festival`·`/course/[slug]`·`/` 에서 Link 클릭 시 `@modal/(.)spot/[contentId]` 이 intercept 해서 backdrop+modal 을 현재 페이지 위에 덮는다. 새로고침하면 `@modal/default.tsx` 가 빈 slot 을 렌더하고 `app/spot/[contentId]/page.tsx` 전용 페이지가 본문에 표시.

### 3.3 삭제

- `app/components/FestivalList.tsx` — `app/components/festival/` 하위로 분해
- `app/components/SpotDetailModal.tsx` — `app/components/spot/SpotDetail.tsx` (공통) + intercepted modal + full page 로 3분해

## 4. FestivalList 재구축

### 4.1 페이지 구조 (데스크톱)

```
[GlobalHeader]
[Header 섹션 — max-w-7xl]
  h1 "이번 주말 근처 축제" (Gmarket display 28/36 lg)
  서브 "11월 1~2일 · 서울 반경 50km · 12개 축제" (ink-3)
[필터 바 — sticky top-16, bg-surface-base/95 backdrop-blur]
  [Tab: 전체 / 진행 중 / 이번 주말 / 곧 시작]  [Select: 가까운순 ▾]
[반경 · 지역 Chip row — max-w-7xl]
  [30km][50km ●][100km][200km]  |  [전체][서울][경기][강원]...
[Grid — max-w-7xl, lg:grid-cols-3 xl:grid-cols-4 gap-6]
  FestivalCard × N
[BottomTabBar (모바일)]
```

### 4.2 모바일

- 단일 컬럼 (`grid-cols-1`)
- 필터 UI 는 가로 스크롤 Chip + 드롭다운 정렬
- 나머지 레이아웃 동일

### 4.3 필터 컴포넌트

| 컴포넌트 | 역할 | 스타일 |
|---------|------|--------|
| `FestivalStatusTabs` | `전체 / 진행 중 / 이번 주말 / 곧 시작` | `role="tablist"` + `role="tab"` + `aria-selected`. active: ink-1 + 하단 2px brand underline |
| `FestivalSort` | `가까운순 / 종료임박순 / 최신순` | `<select>` native + `ChevronDown` 아이콘. ink-2 텍스트 + border border-line |
| `FestivalRadius` | `30km · 50km · 100km · 200km` | Chip 그룹. 선택 `bg-brand-soft text-brand`, 비선택 `bg-surface-elevated border border-line text-ink-3` |
| `FestivalRegionFilter` | 17개 시·도 + "전체" | 가로 스크롤 chip row (`overflow-x-auto snap-x` 모바일, `flex-wrap` lg) |

### 4.4 FestivalCard

```
┌────────────────────────────────┐
│ [next/image aspect-[4/3]]      │  ← 축제 메인 사진
│  ┌──────────┐                  │
│  │D-3 or 진행│  좌상단 오버레이  │
│  └──────────┘                  │
├────────────────────────────────┤
│ [h3 Pretendard SemiBold 15]    │
│ 여수 밤바다 불꽃축제             │
│ [caption ink-3]                │
│ 여수 · 11.1 ~ 11.3 (3일간)     │
│ [micro ink-4]                  │
│ 거리 · 입장료                   │
└────────────────────────────────┘
```

- 래퍼: `<Link href={`/spot/${festival.contentId}`}>` — Intercepting Routes 가 모달 오픈
- Card 프리미티브 `variant="default"` + hover `shadow-raised` + `focus-visible:ring-2 ring-brand ring-offset-2`
- 이미지 없으면 `bg-surface-sunken` + `PartyPopper` Lucide (text-role-festival)
- **D-Day 뱃지 3종** (이미지 좌상단 absolute):
  - `진행 중`: 날짜 범위에 오늘 포함 → `bg-success-soft text-success`
  - `마감 임박`: 종료일 ≤ D-3 → `bg-warning-soft text-warning`
  - `D-N` / 미래: → `bg-brand-soft text-brand`
- `aria-label` 에 축제명·기간·거리 포함

### 4.5 로딩 · 빈 · 에러

- **로딩**: 동일 그리드 위에 `FestivalSkeleton` 6~8개 (Phase 2 `SkeletonStopCard` 세로형 변형, shimmer)
- **빈 상태**: Lucide `SearchX` + "조건에 맞는 축제가 없어요" + 제안 + `<Button variant="secondary">반경 200km 로 보기</Button>`
- **에러**: Lucide `AlertCircle` + 한국어 메시지 + `<Button variant="secondary">다시 시도</Button>`

### 4.6 파일 구조

```
app/components/festival/
  FestivalPageShell.tsx         (fetch + state 소유)
  FestivalHeader.tsx            (h1 + 서브)
  FestivalFilterBar.tsx         (탭 + 정렬, sticky)
  FestivalRadius.tsx            (반경 chip)
  FestivalRegionFilter.tsx      (지역 chip row)
  FestivalGrid.tsx              (grid + 매핑)
  FestivalCard.tsx              (개별 카드, Link)
  FestivalEmpty.tsx             (빈 상태)
  FestivalSkeleton.tsx          (스켈레톤)
```

**수정**: `app/(pages)/festival/page.tsx` — `<FestivalPageShell />` 단순 마운트.
**삭제**: `app/components/FestivalList.tsx` (467줄).

## 5. SpotDetail + Intercepting Routes

### 5.1 라우팅 구조

```
app/
  layout.tsx                     # @modal slot 마운트 (수정)
  @modal/
    default.tsx                  # 빈 slot
    (.)spot/
      [contentId]/
        page.tsx                 # 인터셉트된 모달 (client)
  spot/
    [contentId]/
      page.tsx                   # 전용 페이지 (server component)
  components/spot/
    SpotDetail.tsx               # 공통 표시 (pure UI)
    SpotDetailSkeleton.tsx       # 스켈레톤
    SpotDetailModalFrame.tsx     # backdrop + 닫기 + 애니메이션 래퍼
    SpotPageBackButton.tsx       # 전용 페이지 상단 뒤로가기
```

### 5.2 데이터 페칭 전략

**전용 페이지** — 서버 컴포넌트
- `app/spot/[contentId]/page.tsx` 에서 `fetch('/api/spot?contentId=X')` 서버 호출
- `generateMetadata` 로 OG tag 주입 (title, description, image) → 카카오 공유 썸네일 작동
- 받은 data 를 `<SpotDetail detail={data} />` 에 전달

**인터셉트된 모달** — 클라이언트 컴포넌트
- `app/@modal/(.)spot/[contentId]/page.tsx` 에서 기존 `useState` + `useEffect` + `fetch` 로직 유지
- `<SpotDetailModalFrame>` 래퍼 + 내부 `<SpotDetail detail={data} />`
- ESC · body scroll lock · slide-up 애니메이션 · click-outside 닫기 (기존 SpotDetailModal 에서 보존)
- 닫기: `router.back()`

동일한 API(`/api/spot`) 호출. 중복 fetch 는 Next.js fetch 기본 캐싱으로 완화.

### 5.3 SpotDetail 공통 컴포넌트

**데스크톱 (≥lg) — 2-column grid-cols-[1fr_1fr] gap-8, max-w-5xl**

```
┌────────────────────────────────────────────────────────┐
│  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │ [이미지 갤러리]   │  │ [h1 Gmarket 28/36]         │  │
│  │  aspect-[4/3]    │  │ 해운대 해수욕장              │  │
│  │  next/image fill │  │ [MapPin ink-3] 부산 해운대  │  │
│  │                  │  │ [FacilityBadges]           │  │
│  │ [썸네일 row]     │  │                            │  │
│  │                  │  │ [introFields 리스트]         │  │
│  │                  │  │                            │  │
│  │                  │  │ [h2 소개] overview         │  │
│  │                  │  │                            │  │
│  │                  │  │ [SubInfo 섹션]             │  │
│  │                  │  │                            │  │
│  │                  │  │ [Button 카카오맵][Button 전화]│  │
│  └──────────────────┘  └────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

**모바일 (<lg) — bottom-sheet 세로 스크롤**
- 기존 SpotDetailModal 구조 유지 (상단 drag handle → 이미지 → 썸네일 → 제목 → 정보 → CTA)
- 톤만 Phase 1 토큰으로 교체

### 5.4 모달 vs 페이지 차이점

| 요소 | 모달 (`@modal/(.)spot`) | 전용 페이지 (`spot`) |
|------|-------------------------|---------------------|
| 래퍼 | `<SpotDetailModalFrame>` (backdrop + X + slide-up) | `<GlobalHeader>` + `<Container>` + `<SpotPageBackButton>` |
| 닫기 | ESC / backdrop / X → `router.back()` | `← 돌아가기` / 브라우저 뒤로가기 |
| 스크롤 | 모달 내부 overflow-y-auto + body scroll lock | 페이지 일반 스크롤 |
| 애니메이션 | slide-up 300ms + backdrop fade | 없음 (페이지 전환) |
| 메타데이터 | 없음 | `generateMetadata` OG tag |

### 5.5 호출처 수정 (3곳)

**HomeView (`app/components/home/HomeView.tsx`)**
```diff
- <button onClick={() => setSelectedContentId(s.contentId)} ... >
-   <SpotCard ... />
- </button>
+ <Link href={`/spot/${s.contentId}`} className="text-left w-full block" aria-label={`${s.title} 상세 보기`}>
+   <SpotCard ... />
+ </Link>
```
+ `selectedContentId` state 제거, `<SpotDetailModal>` 마운트 제거.

**CourseResultShell (`app/components/course/result/CourseResultShell.tsx`)**
- `modalContentId` state 제거
- `<SpotDetailModal>` 마운트 제거
- `Timeline` / `StopCard` 의 `onOpenDetail` prop 제거 (prop drilling 단순화)
- `StopCard` 내부에서 `useRouter()` 훅으로 직접 `isActive && 두 번째 클릭` 시 `router.push(`/spot/${stop.contentId}`)` 호출

**FestivalList → FestivalCard**
- 이미 `<Link href={`/spot/${contentId}`}>` 래퍼 (§4.4)

### 5.6 `app/layout.tsx` 수정

```tsx
export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <LocationProvider>
          <GlobalHeader />
          <main ...>{children}</main>
          <BottomTabBar />
          {modal}
        </LocationProvider>
        <KakaoSDK />
      </body>
    </html>
  );
}
```

### 5.7 `@modal/default.tsx`

```tsx
export default function ModalDefault() {
  return null;
}
```

Parallel Routes 규칙 — 매칭되지 않을 때 렌더될 기본값. 필수.

## 6. FacilityBadges 리스타일

**변경**
- 이모지 → Lucide: `ParkingSquare`, `Baby`, `ToyBrick`(유아·키즈 공용), `Dog`, `Clock`
- 배경/텍스트: `bg-brand-soft text-brand` (편의시설) + `bg-surface-sunken text-ink-2` (운영시간)
- API: `compact` prop → `size: 'sm' | 'md'` 로 리네임 (Phase 1 Badge 프리미티브 API 와 통일)
- 정보 표시용 `<span>` 유지 (키보드 타겟 아님)

**구현**
```tsx
const BADGES: { key: keyof FacilityInfo; Icon: ComponentType<...>; label: string }[] = [
  { key: 'parking', Icon: ParkingSquare, label: '주차' },
  { key: 'babyCarriage', Icon: Baby, label: '유모차' },
  { key: 'kidsFacility', Icon: ToyBrick, label: '키즈' },
  { key: 'pet', Icon: Dog, label: '반려동물' },
];
```

## 7. ImageGallery 리스타일

**변경**
- `<img>` → `next/image fill sizes={...} unoptimized={src.startsWith('http://')}`
- Fallback: `bg-surface-sunken` + `ImageOff` Lucide (ink-4) 중앙 배치
- Optional `priority` prop (첫 번째 이미지용)
- ARIA: `role="region" aria-roledescription="image carousel" aria-label={alt}`, 각 이미지 `aria-label={`${alt} ${i + 1} / ${n}`}`
- 인디케이터 도트: `bg-white/50` 비활성 / `bg-white w-3` 활성 유지 (이미지 오버레이라 white 타당)

## 8. 진행 순서 (writing-plans 입력)

```
Task 1. 라우팅 기반 구축 (Intercepting Routes + Parallel Routes)
  - app/layout.tsx 에 modal slot 추가
  - app/@modal/default.tsx (빈 slot)
  - app/spot/[contentId]/page.tsx (서버 컴포넌트 + generateMetadata)
  - app/@modal/(.)spot/[contentId]/page.tsx (클라이언트 모달)
  - app/components/spot/ 4개 파일 (SpotDetail, Skeleton, ModalFrame, BackButton)
  - 기본 동작 검증: 더미 Link 로 모달 ↔ 전용 페이지 전환 확인

Task 2. SpotDetail 공통 컴포넌트 구현
  - 2-column (lg) / bottom-sheet (mobile)
  - 이미지 갤러리 (next/image + 썸네일 스크롤)
  - 정보 섹션 (주소·전화·홈페이지·FacilityBadges·소개·SubInfo)
  - CTA 2개 (Button 프리미티브)

Task 3. FacilityBadges 리스타일
  - Lucide 아이콘 교체
  - 토큰 적용
  - compact → size API 통일

Task 4. ImageGallery 리스타일
  - next/image 전환
  - 토큰 기반 fallback + ImageOff 아이콘
  - ARIA 강화

Task 5. FestivalList 재구축
  - app/components/festival/ 9개 파일 신설
  - FestivalPageShell(fetch+state), FilterBar, Radius, RegionFilter, Grid, Card, Empty, Skeleton, Header
  - FestivalCard <Link href=/spot/:id> 래퍼
  - app/(pages)/festival/page.tsx 단순화
  - 옛 FestivalList.tsx 삭제

Task 6. 호출처 3곳 전환
  - HomeView: setSelectedContentId → Link
  - CourseResultShell: modalContentId state 제거, StopCard → router.push
  - 옛 SpotDetailModal.tsx 삭제

Task 7. 정리 & 최종 검증
  - 옛 클래스 grep (festival/spot/@modal 0건)
  - 이모지 grep
  - Dead import (FestivalList / SpotDetailModal)
  - rm -rf .next && npm run build
  - 시각 회귀 (4 브레이크포인트 + 라우팅 시나리오 6개)

Task 8. code-reviewer 에이전트 리뷰
  - 전체 Phase 3 범위 (main..HEAD)
  - Critical/Important 수정
  - Nice-to-have Backlog 이관
```

## 9. 검증 전략

### 9.1 자동 검증
- `rm -rf .next && npm run build` 0 에러
- 옛 클래스 grep (`pink-·violet-·sky-·emerald-·amber-·rose-·orange-`) → `app/components/festival/` · `app/components/spot/` · `app/@modal/` · `app/spot/` 0건
- 이모지 grep (해당 디렉토리 0건)
- Dead import: `from .*components/(FestivalList|SpotDetailModal)` → 0건

### 9.2 수동 시각 검증 (4 브레이크포인트 1440 / 1024 / 768 / 375)

**라우팅 시나리오**
- `/festival` 에서 카드 클릭 → 모달 오버레이 + URL `/spot/:id` 변경 + 뒤로가기로 닫힘
- `/spot/:id` 직접 접속 (새 탭) → 전용 페이지 풀 렌더
- `/course/:slug` StopCard 두 번째 클릭 → 모달
- `/` Home SpotCard 클릭 → 모달
- 모달에서 ESC / backdrop / X → 닫힘
- 공유 링크 카카오톡으로 보내서 OG 썸네일 확인

**시각 시나리오**
- FestivalList 데스크톱 3열·4열 / 모바일 단일 컬럼
- 필터 바 sticky 동작
- 빈 상태 UI (반경 30km 강제 시)
- SpotDetail 데스크톱 2-column ↔ 모바일 bottom-sheet 분기

### 9.3 회귀 체크리스트
- 기존 저장 코스 조회 정상 (StopCard → 모달)
- TourAPI 키 없을 때 에러 UI 정상
- 카카오맵 링크 버튼 정상
- 전화 연결 정상 (모바일 `tel:`)

## 10. 위험 & 완화

| 위험 | 완화 |
|------|------|
| Intercepting Routes + Parallel Routes 동작 미숙 | Next.js 공식 예제(Instagram photo modal) 패턴 그대로 차용. Task 1 완수 후엔 표준 React |
| 모달·전용 페이지 데이터 중복 fetch | Next fetch 기본 캐싱 의존. 필요시 route config `revalidate: 3600` 추가 |
| 모바일 intercepted modal 뒤로가기 이슈 | `router.back()` 사용. 히스토리 오염 방지 위해 `router.replace` 금지 |
| StopCard 두 번째 클릭 UX 모호 | `aria-label` 에 "다시 눌러 상세 보기" (Phase 2 Task 8 fix에서 반영됨). 첫 클릭 activate 시각 변화로 힌트 |
| 전용 페이지 OG 이미지 — TourAPI http:// | `generateMetadata` 에서 `http→https` 치환 + fallback 큐레이션 이미지(Phase 1 `/hero/*.jpg`) |
| Vercel 배포 후 intercepted route 미작동 | 표준 Next 기능이라 Vercel 완전 지원. 첫 배포 후 `/festival` → 카드 클릭 테스트 필수 |
| FestivalList `badge-pulse` 잔존 영향 | Phase 3 재구축 시 해당 클래스 제거. Task 7 grep 으로 0건 검증 |
| 모달 안에서 모달 불가능 (중첩) | SpotDetail 내부에서 추가 모달 호출 금지. CTA 는 `window.open` (카카오맵) / `tel:` (전화) 외부 액션만 |

## 11. Backlog (Phase 3 이후)

### 시각 · UX
- Festival split view (좌 목록 / 우 sticky 지도 + 선택된 축제)
- SpotDetail 내 지도 미니뷰 임베드 (카카오맵 축소)
- 이미지 갤러리 full-screen viewer (탭하여 확대)
- 축제 북마크 / 캘린더 연동
- SpotDetail 공유 전용 OG 이미지 (API route 로 동적 생성)

### 기능
- `/spot/[contentId]` ISR (`revalidate: 3600`)
- 저장한 코스 마이페이지 (mobile 4번째 탭 / desktop 헤더 우측)
- `/search?q=...` 전용 검색 페이지
- Phase 1 Nice-to-have 3건 (LocationModal 포커스 트랩 · focus-visible ring · useHomeData loading 무한 방지)
- Phase 2 Backlog 전체 (Wizard draft 저장 · PDF 공유 · 코스 수정 드래그 등)

### 기술
- Playwright 시각 회귀 자동화
- Lighthouse CI (LCP / CLS / TBT)
- WCAG AA 접근성 감사
- 이미지 AVIF 튜닝

### 다음 단계
- **Phase 4**: 공모전 제출 준비 — Vercel 배포 + `NEXT_PUBLIC_SITE_URL` 환경변수 + OG 메타 세팅 + 최종 QA 체크리스트
