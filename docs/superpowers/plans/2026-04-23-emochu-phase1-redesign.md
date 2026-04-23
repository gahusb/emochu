# 이모추 Phase 1 재디자인 — 구현 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이모추 Home 페이지 + 글로벌 네비게이션을 따뜻한 에디토리얼 톤으로 전면 재디자인하고 진정한 반응형(데스크톱 매거진 / 모바일 단일 컬럼)으로 전환한다.

**Architecture:** Tailwind v4 `@theme inline`에 컬러·폰트 토큰을 정의하고, `app/components/ui/` 프리미티브 위에 `app/components/nav/` (글로벌 헤더/탭바/위치 모달/검색)와 `app/components/home/` (Hero/MagazineGrid/사이드바)를 쌓아 올린다. 모든 컴포넌트는 토큰만 참조하며 임의 컬러/사이즈를 직접 받지 않는다. 옛 페이지(course/festival)는 손대지 않고 새 톤이 자연 적용되도록 둔다.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS v4 · Lucide React (신규 추가) · Gmarket Sans + Pretendard + CookieRun

**Spec:** `docs/superpowers/specs/2026-04-23-emochu-phase1-redesign-design.md`

---

## 검증 전략 (테스트 없음 환경)

이 프로젝트에는 단위 테스트 인프라가 없다. UI 리팩토링 특성상 단위 테스트가 잡지 못하는 부분이 많아 다음 전략으로 검증한다:

- **빌드 검증**: 각 task 끝에 `npm run build` 실행 → TypeScript 에러·import 에러·Next 빌드 에러 0건
- **린트 검증**: 의미 있는 경고가 새로 생기지 않는지 `npm run lint` 확인
- **시각 검증**: 사용자가 `npm run dev`로 실행 후 브라우저에서 확인 (4 브레이크포인트: 1440 / 1024 / 768 / 375)
- **회귀 체크리스트**: 각 task별 명시 (TourAPI 미설정 폴백, GPS 거부 폴백, SpotDetailModal 정상 작동 등)

각 task의 마지막 단계로 빌드 + 린트를 무조건 실행하고, 사용자 시각 검증이 필요한 부분은 명시적으로 표시한다.

---

## 사전 자산 준비 (USER ACTION REQUIRED)

다음 자산은 외부 다운로드가 필요하다. **Task 1 시작 전**에 사용자가 직접 다음 위치에 배치한다.

### 폰트 (Task 1에서 사용)
- `public/fonts/GmarketSansBold.otf` — https://corp.gmarket.com/fonts/ 에서 다운로드
- `public/fonts/GmarketSansMedium.otf` — 동일

### Hero 큐레이션 사진 6장 (Task 4에서 사용)
- `public/hero/spring-clear.jpg` — 봄 맑음 (벚꽃·신록 등, ≥1600x900, landscape)
- `public/hero/summer-clear.jpg` — 여름 맑음 (바다·계곡 등)
- `public/hero/autumn-clear.jpg` — 가을 맑음 (단풍·코스모스 등)
- `public/hero/winter-clear.jpg` — 겨울 맑음 (설경·전통 등)
- `public/hero/rain.jpg` — 비 (실내·우중 풍경)
- `public/hero/snow.jpg` — 눈 (설산·눈꽃 등)
- 출처: Unsplash (https://unsplash.com) 무료 사진 권장. 라이선스 자유.

> **위 자산이 준비되지 않으면 Task 1, Task 4가 빌드는 통과해도 시각 검증 실패한다.** 자산이 없을 때는 임시로 어떤 파일이든 같은 이름으로 두면 빌드는 통과한다 (시각만 깨짐). 정식 자산은 사용자가 추후 교체.

---

## 파일 구조 (전체 변경 요약)

### 신규 파일 (lib + ui + nav + home)
```
lib/
  hero-copy.ts                     (Task 4)
  hero-image.ts                    (Task 4)
  use-home-data.ts                 (Task 4)

app/components/ui/
  Button.tsx                       (Task 2)
  Card.tsx                         (Task 2)
  Badge.tsx                        (Task 2)
  Container.tsx                    (Task 2)
  SectionHeader.tsx                (Task 2)

app/components/nav/
  GlobalHeader.tsx                 (Task 3)
  BottomTabBar.tsx                 (Task 3, 기존 파일 이동+리스타일)
  LocationSelector.tsx             (Task 3)
  LocationModal.tsx                (Task 3)
  GlobalSearchBar.tsx              (Task 3)

app/components/home/
  HomeHero.tsx                     (Task 4)
  MagazineGrid.tsx                 (Task 4)
  WeatherCard.tsx                  (Task 4)
  FestivalSideList.tsx             (Task 4)
  HomeView.tsx                     (Task 4)

public/fonts/
  GmarketSansBold.otf              (사전 준비)
  GmarketSansMedium.otf            (사전 준비)

public/hero/
  spring-clear.jpg                 (사전 준비)
  summer-clear.jpg
  autumn-clear.jpg
  winter-clear.jpg
  rain.jpg
  snow.jpg
```

### 수정 파일
```
app/globals.css                    (Task 1: 토큰화 + 폰트)
app/layout.tsx                     (Task 3: GlobalHeader+BottomTabBar 마운트)
app/page.tsx                       (Task 4: HomeView로 교체)
app/components/SpotCard.tsx        (Task 4: 토큰 적용 + 이모지 제거)
app/components/FestivalBadge.tsx   (Task 4: 매거진 카드 톤)
app/components/SearchBar.tsx       (Task 4: 톤 정제)
package.json                       (Task 1: lucide-react 추가)
```

### 삭제 파일
```
app/components/WeekendHeader.tsx   (Task 3, GlobalHeader로 대체)
app/components/WeekendHome.tsx     (Task 4, HomeView + use-home-data로 분해)
app/components/WeatherBar.tsx      (Task 4, WeatherCard로 대체. 사용처 0 확인됨)
app/components/BottomTabBar.tsx    (Task 3, app/components/nav/로 이동)
```

---

## Task 1: 디자인 시스템 토대 (토큰 + 폰트 + Lucide)

**Files:**
- Modify: `app/globals.css`
- Modify: `package.json` (lucide-react 추가)
- Read prerequisite: `public/fonts/GmarketSansBold.otf`, `public/fonts/GmarketSansMedium.otf` (사전 준비됨)

### Step 1.1: lucide-react 설치

- [ ] **명령 실행**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && npm install lucide-react
```

기대 결과: `lucide-react`가 dependencies에 추가되고 node_modules에 설치됨. 에러 없음.

### Step 1.2: globals.css 전면 재작성 (토큰 + 폰트)

- [ ] **`app/globals.css` 파일 전체를 다음으로 교체**

```css
@import "tailwindcss";

/* ─── Fonts ─── */
@font-face {
  font-family: 'CookieRun';
  src: url('/fonts/CookieRun-Regular.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'CookieRun';
  src: url('/fonts/CookieRun-Bold.otf') format('opentype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'CookieRun';
  src: url('/fonts/CookieRun-Black.otf') format('opentype');
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'GmarketSans';
  src: url('/fonts/GmarketSansBold.otf') format('opentype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'GmarketSans';
  src: url('/fonts/GmarketSansMedium.otf') format('opentype');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@theme inline {
  /* Surface */
  --color-surface-base: #FAF7F2;
  --color-surface-elevated: #FFFFFF;
  --color-surface-sunken: #F2EBE0;

  /* Brand */
  --color-brand: #C5532D;
  --color-brand-hover: #A8421F;
  --color-brand-soft: #F5E0D5;

  /* Ink (warm neutrals) */
  --color-ink-1: #2A241F;
  --color-ink-2: #4A4038;
  --color-ink-3: #7A6E62;
  --color-ink-4: #A8917A;
  --color-line: #E8DFD2;

  /* Functional */
  --color-mocha: #8B5E3C;
  --color-success: #5A7A4F;
  --color-warning: #B8860B;
  --color-info: #4A6B8A;

  /* Typography */
  --font-sans: 'Pretendard', -apple-system, system-ui, sans-serif;
  --font-display: 'GmarketSans', 'Pretendard', sans-serif;
  --font-logo: 'CookieRun', 'Pretendard', sans-serif;

  /* Shadow */
  --shadow-soft: 0 1px 2px rgba(42, 36, 31, 0.04);
  --shadow-raised: 0 4px 12px rgba(42, 36, 31, 0.06);
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--color-surface-base);
  color: var(--color-ink-2);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--color-line);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-ink-4);
}

/* ─── 스크롤 페이드인 ─── */
.fade-in-up {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.fade-in-up.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ─── 슬라이드 전환 ─── */
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-40px); }
  to   { opacity: 1; transform: translateX(0); }
}
.slide-in-right { animation: slideInRight 0.35s ease-out both; }
.slide-in-left  { animation: slideInLeft 0.35s ease-out both; }

/* ─── 스켈레톤 ─── */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #F2EBE0 25%, #E8DFD2 50%, #F2EBE0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 12px;
}

/* ─── 스태거 페이드인 ─── */
@keyframes staggerFadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.stagger-item {
  animation: staggerFadeIn 0.4s ease-out both;
}
```

> **삭제된 항목 주의**: 기존 globals.css의 `badge-pulse`, `progress-glow`, `select-bounce`, `weather-sun`, `weather-cloud`, `weather-rain` 애니메이션은 사용처가 옛 컴포넌트(WeatherBar, FestivalBadge의 펄스 뱃지 등)에 한정되어 있고, 새 디자인에서 모두 제거되거나 단순화된다. 옛 페이지(`/course`, `/festival`, `/course/[slug]`)에서 이들 클래스를 참조하는지는 Task 5에서 grep으로 확인 후 필요 시 임시 보존한다.

### Step 1.3: 빌드 검증

- [ ] **빌드 실행**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && npm run build
```

기대 결과: 0 에러로 통과. 새 토큰이 Tailwind v4에 의해 `bg-surface-base`, `text-ink-1`, `border-line`, `bg-brand`, `text-mocha` 같은 utility로 자동 생성됨.

만약 폰트 파일 (`public/fonts/GmarketSans*.otf`)이 없으면 빌드는 통과하나 런타임 시 폰트만 로드 실패함 (FOUT). 추후 자산만 교체하면 해결.

### Step 1.4: 린트 검증

- [ ] **린트 실행**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && npm run lint
```

기대 결과: 새 경고 0건. 기존 경고는 그대로일 수 있음.

### Step 1.5: 회귀 체크 (수동)

- [ ] **개발 서버 실행 후 시각 확인**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && npm run dev
```

브라우저에서 http://localhost:3000 접속.

기대 결과:
- 페이지가 깨지지 않고 렌더링됨 (배경색이 약간 베이지 톤으로 변경됨)
- 옛 컴포넌트들(WeekendHome, SpotCard, FestivalBadge 등)은 옛 컬러(orange-400 등)를 직접 참조하므로 시각적으로는 거의 그대로
- 콘솔 에러 없음

> **참고**: Task 1 단독으로는 시각적 변화가 미미하다. 핵심은 토큰이 제대로 정의되어 후속 task가 사용할 수 있는지 확인하는 것.

### Step 1.6: 커밋

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/globals.css package.json package-lock.json public/fonts/ && git commit -m "$(cat <<'EOF'
chore(design): 디자인 시스템 토큰 + 폰트 + lucide 도입

Tailwind v4 @theme inline에 surface/brand/ink/functional 컬러 토큰
정의. Gmarket Sans 폰트 추가 (헤드라인 용). lucide-react 의존성 추가.
기존 컴포넌트는 옛 클래스(orange-*) 참조 유지하므로 영향 없음.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: UI 프리미티브 5개

**Files:**
- Create: `app/components/ui/Button.tsx`
- Create: `app/components/ui/Card.tsx`
- Create: `app/components/ui/Badge.tsx`
- Create: `app/components/ui/Container.tsx`
- Create: `app/components/ui/SectionHeader.tsx`

이 컴포넌트들은 후속 task(나비/홈)의 빌딩 블록이다. 각 컴포넌트는 토큰만 참조하며 임의 컬러를 받지 않는다.

### Step 2.1: Container

- [ ] **`app/components/ui/Container.tsx` 생성**

```tsx
import type { ReactNode, HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export default function Container({ children, className = '', ...rest }: Props) {
  return (
    <div className={`max-w-7xl mx-auto px-5 lg:px-8 ${className}`} {...rest}>
      {children}
    </div>
  );
}
```

### Step 2.2: Button

- [ ] **`app/components/ui/Button.tsx` 생성**

```tsx
'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-hover disabled:bg-ink-4 disabled:text-white',
  secondary:
    'bg-transparent text-brand border border-brand hover:bg-brand-soft disabled:text-ink-4 disabled:border-ink-4',
  ghost:
    'bg-transparent text-ink-2 hover:bg-surface-sunken disabled:text-ink-4',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-11 px-4 text-[15px] gap-2 rounded-lg',
  lg: 'h-12 px-5 text-base gap-2 rounded-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  children,
  className = '',
  ...rest
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-colors duration-200 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {iconLeft && <span className="flex-shrink-0">{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
}
```

### Step 2.3: Card

- [ ] **`app/components/ui/Card.tsx` 생성**

```tsx
import type { ReactNode, HTMLAttributes } from 'react';

type Variant = 'default' | 'sunken' | 'elevated';

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  default: 'bg-surface-elevated border border-line',
  sunken: 'bg-surface-sunken border border-line',
  elevated: 'bg-surface-elevated border border-line shadow-[var(--shadow-raised)]',
};

export default function Card({
  variant = 'default',
  children,
  className = '',
  ...rest
}: Props) {
  return (
    <div
      className={`rounded-xl ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
```

### Step 2.4: Badge

- [ ] **`app/components/ui/Badge.tsx` 생성**

```tsx
import type { ReactNode } from 'react';

type Variant = 'brand' | 'mocha' | 'success' | 'warning' | 'outline';
type Size = 'sm' | 'md';

interface Props {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  brand: 'bg-brand-soft text-brand',
  mocha: 'bg-[#F0E5DA] text-mocha',
  success: 'bg-[#E5EBDF] text-success',
  warning: 'bg-[#F5EAD0] text-warning',
  outline: 'bg-transparent text-ink-2 border border-line',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-[11px] px-2 py-0.5 h-5',
  md: 'text-xs px-2.5 py-1 h-6',
};

export default function Badge({
  variant = 'brand',
  size = 'sm',
  children,
  className = '',
}: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center font-semibold rounded-md ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </span>
  );
}
```

### Step 2.5: SectionHeader

- [ ] **`app/components/ui/SectionHeader.tsx` 생성**

```tsx
import type { ReactNode } from 'react';
import Link from 'next/link';

interface Props {
  title: string;
  description?: string;
  moreHref?: string;
  moreLabel?: string;
  rightSlot?: ReactNode;
  className?: string;
}

export default function SectionHeader({
  title,
  description,
  moreHref,
  moreLabel = '더보기',
  rightSlot,
  className = '',
}: Props) {
  return (
    <div className={`flex items-end justify-between gap-4 mb-5 ${className}`}>
      <div className="min-w-0 flex-1">
        <h2
          className="text-xl lg:text-2xl font-bold text-ink-1 leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h2>
        {description && (
          <p className="text-sm text-ink-3 mt-1.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {moreHref ? (
        <Link
          href={moreHref}
          className="text-sm font-semibold text-brand hover:text-brand-hover whitespace-nowrap transition-colors"
        >
          {moreLabel} →
        </Link>
      ) : (
        rightSlot
      )}
    </div>
  );
}
```

### Step 2.6: 빌드·린트·커밋

- [ ] **빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && npm run build
```

기대: 0 에러. 새 컴포넌트들은 아직 어디서도 import되지 않으므로 unused 경고가 있을 수 있는데, 대부분 ESLint 기본 룰이 풀어주므로 통과.

- [ ] **린트**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && npm run lint
```

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/components/ui/ && git commit -m "$(cat <<'EOF'
feat(ui): UI 프리미티브 5개 추가 (Button/Card/Badge/Container/SectionHeader)

토큰만 참조하며 임의 컬러/사이즈를 받지 않는 디자인 시스템 컴포넌트.
후속 글로벌 네비·Home 페이지의 빌딩 블록.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 글로벌 네비게이션

**Files:**
- Create: `app/components/nav/GlobalHeader.tsx`
- Create: `app/components/nav/BottomTabBar.tsx` (기존 파일 이동+리스타일)
- Create: `app/components/nav/LocationSelector.tsx`
- Create: `app/components/nav/LocationModal.tsx`
- Create: `app/components/nav/GlobalSearchBar.tsx`
- Modify: `app/layout.tsx`
- Delete: `app/components/WeekendHeader.tsx`
- Delete: `app/components/BottomTabBar.tsx`

### Step 3.1: 위치 컨텍스트 — localStorage 헬퍼

위치 변경 모달이 여러 컴포넌트에 영향을 주므로 단순한 React Context로 위치 상태를 끌어올린다.

- [ ] **`app/components/nav/LocationContext.tsx` 생성**

```tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface UserLocation {
  lat: number;
  lng: number;
  name: string;
}

interface LocationContextValue {
  location: UserLocation | null;
  setLocation: (loc: UserLocation) => void;
  recentLocations: UserLocation[];
  requestGPS: () => void;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const DEFAULT_SEOUL: UserLocation = { lat: 37.5665, lng: 126.978, name: '서울' };
const STORAGE_KEY = 'emochu.recent_locations';
const MAX_RECENT = 5;

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<UserLocation | null>(null);
  const [recentLocations, setRecentLocations] = useState<UserLocation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRecentLocations(JSON.parse(raw));
    } catch {
      /* ignore */
    }

    if (!navigator.geolocation) {
      setLocationState(DEFAULT_SEOUL);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: '내 근처',
        });
      },
      () => setLocationState(DEFAULT_SEOUL),
      { timeout: 5000 },
    );
  }, []);

  const setLocation = (loc: UserLocation) => {
    setLocationState(loc);
    setRecentLocations((prev) => {
      const filtered = prev.filter(
        (p) => !(p.lat === loc.lat && p.lng === loc.lng),
      );
      const next = [loc, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const requestGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: '내 근처',
        });
      },
      () => {},
      { timeout: 5000 },
    );
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        setLocation,
        recentLocations,
        requestGPS,
        isModalOpen,
        openModal: () => setIsModalOpen(true),
        closeModal: () => setIsModalOpen(false),
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
```

### Step 3.2: LocationSelector (위치 칩)

- [ ] **`app/components/nav/LocationSelector.tsx` 생성**

```tsx
'use client';

import { MapPin, ChevronDown } from 'lucide-react';
import { useLocation } from './LocationContext';

interface Props {
  variant?: 'compact' | 'full';
  className?: string;
}

export default function LocationSelector({ variant = 'full', className = '' }: Props) {
  const { location, openModal } = useLocation();
  const name = location?.name ?? '위치 설정';

  return (
    <button
      onClick={openModal}
      className={`inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-elevated px-3 py-1.5 text-sm font-medium text-ink-2 hover:border-brand-soft hover:text-brand transition-colors ${className}`}
    >
      <MapPin size={14} className="text-brand flex-shrink-0" />
      <span className="truncate max-w-[10rem]">{name}</span>
      {variant === 'full' && <ChevronDown size={14} className="text-ink-3 flex-shrink-0" />}
    </button>
  );
}
```

### Step 3.3: LocationModal (위치 변경 모달)

- [ ] **`app/components/nav/LocationModal.tsx` 생성**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Search, Crosshair, X } from 'lucide-react';
import { CITY_OPTIONS } from '@/lib/weekend-types';
import { useLocation, type UserLocation } from './LocationContext';

export default function LocationModal() {
  const { isModalOpen, closeModal, setLocation, recentLocations, requestGPS } = useLocation();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isModalOpen, closeModal]);

  if (!isModalOpen) return null;

  const filtered = query.trim()
    ? CITY_OPTIONS.filter((c) => c.name.includes(query.trim()))
    : CITY_OPTIONS;

  const pick = (loc: UserLocation) => {
    setLocation(loc);
    closeModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-1/40 backdrop-blur-sm flex items-end lg:items-center justify-center"
      onClick={closeModal}
    >
      <div
        className="w-full lg:max-w-md bg-surface-elevated rounded-t-2xl lg:rounded-xl border border-line shadow-[var(--shadow-raised)] max-h-[80vh] lg:max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2
            className="text-lg font-bold text-ink-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            위치 변경
          </h2>
          <button
            onClick={closeModal}
            className="text-ink-3 hover:text-ink-1 transition-colors"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-line">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="도시 이름 검색"
              className="w-full pl-10 pr-3 h-10 rounded-md border border-line bg-surface-base text-sm text-ink-1 placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* GPS */}
          <button
            onClick={() => {
              requestGPS();
              closeModal();
            }}
            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-sunken transition-colors text-left"
          >
            <Crosshair size={18} className="text-brand flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-ink-1">현재 위치 사용</p>
              <p className="text-xs text-ink-3">GPS로 자동 감지</p>
            </div>
          </button>

          {/* Recent */}
          {recentLocations.length > 0 && (
            <>
              <div className="px-5 py-2 bg-surface-sunken border-y border-line">
                <p className="text-xs font-semibold text-ink-3 uppercase tracking-wide">최근 사용</p>
              </div>
              {recentLocations.map((loc) => (
                <button
                  key={`${loc.lat}-${loc.lng}`}
                  onClick={() => pick(loc)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-sunken transition-colors text-left"
                >
                  <span className="text-sm text-ink-1">{loc.name}</span>
                </button>
              ))}
            </>
          )}

          {/* City list */}
          <div className="px-5 py-2 bg-surface-sunken border-y border-line">
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-wide">도시</p>
          </div>
          {filtered.map((c) => (
            <button
              key={c.name}
              onClick={() => pick({ lat: c.lat, lng: c.lng, name: c.name })}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-sunken transition-colors text-left"
            >
              <span className="text-sm text-ink-1">{c.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-ink-3">검색 결과 없음</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Step 3.4: GlobalSearchBar (데스크톱 헤더용)

- [ ] **`app/components/nav/GlobalSearchBar.tsx` 생성**

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  contentId: string;
  title: string;
  addr1: string;
  firstImage: string;
  contentTypeId: number;
  cat2: string;
}

const CONTENT_TYPE_LABELS: Record<number, string> = {
  12: '관광지', 14: '문화시설', 15: '축제', 28: '레포츠', 32: '숙박', 39: '음식점',
};

export default function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const doSearch = async (keyword: string) => {
    if (keyword.trim().length < 1) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setLoading(true);
    setShowResults(true);
    try {
      const res = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}&numOfRows=8`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`relative flex items-center transition-all duration-200 ${
          focused ? 'w-[400px]' : 'w-72'
        }`}
      >
        <Search size={16} className="absolute left-3 text-ink-4 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (results.length > 0) setShowResults(true);
          }}
          onBlur={() => setFocused(false)}
          placeholder="장소·축제 검색"
          className="w-full h-10 pl-9 pr-9 rounded-md border border-line bg-surface-elevated text-sm text-ink-1 placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
            className="absolute right-2 text-ink-4 hover:text-ink-1 transition-colors"
            aria-label="지우기"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute top-full right-0 mt-2 w-[400px] bg-surface-elevated rounded-lg border border-line shadow-[var(--shadow-raised)] max-h-96 overflow-y-auto z-50">
          {loading && <div className="p-4 text-center text-sm text-ink-3">검색 중...</div>}
          {!loading && results.length === 0 && query && (
            <div className="p-4 text-center text-sm text-ink-3">검색 결과 없음</div>
          )}
          {!loading && results.map((r) => (
            <Link
              key={r.contentId}
              href={`/?spot=${r.contentId}`}
              onClick={() => setShowResults(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface-sunken transition-colors border-b border-line last:border-0"
            >
              {r.firstImage ? (
                <img src={r.firstImage} alt={r.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-surface-sunken flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-1 truncate">{r.title}</p>
                <p className="text-xs text-ink-3 truncate">
                  {CONTENT_TYPE_LABELS[r.contentTypeId] ?? ''} · {r.addr1}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

> **참고**: 검색 결과 클릭 시 `?spot=<contentId>` 쿼리 파라미터로 home 페이지로 이동한다. Home의 `HomeView`가 이 쿼리를 감지해서 `SpotDetailModal`을 자동 오픈한다 (Task 4에서 구현).

### Step 3.5: GlobalHeader (반응형)

- [ ] **`app/components/nav/GlobalHeader.tsx` 생성**

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase } from 'lucide-react';
import LocationSelector from './LocationSelector';
import GlobalSearchBar from './GlobalSearchBar';

const NAV_ITEMS = [
  { href: '/', label: '홈', match: (p: string) => p === '/' },
  { href: '/course', label: '코스 만들기', match: (p: string) => p.startsWith('/course') },
  { href: '/festival', label: '축제', match: (p: string) => p.startsWith('/festival') },
];

export default function GlobalHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 inset-x-0 z-40 bg-surface-base/95 backdrop-blur transition-shadow ${
        scrolled ? 'shadow-[var(--shadow-soft)] border-b border-line' : ''
      }`}
    >
      {/* Desktop (lg+) */}
      <div className="hidden lg:flex max-w-7xl mx-auto px-8 h-16 items-center gap-6">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Briefcase size={22} className="text-brand" strokeWidth={1.8} />
          <span
            className="text-xl font-bold text-ink-1 tracking-tight"
            style={{ fontFamily: 'var(--font-logo)' }}
          >
            이모추
          </span>
        </Link>

        <nav className="flex items-center gap-1 ml-2">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? 'text-ink-1' : 'text-ink-3 hover:text-ink-1'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-brand rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <GlobalSearchBar />
        <LocationSelector />
      </div>

      {/* Mobile (<lg) */}
      <div className="lg:hidden max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5">
          <Briefcase size={20} className="text-brand" strokeWidth={1.8} />
          <span
            className="text-lg font-bold text-ink-1 tracking-tight"
            style={{ fontFamily: 'var(--font-logo)' }}
          >
            이모추
          </span>
        </Link>
        <LocationSelector variant="compact" />
      </div>
    </header>
  );
}
```

### Step 3.6: BottomTabBar 이동 + 리스타일

- [ ] **`app/components/nav/BottomTabBar.tsx` 생성** (기존 `app/components/BottomTabBar.tsx`는 Step 3.10에서 삭제)

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, PartyPopper } from 'lucide-react';

const TABS = [
  { href: '/', label: '홈', icon: Home, match: (p: string) => p === '/' },
  { href: '/course', label: '코스', icon: Sparkles, match: (p: string) => p.startsWith('/course') },
  { href: '/festival', label: '축제', icon: PartyPopper, match: (p: string) => p.startsWith('/festival') },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface-base/95 backdrop-blur border-t border-line">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-1 px-5 py-2 transition-colors ${
                active ? 'text-ink-1' : 'text-ink-3 hover:text-ink-1'
              }`}
            >
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand rounded-full" />}
              <Icon
                size={22}
                strokeWidth={active ? 2.2 : 1.8}
                fill={active ? 'currentColor' : 'none'}
              />
              <span className="text-[11px] font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### Step 3.7: layout.tsx 수정 — Provider + 마운트

- [ ] **`app/layout.tsx` 전체 교체**

```tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import KakaoSDK from './components/KakaoSDK';
import GlobalHeader from './components/nav/GlobalHeader';
import BottomTabBar from './components/nav/BottomTabBar';
import LocationModal from './components/nav/LocationModal';
import { LocationProvider } from './components/nav/LocationContext';

export const metadata: Metadata = {
  title: {
    default: '이모추! — 이번 주에 모하지 추천',
    template: '%s | 이모추!',
  },
  description:
    '매주 금요일 열어보는 주말 나들이 AI 코스 플래너. 내 위치 + 축제 + 날씨를 AI가 분석해 10초 만에 맞춤 코스를 만들어드려요.',
  keywords: [
    '주말 나들이',
    '당일치기 여행',
    'AI 코스 추천',
    '축제 정보',
    '주말 갈만한곳',
    '나들이 코스',
    '관광지 추천',
    '이모추',
  ],
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://emochu.vercel.app',
    title: '이모추! — 이번 주에 모하지 추천',
    description: '3번의 선택 → AI가 10초 만에 주말 나들이 코스 완성!',
    siteName: '이모추!',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#FAF7F2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <LocationProvider>
          <div className="min-h-[100dvh] bg-surface-base text-ink-2 flex flex-col">
            <GlobalHeader />
            <main className="flex-1 pb-16 lg:pb-0">{children}</main>
            <BottomTabBar />
            <LocationModal />
            <KakaoSDK />
          </div>
        </LocationProvider>
      </body>
    </html>
  );
}
```

> **변경 요점**:
> - `themeColor`를 새 surface-base 색(`#FAF7F2`)으로 갱신
> - inline style 제거 (body가 globals.css에서 폰트 토큰 사용)
> - `<GlobalHeader />`, `<BottomTabBar />`, `<LocationModal />`, `<LocationProvider />` 마운트
> - `<main>`에 `pb-16 lg:pb-0` 추가 (모바일 BottomTabBar 가림 방지)
> - 옛 `min-h-[100dvh]` 컨테이너 구조 유지

### Step 3.8: WeekendHeader 삭제

- [ ] **파일 삭제**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git rm app/components/WeekendHeader.tsx
```

### Step 3.9: 옛 BottomTabBar 삭제

- [ ] **파일 삭제**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git rm app/components/BottomTabBar.tsx
```

### Step 3.10: WeekendHome.tsx import 임시 정리

기존 `WeekendHome.tsx`는 `WeekendHeader`와 `BottomTabBar`(옛 위치)를 import한다. Task 4에서 통째로 교체할 예정이지만, Task 3 단계에서 빌드를 통과시키려면 다음 두 import를 임시로 제거해야 한다.

- [ ] **`app/components/WeekendHome.tsx` import 정리**

```tsx
// 삭제할 import 2줄
import WeekendHeader from './WeekendHeader';
import BottomTabBar from './BottomTabBar';
```

→ 위 두 줄을 삭제하고, JSX 본문에서도 `<WeekendHeader ... />`와 `<BottomTabBar />` 호출 제거.

다음 패치를 적용:

**삭제할 import (2줄):**
```tsx
import WeekendHeader from './WeekendHeader';
import BottomTabBar from './BottomTabBar';
```

**삭제할 JSX (return 문 내부):**
```tsx
<WeekendHeader
  locationName={locationName}
  onLocationClick={() => {/* TODO: 위치 설정 모달 */}}
/>
```
→ 이 블록 전체 제거 (이제 GlobalHeader가 layout에서 처리).

```tsx
<BottomTabBar />
```
→ 이 한 줄도 제거 (이제 layout에서 처리).

**컨테이너 padding 조정**:
기존: `<div className="max-w-lg mx-auto px-5 pt-16 pb-24">` → `pt-16`(옛 fixed header 회피용), `pb-24`(옛 fixed bottom tab 회피용) 모두 더 이상 불필요.
```tsx
<div className="max-w-lg mx-auto px-5 py-4">
```

> Task 4에서 WeekendHome 자체를 통째로 삭제할 예정이므로, 이 임시 정리는 빌드 통과만 목적이다.

### Step 3.11: 빌드·린트·시각 검증·커밋

- [ ] **빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && npm run build
```

기대: 0 에러. WeekendHome이 옛 import를 잃었지만 본문은 옛 톤으로 렌더링.

- [ ] **린트**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && npm run lint
```

- [ ] **수동 시각 검증** (사용자 액션)

`npm run dev` 후 다음을 확인:
- 데스크톱(1024px+): 상단 헤더에 새 로고 + 메뉴 + 검색바 + 위치 칩이 보임
- 모바일(<1024px): 상단 헤더 + 하단 탭바 모두 새 톤으로 보임
- 위치 칩 클릭 → 위치 변경 모달 오픈, GPS/도시 선택 가능
- `/course`, `/festival` 라우트 클릭 시 정상 이동
- Home 본문은 아직 옛 톤(orange-*)이지만 기능 동작 정상

**회귀 체크**:
- GPS 거부해도 서울 기본값으로 동작
- 위치 변경 시 home 페이지 데이터(weather/festival/spot)가 새 위치로 refetch — 단 Task 4에서 `useLocation()`을 home에 연결한 후에 검증 가능. Task 3 시점에서는 모달 자체 동작만 확인.

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/components/nav/ app/layout.tsx app/components/WeekendHome.tsx && git commit -m "$(cat <<'EOF'
feat(nav): 글로벌 헤더 + 모바일 탭바 + 위치 변경 모달

- GlobalHeader: 데스크톱 상단(로고+메뉴+검색+위치) / 모바일 상단(로고+위치)
- BottomTabBar: app/components/nav/로 이동, Lucide 아이콘 + 새 토큰 적용
- LocationContext + LocationModal: GPS/도시/최근 사용 선택 (localStorage)
- GlobalSearchBar: 데스크톱 헤더 내장 검색
- 옛 WeekendHeader.tsx 삭제, WeekendHome.tsx import 임시 정리

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Home 페이지 재구축

**Files:**
- Create: `lib/hero-copy.ts`
- Create: `lib/hero-image.ts`
- Create: `lib/use-home-data.ts`
- Create: `app/components/home/HomeHero.tsx`
- Create: `app/components/home/MagazineGrid.tsx`
- Create: `app/components/home/WeatherCard.tsx`
- Create: `app/components/home/FestivalSideList.tsx`
- Create: `app/components/home/HomeView.tsx`
- Modify: `app/components/SpotCard.tsx` (리스타일)
- Modify: `app/components/FestivalBadge.tsx` (리스타일)
- Modify: `app/components/SearchBar.tsx` (톤 정제)
- Modify: `app/page.tsx`
- Delete: `app/components/WeekendHome.tsx`
- Delete: `app/components/WeatherBar.tsx`
- Read prerequisite: `public/hero/{spring,summer,autumn,winter}-clear.jpg`, `rain.jpg`, `snow.jpg`

### Step 4.1: lib/hero-copy.ts

- [ ] **`lib/hero-copy.ts` 생성**

```tsx
import type { WeekendWeather } from './weekend-types';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export function getSeason(date: Date = new Date()): Season {
  const m = date.getMonth() + 1; // 1~12
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

export function getHeroCopy(weather: WeekendWeather | null, date: Date = new Date()): string {
  const season = getSeason(date);
  const sat = weather?.saturday;
  const sun = weather?.sunday;

  const hasRain = sat?.precipitation === 'rain' || sun?.precipitation === 'rain' ||
                  sat?.precipitation === 'mixed' || sun?.precipitation === 'mixed';
  const hasSnow = sat?.precipitation === 'snow' || sun?.precipitation === 'snow';
  const allClear = sat?.sky === 'clear' && sun?.sky === 'clear';

  if (hasSnow) return '이번 주말, 눈 내리는 풍경 보러 갈까요?';
  if (hasRain) return '이번 주말, 비 와도 좋은 곳 찾아드릴게요';
  if (allClear) {
    if (season === 'summer') return '이번 주말, 시원한 곳으로 떠나볼까요?';
    if (season === 'winter') return '이번 주말, 따뜻한 풍경 보러 갈까요?';
    return '이번 주말, 햇살 따라 어디로 떠나볼까요?';
  }
  return '이번 주말, 어디로 떠나볼까요?';
}

export function getWeekendLabel(date: Date = new Date()): string {
  const day = date.getDay();
  const satOffset = day === 6 ? 0 : day === 0 ? -1 : 6 - day;
  const sat = new Date(date);
  sat.setDate(date.getDate() + satOffset);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return `${sat.getMonth() + 1}월 ${sat.getDate()}~${sun.getDate()}일`;
}
```

### Step 4.2: lib/hero-image.ts

- [ ] **`lib/hero-image.ts` 생성**

```tsx
import type { SpotCard, WeekendWeather } from './weekend-types';
import { getSeason, type Season } from './hero-copy';

const CURATED: Record<Season | 'rain' | 'snow', string> = {
  spring: '/hero/spring-clear.jpg',
  summer: '/hero/summer-clear.jpg',
  autumn: '/hero/autumn-clear.jpg',
  winter: '/hero/winter-clear.jpg',
  rain: '/hero/rain.jpg',
  snow: '/hero/snow.jpg',
};

export function getCuratedHeroImage(
  weather: WeekendWeather | null,
  date: Date = new Date(),
): string {
  const sat = weather?.saturday;
  const sun = weather?.sunday;

  if (sat?.precipitation === 'snow' || sun?.precipitation === 'snow') return CURATED.snow;
  if (
    sat?.precipitation === 'rain' || sun?.precipitation === 'rain' ||
    sat?.precipitation === 'mixed' || sun?.precipitation === 'mixed'
  ) return CURATED.rain;

  return CURATED[getSeason(date)];
}

/**
 * SpotCard 리스트에서 hero에 쓸 만한 이미지를 찾는다.
 * - firstImage가 있는 첫 번째 spot의 firstImage 반환
 * - TourAPI 사진은 해상도/비율 메타데이터를 제공하지 않으므로 클라이언트
 *   `<img onload>` 검증은 hero 컴포넌트에서 따로 처리
 * - 후보 없으면 null 반환 → 호출자가 큐레이션 폴백 사용
 */
export function pickHeroFromSpots(spots: SpotCard[]): string | null {
  for (const s of spots.slice(0, 5)) {
    if (s.firstImage) return s.firstImage;
  }
  return null;
}
```

### Step 4.3: lib/use-home-data.ts

- [ ] **`lib/use-home-data.ts` 생성**

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { FestivalCard, SpotCard, WeekendWeather } from './weekend-types';

export interface HomeData {
  weather: WeekendWeather | null;
  festivals: FestivalCard[];
  spots: SpotCard[];
  loading: boolean;
}

const DEMO_WEATHER: WeekendWeather = {
  saturday: { date: '', sky: 'clear', precipitation: 'none', tempMin: 15, tempMax: 22, pop: 0, summary: '날씨 정보 준비 중' },
  sunday:   { date: '', sky: 'clear', precipitation: 'none', tempMin: 15, tempMax: 22, pop: 0, summary: '날씨 정보 준비 중' },
  recommendation: 'API 키를 설정하면 실시간 날씨를 볼 수 있어요.',
};

export function useHomeData(loc: { lat: number; lng: number } | null): HomeData {
  const [weather, setWeather] = useState<WeekendWeather | null>(DEMO_WEATHER);
  const [festivals, setFestivals] = useState<FestivalCard[]>([]);
  const [spots, setSpots] = useState<SpotCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loc) return;

    setLoading(true);
    fetch(`/api/home?lat=${loc.lat}&lng=${loc.lng}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.weather) setWeather(data.weather);
        if (data.festivals?.length > 0) setFestivals(data.festivals);
        if (data.recommended?.length > 0) setSpots(data.recommended);
      })
      .catch(() => { /* 데모 유지 */ })
      .finally(() => setLoading(false));
  }, [loc?.lat, loc?.lng]);

  return { weather, festivals, spots, loading };
}
```

### Step 4.4: HomeHero

- [ ] **`app/components/home/HomeHero.tsx` 생성**

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { SpotCard, WeekendWeather } from '@/lib/weekend-types';
import { getHeroCopy, getWeekendLabel } from '@/lib/hero-copy';
import { getCuratedHeroImage, pickHeroFromSpots } from '@/lib/hero-image';
import { useLocation } from '../nav/LocationContext';

interface Props {
  weather: WeekendWeather | null;
  spots: SpotCard[];
}

export default function HomeHero({ weather, spots }: Props) {
  const { location } = useLocation();
  const [imgSrc, setImgSrc] = useState<string>(() => getCuratedHeroImage(weather));
  const [tried, setTried] = useState<Set<string>>(new Set());

  useEffect(() => {
    const candidate = pickHeroFromSpots(spots);
    if (candidate && !tried.has(candidate)) {
      setImgSrc(candidate);
    } else {
      setImgSrc(getCuratedHeroImage(weather));
    }
  }, [spots, weather]);

  const handleError = () => {
    setTried((prev) => new Set(prev).add(imgSrc));
    setImgSrc(getCuratedHeroImage(weather));
  };

  const copy = getHeroCopy(weather);
  const weekendLabel = getWeekendLabel();
  const locationLabel = location?.name ?? '내 근처';

  return (
    <section className="relative w-full h-[50vh] lg:h-[60vh] min-h-[420px] overflow-hidden">
      <Image
        src={imgSrc}
        alt="이번 주말의 풍경"
        fill
        priority
        sizes="100vw"
        className="object-cover"
        onError={handleError}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-1/70 via-ink-1/20 to-transparent" />

      <div className="absolute inset-x-0 bottom-0">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pb-8 lg:pb-12">
          <p className="text-sm lg:text-base font-semibold text-white/80 mb-2">
            {weekendLabel} · {locationLabel}
          </p>
          <h1
            className="text-3xl lg:text-5xl font-bold text-white leading-tight break-keep max-w-2xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {copy}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link
              href="/course"
              className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-brand text-white font-semibold hover:bg-brand-hover transition-colors"
            >
              <Sparkles size={18} strokeWidth={2} />
              <span>AI 코스 만들기</span>
            </Link>
            <a
              href="#recommended"
              className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-white/15 backdrop-blur text-white font-semibold border border-white/30 hover:bg-white/25 transition-colors"
            >
              <span>추천 둘러보기</span>
              <ArrowRight size={18} strokeWidth={2} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
```

### Step 4.5: WeatherCard

- [ ] **`app/components/home/WeatherCard.tsx` 생성**

```tsx
'use client';

import { Sun, Cloud, CloudRain, CloudSnow, Droplets } from 'lucide-react';
import type { DayWeather, WeekendWeather } from '@/lib/weekend-types';
import Card from '../ui/Card';

function dayIcon(day: DayWeather) {
  if (day.precipitation === 'snow') return CloudSnow;
  if (day.precipitation === 'rain' || day.precipitation === 'mixed') return CloudRain;
  if (day.sky === 'clear') return Sun;
  return Cloud;
}

interface Props {
  weather: WeekendWeather | null;
}

export default function WeatherCard({ weather }: Props) {
  if (!weather) return null;
  const sat = weather.saturday;
  const sun = weather.sunday;
  const SatIcon = dayIcon(sat);
  const SunIcon = dayIcon(sun);

  return (
    <Card className="p-5">
      <h3
        className="text-sm font-bold text-ink-1 mb-4"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        주말 날씨
      </h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-ink-3 mb-2">토요일</p>
          <div className="flex items-center gap-2">
            <SatIcon size={28} className="text-info" strokeWidth={1.6} />
            <p className="text-2xl font-bold text-ink-1">{sat.tempMax}°</p>
          </div>
          <p className="text-xs text-ink-3 mt-1">
            {sat.tempMin}°/{sat.tempMax}°
          </p>
          {sat.pop > 20 && (
            <p className="inline-flex items-center gap-1 text-[11px] text-info font-semibold mt-1">
              <Droplets size={11} /> {sat.pop}%
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-ink-3 mb-2">일요일</p>
          <div className="flex items-center gap-2">
            <SunIcon size={28} className="text-info" strokeWidth={1.6} />
            <p className="text-2xl font-bold text-ink-1">{sun.tempMax}°</p>
          </div>
          <p className="text-xs text-ink-3 mt-1">
            {sun.tempMin}°/{sun.tempMax}°
          </p>
          {sun.pop > 20 && (
            <p className="inline-flex items-center gap-1 text-[11px] text-info font-semibold mt-1">
              <Droplets size={11} /> {sun.pop}%
            </p>
          )}
        </div>
      </div>
      {weather.recommendation && (
        <p className="text-xs text-ink-2 leading-relaxed bg-surface-sunken rounded-md px-3 py-2 break-keep">
          {weather.recommendation}
        </p>
      )}
    </Card>
  );
}
```

### Step 4.6: FestivalSideList (사이드바용)

- [ ] **`app/components/home/FestivalSideList.tsx` 생성**

```tsx
'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import type { FestivalCard } from '@/lib/weekend-types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

interface Props {
  festivals: FestivalCard[];
  onSelect?: (contentId: string) => void;
}

export default function FestivalSideList({ festivals, onSelect }: Props) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-bold text-ink-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          근처 축제
        </h3>
        <Link href="/festival" className="text-xs font-semibold text-brand hover:text-brand-hover">
          전체 →
        </Link>
      </div>
      {festivals.length === 0 ? (
        <p className="text-sm text-ink-3 py-4 text-center">진행 중인 축제가 없어요</p>
      ) : (
        <ul className="space-y-3">
          {festivals.slice(0, 3).map((f) => (
            <li key={f.contentId}>
              <button
                onClick={() => onSelect?.(f.contentId)}
                className="w-full text-left flex items-start gap-3 group"
              >
                <Calendar size={16} className="text-mocha mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-1 group-hover:text-brand transition-colors line-clamp-1">
                    {f.title}
                  </p>
                  <p className="text-xs text-ink-3 mt-0.5 line-clamp-1">{f.addr1}</p>
                </div>
                {f.dDay !== undefined && f.dDay <= 7 && (
                  <Badge variant="warning" size="sm">
                    {f.dDay === 0 ? 'D-DAY' : `D-${f.dDay}`}
                  </Badge>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
```

### Step 4.7: MagazineGrid

- [ ] **`app/components/home/MagazineGrid.tsx` 생성**

```tsx
import type { ReactNode } from 'react';

interface Props {
  main: ReactNode;
  side: ReactNode;
}

export default function MagazineGrid({ main, side }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
      <div className="lg:col-span-8 min-w-0">{main}</div>
      <aside className="lg:col-span-4">
        <div className="lg:sticky lg:top-20 space-y-5 lg:max-h-[calc(100vh-5rem)] lg:overflow-auto lg:pb-8 lg:pr-1">
          {side}
        </div>
      </aside>
    </div>
  );
}
```

### Step 4.8: SpotCard 리스타일

- [ ] **`app/components/SpotCard.tsx` 전체 교체**

```tsx
'use client';

import { MapPin } from 'lucide-react';
import type { SpotCard as SpotCardType } from '@/lib/weekend-types';
import FacilityBadges from './FacilityBadges';
import Badge from './ui/Badge';

interface Props {
  spot: SpotCardType;
}

const CATEGORY_VARIANT: Record<string, 'brand' | 'mocha' | 'success' | 'warning' | 'outline'> = {
  '자연관광': 'success',
  '인문관광': 'mocha',
  '레포츠': 'brand',
  '음식': 'warning',
  '문화시설': 'mocha',
};

export default function SpotCard({ spot }: Props) {
  const variant = CATEGORY_VARIANT[spot.cat2] ?? 'outline';

  return (
    <article className="group bg-surface-elevated rounded-xl border border-line overflow-hidden hover:shadow-[var(--shadow-raised)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
      <div className="relative aspect-[4/3] bg-surface-sunken overflow-hidden">
        {spot.firstImage ? (
          <img
            src={spot.firstImage}
            alt={spot.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-4">
            <MapPin size={32} strokeWidth={1.4} />
          </div>
        )}

        <div className="absolute top-3 left-3">
          <Badge variant={variant} size="sm">{spot.cat2}</Badge>
        </div>

        {spot.distanceKm !== undefined && (
          <div className="absolute bottom-3 right-3 bg-surface-elevated/95 backdrop-blur text-ink-2 text-[11px] font-semibold px-2 py-0.5 rounded-md border border-line">
            {spot.distanceKm < 1
              ? `${Math.round(spot.distanceKm * 1000)}m`
              : `${spot.distanceKm.toFixed(1)}km`}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-ink-1 leading-snug line-clamp-1">
          {spot.title}
        </h3>
        {spot.whyNow && (
          <p className="text-xs text-brand font-semibold mt-1 line-clamp-1">
            {spot.whyNow}
          </p>
        )}
        <p className="text-sm text-ink-3 mt-1.5 line-clamp-2 leading-relaxed break-keep">
          {spot.reason}
        </p>
        {spot.facilities && (
          <div className="mt-2">
            <FacilityBadges facilities={spot.facilities} compact />
          </div>
        )}
        <p className="text-xs text-ink-4 mt-2 truncate">
          {spot.addr1}
        </p>
      </div>
    </article>
  );
}
```

> **변경 요점**: 그라데이션·이모지(`🌳🏛⛰️🌊`)·`✨` prefix 제거. 카테고리 컬러는 토큰 기반 Badge variant로. 카드 라디우스 `rounded-3xl`→`rounded-xl`. shadow는 토큰 사용. aspect 비율 4:3 고정.

### Step 4.9: FestivalBadge 리스타일 (매거진 카드)

- [ ] **`app/components/FestivalBadge.tsx` 전체 교체**

```tsx
'use client';

import { MapPin } from 'lucide-react';
import type { FestivalCard } from '@/lib/weekend-types';
import Badge from './ui/Badge';

interface Props {
  festival: FestivalCard;
}

export default function FestivalBadge({ festival }: Props) {
  const dDayBadge = festival.urgencyTag
    ? { variant: 'brand' as const, label: festival.urgencyTag }
    : festival.dDay !== undefined && festival.dDay <= 7
      ? {
          variant: 'warning' as const,
          label: festival.dDay === 0 ? 'D-DAY' : `D-${festival.dDay}`,
        }
      : null;

  return (
    <article className="group flex-shrink-0 w-64 lg:w-72 bg-surface-elevated rounded-xl border border-line overflow-hidden hover:shadow-[var(--shadow-raised)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
      <div className="relative aspect-[16/10] bg-surface-sunken overflow-hidden">
        {festival.firstImage ? (
          <img
            src={festival.firstImage}
            alt={festival.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-4">
            <MapPin size={32} strokeWidth={1.4} />
          </div>
        )}
        {dDayBadge && (
          <div className="absolute top-3 left-3">
            <Badge variant={dDayBadge.variant} size="md">
              {dDayBadge.label}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-ink-1 line-clamp-1 leading-snug break-keep">
          {festival.title}
        </h3>
        {festival.aiSummary && (
          <p className="text-sm text-ink-3 mt-1.5 line-clamp-2 leading-relaxed break-keep">
            {festival.aiSummary}
          </p>
        )}
        <p className="text-xs text-ink-4 mt-3 flex items-center gap-1 truncate">
          <MapPin size={12} className="flex-shrink-0" />
          {festival.addr1}
        </p>
      </div>
    </article>
  );
}
```

> **변경 요점**: 이모지(`🎪🎭🎵🎨🎉`) 제거. 그라데이션 placeholder 제거. `badge-pulse` 애니메이션 제거 (정적 톤이 더 신뢰). 카드 너비 모바일 w-44 → w-64로 키워 매거진 카드 톤 확보.

### Step 4.10: SearchBar 톤 정제

- [ ] **`app/components/SearchBar.tsx` 전체 교체**

```tsx
'use client';

import { useState, useRef } from 'react';
import { Search, X, MapPin } from 'lucide-react';

interface SearchResult {
  contentId: string;
  title: string;
  addr1: string;
  firstImage: string;
  contentTypeId: number;
  cat2: string;
}

interface Props {
  onSelectSpot?: (contentId: string) => void;
}

const POPULAR_KEYWORDS = ['벚꽃', '야경', '맛집', '카페', '전시', '바다'];

const CONTENT_TYPE_LABELS: Record<number, string> = {
  12: '관광지', 14: '문화시설', 15: '축제', 28: '레포츠', 32: '숙박', 39: '음식점',
};

export default function SearchBar({ onSelectSpot }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = async (keyword: string) => {
    if (keyword.trim().length < 1) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setLoading(true);
    setShowResults(true);
    try {
      const res = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}&numOfRows=8`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  };

  const handleTagClick = (keyword: string) => {
    setQuery(keyword);
    doSearch(keyword);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="장소·축제 검색"
          className="w-full pl-10 pr-10 h-12 rounded-lg bg-surface-elevated border border-line text-sm text-ink-1 placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-1 transition-colors"
            aria-label="지우기"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {!showResults && (
        <div className="flex flex-wrap gap-2 mt-3">
          {POPULAR_KEYWORDS.map((kw) => (
            <button
              key={kw}
              onClick={() => handleTagClick(kw)}
              className="px-3 h-8 rounded-md bg-surface-elevated border border-line text-xs font-semibold text-ink-2 hover:border-brand hover:text-brand transition-colors"
            >
              {kw}
            </button>
          ))}
        </div>
      )}

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated rounded-lg border border-line shadow-[var(--shadow-raised)] max-h-80 overflow-y-auto z-50">
          {loading && (
            <div className="p-4 text-center text-sm text-ink-3">검색 중...</div>
          )}
          {!loading && results.length === 0 && query && (
            <div className="p-4 text-center text-sm text-ink-3">
              검색 결과가 없어요
            </div>
          )}
          {!loading && results.map((r) => (
            <button
              key={r.contentId}
              onClick={() => {
                onSelectSpot?.(r.contentId);
                setShowResults(false);
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-surface-sunken transition-colors border-b border-line last:border-0"
            >
              {r.firstImage ? (
                <img src={r.firstImage} alt={r.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-surface-sunken flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} className="text-ink-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-1 truncate">{r.title}</p>
                <p className="text-xs text-ink-3 truncate">
                  {CONTENT_TYPE_LABELS[r.contentTypeId] ?? ''} · {r.addr1}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 4.11: HomeView (Home 메인 컴포넌트)

- [ ] **`app/components/home/HomeView.tsx` 생성**

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useLocation } from '../nav/LocationContext';
import { useHomeData } from '@/lib/use-home-data';
import HomeHero from './HomeHero';
import MagazineGrid from './MagazineGrid';
import WeatherCard from './WeatherCard';
import FestivalSideList from './FestivalSideList';
import SectionHeader from '../ui/SectionHeader';
import Container from '../ui/Container';
import Card from '../ui/Card';
import SpotCard from '../SpotCard';
import FestivalBadge from '../FestivalBadge';
import SearchBar from '../SearchBar';
import SpotDetailModal from '../SpotDetailModal';

export default function HomeView() {
  const { location, openModal } = useLocation();
  const { weather, festivals, spots, loading } = useHomeData(location);
  const searchParams = useSearchParams();
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  useEffect(() => {
    const spotParam = searchParams.get('spot');
    if (spotParam) setSelectedContentId(spotParam);
  }, [searchParams]);

  const main = (
    <div className="space-y-12 lg:space-y-16">
      {/* Mobile-only sections (sidebar 콘텐츠 합류) */}
      <div className="lg:hidden space-y-6">
        <SearchBar onSelectSpot={(id) => setSelectedContentId(id)} />
        <WeatherCard weather={weather} />
      </div>

      {/* 추천 관광지 */}
      <section id="recommended">
        <SectionHeader
          title="지금 가면 좋은 곳"
          description="이번 주말 추천 관광지"
        />
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>
                <div className="skeleton aspect-[4/3] rounded-xl" />
                <div className="space-y-2 mt-3">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {spots.slice(0, 6).map((s) => (
              <div key={s.contentId} onClick={() => setSelectedContentId(s.contentId)}>
                <SpotCard spot={s} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI 코스 CTA — 큰 매거진 카드 */}
      <section>
        <Card className="relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-6 lg:p-10 flex flex-col justify-center">
              <p className="text-xs font-semibold text-brand uppercase tracking-wide mb-3">AI 코스 추천</p>
              <h3
                className="text-2xl lg:text-3xl font-bold text-ink-1 leading-tight break-keep"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                3가지 선택만으로<br />당신만의 주말 코스를
              </h3>
              <p className="text-sm text-ink-3 mt-3 leading-relaxed break-keep">
                위치 · 동반자 · 기분을 알려주시면 AI가 10초 만에 맞춤 코스를 설계합니다.
              </p>
              <Link
                href="/course"
                className="inline-flex items-center gap-2 self-start mt-6 h-11 px-5 rounded-lg bg-brand text-white font-semibold hover:bg-brand-hover transition-colors"
              >
                <Sparkles size={16} strokeWidth={2} />
                지금 만들어보기
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </div>
            <div className="relative aspect-[16/10] lg:aspect-auto bg-surface-sunken">
              <img
                src="/hero/autumn-clear.jpg"
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </Card>
      </section>

      {/* 근처 축제 */}
      <section>
        <SectionHeader
          title="이번 주말 근처 축제"
          description="진행 중이거나 곧 시작하는 축제"
          moreHref="/festival"
        />
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 lg:mx-0 px-5 lg:px-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-64 lg:w-72">
                <div className="skeleton aspect-[16/10] rounded-xl" />
                <div className="space-y-2 mt-3">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : festivals.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-ink-3">진행 중인 축제가 없어요</p>
          </Card>
        ) : (
          <div
            className="flex gap-4 overflow-x-auto pb-2 -mx-5 lg:mx-0 px-5 lg:px-0 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none' }}
          >
            {festivals.map((f) => (
              <div
                key={f.contentId}
                className="snap-start"
                onClick={() => setSelectedContentId(f.contentId)}
              >
                <FestivalBadge festival={f} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 서비스 소개 한 줄 */}
      <section>
        <Card variant="sunken" className="p-5 lg:p-6 text-center">
          <p className="text-sm text-ink-2 leading-relaxed break-keep">
            <strong className="text-brand font-bold">이모추</strong>는 한국관광공사 TourAPI와 AI를 활용해
            매주 새로운 주말 나들이 코스를 추천합니다.
          </p>
          <p className="text-xs text-ink-4 mt-2">2026 관광데이터 활용 공모전 출품작</p>
        </Card>
      </section>
    </div>
  );

  const side = (
    <>
      <WeatherCard weather={weather} />
      <FestivalSideList
        festivals={festivals}
        onSelect={(id) => setSelectedContentId(id)}
      />
      <Card className="p-5">
        <h3
          className="text-sm font-bold text-ink-1 mb-3"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          현재 위치
        </h3>
        <p className="text-sm text-ink-2 mb-4">{location?.name ?? '위치 설정 필요'}</p>
        <button
          onClick={openModal}
          className="w-full h-10 rounded-md border border-line text-sm font-semibold text-ink-2 hover:border-brand hover:text-brand transition-colors"
        >
          위치 변경
        </button>
      </Card>
    </>
  );

  return (
    <>
      <HomeHero weather={weather} spots={spots} />
      <Container className="py-10 lg:py-14">
        <MagazineGrid main={main} side={side} />
      </Container>

      <SpotDetailModal
        contentId={selectedContentId}
        onClose={() => setSelectedContentId(null)}
      />
    </>
  );
}
```

> **사이드바 콘텐츠 모바일 합류**: 모바일에서는 `MagazineGrid`가 자동으로 사이드를 본문 아래로 이동시킨다. 이미 `main`의 mobile-only 섹션에 SearchBar + WeatherCard를 노출하고, FestivalSideList와 위치 변경 카드는 사이드에서 자동 합류된다. 단 모바일에서 위치 변경 카드 + 헤더 위치 칩이 중복으로 보일 수 있어 모바일에서는 위치 변경 카드를 숨기는 것이 깔끔하다. 다음 step에서 처리.

### Step 4.12: app/page.tsx 교체

- [ ] **`app/page.tsx` 전체 교체**

```tsx
import { Suspense } from 'react';
import HomeView from './components/home/HomeView';

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeView />
    </Suspense>
  );
}
```

> `HomeView`가 `useSearchParams()`를 쓰므로 Next.js 16 App Router 규칙에 따라 Suspense 경계가 필요.

### Step 4.13: Hero Image 큐레이션 폴백 자산 확인

- [ ] **자산 확인** (사전 준비 완료 가정)

```bash
ls C:/Users/jaeoh/Desktop/workspace/emochu/public/hero/
```

기대 결과: 6개 파일 존재 (`spring-clear.jpg`, `summer-clear.jpg`, `autumn-clear.jpg`, `winter-clear.jpg`, `rain.jpg`, `snow.jpg`).

자산이 없으면 시각 검증 시 hero가 깨진 이미지로 표시. 빌드는 통과한다.

### Step 4.14: 옛 파일 삭제

- [ ] **WeekendHome.tsx 삭제**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git rm app/components/WeekendHome.tsx
```

- [ ] **WeatherBar.tsx 삭제**

WeatherBar는 spec 7.3에 따라 "사용처 0이면 삭제"이고, 이미 grep으로 사용처 0 확인됨. WeekendHome도 함께 삭제되므로 안전.

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git rm app/components/WeatherBar.tsx
```

### Step 4.15: 빌드·린트·시각 검증·커밋

- [ ] **빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && npm run build
```

기대: 0 에러.

- [ ] **린트**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && npm run lint
```

- [ ] **수동 시각 검증** (사용자 액션) — 4 브레이크포인트 모두

`npm run dev` 후 1440 / 1024 / 768 / 375 width에서:

**1440px (와이드 데스크톱)**
- 상단 헤더 풀 너비, 메뉴 + 검색바 expanded, 위치 칩 보임
- Hero 60vh, 큐레이션 사진 또는 TourAPI 사진 (날씨/시즌 매칭) 로드
- 본문 8col + 사이드바 4col, 사이드바 sticky 동작
- SpotCard 3열 × 2행 = 6개 보임
- AI 코스 CTA 큰 카드 (좌 텍스트 / 우 사진)
- 축제 가로 스크롤 5~6개

**1024px (데스크톱 진입점)**
- 동일하나 검색바 width=72(focus 전), 사이드바 비례 좁음

**768px (태블릿)**
- 모바일 레이아웃 적용 (단일 컬럼)
- 상단 헤더 모바일 모드 (메뉴 없음, 위치 칩만)
- 하단 탭바 출현

**375px (모바일)**
- 단일 컬럼
- Hero 50vh
- 본문 흐름: 검색바 → WeatherCard → SpotCard 2열 그리드 → AI CTA → 축제 가로 스크롤 → 서비스 소개
- 사이드바 콘텐츠 자동 합류 (FestivalSideList, 위치 변경 카드)
- BottomTabBar 표시

**회귀 체크**:
- TourAPI 데이터 안 와도 폴백 작동 (hero는 큐레이션 사진, spots/festivals 빈 상태 메시지)
- GPS 거부해도 서울 기본값으로 home 데이터 로드
- SpotCard 클릭 → SpotDetailModal 정상 오픈 (기존 모달 그대로)
- 헤더 위치 칩 또는 사이드바 "위치 변경" 클릭 → LocationModal 오픈, 도시 선택 시 home 데이터 refetch
- 데스크톱 GlobalSearchBar에서 검색 후 결과 클릭 → home으로 이동하며 SpotDetailModal 자동 오픈 (`?spot=XXX` 쿼리)
- 옛 페이지(`/course`, `/festival`) 정상 이동, 옛 톤 유지

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/components/home/ app/components/SpotCard.tsx app/components/FestivalBadge.tsx app/components/SearchBar.tsx app/page.tsx lib/hero-copy.ts lib/hero-image.ts lib/use-home-data.ts public/hero/ && git commit -m "$(cat <<'EOF'
feat(home): Home 페이지 매거진 레이아웃 + Hero + 사이드바 재구축

- HomeHero: 풀폭 에디토리얼 사진(50/60vh) + 날씨/시즌 카피 + 더블 CTA
- MagazineGrid: 데스크톱 8/4 분할, 모바일 단일 컬럼 자연 합류
- WeatherCard / FestivalSideList: 사이드바용 신규 카드
- SpotCard / FestivalBadge / SearchBar: 새 토큰 + Lucide + 그라데이션·이모지 제거
- lib/hero-copy + hero-image: 날씨/시즌 기반 카피·사진 룩업
- lib/use-home-data: 데이터 fetch 훅 분리
- app/page.tsx: Suspense + HomeView로 교체
- WeekendHome.tsx, WeatherBar.tsx 삭제

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 정리 & 최종 검증

**Files:** (수정 없음, 검증 위주)

### Step 5.1: 옛 클래스 잔존 확인

- [ ] **Home + 글로벌 chrome 영역에서 옛 클래스 사용 0건 확인**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && grep -rn "from-orange-\|via-orange-\|to-orange-\|from-pink-\|via-pink-\|to-pink-\|from-violet-\|via-violet-\|to-violet-\|shadow-orange-\|orange-400\|orange-500" app/components/ui/ app/components/nav/ app/components/home/ app/page.tsx app/layout.tsx app/globals.css 2>/dev/null
```

기대 결과: 0 매치.

매치가 있으면 해당 위치를 새 토큰으로 교체:
- `bg-orange-400` → `bg-brand`
- `text-orange-500` → `text-brand`
- `border-orange-100` → `border-line`
- `from-orange-* via-pink-* to-violet-*` 그라데이션 → 단색 또는 사진 배경으로 교체

### Step 5.2: 옛 페이지 호환성 grep

- [ ] **`/course`, `/festival`에서 globals.css의 옛 애니메이션 사용 확인**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && grep -rn "badge-pulse\|progress-glow\|select-bounce\|weather-sun\|weather-cloud\|weather-rain" app/components/ app/pages/ 2>/dev/null
```

기대 결과: 0 매치 (Task 1에서 globals.css에서 제거됨, 옛 페이지에서도 사용 안 됨).

매치가 있으면 두 옵션:
1. 해당 컴포넌트에서 클래스 제거 (옛 페이지의 시각적 효과 잃음)
2. globals.css에 임시로 해당 키프레임만 다시 추가 (Phase 2/3에서 정리)

### Step 5.3: Dead import 확인

- [ ] **WeekendHeader / WeekendHome / WeatherBar / 옛 BottomTabBar import 잔존 확인**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && grep -rn "from.*WeekendHeader\|from.*WeekendHome\|from.*WeatherBar\|from '\\./BottomTabBar'\|from '\\.\\./BottomTabBar'" app/ lib/ 2>/dev/null
```

기대 결과: 0 매치 (Task 3, 4에서 모두 정리됨).

### Step 5.4: 최종 빌드

- [ ] **클린 빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build
```

기대: 0 에러, 0 경고 (의미 있는 것).

### Step 5.5: 최종 시각 회귀 (사용자 액션)

- [ ] **4 브레이크포인트 종합 시각 검증**

`npm run dev` 후:

**전체 시나리오 1: 신규 방문자 (GPS 허용)**
- Home 진입 → GPS 허용 → "내 근처" 위치로 데이터 로드 → Hero 카피가 날씨에 맞음
- 데스크톱: 매거진 레이아웃, 사이드바 sticky
- 모바일: 단일 컬럼, BottomTabBar 보임

**전체 시나리오 2: GPS 거부**
- Home 진입 → GPS 거부 → "서울" 기본값 → 데이터 로드 정상

**전체 시나리오 3: 위치 변경**
- 헤더 위치 칩 클릭 → 모달 오픈 → "부산" 선택 → home 데이터 refetch
- 모달이 모바일에서 바텀시트, 데스크톱에서 가운데

**전체 시나리오 4: 검색**
- 데스크톱: 헤더 검색바 → "벚꽃" 검색 → 결과 클릭 → SpotDetailModal 오픈
- 모바일: home 본문 SearchBar → 검색 → 결과 클릭 → SpotDetailModal 오픈

**전체 시나리오 5: 다른 페이지 이동**
- 메뉴 "코스 만들기" 클릭 → `/course` 정상 이동 (옛 톤이지만 GlobalHeader는 새 톤으로 통일됨 → 자연스러움)
- 메뉴 "축제" → `/festival` 정상 이동
- 코스 페이지에서 "홈" 메뉴 → home 복귀

**전체 시나리오 6: 데이터 폴백**
- TourAPI 키 미설정 시 (`.env.local`에서 잠시 키 비활성) → DEMO_WEATHER 표시, 축제·관광지 빈 상태 메시지 정상

### Step 5.6: 최종 정리 커밋 (필요 시)

위 검증 중 발견된 사소한 수정사항이 있으면 별도 커밋:

- [ ] **(있을 경우) 정리 커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add -A && git commit -m "$(cat <<'EOF'
chore(redesign): Phase 1 시각 회귀 검증 후 사소한 정리

[발견된 항목 구체적으로 기록]

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: /codex:reviewer 전체 리뷰

Phase 1 구현이 모두 완료되고 시각 검증을 통과한 후, 사용자가 명시적으로 요청한 코드 리뷰 단계.

### Step 6.1: codex 리뷰 요청

- [ ] **codex 리뷰어 스킬 호출**

`Skill` 도구로 `codex:rescue` 또는 적절한 codex 리뷰어 슬래시 커맨드를 사용한다.
사용자가 명시한 슬래시 커맨드는 `/codex:reviewer`이다. 이 커맨드는 다음 범위로 리뷰를 요청한다:

- 리뷰 범위: Phase 1 redesign으로 추가/수정된 모든 파일 (Task 1~5 커밋 범위)
- 검토 항목:
  1. 디자인 시스템 토큰 일관성 (임의 컬러 직접 사용 0건)
  2. 반응형 레이아웃 정합성 (브레이크포인트 일관성)
  3. 접근성 (키보드 네비, focus 표시, alt/aria)
  4. 성능 (불필요한 client component, useEffect 누락 의존성)
  5. 옛 페이지(course/festival)와 새 컴포넌트의 호환성
  6. 데드 코드 / 사용 안 되는 import

### Step 6.2: 리뷰 결과 반영

- [ ] **이슈 발견 시 재수정 → 빌드 → 커밋**

Codex 리뷰가 발견한 이슈마다:
1. 우선순위 분류 (Critical / Important / Nice-to-have)
2. Critical/Important만 즉시 수정
3. 수정 후 `npm run build` + 시각 회귀 재확인
4. 별도 커밋: "fix(review): [이슈 요약]"

Nice-to-have는 Phase 2/3 backlog로 spec 문서에 추가.

---

## Self-Review Checklist (이 plan 작성자가 수행)

### Spec coverage
- [x] §3 Color tokens → Task 1.2
- [x] §3 Typography (Gmarket Sans + 폰트 토큰) → Task 1.2
- [x] §3 Spacing/Radius/Shadow → Task 1.2
- [x] §3 Breakpoints → Tailwind v4 기본값 사용
- [x] §4 UI 프리미티브 5개 → Task 2
- [x] §5.1 데스크톱 헤더 → Task 3.5
- [x] §5.2 모바일 헤더 → Task 3.5 (한 컴포넌트에서 분기)
- [x] §5.3 모바일 BottomTabBar → Task 3.6
- [x] §5.4 위치 변경 모달 → Task 3.1, 3.3
- [x] §5.5 nav 컴포넌트 파일 구조 → Task 3 전체
- [x] §6.1 데스크톱 매거진 레이아웃 → Task 4.7, 4.11
- [x] §6.2 모바일 단일 컬럼 흐름 → Task 4.11 (mobile-only 섹션)
- [x] §6.3 Hero 카피 시스템 → Task 4.1
- [x] §6.4 Hero 이미지 결정 트리 → Task 4.2, 4.4
- [x] §7.1 신규 파일 생성 → Task 2, 3, 4
- [x] §7.2 리스타일 (BottomTabBar, SpotCard, FestivalBadge, SearchBar, globals, layout, page, WeekendHome) → Task 1, 3, 4
- [x] §7.3 삭제 (WeekendHeader, WeekendHome, WeatherBar, 옛 BottomTabBar) → Task 3.8, 3.9, 4.14
- [x] §8 진행 순서 5단계 → Task 1~5
- [x] §9 검증 전략 → 각 task 마지막 단계
- [x] §10 위험 완화 → next/image error fallback (Task 4.4), font-display swap (Task 1.2), sticky max-height (Task 4.7), 모달 키보드 처리 (Task 3.3)
- [x] §11 Backlog → spec에 이미 명시 (이 plan에서 다시 다룰 필요 없음)
- [x] 사용자 추가 요청: /codex:reviewer 단계 → Task 6

### Placeholder scan
- [ ] "TBD/TODO" 0건 확인 → 0건 (사용자 액션 표시는 USER ACTION REQUIRED로 명시)
- [ ] "implement later" 0건 → 0건
- [ ] 코드 없는 step 0건 → 0건 (모든 코드 step에 완전한 코드 블록)

### Type consistency
- `useLocation()` 반환 타입에서 `location: UserLocation | null` → 모든 사용처(`HomeView`, `LocationSelector`, `LocationModal`, `HomeHero`)에서 null 체크
- `useHomeData(loc)`의 `loc`도 null 허용 → 내부에서 null 체크
- `LocationContext` `setLocation(loc: UserLocation)` 시그니처 → `LocationModal`에서 호출 시 일치
- `getHeroCopy(weather, date)` 시그니처 → `HomeHero`에서 호출 일치
- `getCuratedHeroImage(weather, date)`, `pickHeroFromSpots(spots)` → `HomeHero`에서 일치
