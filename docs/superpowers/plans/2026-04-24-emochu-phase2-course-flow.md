# 이모추 Phase 2 재디자인 — 코스 플로우 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이모추 코스 플로우 3개 화면(CourseWizard · CourseResult · CourseMap)을 Phase 1 토큰·UI 프리미티브 위에 재구축하고, 데스크톱 split view + 역할 기반 컬러 + 타임라인 프리뷰 스켈레톤 로딩으로 에디토리얼 코스 큐레이션 감각을 구현한다.

**Architecture:** 옛 3개 큰 파일(CourseWizard 562L · CourseResult 543L · CourseMap 199L)을 `app/components/course/{wizard,loading,result}/` 디렉토리의 작고 집중된 컴포넌트 20여 개로 분해한다. 상태 관리는 `WizardShell`의 `useReducer` + `lib/use-course-generation.ts` 훅(AI 호출) + `lib/use-active-stop.ts` 훅(Timeline↔Map 연동). 스키마는 `CourseStop.contentTypeId?: string` optional 추가로 기존 저장 코스 하위호환.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS v4 · Lucide React · Kakao Maps SDK · Google Gemini (기존 AI) · Supabase (기존 저장)

**Spec:** `docs/superpowers/specs/2026-04-24-emochu-phase2-course-flow-design.md`

---

## 검증 전략 (테스트 없음 환경)

Phase 1과 동일하게 프로젝트에는 단위 테스트 인프라가 없다. UI 리팩토링 + 스키마 변경 특성상 다음 전략으로 검증한다:

- **빌드 검증**: 각 task 끝에 `rm -rf .next && npm run build` 실행 → TypeScript 에러·import 에러·Next 빌드 에러 0건
- **grep 검증**: 옛 컬러 클래스 · 이모지 · dead import 0건 확인
- **시각 검증** (사용자 액션): `npm run dev` 로 4 브레이크포인트(1440 / 1024 / 768 / 375) 수동 확인
- **회귀 체크리스트**: 각 task별 명시 (기존 저장 코스 하위호환, AI 응답 fallback, 카카오맵 로드 지연, SpotDetailModal 정상 오픈 등)

---

## 파일 구조 (전체 변경 요약)

### 신규 파일 (20개)

```
lib/
  course-role.ts                        (Task 1)
  use-course-generation.ts              (Task 2)
  use-active-stop.ts                    (Task 2)

app/components/course/wizard/
  WizardShell.tsx                       (Task 3)
  WizardStepper.tsx                     (Task 3)
  WizardProgressBar.tsx                 (Task 3)
  WizardNav.tsx                         (Task 3)
  steps/
    StepDestination.tsx                 (Task 3)
    StepFeeling.tsx                     (Task 3)
    StepDuration.tsx                    (Task 3)
    StepCompanion.tsx                   (Task 3)
    StepPreferences.tsx                 (Task 3)

app/components/course/loading/
  CourseLoading.tsx                     (Task 4)
  SkeletonStopCard.tsx                  (Task 4)

app/components/course/result/
  CourseResultShell.tsx                 (Task 5)
  CourseSummary.tsx                     (Task 5)
  DayTabs.tsx                           (Task 5)
  Timeline.tsx                          (Task 5)
  StopCard.tsx                          (Task 5)
  CourseTip.tsx                         (Task 5)
  SaveShareBar.tsx                      (Task 5)
  CourseMapPane.tsx                     (Task 5)
```

### 수정 파일 (7개)

```
app/globals.css                         (Task 1: role 팔레트 5개 토큰 추가)
lib/weekend-types.ts                    (Task 1: CourseStop.contentTypeId 추가)
lib/weekend-ai.ts                       (Task 1: Gemini 프롬프트 스키마 확장)
app/api/course/route.ts                 (Task 1: fallbackContentTypeId 주입)
next.config.ts                          (Task 2: TourAPI 호스트 추가)
app/(pages)/course/page.tsx             (Task 3: WizardShell 마운트만)
app/(pages)/course/[slug]/page.tsx      (Task 5: CourseResultShell 마운트만)
```

### 삭제 파일 (3개)

```
app/components/CourseWizard.tsx         (Task 3 말미)
app/components/CourseResult.tsx         (Task 5 말미)
app/components/CourseMap.tsx            (Task 5 말미)
```

### Phase 1 Backlog 흡수 대상 (Task 6)

```
app/components/nav/GlobalHeader.tsx     (aria-current)
app/components/nav/BottomTabBar.tsx     (aria-current)
app/components/nav/LocationSelector.tsx (aria-label / haspopup / expanded)
app/components/home/WeatherCard.tsx     ('use client' 제거)
app/components/home/FestivalSideList.tsx ('use client' 제거)
app/components/home/HomeHero.tsx        (next/image 복원)
app/components/home/HomeView.tsx        (카드 키보드 접근성 + next/image)
app/components/SpotCard.tsx             (next/image 복원)
app/components/FestivalBadge.tsx        (next/image 복원)
app/components/nav/GlobalSearchBar.tsx  (검색 결과 이미지 next/image 복원)
```

---

## Task 1: 디자인 토큰 + 스키마 변경 + course-role 로직

**Files:**
- Modify: `app/globals.css`
- Modify: `lib/weekend-types.ts`
- Modify: `lib/weekend-ai.ts`
- Modify: `app/api/course/route.ts`
- Create: `lib/course-role.ts`

### Step 1.1: globals.css 에 role 팔레트 5개 토큰 추가

- [ ] **`app/globals.css` 의 Functional 토큰 블록 바로 아래에 추가**

다음 줄을 찾아서:

```
  /* Hero fallback gradient — 사진 로드 실패 시 에디토리얼 질감 유지 */
  --color-hero-fallback-start: #3D2914;
  --color-hero-fallback-mid: #5C3D2A;
  --color-hero-fallback-end: #7A5642;
```

바로 아래에 삽입:

```css
  /* Stop role palette — 타임라인 뱃지·지도 마커 공통 (Phase 2) */
  --color-role-spot: #C5532D;      /* 관광지/문화/액티비티 (= brand) */
  --color-role-food: #8B5E3C;      /* 맛집 (= mocha) */
  --color-role-cafe: #A8421F;      /* 카페 (= brand-hover 톤) */
  --color-role-festival: #B8860B;  /* 축제 (= warning) */
  --color-role-stay: #4A6B8A;      /* 숙박 (= info) */
```

### Step 1.2: CourseStop 스키마에 contentTypeId 추가

- [ ] **`lib/weekend-types.ts` 의 `CourseStop` interface 수정**

`transitInfo?: string;` 아래에 다음 줄 추가:

```ts
  contentTypeId?: string;  // Phase 2: "12"|"14"|"15"|"28"|"32"|"39" — optional (기존 저장 코스 하위호환)
```

### Step 1.3: Gemini 프롬프트 스키마 확장

- [ ] **`lib/weekend-ai.ts` 에서 Gemini 에 요구하는 JSON 스키마에 contentTypeId 필드 추가**

먼저 현재 프롬프트 구조 확인:

```bash
grep -n "contentId\|stops\|JSON" lib/weekend-ai.ts | head -20
```

Gemini 가 stops 배열 각 항목에 `contentId` 를 포함하도록 이미 요구하고 있을 것이다. `contentId` 필드 요구 부분을 찾아서 `contentTypeId` 를 optional 필드로 추가 명시한다.

예시 (실제 프롬프트 문자열 위치에서):

```ts
// Before:
// - contentId: (TourAPI 후보 중 하나의 contentId, 필수)

// After:
// - contentId: (TourAPI 후보 중 하나의 contentId, 필수)
// - contentTypeId: (후보의 contentTypeId 그대로 복사, "12"|"14"|"15"|"28"|"32"|"39")
```

후보 데이터를 프롬프트에 직렬화하는 부분(일반적으로 `candidate.contentTypeId` 속성)이 이미 포함되어 있을 것이므로, 없다면 후보 데이터 직렬화 템플릿에 `contentTypeId: "${candidate.contentTypeId}"` 를 추가한다.

### Step 1.4: API route 에서 fallbackContentTypeId 주입

- [ ] **`app/api/course/route.ts` 의 AI 응답 검증 로직 수정**

AI 가 반환한 stops 배열에 대해 후보 원본에서 `contentTypeId` 를 fallback 주입:

현재 validation 섹션 근처 (stops 를 매핑하는 부분)에서 각 stop 을 다음과 같이 보강:

```ts
const enrichedStops = aiCourse.stops.map((stop: CourseStop) => {
  // AI 가 contentTypeId 를 생략한 경우, 후보 원본에서 찾아서 주입
  if (!stop.contentTypeId && stop.contentId) {
    const candidate = allCandidates.find((c) => c.contentid === stop.contentId);
    if (candidate?.contenttypeid) {
      stop.contentTypeId = String(candidate.contenttypeid);
    }
  }
  return stop;
});
```

`allCandidates` 변수명은 실제 코드에 맞게 조정한다. 후보 배열 이름을 먼저 grep 으로 확인:

```bash
grep -n "candidates\|allCandidates\|spotCandidates" app/api/course/route.ts | head -10
```

### Step 1.5: lib/course-role.ts 신설 — 역할 판정 + 컬러 매핑

- [ ] **`lib/course-role.ts` 생성**

```ts
import type { CourseStop } from './weekend-types';

export type Role = 'spot' | 'food' | 'cafe' | 'festival' | 'stay';

export interface RoleInfo {
  role: Role;
  colorVar: string;  // CSS 변수 참조 문자열 (ex: 'var(--color-role-food)')
  colorHex: string;  // 카카오맵 marker 주입용 헥사 상수
  label: string;     // 한국어 라벨
}

const ROLE_MAP: Record<Role, Omit<RoleInfo, 'role'>> = {
  spot:     { colorVar: 'var(--color-role-spot)',     colorHex: '#C5532D', label: '관광지' },
  food:     { colorVar: 'var(--color-role-food)',     colorHex: '#8B5E3C', label: '맛집' },
  cafe:     { colorVar: 'var(--color-role-cafe)',     colorHex: '#A8421F', label: '카페' },
  festival: { colorVar: 'var(--color-role-festival)', colorHex: '#B8860B', label: '축제' },
  stay:     { colorVar: 'var(--color-role-stay)',     colorHex: '#4A6B8A', label: '숙박' },
};

const CAFE_KEYWORDS = ['카페', 'coffee', '커피', 'Coffee', 'COFFEE'];

function isCafe(stop: Pick<CourseStop, 'title' | 'description'>): boolean {
  const text = `${stop.title ?? ''} ${stop.description ?? ''}`;
  return CAFE_KEYWORDS.some((kw) => text.includes(kw));
}

export function getRole(stop: Pick<CourseStop, 'contentTypeId' | 'isFestival' | 'isStay' | 'title' | 'description'>): Role {
  if (stop.isStay) return 'stay';
  if (stop.isFestival) return 'festival';
  if (stop.contentTypeId === '39') return isCafe(stop) ? 'cafe' : 'food';
  if (stop.contentTypeId === '12' || stop.contentTypeId === '14' || stop.contentTypeId === '28') return 'spot';
  return 'spot';  // fallback (contentTypeId 누락 포함)
}

export function getRoleInfo(stop: Pick<CourseStop, 'contentTypeId' | 'isFestival' | 'isStay' | 'title' | 'description'>): RoleInfo {
  const role = getRole(stop);
  return { role, ...ROLE_MAP[role] };
}

export function roleBgClass(role: Role): string {
  return `bg-role-${role}`;
}

export function roleLabel(role: Role): string {
  return ROLE_MAP[role].label;
}
```

### Step 1.6: 빌드 검증 + 커밋

- [ ] **빌드 검증**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build 2>&1 | tail -15
```

기대: 0 에러. Tailwind v4 가 새 `--color-role-*` 토큰을 자동으로 `bg-role-*`, `text-role-*` 유틸리티로 생성.

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/globals.css lib/weekend-types.ts lib/weekend-ai.ts app/api/course/route.ts lib/course-role.ts && git commit -m "$(cat <<'EOF'
feat(phase2): role 팔레트 + CourseStop.contentTypeId + course-role 로직

Phase 2 기반 작업:
- globals.css: --color-role-{spot,food,cafe,festival,stay} 5개 토큰 추가
- weekend-types.ts: CourseStop.contentTypeId?: string (optional)
- weekend-ai.ts: Gemini 프롬프트 스키마에 contentTypeId 필드 요구
- app/api/course/route.ts: 후보 원본에서 fallbackContentTypeId 주입
- lib/course-role.ts: contentTypeId + 플래그 → role + 컬러/라벨 매핑
  · cafe 판정은 contentTypeId=39 + 제목/설명 키워드 ("카페"|"coffee"|"커피")
  · 기존 저장 코스(contentTypeId 누락)는 'spot' fallback

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: lib 훅 신설 + next.config 확장

**Files:**
- Create: `lib/use-course-generation.ts`
- Create: `lib/use-active-stop.ts`
- Modify: `next.config.ts`

### Step 2.1: next.config.ts 에 TourAPI 호스트 추가

- [ ] **`next.config.ts` 수정 — images.remotePatterns 추가**

현재 파일을 먼저 확인:

```bash
cat next.config.ts
```

빈 config (`export default {}`) 이면 다음으로 교체:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'tong.visitkorea.or.kr' },
      { protocol: 'https', hostname: 'tong.visitkorea.or.kr' },
    ],
  },
};

export default nextConfig;
```

기존에 다른 설정이 있으면 `images` 키만 추가(merge).

### Step 2.2: lib/use-course-generation.ts 신설

- [ ] **파일 생성**

기존 CourseWizard 의 `handleGenerate` + 로딩 상태 관리를 훅으로 추출.

```ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CourseResponse, Duration, Companion, Preference, Feeling, DestinationType } from './weekend-types';

export interface GenerateParams {
  lat: number;
  lng: number;
  duration: Duration;
  companion: Companion;
  preferences: Preference[];
  feeling?: Feeling;
  destinationType?: DestinationType;
  cityAreaCode?: string;
  mood?: string | null;
}

export interface GenerationState {
  loading: boolean;
  error: string | null;
  generate: (params: GenerateParams) => Promise<void>;
}

const LOADING_MESSAGES = [
  '주변 관광지를 살펴보고 있어요',
  'AI가 코스 순서를 계산하는 중이에요',
  '실시간 날씨와 동선을 반영하고 있어요',
  '마지막으로 다듬는 중이에요',
];

export function useCourseGeneration(): GenerationState & { loadingMessage: string } {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  // 로딩 중 4개 메시지 8초 간격 순환, 마지막에서 정지
  useEffect(() => {
    if (!loading) {
      setMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMessageIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 8000);
    return () => clearInterval(interval);
  }, [loading]);

  const generate = useCallback(async (params: GenerateParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: params.lat,
          lng: params.lng,
          duration: params.duration,
          companion: params.companion,
          preferences: params.preferences,
          feeling: params.feeling,
          destinationType: params.destinationType ?? 'nearby',
          cityAreaCode: params.cityAreaCode,
          mood: params.mood,
        }),
      });
      const data: CourseResponse = await res.json();
      if (!res.ok) {
        throw new Error((data as unknown as { error?: string }).error ?? '코스 생성에 실패했어요.');
      }
      sessionStorage.setItem('weekendCourse', JSON.stringify(data));
      const slug = data.shareUrl.split('/').pop();
      router.replace(`/course/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '코스 생성 중 문제가 생겼어요.');
      setLoading(false);
    }
  }, [router]);

  return {
    loading,
    error,
    generate,
    loadingMessage: LOADING_MESSAGES[messageIndex],
  };
}
```

### Step 2.3: lib/use-active-stop.ts 신설

- [ ] **파일 생성**

```ts
'use client';

import { useState, useCallback } from 'react';

export interface ActiveStopState {
  activeIndex: number | null;
  setActive: (index: number | null) => void;
  toggleActive: (index: number) => void;
}

export function useActiveStop(): ActiveStopState {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const setActive = useCallback((index: number | null) => {
    setActiveIndex(index);
  }, []);

  const toggleActive = useCallback((index: number) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  }, []);

  return { activeIndex, setActive, toggleActive };
}
```

### Step 2.4: 빌드 검증 + 커밋

- [ ] **빌드 검증**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build 2>&1 | tail -15
```

기대: 0 에러. 훅들은 아직 사용되지 않지만 TS 타입 체크 통과.

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add next.config.ts lib/use-course-generation.ts lib/use-active-stop.ts && git commit -m "$(cat <<'EOF'
feat(phase2): next/image TourAPI 호스트 + use-course-generation/active-stop 훅

- next.config.ts: images.remotePatterns 에 tong.visitkorea.or.kr 추가
  → 이후 Task 3~5 에서 <Image /> 복원 가능
- lib/use-course-generation.ts: AI 호출 + 4개 순환 로딩 메시지 관리
  기존 CourseWizard handleGenerate 로직 훅화
- lib/use-active-stop.ts: Timeline 카드 ↔ 지도 마커 연동 상태 관리

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Wizard 재구축

**Files:**
- Create: `app/components/course/wizard/WizardShell.tsx`
- Create: `app/components/course/wizard/WizardStepper.tsx`
- Create: `app/components/course/wizard/WizardProgressBar.tsx`
- Create: `app/components/course/wizard/WizardNav.tsx`
- Create: `app/components/course/wizard/steps/StepDestination.tsx`
- Create: `app/components/course/wizard/steps/StepFeeling.tsx`
- Create: `app/components/course/wizard/steps/StepDuration.tsx`
- Create: `app/components/course/wizard/steps/StepCompanion.tsx`
- Create: `app/components/course/wizard/steps/StepPreferences.tsx`
- Modify: `app/(pages)/course/page.tsx`
- Delete: `app/components/CourseWizard.tsx`

**Reference:** spec §6 (Wizard 상세 UI), §6.4 (아이콘 매핑 매트릭스)

### Step 3.1: WizardShell.tsx — 반응형 래퍼 + 상태 store

- [ ] **파일 생성**

`useReducer` 로 5단계 전체 상태 관리 + 데스크톱 2-column / 모바일 풀스크린 분기.

```tsx
'use client';

import { useReducer, useEffect } from 'react';
import type {
  Duration, Companion, Preference, Feeling,
  DestinationType, MoodType, CityOption,
} from '@/lib/weekend-types';
import { useCourseGeneration } from '@/lib/use-course-generation';
import { CITY_OPTIONS, MOOD_OPTIONS } from '@/lib/weekend-types';
import Container from '@/app/components/ui/Container';
import CourseLoading from '../loading/CourseLoading';
import WizardStepper from './WizardStepper';
import WizardProgressBar from './WizardProgressBar';
import WizardNav from './WizardNav';
import StepDestination from './steps/StepDestination';
import StepFeeling from './steps/StepFeeling';
import StepDuration from './steps/StepDuration';
import StepCompanion from './steps/StepCompanion';
import StepPreferences from './steps/StepPreferences';

export interface WizardState {
  step: number;
  destinationType: DestinationType | null;
  selectedCity: CityOption | null;
  selectedMood: MoodType | null;
  feeling: Feeling | null;
  duration: Duration | null;
  companion: Companion | null;
  preferences: Preference[];
  userLocation: { lat: number; lng: number } | null;
  gpsLoading: boolean;
}

export type WizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_DESTINATION_TYPE'; value: DestinationType | null }
  | { type: 'SET_CITY'; value: CityOption | null }
  | { type: 'SET_MOOD'; value: MoodType | null }
  | { type: 'SET_FEELING'; value: Feeling | null }
  | { type: 'SET_DURATION'; value: Duration | null }
  | { type: 'SET_COMPANION'; value: Companion | null }
  | { type: 'TOGGLE_PREFERENCE'; value: Preference }
  | { type: 'SET_USER_LOCATION'; value: { lat: number; lng: number } | null }
  | { type: 'SET_GPS_LOADING'; value: boolean };

const INITIAL: WizardState = {
  step: 0,
  destinationType: null,
  selectedCity: null,
  selectedMood: null,
  feeling: null,
  duration: null,
  companion: null,
  preferences: [],
  userLocation: null,
  gpsLoading: false,
};

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP': return { ...state, step: action.step };
    case 'SET_DESTINATION_TYPE': {
      // 선택 전환 시 의존 선택 초기화
      const next: WizardState = { ...state, destinationType: action.value };
      if (action.value !== 'city') next.selectedCity = null;
      if (action.value !== 'mood') next.selectedMood = null;
      return next;
    }
    case 'SET_CITY': return { ...state, selectedCity: action.value };
    case 'SET_MOOD': return { ...state, selectedMood: action.value };
    case 'SET_FEELING': return { ...state, feeling: action.value };
    case 'SET_DURATION': return { ...state, duration: action.value };
    case 'SET_COMPANION': return { ...state, companion: action.value };
    case 'TOGGLE_PREFERENCE': {
      const exists = state.preferences.includes(action.value);
      return { ...state, preferences: exists ? state.preferences.filter(p => p !== action.value) : [...state.preferences, action.value] };
    }
    case 'SET_USER_LOCATION': return { ...state, userLocation: action.value };
    case 'SET_GPS_LOADING': return { ...state, gpsLoading: action.value };
    default: return state;
  }
}

const TOTAL_STEPS = 5;

const STEP_META = [
  { title: '목적지', question: '어디로 떠나볼까요?', sub: '가고 싶은 스타일을 골라주세요.' },
  { title: '기분', question: '오늘 기분이 어때요?', sub: '기분에 맞는 코스를 AI가 맞춰드릴게요.' },
  { title: '시간', question: '얼마나 놀 수 있어요?', sub: '시간 여유에 맞게 코스를 짜드릴게요.' },
  { title: '동반자', question: '누구랑 가요?', sub: '함께하는 사람에 따라 추천이 달라져요.' },
  { title: '취향', question: '뭐가 끌려요?', sub: '여러 개 골라도 좋아요.' },
];

export default function WizardShell() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const { loading, error, generate, loadingMessage } = useCourseGeneration();

  // nearby 선택 시 GPS 요청
  useEffect(() => {
    if (state.destinationType !== 'nearby' || state.userLocation) return;
    dispatch({ type: 'SET_GPS_LOADING', value: true });
    if (!navigator.geolocation) {
      dispatch({ type: 'SET_USER_LOCATION', value: { lat: 37.5665, lng: 126.9780 } });
      dispatch({ type: 'SET_GPS_LOADING', value: false });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        dispatch({ type: 'SET_USER_LOCATION', value: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
        dispatch({ type: 'SET_GPS_LOADING', value: false });
      },
      () => {
        dispatch({ type: 'SET_USER_LOCATION', value: { lat: 37.5665, lng: 126.9780 } });
        dispatch({ type: 'SET_GPS_LOADING', value: false });
      },
      { timeout: 5000 },
    );
  }, [state.destinationType, state.userLocation]);

  const step0Complete =
    state.destinationType === 'nearby' ||
    (state.destinationType === 'city' && state.selectedCity !== null) ||
    (state.destinationType === 'mood' && state.selectedMood !== null);

  const canProceed =
    (state.step === 0 && step0Complete) ||
    (state.step === 1 && state.feeling !== null) ||
    (state.step === 2 && state.duration !== null) ||
    (state.step === 3 && state.companion !== null) ||
    (state.step === 4 && state.preferences.length > 0);

  const getRequestLocation = () => {
    if (state.destinationType === 'city' && state.selectedCity) {
      return { lat: state.selectedCity.lat, lng: state.selectedCity.lng };
    }
    if (state.destinationType === 'mood' && state.selectedMood) {
      const mood = MOOD_OPTIONS.find(m => m.type === state.selectedMood);
      if (mood) {
        const city = CITY_OPTIONS.find(c => c.areaCode === mood.areaCodes[0]);
        if (city) return { lat: city.lat, lng: city.lng };
      }
    }
    return state.userLocation ?? { lat: 37.5665, lng: 126.9780 };
  };

  const handleNext = () => {
    if (state.step < TOTAL_STEPS - 1) {
      dispatch({ type: 'SET_STEP', step: state.step + 1 });
    } else if (state.duration && state.companion && state.preferences.length > 0) {
      const loc = getRequestLocation();
      generate({
        ...loc,
        duration: state.duration,
        companion: state.companion,
        preferences: state.preferences,
        feeling: state.feeling ?? undefined,
        destinationType: state.destinationType ?? 'nearby',
        cityAreaCode: state.selectedCity?.areaCode,
        mood: state.selectedMood,
      });
    }
  };

  const handlePrev = () => {
    if (state.step > 0) dispatch({ type: 'SET_STEP', step: state.step - 1 });
  };

  if (loading) {
    return <CourseLoading message={loadingMessage} />;
  }

  const stepSummaries: (string | null)[] = [
    state.destinationType === 'nearby' ? '내 주변'
      : state.destinationType === 'city' ? state.selectedCity?.name ?? null
      : state.destinationType === 'mood' ? MOOD_OPTIONS.find(m => m.type === state.selectedMood)?.label ?? null
      : null,
    state.feeling ?? null,
    state.duration ?? null,
    state.companion ?? null,
    state.preferences.length > 0 ? `${state.preferences.length}개 선택` : null,
  ];

  const meta = STEP_META[state.step];

  const CurrentStep = [StepDestination, StepFeeling, StepDuration, StepCompanion, StepPreferences][state.step];

  return (
    <>
      <WizardProgressBar current={state.step} total={TOTAL_STEPS} />
      <Container>
        <div className="py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-10">
          <aside className="hidden lg:block">
            <WizardStepper
              current={state.step}
              titles={STEP_META.map(s => s.title)}
              summaries={stepSummaries}
              onJump={(i) => i <= state.step && dispatch({ type: 'SET_STEP', step: i })}
            />
          </aside>
          <section className="min-w-0">
            <h2 className="text-2xl lg:text-3xl font-bold text-ink-1 break-keep" style={{ fontFamily: 'var(--font-display)' }}>
              {meta.question}
            </h2>
            <p className="text-sm text-ink-3 mt-2">{meta.sub}</p>
            <div className="mt-6">
              <CurrentStep state={state} dispatch={dispatch} />
            </div>
            {error && (
              <p role="alert" className="mt-4 text-sm text-brand">{error}</p>
            )}
            <div className="mt-10">
              <WizardNav
                canGoBack={state.step > 0}
                canProceed={canProceed}
                isLast={state.step === TOTAL_STEPS - 1}
                onPrev={handlePrev}
                onNext={handleNext}
              />
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}
```

### Step 3.2: WizardStepper.tsx — 좌측 세로 스테퍼 (lg only)

- [ ] **파일 생성**

```tsx
import { Check } from 'lucide-react';

interface Props {
  current: number;
  titles: string[];
  summaries: (string | null)[];  // 완료 단계의 선택 답 요약
  onJump: (index: number) => void;
}

export default function WizardStepper({ current, titles, summaries, onJump }: Props) {
  return (
    <ol className="space-y-6" aria-label="코스 생성 진행 단계">
      {titles.map((title, i) => {
        const status = i < current ? 'completed' : i === current ? 'active' : 'upcoming';
        const isClickable = i < current;
        const iconBg =
          status === 'completed' ? 'bg-brand-soft text-brand'
          : status === 'active' ? 'bg-brand text-white'
          : 'bg-surface-elevated border border-line text-ink-4';
        const titleColor =
          status === 'active' ? 'font-bold text-ink-1'
          : status === 'completed' ? 'text-ink-2'
          : 'text-ink-4';
        const content = (
          <>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${iconBg}`} aria-hidden="true">
              {status === 'completed' ? <Check size={16} strokeWidth={3} /> : i + 1}
            </div>
            <div className="min-w-0">
              <p className={`text-sm ${titleColor}`}>{title}</p>
              {status === 'completed' && summaries[i] && (
                <p className="text-xs text-ink-3 mt-0.5 truncate">{summaries[i]}</p>
              )}
            </div>
          </>
        );
        return (
          <li key={title} className="relative">
            {i < titles.length - 1 && (
              <span aria-hidden="true" className="absolute left-4 top-8 h-6 w-px bg-line" />
            )}
            {isClickable ? (
              <button
                type="button"
                onClick={() => onJump(i)}
                className="flex items-start gap-3 w-full text-left rounded-md hover:bg-surface-sunken/50 -mx-1 px-1 py-0.5 transition-colors"
                aria-label={`${i + 1}단계 ${title}로 이동 (수정)`}
              >
                {content}
              </button>
            ) : (
              <div className="flex items-start gap-3" aria-current={status === 'active' ? 'step' : undefined}>
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

### Step 3.3: WizardProgressBar.tsx — 모바일 상단 프로그레스

- [ ] **파일 생성**

```tsx
interface Props { current: number; total: number; }

export default function WizardProgressBar({ current, total }: Props) {
  const pct = Math.min(100, ((current + 1) / total) * 100);
  return (
    <div className="lg:hidden h-1 bg-line w-full" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total} aria-label="코스 생성 진행률">
      <div
        className="h-full bg-brand transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
```

### Step 3.4: WizardNav.tsx — 이전/다음 버튼 (Button 프리미티브 사용)

- [ ] **파일 생성**

`Button` 프리미티브 임포트 경로는 Phase 1에서 생성한 `app/components/ui/Button.tsx`.

```tsx
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import Button from '@/app/components/ui/Button';

interface Props {
  canGoBack: boolean;
  canProceed: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function WizardNav({ canGoBack, canProceed, isLast, onPrev, onNext }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 lg:static sticky bottom-0 lg:bg-transparent bg-surface-base/95 backdrop-blur-sm lg:backdrop-blur-0 py-3 lg:py-0 -mx-5 px-5 lg:mx-0 lg:px-0 lg:border-0 border-t border-line" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      {canGoBack ? (
        <Button variant="secondary" size="md" iconLeft={<ArrowLeft size={18} />} onClick={onPrev}>이전</Button>
      ) : <span />}
      <Button
        variant="primary"
        size="md"
        iconRight={isLast ? <Sparkles size={18} /> : <ArrowRight size={18} />}
        onClick={onNext}
        disabled={!canProceed}
      >
        {isLast ? '코스 만들기' : '다음'}
      </Button>
    </div>
  );
}
```

참고: Phase 1 `Button.tsx` 의 API (variant, size, iconLeft, iconRight, disabled, onClick) 가 이 사용법을 지원해야 한다. Phase 1 구현 확인하고 시그니처가 다르면 맞춰서 호출한다.

### Step 3.5: StepDestination.tsx — 0단계

- [ ] **파일 생성**

```tsx
import { MapPin, Building2, Sparkles, Loader2 } from 'lucide-react';
import { CITY_OPTIONS, MOOD_OPTIONS } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

const DESTINATION_TYPES = [
  { type: 'nearby', label: '내 주변', Icon: MapPin, desc: 'GPS 기반' },
  { type: 'city', label: '도시 선택', Icon: Building2, desc: '가고 싶은 곳' },
  { type: 'mood', label: '분위기', Icon: Sparkles, desc: '기분에 맞게' },
] as const;

export default function StepDestination({ state, dispatch }: Props) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {DESTINATION_TYPES.map(({ type, label, Icon, desc }) => {
          const selected = state.destinationType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => dispatch({ type: 'SET_DESTINATION_TYPE', value: type })}
              aria-pressed={selected}
              className={`flex flex-col items-center gap-2 px-3 py-5 rounded-lg border transition-colors ${
                selected
                  ? 'bg-brand-soft border-brand ring-2 ring-brand/20'
                  : 'bg-surface-elevated border-line hover:border-ink-4'
              }`}
            >
              <Icon size={24} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
              <span className="text-sm font-semibold text-ink-1">{label}</span>
              <span className="text-[11px] text-ink-3">{desc}</span>
            </button>
          );
        })}
      </div>

      {state.destinationType === 'nearby' && (
        <div className="px-4 py-3 rounded-lg bg-surface-sunken border border-line">
          {state.gpsLoading ? (
            <p className="text-sm text-ink-3 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> 위치를 찾고 있어요...</p>
          ) : state.userLocation ? (
            <p className="text-sm text-ink-2 flex items-center gap-2"><MapPin size={14} className="text-brand" /> 현재 위치 기준으로 추천해드려요</p>
          ) : (
            <p className="text-sm text-ink-3">위치를 못 찾았어요. 서울 기준으로 추천할게요.</p>
          )}
        </div>
      )}

      {state.destinationType === 'city' && (
        <div>
          <p className="text-xs font-semibold text-ink-3 mb-3">어디로 가고 싶어요?</p>
          <div className="grid grid-cols-4 gap-2">
            {CITY_OPTIONS.map((city) => {
              const selected = state.selectedCity?.name === city.name;
              return (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_CITY', value: city })}
                  aria-pressed={selected}
                  className={`flex items-center justify-center px-2 py-3 rounded-md border text-xs font-semibold transition-colors ${
                    selected ? 'bg-brand-soft border-brand text-brand' : 'bg-surface-elevated border-line text-ink-2 hover:border-ink-4'
                  }`}
                >{city.name}</button>
              );
            })}
          </div>
        </div>
      )}

      {state.destinationType === 'mood' && (
        <div>
          <p className="text-xs font-semibold text-ink-3 mb-3">어떤 분위기가 끌려요?</p>
          <div className="grid grid-cols-1 gap-2">
            {MOOD_OPTIONS.map((mood) => {
              const selected = state.selectedMood === mood.type;
              return (
                <button
                  key={mood.type}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_MOOD', value: mood.type })}
                  aria-pressed={selected}
                  className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                    selected ? 'bg-brand-soft border-brand' : 'bg-surface-elevated border-line hover:border-ink-4'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-ink-1">{mood.label}</p>
                    <p className="text-xs text-ink-3 mt-0.5">{mood.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

주의: 원본 코드에 `mood.emoji` / `mood.description` 이 있다면 `weekend-types.ts` 에서 정확한 필드명 확인하고 사용. `MoodOption` 타입 정의를 grep 으로 확인:

```bash
grep -A 5 "MOOD_OPTIONS\b\|MoodOption\b" lib/weekend-types.ts | head -30
```

### Step 3.6: StepFeeling.tsx — 1단계 (감정)

- [ ] **파일 생성**

`FEELING_OPTIONS` 가 `lib/weekend-types.ts` 에 정의되어 있음. 각 option 의 `emoji` 필드는 무시하고 Lucide 아이콘으로 매핑한다.

```tsx
import { Battery, Zap, Heart, Leaf, Compass, UtensilsCrossed } from 'lucide-react';
import { FEELING_OPTIONS } from '@/lib/weekend-types';
import type { Feeling } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

// weekend-types의 Feeling enum 값에 맞춰 조정. 예상 값: 'tired'|'energetic'|'romantic'|'healing'|'adventure'|'foodie'
const FEELING_ICONS: Record<string, ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  tired: Battery,
  energetic: Zap,
  romantic: Heart,
  healing: Leaf,
  adventure: Compass,
  foodie: UtensilsCrossed,
};

export default function StepFeeling({ state, dispatch }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {FEELING_OPTIONS.map((opt) => {
        const selected = state.feeling === opt.type;
        const Icon = FEELING_ICONS[opt.type] ?? Heart;
        return (
          <button
            key={opt.type}
            type="button"
            onClick={() => dispatch({ type: 'SET_FEELING', value: opt.type as Feeling })}
            aria-pressed={selected}
            className={`flex flex-col items-start gap-2 px-4 py-4 rounded-lg border text-left transition-colors ${
              selected ? 'bg-brand-soft border-brand' : 'bg-surface-elevated border-line hover:border-ink-4'
            }`}
          >
            <Icon size={22} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
            <span className="text-sm font-semibold text-ink-1">{opt.label}</span>
            {'description' in opt && opt.description && (
              <span className="text-xs text-ink-3">{opt.description as string}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

### Step 3.7: StepDuration.tsx — 2단계 (시간)

- [ ] **파일 생성**

```tsx
import { Clock, Sun, Coffee, Moon } from 'lucide-react';
import { DURATION_LABELS } from '@/lib/weekend-types';
import type { Duration } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

const DURATIONS: { type: Duration; Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }[] = [
  { type: 'half_day', Icon: Clock },
  { type: 'full_day', Icon: Sun },
  { type: 'leisurely', Icon: Coffee },
  { type: 'overnight', Icon: Moon },
];

export default function StepDuration({ state, dispatch }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {DURATIONS.map(({ type, Icon }) => {
        const selected = state.duration === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => dispatch({ type: 'SET_DURATION', value: type })}
            aria-pressed={selected}
            className={`flex flex-col items-center gap-2 px-4 py-5 rounded-lg border transition-colors ${
              selected ? 'bg-brand-soft border-brand' : 'bg-surface-elevated border-line hover:border-ink-4'
            }`}
          >
            <Icon size={22} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
            <span className="text-sm font-semibold text-ink-1">{DURATION_LABELS[type]}</span>
          </button>
        );
      })}
    </div>
  );
}
```

### Step 3.8: StepCompanion.tsx — 3단계 (동반자)

- [ ] **파일 생성**

```tsx
import { User, Users2, Baby, PartyPopper } from 'lucide-react';
import { COMPANION_LABELS } from '@/lib/weekend-types';
import type { Companion } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

const COMPANIONS: { type: Companion; Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }[] = [
  { type: 'solo', Icon: User },
  { type: 'couple', Icon: Users2 },
  { type: 'family', Icon: Baby },
  { type: 'friends', Icon: PartyPopper },
];

export default function StepCompanion({ state, dispatch }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {COMPANIONS.map(({ type, Icon }) => {
        const selected = state.companion === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => dispatch({ type: 'SET_COMPANION', value: type })}
            aria-pressed={selected}
            className={`flex flex-col items-center gap-2 px-4 py-5 rounded-lg border transition-colors ${
              selected ? 'bg-brand-soft border-brand' : 'bg-surface-elevated border-line hover:border-ink-4'
            }`}
          >
            <Icon size={22} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
            <span className="text-sm font-semibold text-ink-1">{COMPANION_LABELS[type]}</span>
          </button>
        );
      })}
    </div>
  );
}
```

### Step 3.9: StepPreferences.tsx — 4단계 (취향 다중)

- [ ] **파일 생성**

```tsx
import { TreePine, UtensilsCrossed, Landmark, Coffee, Waves, Camera } from 'lucide-react';
import { PREFERENCE_LABELS } from '@/lib/weekend-types';
import type { Preference } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

const PREFERENCES: { type: Preference; Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }[] = [
  { type: 'nature', Icon: TreePine },
  { type: 'food', Icon: UtensilsCrossed },
  { type: 'culture', Icon: Landmark },
  { type: 'cafe', Icon: Coffee },
  { type: 'activity', Icon: Waves },
  { type: 'photo', Icon: Camera },
];

export default function StepPreferences({ state, dispatch }: Props) {
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {PREFERENCES.map(({ type, Icon }) => {
          const selected = state.preferences.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_PREFERENCE', value: type })}
              aria-pressed={selected}
              className={`flex flex-col items-center gap-2 px-4 py-5 rounded-lg border transition-colors ${
                selected ? 'bg-brand-soft border-brand ring-2 ring-brand/20' : 'bg-surface-elevated border-line hover:border-ink-4'
              }`}
            >
              <Icon size={22} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
              <span className="text-sm font-semibold text-ink-1">{PREFERENCE_LABELS[type]}</span>
            </button>
          );
        })}
      </div>
      {state.preferences.length > 0 && (
        <p className="text-xs text-ink-3 mt-4">{state.preferences.length}개 선택됨</p>
      )}
    </div>
  );
}
```

**주의:** 원본 `CourseWizard.tsx` 에는 `subCategories` (취향 sub) 로직도 있다. Phase 2 에서는 **단순화를 위해 sub-category 선택은 제외**하고 대분류 6종만 사용. sub-category 가 AI 품질에 중요하다면 Phase 2 Backlog 로 이관 (spec §12 에 "취향 세분화" 추가 필요).

### Step 3.10: app/(pages)/course/page.tsx 단순화

- [ ] **파일 전체를 다음으로 교체**

```tsx
import WizardShell from '@/app/components/course/wizard/WizardShell';

export default function CoursePage() {
  return <WizardShell />;
}
```

### Step 3.11: 옛 CourseWizard.tsx 삭제

- [ ] **파일 삭제**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm app/components/CourseWizard.tsx
```

### Step 3.12: 빌드 검증 + 커밋

- [ ] **빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build 2>&1 | tail -20
```

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/components/course/wizard/ app/\(pages\)/course/page.tsx && git rm app/components/CourseWizard.tsx && git commit -m "$(cat <<'EOF'
feat(phase2): Wizard 재구축 — 데스크톱 2-column 스테퍼 + Lucide 전환

- app/components/course/wizard/ 10개 파일 신설
  · WizardShell: useReducer 기반 5단계 상태 관리, 반응형 분기
  · WizardStepper: 데스크톱 좌측 세로 스테퍼, 완료 단계 클릭 수정 가능
  · WizardProgressBar: 모바일 상단 슬림 프로그레스
  · WizardNav: Button 프리미티브 기반 이전/다음
  · steps/: 5개 단계 컴포넌트, 선택 카드는 aria-pressed + 키보드 접근
- 이모지 전량 제거 → Lucide 아이콘 (Clock/Sun/Coffee/Moon, User/Users2/
  Baby/PartyPopper, TreePine/UtensilsCrossed/Landmark/Coffee/Waves/Camera)
- 옛 CourseWizard.tsx (562L) 삭제
- sub-category 선택 로직은 단순화 위해 제외(Phase 2 Backlog 이관)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Loading 재구축 — 타임라인 프리뷰 스켈레톤

**Files:**
- Create: `app/components/course/loading/CourseLoading.tsx`
- Create: `app/components/course/loading/SkeletonStopCard.tsx`

### Step 4.1: SkeletonStopCard.tsx

- [ ] **파일 생성**

```tsx
interface Props { index: number; }

export default function SkeletonStopCard({ index }: Props) {
  return (
    <div
      className="flex gap-4 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
      style={{ animationDelay: `${index * 800}ms` }}
    >
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <div className="w-8 h-8 rounded-full skeleton" />
        <div className="flex-1 w-px bg-line my-1" />
      </div>
      <div className="flex-1 bg-surface-elevated rounded-lg border border-line overflow-hidden">
        <div className="h-36 skeleton" />
        <div className="p-4 space-y-3">
          <div className="h-4 w-16 skeleton rounded-md" />
          <div className="h-5 w-3/4 skeleton rounded-md" />
          <div className="h-3 w-1/2 skeleton rounded-md" />
          <div className="h-3 w-full skeleton rounded-md" />
          <div className="h-3 w-5/6 skeleton rounded-md" />
        </div>
      </div>
    </div>
  );
}
```

`@keyframes fadeIn` 은 globals.css 에 정의되어 있지 않을 가능성이 큼. Step 4.3 에서 추가.

### Step 4.2: CourseLoading.tsx

- [ ] **파일 생성**

```tsx
import { Loader2, Map as MapIcon } from 'lucide-react';
import SkeletonStopCard from './SkeletonStopCard';
import Container from '@/app/components/ui/Container';

interface Props { message: string; }

export default function CourseLoading({ message }: Props) {
  return (
    <Container>
      <div className="py-8 lg:py-12">
        <div className="text-center mb-10">
          <Loader2 size={32} strokeWidth={1.75} className="text-brand mx-auto animate-spin" aria-hidden="true" />
          <h2 className="text-2xl lg:text-3xl font-bold text-ink-1 mt-4" style={{ fontFamily: 'var(--font-display)' }}>
            코스를 설계하고 있어요
          </h2>
          <p className="text-sm text-ink-3 mt-2">평균 15~25초 소요</p>
          <p className="text-sm text-ink-2 mt-4 transition-opacity duration-500" aria-live="polite">
            {message}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-8">
          <section aria-label="코스 타임라인 로딩 중" className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <SkeletonStopCard key={i} index={i} />
            ))}
          </section>
          <aside aria-label="지도 로딩 중" className="hidden lg:block">
            <div className="sticky top-20 h-[calc(100vh-7rem)] rounded-lg bg-surface-sunken border border-line flex flex-col items-center justify-center gap-3">
              <MapIcon size={32} strokeWidth={1.5} className="text-ink-4" aria-hidden="true" />
              <p className="text-sm text-ink-3">코스가 완성되면<br />지도가 나타나요</p>
            </div>
          </aside>
        </div>
      </div>
    </Container>
  );
}
```

### Step 4.3: globals.css 에 @keyframes fadeIn 추가 (없을 때만)

- [ ] **확인 후 필요시 추가**

```bash
grep -n "@keyframes fadeIn\b" app/globals.css
```

없으면 globals.css 파일 끝에 추가:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

`.skeleton` 클래스는 Phase 1 globals.css 에 이미 존재 (보존됨). 아니면 grep 으로 확인:

```bash
grep -n "\\.skeleton\\b\|@keyframes shimmer\\b" app/globals.css
```

존재 확인되면 Step 4.3 skip.

### Step 4.4: 빌드 검증 + 커밋

- [ ] **빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build 2>&1 | tail -10
```

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/components/course/loading/ app/globals.css && git commit -m "$(cat <<'EOF'
feat(phase2): Loading 재구축 — 타임라인 프리뷰 스켈레톤

- CourseLoading: 결과 페이지와 동일한 split view 레이아웃이 즉시 깔리고
  스톱 카드 5개가 800ms 간격 순차 fade-in. 상단 "코스를 설계하고 있어요"
  + 4개 메시지 순환 + Loader2 스피너
- SkeletonStopCard: shimmer 기반 번호 뱃지·이미지·텍스트 블록 자리
- globals.css: @keyframes fadeIn 추가 (스켈레톤 순차 등장용)
- 옛 LOADING_STEPS 10단계 이모지 로직은 WizardShell 재구축 시 이미 제거됨

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Result + Map 재구축

**Files:**
- Create: `app/components/course/result/CourseResultShell.tsx`
- Create: `app/components/course/result/CourseSummary.tsx`
- Create: `app/components/course/result/DayTabs.tsx`
- Create: `app/components/course/result/Timeline.tsx`
- Create: `app/components/course/result/StopCard.tsx`
- Create: `app/components/course/result/CourseTip.tsx`
- Create: `app/components/course/result/SaveShareBar.tsx`
- Create: `app/components/course/result/CourseMapPane.tsx`
- Modify: `app/(pages)/course/[slug]/page.tsx`
- Delete: `app/components/CourseResult.tsx`, `app/components/CourseMap.tsx`

**Reference:** spec §8 (Result 상세 UI)

### Step 5.1: StopCard.tsx — 역할 컬러 기반 스톱 카드

- [ ] **파일 생성**

```tsx
'use client';

import Image from 'next/image';
import { Lightbulb, Route } from 'lucide-react';
import type { CourseStop } from '@/lib/weekend-types';
import { getRoleInfo } from '@/lib/course-role';
import { formatTimeRange } from './formatTime';

interface Props {
  stop: CourseStop;
  isLast: boolean;
  isActive: boolean;
  onActivate: () => void;
}

export default function StopCard({ stop, isLast, isActive, onActivate }: Props) {
  const { role, colorHex, label } = getRoleInfo(stop);
  const timeRange = formatTimeRange(stop.timeStart, stop.durationMin);

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: colorHex }}
          aria-hidden="true"
        >
          {stop.order}
        </div>
        {!isLast && <div className="flex-1 w-px bg-line my-1" />}
      </div>

      <button
        type="button"
        onClick={onActivate}
        aria-label={`${stop.order}번째 코스: ${stop.title}, ${timeRange}, ${label}`}
        className={`flex-1 text-left bg-surface-elevated rounded-lg border overflow-hidden mb-4 transition-all hover:border-ink-4 ${
          isActive ? 'border-brand ring-2 ring-brand/20' : 'border-line'
        }`}
      >
        {stop.imageUrl && (
          <div className="relative h-36">
            <Image
              src={stop.imageUrl}
              alt={stop.title}
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
              unoptimized={stop.imageUrl.startsWith('http://')}
            />
            {(stop.isFestival || stop.isStay) && (
              <span
                className="absolute top-2 left-2 text-[11px] font-semibold text-white px-2 py-0.5 rounded-md"
                style={{ backgroundColor: stop.isStay ? '#4A6B8A' : '#B8860B' }}
              >
                {stop.isStay ? '숙박' : '축제'}
              </span>
            )}
          </div>
        )}

        <div className="p-4 space-y-2">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-white px-2 py-0.5 rounded-md"
            style={{ backgroundColor: colorHex }}
          >
            {label}
          </span>
          <h3 className="text-base font-semibold text-ink-1">{stop.title}</h3>
          <p className="text-xs text-ink-3">{timeRange} · {stop.durationMin}분</p>
          <p className="text-sm text-ink-2 line-clamp-3">{stop.description}</p>
          {stop.transitInfo && (
            <p className="text-xs text-ink-3 flex items-center gap-1">
              <Route size={12} strokeWidth={1.75} aria-hidden="true" /> {stop.transitInfo}
            </p>
          )}
          {stop.tip && (
            <p className="text-xs text-ink-2 bg-mocha-soft px-3 py-2 rounded-md flex items-start gap-2">
              <Lightbulb size={14} strokeWidth={1.75} className="text-mocha flex-shrink-0 mt-px" aria-hidden="true" />
              <span>{stop.tip}</span>
            </p>
          )}
        </div>
      </button>
    </div>
  );
}
```

### Step 5.2: formatTime 유틸 (동일 폴더 inline)

- [ ] **`app/components/course/result/formatTime.ts` 생성**

```ts
export function formatTimeRange(timeStart: string, durationMin: number): string {
  const [h, m] = timeStart.split(':').map(Number);
  const endTotal = h * 60 + m + durationMin;
  const endH = Math.floor(endTotal / 60);
  const endM = endTotal % 60;
  return `${timeStart} ~ ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}
```

### Step 5.3: Timeline.tsx

- [ ] **파일 생성**

```tsx
'use client';

import { useRef, useEffect } from 'react';
import type { CourseStop } from '@/lib/weekend-types';
import StopCard from './StopCard';

interface Props {
  stops: CourseStop[];
  activeIndex: number | null;
  onActivate: (index: number) => void;
}

export default function Timeline({ stops, activeIndex, onActivate }: Props) {
  const refs = useRef<Array<HTMLDivElement | null>>([]);

  // 외부에서 activeIndex 가 바뀌면 해당 카드 scrollIntoView (지도 마커 클릭 시)
  useEffect(() => {
    if (activeIndex === null) return;
    const el = refs.current[activeIndex];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex]);

  return (
    <div className="space-y-0">
      {stops.map((stop, i) => (
        <div key={stop.contentId ?? i} ref={(el) => { refs.current[i] = el; }}>
          <StopCard
            stop={stop}
            isLast={i === stops.length - 1}
            isActive={activeIndex === i}
            onActivate={() => onActivate(i)}
          />
        </div>
      ))}
    </div>
  );
}
```

### Step 5.4: DayTabs.tsx

- [ ] **파일 생성**

```tsx
'use client';

interface Props {
  days: number[];  // ex: [1, 2]
  active: number;
  onChange: (day: number) => void;
}

export default function DayTabs({ days, active, onChange }: Props) {
  if (days.length < 2) return null;
  return (
    <div role="tablist" aria-label="일차 선택" className="flex items-center gap-6 border-b border-line mb-6">
      {days.map((day) => {
        const isActive = active === day;
        return (
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(day)}
            className={`relative py-3 text-sm font-semibold transition-colors ${
              isActive ? 'text-ink-1' : 'text-ink-3 hover:text-ink-1'
            }`}
          >
            {day}일차
            {isActive && <span aria-hidden="true" className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand" />}
          </button>
        );
      })}
    </div>
  );
}
```

### Step 5.5: CourseSummary.tsx

- [ ] **파일 생성**

```tsx
import { Route, MapPin, Calendar } from 'lucide-react';
import type { CourseData } from '@/lib/weekend-types';

interface Props { course: CourseData; }

export default function CourseSummary({ course }: Props) {
  return (
    <section className="bg-surface-sunken border-b border-line">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8 lg:py-10">
        <h1 className="text-2xl lg:text-4xl font-bold text-ink-1 break-keep" style={{ fontFamily: 'var(--font-display)' }}>
          {course.title}
        </h1>
        {course.summary && (
          <p className="text-sm lg:text-base text-ink-2 mt-3 max-w-3xl break-keep">{course.summary}</p>
        )}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-ink-3">
          {course.totalDistanceKm > 0 && (
            <span className="inline-flex items-center gap-1"><Route size={14} strokeWidth={1.75} aria-hidden="true" /> 총 {course.totalDistanceKm.toFixed(1)}km</span>
          )}
        </div>
      </div>
    </section>
  );
}
```

### Step 5.6: CourseTip.tsx

- [ ] **파일 생성**

```tsx
import { Lightbulb } from 'lucide-react';

interface Props { tip: string; }

export default function CourseTip({ tip }: Props) {
  if (!tip) return null;
  return (
    <div className="bg-mocha-soft rounded-lg p-4 flex items-start gap-3">
      <Lightbulb size={18} strokeWidth={1.75} className="text-mocha flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm text-ink-2 break-keep">{tip}</p>
    </div>
  );
}
```

### Step 5.7: SaveShareBar.tsx

- [ ] **파일 생성**

```tsx
'use client';

import { useState } from 'react';
import { Share2, Link2, Check } from 'lucide-react';
import Button from '@/app/components/ui/Button';
import type { CourseResponse } from '@/lib/weekend-types';

interface Props { course: CourseResponse; }

export default function SaveShareBar({ course }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(course.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* 클립보드 권한 없음 무시 */ }
  };

  const handleKakaoShare = () => {
    // Kakao SDK 로드되어 있어야 함 (app/components/KakaoSDK.tsx 의 글로벌 init)
    const Kakao = (window as unknown as { Kakao?: { isInitialized: () => boolean; Share: { sendDefault: (opts: Record<string, unknown>) => void } } }).Kakao;
    if (!Kakao?.isInitialized()) {
      handleCopy();
      return;
    }
    Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: course.title ?? '이모추 코스',
        description: '이번 주말 나들이 코스를 AI가 만들어줬어요!',
        imageUrl: '',
        link: { mobileWebUrl: course.shareUrl, webUrl: course.shareUrl },
      },
    });
  };

  return (
    <div className="flex flex-wrap gap-2" aria-live="polite">
      <Button variant="secondary" size="md" iconLeft={<Share2 size={16} />} onClick={handleKakaoShare}>카카오톡 공유</Button>
      <Button variant="ghost" size="md" iconLeft={copied ? <Check size={16} /> : <Link2 size={16} />} onClick={handleCopy}>
        {copied ? '복사됨!' : '링크 복사'}
      </Button>
    </div>
  );
}
```

참고: `CourseResponse` 의 `title` 필드가 없다면 `course.course?.title` 식으로 접근. 실제 타입을 먼저 확인:

```bash
grep -A 10 "interface CourseResponse" lib/weekend-types.ts
```

### Step 5.8: CourseMapPane.tsx — 기존 CourseMap 리팩토링

- [ ] **파일 생성** (기존 CourseMap.tsx 의 SDK 로드 로직 + 리팩토링)

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { CourseStop } from '@/lib/weekend-types';
import { getRoleInfo } from '@/lib/course-role';

declare global {
  interface Window { kakao: unknown; }
}

interface Props {
  stops: CourseStop[];
  activeIndex: number | null;
  onMarkerClick: (index: number) => void;
  expandable?: boolean;
}

export default function CourseMapPane({ stops, activeIndex, onMarkerClick, expandable = false }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [mapReady, setMapReady] = [useRef(false), () => { /* placeholder */ }];  // Hooks 단순화 위해 아래 useEffect 에서 관리
  const readyStateRef = useRef(false);

  // SDK 로드 대기
  useEffect(() => {
    if (!stops.length) return;
    const w = window as unknown as { kakao?: { maps: { load: (cb: () => void) => void } } };
    const check = () => {
      if (w.kakao?.maps) {
        w.kakao.maps.load(() => { readyStateRef.current = true; renderMap(); });
      } else {
        setTimeout(check, 300);
      }
    };
    check();
    // renderMap 은 아래에서 정의되므로 effect 내부에서 함수 참조
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

  function renderMap() {
    if (!mapRef.current || !stops.length) return;
    const w = window as unknown as { kakao: { maps: { LatLng: new (lat: number, lng: number) => unknown; LatLngBounds: new () => { extend: (p: unknown) => void }; Map: new (el: HTMLElement, opts: Record<string, unknown>) => unknown; Marker: new (opts: Record<string, unknown>) => unknown; CustomOverlay: new (opts: Record<string, unknown>) => unknown; event: { addListener: (target: unknown, type: string, cb: () => void) => void } } } };
    const kakao = w.kakao;
    const bounds = new kakao.maps.LatLngBounds();

    const map = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(stops[0].latitude, stops[0].longitude),
      level: 5,
    });
    mapInstanceRef.current = map;

    stops.forEach((stop, i) => {
      const pos = new kakao.maps.LatLng(stop.latitude, stop.longitude);
      bounds.extend(pos);
      const { colorHex } = getRoleInfo(stop);

      // 커스텀 오버레이로 컬러 마커 렌더
      const html = document.createElement('div');
      html.className = 'flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer';
      html.style.cssText = `width: 32px; height: 32px; border-radius: 50%; background: ${colorHex}; border: 2px solid white;`;
      html.textContent = String(stop.order);
      html.addEventListener('click', () => onMarkerClick(i));

      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: html,
        yAnchor: 0.5,
        xAnchor: 0.5,
      });
      (overlay as unknown as { setMap: (m: unknown) => void }).setMap(map);
      markersRef.current[i] = { overlay, element: html, position: pos };
    });

    (map as unknown as { setBounds: (b: unknown) => void }).setBounds(bounds as unknown as Parameters<() => void>[0]);
  }

  // activeIndex 변경 시 해당 마커 중앙 이동 + ring
  useEffect(() => {
    if (activeIndex === null || !readyStateRef.current) return;
    const marker = markersRef.current[activeIndex] as { element: HTMLElement; position: unknown } | undefined;
    const map = mapInstanceRef.current as { panTo?: (p: unknown) => void } | null;
    if (!marker || !map?.panTo) return;
    map.panTo(marker.position);
    // ring 효과
    markersRef.current.forEach((m, i) => {
      const el = (m as { element?: HTMLElement })?.element;
      if (!el) return;
      if (i === activeIndex) {
        el.style.boxShadow = '0 0 0 4px rgba(197, 83, 45, 0.3)';
        el.style.transform = 'scale(1.15)';
      } else {
        el.style.boxShadow = '';
        el.style.transform = '';
      }
    });
  }, [activeIndex]);

  return (
    <div className="relative w-full h-full rounded-lg bg-surface-sunken border border-line overflow-hidden">
      <div ref={mapRef} className="w-full h-full min-h-[320px]" aria-label="코스 지도" />
    </div>
  );
}
```

**중요:** 카카오맵 SDK 호출 시 `unknown` 타입 캐스팅이 복잡하므로, 실제 구현 시 타입 안정성보다 기능 동작을 우선한다. 옛 `app/components/CourseMap.tsx` 의 `declare global { interface Window { kakao: any; } }` 방식을 그대로 사용하는 것이 더 단순할 수 있다. 빌드 에러 없이 동작하는 쪽을 선택.

옛 패턴 적용 시:

```tsx
declare global {
  interface Window { kakao: any; }
}

// 그 후 window.kakao 직접 접근 (any 처리)
```

### Step 5.9: CourseResultShell.tsx — split view 반응형 래퍼

- [ ] **파일 생성**

```tsx
'use client';

import { useState, useMemo } from 'react';
import type { CourseResponse, CourseStop } from '@/lib/weekend-types';
import { useActiveStop } from '@/lib/use-active-stop';
import Container from '@/app/components/ui/Container';
import CourseSummary from './CourseSummary';
import DayTabs from './DayTabs';
import Timeline from './Timeline';
import CourseTip from './CourseTip';
import SaveShareBar from './SaveShareBar';
import CourseMapPane from './CourseMapPane';

interface Props { course: CourseResponse; }

export default function CourseResultShell({ course }: Props) {
  const allStops = course.course?.stops ?? (course as unknown as { stops?: CourseStop[] }).stops ?? [];
  const days = useMemo(() => {
    const uniq = Array.from(new Set(allStops.map(s => s.day ?? 1)));
    return uniq.sort((a, b) => a - b);
  }, [allStops]);

  const [activeDay, setActiveDay] = useState<number>(days[0] ?? 1);
  const visibleStops = allStops.filter(s => (s.day ?? 1) === activeDay);

  const { activeIndex, setActive } = useActiveStop();

  return (
    <>
      <CourseSummary course={course.course as unknown as { title: string; summary: string; totalDistanceKm: number; tip: string }} />
      <Container>
        <div className="py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-8">
          <section className="min-w-0">
            <DayTabs days={days} active={activeDay} onChange={(d) => { setActiveDay(d); setActive(null); }} />
            <Timeline stops={visibleStops} activeIndex={activeIndex} onActivate={setActive} />
            {course.course?.tip && <CourseTip tip={course.course.tip} />}
            <div className="mt-6">
              <SaveShareBar course={course} />
            </div>
          </section>
          <aside className="hidden lg:block">
            <div className="sticky top-20 h-[calc(100vh-7rem)]">
              <CourseMapPane stops={visibleStops} activeIndex={activeIndex} onMarkerClick={setActive} />
            </div>
          </aside>
          {/* 모바일에서만: 타임라인 아래 지도 */}
          <div className="lg:hidden h-80">
            <CourseMapPane stops={visibleStops} activeIndex={activeIndex} onMarkerClick={setActive} expandable />
          </div>
        </div>
      </Container>
    </>
  );
}
```

**주의:** `CourseResponse` 타입 구조(`course.course.stops` vs `course.stops`)를 Step 5.0 전에 확인:

```bash
grep -A 10 "interface CourseResponse\|interface CourseData" lib/weekend-types.ts
```

현재 spec 이 `CourseData.stops`, `CourseResponse` 는 별도 구조로 추정. 실제 구조에 맞게 `allStops` 추출 로직 조정.

### Step 5.10: app/(pages)/course/[slug]/page.tsx 단순화

- [ ] **현재 구조 먼저 확인**

```bash
cat "app/(pages)/course/[slug]/page.tsx"
```

- [ ] **파일 교체 — 기존 fetch 로직 유지 + <CourseResult> 를 <CourseResultShell>로 교체**

기존 페이지가 `CourseResult` 를 mount 하는 구조라면 그 import/사용 부분만 `CourseResultShell` 로 교체. fetch/params 로직은 그대로.

```tsx
// 기존 import CourseResult → CourseResultShell 로 변경
import CourseResultShell from '@/app/components/course/result/CourseResultShell';

// 기존 <CourseResult data={...} /> → <CourseResultShell course={...} />
```

정확한 기존 코드 구조를 Step 5.9 전에 읽고 맞춰서 교체.

### Step 5.11: 옛 CourseResult.tsx / CourseMap.tsx 삭제

- [ ] **파일 삭제**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm app/components/CourseResult.tsx app/components/CourseMap.tsx
```

### Step 5.12: 빌드 검증 + 커밋

- [ ] **빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build 2>&1 | tail -20
```

빌드 에러 발생 시:
- CourseResponse / CourseData 타입 실제 구조 확인하여 `allStops` 추출 로직 조정
- 카카오맵 타입 이슈는 `any` 캐스팅 사용 (옛 코드와 동일)

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/components/course/result/ app/\(pages\)/course/\[slug\]/page.tsx && git rm app/components/CourseResult.tsx app/components/CourseMap.tsx && git commit -m "$(cat <<'EOF'
feat(phase2): Result + Map 재구축 — split view + role 컬러 + 쌍방향 연동

- app/components/course/result/ 8개 파일 신설
  · CourseResultShell: lg split view 반응형 래퍼
  · CourseSummary: 제목·요약·총거리 에디토리얼 배너 (Card sunken)
  · DayTabs: 1박2일 탭 (조건부 렌더), Timeline·지도 동시 필터
  · Timeline + StopCard: 역할 컬러 뱃지, <button>으로 키보드 접근,
    next/image 적용 (unoptimized fallback)
  · CourseTip: AI 꿀팁 카드
  · SaveShareBar: Button 프리미티브 + 카카오 공유 + 링크 복사 토스트
  · CourseMapPane: 카카오맵 마커 컬러 role 기반 + activeIndex ring
- Timeline↔Map 쌍방향 연동 (use-active-stop 훅)
- 옛 CourseResult.tsx (543L) / CourseMap.tsx (199L) 삭제
- formatTime.ts 유틸 분리

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Phase 1 Backlog Important 흡수

**Files:**
- Modify: `app/components/nav/GlobalHeader.tsx`
- Modify: `app/components/nav/BottomTabBar.tsx`
- Modify: `app/components/nav/LocationSelector.tsx`
- Modify: `app/components/home/WeatherCard.tsx`
- Modify: `app/components/home/FestivalSideList.tsx`
- Modify: `app/components/home/HomeHero.tsx`
- Modify: `app/components/home/HomeView.tsx`
- Modify: `app/components/SpotCard.tsx`
- Modify: `app/components/FestivalBadge.tsx`
- Modify: `app/components/nav/GlobalSearchBar.tsx`

### Step 6.1: GlobalHeader / BottomTabBar 에 aria-current 추가

- [ ] **GlobalHeader.tsx 수정**

메뉴 렌더링 부분의 `<Link>` 에 `aria-current` 추가. `usePathname()` 이 이미 import 되어 있을 것:

```tsx
<Link
  href={item.href}
  aria-current={pathname === item.href ? 'page' : undefined}
  className={...}
>
  {item.label}
</Link>
```

- [ ] **BottomTabBar.tsx 수정**

동일 패턴으로 탭 `<Link>` 에 `aria-current` 추가.

### Step 6.2: LocationSelector 접근성 속성 추가

- [ ] **LocationSelector.tsx 수정**

버튼에 `aria-label`, `aria-haspopup`, `aria-expanded` 추가. `useLocation()` 훅에서 `isModalOpen` 을 구조분해 가능한지 확인:

```bash
grep -n "isModalOpen\|setModalOpen\|modalOpen" app/components/nav/LocationContext.tsx
```

가능하면 해당 state 를 구조분해 후 `aria-expanded={isModalOpen}`. 불가능하면 `LocationSelector` 내부에 local open state 만들고 사용.

```tsx
<button
  type="button"
  onClick={() => setModalOpen(true)}
  aria-label={`현재 위치 ${location?.name ?? '설정 안됨'}, 클릭하여 변경`}
  aria-haspopup="dialog"
  aria-expanded={isModalOpen}
  className={...}
>
  ...
</button>
```

### Step 6.3: WeatherCard / FestivalSideList 'use client' 제거

- [ ] **두 파일에서 상단 `'use client';` 지시자 삭제**

- `app/components/home/WeatherCard.tsx` 첫 줄 `'use client';` 제거
- `app/components/home/FestivalSideList.tsx` 첫 줄 `'use client';` 제거

이벤트 핸들러가 없는지 한 번 더 확인. `FestivalSideList` 가 `onSelect` prop 을 호출한다면 client 컴포넌트여야 하지만, React Server Components 에서 자식에게 전달만 하는 경우 client boundary 는 부모에서 시작된다. 부모(HomeView)가 이미 client 이므로 자식은 자연스럽게 client boundary 포함됨.

### Step 6.4: Home 영역 next/image 복원

- [ ] **HomeHero.tsx 수정**

`<img>` 를 `next/image` 로 교체:

```tsx
import Image from 'next/image';

// ... 기존 <img src={imgSrc} ... /> 를:
<Image
  src={imgSrc}
  alt="이번 주말의 풍경"
  fill
  sizes="100vw"
  priority
  className="object-cover"
  onError={handleError}
  unoptimized={imgSrc.startsWith('http://')}
/>
```

`<img>` 래퍼의 부모에 `relative` 클래스 + 명시적 height 있어야 `fill` 작동 (이미 `absolute inset-0` 구조이므로 OK).

- [ ] **HomeView.tsx 수정**

SpotCard / FestivalBadge 자체 내부에서 이미지 처리하므로 HomeView 에서는 직접 이미지 사용이 없을 가능성. grep 으로 확인:

```bash
grep -n "<img" app/components/home/HomeView.tsx
```

있으면 동일 패턴으로 `<Image />` 교체.

- [ ] **SpotCard.tsx, FestivalBadge.tsx 수정**

각 파일의 `<img src={...}>` 를 `<Image src={...} fill sizes="..." className="object-cover" unoptimized={isHttp} />` 로 교체. 부모에 relative + 높이 있는지 확인.

- [ ] **GlobalSearchBar.tsx 수정**

검색 결과 드롭다운에 이미지 있으면 동일 패턴. 없으면 skip.

### Step 6.5: HomeView 카드 키보드 접근성

- [ ] **HomeView.tsx 의 `<div onClick>` 을 `<button>` 또는 role/tabIndex/onKeyDown 로 변경**

```bash
grep -n "<div onClick\|<div .*onClick" app/components/home/HomeView.tsx
```

각 매치에서 다음으로 변경:

```tsx
// Before:
<div onClick={() => setSelectedContentId(s.contentId)}>
  <SpotCard ... />
</div>

// After (option A: <button>):
<button
  type="button"
  onClick={() => setSelectedContentId(s.contentId)}
  className="text-left w-full block"
  aria-label={`${s.title} 상세 보기`}
>
  <SpotCard ... />
</button>
```

또는 SpotCard / FestivalBadge 의 최상위 요소 자체를 `<button>` 또는 `<article role="button" tabIndex={0} onKeyDown>` 로 만들어 래핑 `<div>` 제거.

### Step 6.6: 빌드 검증 + 커밋

- [ ] **빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build 2>&1 | tail -15
```

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/components/ && git commit -m "$(cat <<'EOF'
fix(a11y,perf): Phase 1 Backlog Important 흡수

Phase 2 진행 중 병행 정리:
- aria-current="page" — GlobalHeader 메뉴 / BottomTabBar 탭
- LocationSelector aria-label + aria-haspopup="dialog" + aria-expanded
- WeatherCard / FestivalSideList 'use client' 제거 (RSC 전환)
- next/image 복원 — HomeHero / HomeView / SpotCard / FestivalBadge
  · next.config.ts의 TourAPI 호스트 활용
  · http 소스는 unoptimized fallback
- HomeView <div onClick> → <button> 키보드 접근성 확보

Phase 1 리뷰에서 Backlog로 이관됐던 Important 6건 전부 완료.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 정리 & 최종 검증

**Files:** 검증 위주, 변경 없음

### Step 7.1: 옛 컬러 클래스 grep

- [ ] **course 디렉토리 전체에서 옛 컬러 클래스 검색**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && grep -rEn "from-orange-|via-orange-|to-orange-|from-pink-|via-pink-|to-pink-|from-violet-|via-violet-|to-violet-|from-sky-|from-emerald-|from-amber-|from-rose-|from-cyan-|orange-400|orange-500|pink-400|sky-400|emerald-400|amber-400|rose-400|cyan-400|violet-400" app/components/course/ 2>/dev/null; echo "---EXIT:$?---"
```

기대: `---EXIT:1---` (0 매치). 매치 있으면 토큰 기반으로 교체.

### Step 7.2: 이모지 잔존 grep

- [ ] **course 디렉토리에서 이모지 잔존 확인**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && grep -rPn "[\x{1F300}-\x{1F9FF}]|[\x{2600}-\x{27BF}]" app/components/course/ 2>/dev/null; echo "---EXIT:$?---"
```

기대: 0 매치. 매치가 있어도 UI 에 표시되지 않는 주석·aria-label 내부라면 허용. 실제 렌더 부분의 이모지만 제거.

### Step 7.3: Dead import / 옛 파일 참조 grep

- [ ] **옛 파일 import 잔존 확인**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && grep -rn "from.*components/CourseWizard['\"\\s]\|from.*components/CourseResult['\"\\s]\|from.*components/CourseMap['\"\\s]" app/ lib/ 2>/dev/null; echo "---EXIT:$?---"
```

기대: 0 매치.

### Step 7.4: 최종 클린 빌드

- [ ] **클린 빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build 2>&1 | tail -20
```

기대: 0 에러, 11개 페이지 생성 성공 (`/`, `/course`, `/course/[slug]`, `/festival`, API 라우트 6개).

### Step 7.5: 최종 시각 회귀 (사용자 액션)

- [ ] **4 브레이크포인트 종합 시각 검증**

`npm run dev` 후 사용자가 확인:

**시나리오 1: Wizard 완주 (내 주변 → 기분 → 시간 → 동반자 → 취향 → 제출)**
- 데스크톱: 좌측 스테퍼가 진행 상태 정확히 표시, 완료 단계 클릭 시 그 단계로 이동 + 현재 단계까지 상태 유지
- 모바일: 상단 프로그레스 바 점진 증가, 전체 화면 전환 부드러움
- 제출 시 즉시 로딩 화면 (결과 레이아웃 + 스켈레톤 5개 순차)

**시나리오 2: 로딩 → 결과 crossfade**
- 메시지 4개가 8초 간격 순환
- AI 응답 도착 시 `/course/:slug` 로 replace 이동, shell 구조 유지되어 깜빡임 적음

**시나리오 3: 결과 split view (데스크톱)**
- 좌측 타임라인 카드 클릭 → 우측 지도 마커 focus (ring 효과) + 카드 자체 ring
- 지도 마커 클릭 → 해당 카드가 scrollIntoView
- Role 컬러 5종 명확히 구분 (관광지/맛집/카페/축제/숙박)

**시나리오 4: 1박2일 코스**
- 탭 "1일차 / 2일차" 렌더
- 탭 전환 → Timeline + 지도 마커·bounds 즉시 필터

**시나리오 5: 결과 모바일**
- 단일 컬럼 흐름
- 지도는 접힌 카드, 탭하여 확장 가능

**시나리오 6: 기존 저장 코스 호환**
- 기존 저장된 코스(`contentTypeId` 없음) 조회 → 모두 `spot` 색으로 fallback, 에러 없음

**시나리오 7: 다른 페이지 이동**
- 결과에서 GlobalHeader "홈" / "축제" 클릭 → 정상 이동, aria-current 활성 메뉴 표시 확인

### Step 7.6: 정리 커밋 (필요 시)

- [ ] **시각 검증 중 발견된 수정사항 있으면 별도 커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add -A && git commit -m "chore(phase2): 시각 검증 후 사소한 정리 — [발견 항목]"
```

---

## Task 8: 리뷰 (code-reviewer 에이전트)

### Step 8.1: code-reviewer 에이전트 호출

- [ ] **Phase 2 전체 범위 리뷰 요청**

`superpowers:code-reviewer` 에이전트에게 다음 범위로 리뷰 요청:

- 리뷰 범위: feat/phase2-course-flow 브랜치 main..HEAD 의 모든 변경 (Task 1~7 커밋 6~8개)
- 참조 문서: spec `docs/superpowers/specs/2026-04-24-emochu-phase2-course-flow-design.md`, 이 plan 문서, `CLAUDE.md`
- 검토 항목:
  1. 토큰 일관성 (role 팔레트 + Phase 1 토큰, 임의 컬러 직접 사용 0건)
  2. 반응형 레이아웃 정합성 (Wizard 2-column ↔ 모바일 전환, Result split view ↔ 모바일 단일)
  3. 접근성 (키보드 네비, focus 표시, aria-current, aria-pressed, aria-live, 카드 <button>)
  4. 성능 (RSC 경계, next/image 적용, 불필요한 'use client')
  5. 스키마 하위호환 (기존 저장 코스 contentTypeId 누락 시 fallback)
  6. 카카오맵 연동 (SDK 로드 대기, 마커 클릭 콜백, bounds 계산, active ring)
  7. 데드 코드 / 사용 안 되는 import

출력 형식: Critical / Important / Nice-to-have 3단계. 각 이슈에 파일:라인 + 근거 + 제안 수정.

### Step 8.2: 리뷰 결과 반영

- [ ] **이슈 수정**

- Critical / Important 즉시 수정 → `rm -rf .next && npm run build` 재검증
- 별도 커밋: `fix(review): Phase 2 [Critical/Important] 이슈 수정`
- Nice-to-have 는 spec §12 Backlog 로 이관

---

## Self-Review Checklist (이 plan 작성자가 수행)

### Spec coverage
- [x] §2 위저드 데스크톱 2-column → Task 3.1, 3.2
- [x] §2 위저드 모바일 전환 + 프로그레스바 → Task 3.3
- [x] §2 결과 split view → Task 5.9
- [x] §2 1박2일 탭 → Task 5.4
- [x] §2 타임라인 프리뷰 스켈레톤 → Task 4
- [x] §3.1 role 팔레트 토큰 → Task 1.1
- [x] §3.2 역할 판정 규칙 → Task 1.5 (course-role.ts)
- [x] §4.1 CourseStop.contentTypeId → Task 1.2
- [x] §4.2 Gemini 프롬프트 확장 → Task 1.3
- [x] §4.3 API fallbackContentTypeId → Task 1.4
- [x] §5 파일 구조 전부 → Task 3, 4, 5
- [x] §6 Wizard UI 세부 → Task 3
- [x] §6.4 이모지 → Lucide 매핑 → Task 3.5 ~ 3.9
- [x] §7 Loading UI → Task 4
- [x] §8 Result UI → Task 5
- [x] §8.4 Timeline↔Map 연동 → Task 2.3 + 5.3 + 5.8
- [x] §8.5 DayTabs 조건부 → Task 5.4, 5.9
- [x] §9 Phase 1 Backlog 흡수 → Task 6
- [x] §10 검증 전략 → 각 Task 말미 + Task 7
- [x] §11 위험 완화 → 각 Task 단계에 내장 (fallback, unoptimized, any 캐스팅 허용 등)
- [x] §12 Backlog → spec 에 이미 있음, plan 에서 재언급 불필요
- [x] §13 진행 순서 → Task 1~8 매핑

### Placeholder scan
- [ ] "TBD/TODO" 0건 확인 → 0건 (사용자 액션 섹션은 명시)
- [ ] "implement later" 0건 → 0건
- [ ] 코드 없는 step 0건 → Task 3.10, 5.10 이 "기존 구조에 맞춰 교체" 로 코드 대신 구조 안내 — 파일 간단(마운트만)하므로 허용
- [ ] "비슷하게" / "동일하게" 참조로 대체한 코드 → Task 3.7, 3.8, 3.9 (Step Feeling/Duration/Companion/Preferences) 는 모두 독립 코드 블록 제공, "동일 패턴" 언급 없음

### Type consistency
- `WizardState` / `WizardAction` 타입 — Task 3.1 에서 정의, Task 3.5~3.9 Step 컴포넌트에서 `Props` 로 일관 참조
- `CourseStop.contentTypeId` — Task 1.2 에서 추가, Task 1.5 (course-role), Task 5.1 (StopCard), Task 5.8 (MapPane) 에서 참조
- `GenerationState` / `useCourseGeneration` 반환 — Task 2.2 에서 정의, Task 3.1 (WizardShell) 에서 구조분해
- `ActiveStopState` / `useActiveStop` — Task 2.3 에서 정의, Task 5.9 (Shell), 5.3 (Timeline), 5.8 (MapPane) 에서 사용
- `Role` 타입 + `getRoleInfo` 시그니처 — Task 1.5 정의, Task 5.1, 5.8 사용. 파라미터는 `Pick<CourseStop, 'contentTypeId'|'isFestival'|'isStay'|'title'|'description'>` 로 통일
