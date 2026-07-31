# 진짜 갈 수 있는 코스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 방문 요일을 입력받아 휴무일인 장소를 코스에서 배제하고, 무장애 정보를 배지로 노출해 "실제로 갈 수 있는 코스"를 보장한다.

**Architecture:** 위저드 기간 단계에 방문일(토/일) 칩을 추가해 `CourseRequest.visitDay`로 전달한다. `enrichWithFacilities`가 TourAPI `detailIntro`에서 `restdate`를 추가 추출하고, 순수 함수 `parseRestDate`가 이를 요일 배열로 파싱한다. 스코어링에서 방문일 휴무 후보에 대형 페널티를 부여하고, 코스 생성 후 검증 단계에서 잔존 휴무 stop을 차순위 후보로 교체한다. 무장애 정보는 `detailWithTour`(신규, TourAPI 12번째)로 조회해 배지 표시 + family 가산에만 쓴다.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, Vitest 4, Tailwind v4, TourAPI 4.0 KorService2

## Global Constraints

- **graceful degradation 원칙**: `restdate`는 자유 텍스트다. **정보 없음 ≠ 휴무.** 파싱 실패(`null`)는 페널티 0·배지 "확인 필요"로 처리하고, 절대 후보에서 제거하지 않는다.
- **하위호환**: `visitDay` 미지정 요청은 기존과 동일하게 동작해야 한다(토요일 기준). 기존 저장 코스 조회가 깨지면 안 된다.
- **위저드는 5단계 유지.** 새 단계를 추가하지 않는다.
- **무장애는 위저드 입력을 추가하지 않는다.** 배지 표시 + `companion === 'family'` 가산만.
- 기존 검증 통과 유지: `npm run build` exit 0 · `npm run lint` 0 errors · `npm test` 전체 통과 (현재 27개).
- 커밋 메시지는 기존 컨벤션(`feat(scope): 한국어 설명`)을 따른다.
- TourAPI 호출은 `revalidate: 60`을 유지한다(실시간 호출 규정 준수). 로컬 사전 적재 금지.

---

### Task 1: 방문일 타입 + 날씨 스코어링 분기

**Files:**
- Modify: `lib/weekend-types.ts` (타입 추가)
- Modify: `lib/weekend-ai.ts:338-347` (`weatherScore`), `lib/weekend-ai.ts:392-415` (`scoreAndRankCandidates`)
- Modify: `app/api/course/route.ts:96-159` (`validateRequest`), `:525-532` (호출부)
- Test: `tests/visit-day.test.ts` (신규)

**Interfaces:**
- Produces: `type VisitDay = 'sat' | 'sun'` · `CourseRequest.visitDay?: VisitDay` · `weatherScore(spot, weather, visitDay?)` · `scoreAndRankCandidates(candidates, preferences, companion, duration, weather, feeling?, visitDay?)`

- [ ] **Step 1: 타입 추가**

`lib/weekend-types.ts`의 `Duration` 정의(64행) 아래에 추가:

```typescript
export type VisitDay = 'sat' | 'sun';
```

같은 파일 `CourseRequest` 인터페이스(171-182행)에 필드 추가:

```typescript
  visitDay?: VisitDay;   // 방문 요일. 미지정 시 토요일 기준(하위호환)
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/visit-day.test.ts` 신규 생성:

```typescript
import { describe, it, expect } from 'vitest';
import { scoreAndRankCandidates } from '@/lib/weekend-ai';
import type { ScoredSpot } from '@/lib/weekend-ai';
import type { WeekendWeather } from '@/lib/weekend-types';

// 토요일 비(pop 80), 일요일 맑음(pop 10)
const WEATHER: WeekendWeather = {
  saturday: { sky: '흐림', precipitation: '비', tempMin: 18, tempMax: 22, pop: 80, summary: '비' },
  sunday:   { sky: '맑음', precipitation: '없음', tempMin: 19, tempMax: 26, pop: 10, summary: '맑음' },
  recommendation: '일요일을 추천해요',
};

function makeSpot(overrides: Partial<ScoredSpot> = {}): ScoredSpot {
  return {
    contentId: '1', contentTypeId: 12, title: '야외 공원', addr1: '서울',
    cat1: 'A01', cat2: 'A0101', cat3: '', latitude: 37.5, longitude: 127.0,
    distanceKm: 5, score: 0, ...overrides,
  };
}

describe('visitDay별 weatherScore 분기', () => {
  it('야외 spot은 비 오는 토요일보다 맑은 일요일에 점수가 높다', () => {
    const outdoor = makeSpot();
    const sat = scoreAndRankCandidates([outdoor], ['nature'], 'solo', 'half_day', WEATHER, undefined, 'sat');
    const sun = scoreAndRankCandidates([outdoor], ['nature'], 'solo', 'half_day', WEATHER, undefined, 'sun');
    expect(sun[0].score).toBeGreaterThan(sat[0].score);
  });

  it('visitDay 미지정은 토요일 기준과 동일하다 (하위호환)', () => {
    const outdoor = makeSpot();
    const omitted = scoreAndRankCandidates([outdoor], ['nature'], 'solo', 'half_day', WEATHER);
    const sat = scoreAndRankCandidates([outdoor], ['nature'], 'solo', 'half_day', WEATHER, undefined, 'sat');
    expect(omitted[0].score).toBe(sat[0].score);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run tests/visit-day.test.ts`
Expected: FAIL — `scoreAndRankCandidates`가 7번째 인자를 받지 않아 두 결과가 동일하므로 첫 테스트가 실패

- [ ] **Step 4: `weatherScore`에 visitDay 반영**

`lib/weekend-ai.ts:338-347`을 교체:

```typescript
function weatherScore(spot: ScoredSpot, weather: WeekendWeather, visitDay?: VisitDay): number {
  const isOutdoor = ['A01', 'A03'].includes(spot.cat1);
  const isIndoor = ['A02', 'A05'].includes(spot.cat1);
  // visitDay 미지정 시 토요일 기준 (하위호환)
  const day = visitDay === 'sun' ? weather.sunday : weather.saturday;
  const rainy = day.pop > 50;

  if (rainy && isOutdoor) return 0.2;
  if (rainy && isIndoor) return 0.9;
  if (!rainy && isOutdoor) return 0.9;
  return 0.6;
}
```

같은 파일 상단의 `weekend-types` import 구문에 `VisitDay`를 추가한다.

- [ ] **Step 5: `scoreAndRankCandidates` 시그니처 확장**

`lib/weekend-ai.ts:392-415`에서 파라미터와 호출을 수정:

```typescript
export function scoreAndRankCandidates(
  candidates: ScoredSpot[],
  preferences: Preference[],
  companion: Companion,
  duration: Duration,
  weather: WeekendWeather,
  feeling?: Feeling,
  visitDay?: VisitDay,
): ScoredSpot[] {
```

본문에서 `weatherScore(spot, weather)` → `weatherScore(spot, weather, visitDay)`로 변경.

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run tests/visit-day.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 7: API 검증 + 호출부 연결**

`app/api/course/route.ts`의 상수 정의부(89-94행 부근)에 추가:

```typescript
const VALID_VISIT_DAYS: VisitDay[] = ['sat', 'sun'];
```

`validateRequest` 안, `feeling` 검증(134-137행) 다음에 추가:

```typescript
  const visitDay = b.visitDay as VisitDay | undefined;
  if (visitDay && !VALID_VISIT_DAYS.includes(visitDay)) {
    throw new Error('방문 요일 선택이 올바르지 않습니다.');
  }
```

같은 함수의 `return` 문(158행)에 `visitDay`를 추가한다. `VisitDay`를 `@/lib/weekend-types`에서 import한다.

호출부(525-532행)를 수정:

```typescript
    const ranked = scoreAndRankCandidates(
      candidates,
      req.preferences,
      req.companion,
      req.duration,
      weather,
      req.feeling,
      req.visitDay,
    );
```

- [ ] **Step 8: 전체 검증**

Run: `npm test && npm run lint && npm run build`
Expected: 테스트 전체 통과(기존 27 + 신규 2 = 29) · lint 0 errors · build exit 0

- [ ] **Step 9: 커밋**

```bash
git add lib/weekend-types.ts lib/weekend-ai.ts app/api/course/route.ts tests/visit-day.test.ts
git commit -m "feat(course): 방문 요일(visitDay) 도입 — 날씨 스코어링을 선택일 기준으로"
```

---

### Task 2: 위저드 방문일 선택 UI

**Files:**
- Modify: `app/components/course/wizard/steps/StepDuration.tsx`
- Modify: `app/components/course/wizard/WizardShell.tsx:24-64` (state/action/INITIAL), `:101-107` (STEP_META), `:217-235` (handleNext), `:249-258` (stepSummaries)

**Interfaces:**
- Consumes: `VisitDay` (Task 1)
- Produces: `WizardState.visitDay: VisitDay | null` · `WizardAction` 에 `{ type: 'SET_VISIT_DAY'; value: VisitDay }`

- [ ] **Step 1: 위저드 상태 확장**

`WizardShell.tsx`의 `WizardState`(24-36행)에 추가:

```typescript
  visitDay: VisitDay | null;
```

`WizardAction`(38-50행)에 추가:

```typescript
  | { type: 'SET_VISIT_DAY'; value: VisitDay }
```

`INITIAL`(52-64행)에 `visitDay: 'sat',` 추가 — 기본값 토요일로 두어 사용자가 건드리지 않아도 진행 가능하게 한다.

`reducer`(66-90행)의 `SET_DURATION` case를 교체:

```typescript
    case 'SET_DURATION': {
      // 1박2일은 토·일 모두 방문하므로 요일 선택을 무의미하게 만든다 → 토요일로 고정
      if (action.value === 'overnight') return { ...state, duration: action.value, visitDay: 'sat' };
      return { ...state, duration: action.value };
    }
    case 'SET_VISIT_DAY': return { ...state, visitDay: action.value };
```

`import type` 구문(6-9행)에 `VisitDay`를 추가한다.

- [ ] **Step 2: draft 저장/복구에 포함**

`WizardShell.tsx`의 draft 저장 payload(139-151행)의 `state` 객체에 `visitDay: state.visitDay,`를 추가한다.

- [ ] **Step 3: 단계 문구 갱신**

`STEP_META`(101-107행)의 3번째 항목(index 2)을 교체:

```typescript
  { title: '일정', question: '언제, 얼마나 놀 수 있어요?', sub: '방문하는 날에 맞춰 문 여는 곳만 골라드려요.' },
```

`stepSummaries`(249-258행)의 3번째 항목을 교체:

```typescript
    durationLabel && state.duration !== 'overnight' && state.visitDay
      ? `${state.visitDay === 'sat' ? '토' : '일'} · ${durationLabel}`
      : durationLabel,
```

- [ ] **Step 4: generate에 visitDay 전달**

`handleNext`(217-235행)의 `generate({...})` 인자에 추가:

```typescript
        visitDay: state.duration === 'overnight' ? undefined : state.visitDay ?? undefined,
```

- [ ] **Step 5: StepDuration에 요일 칩 추가**

`app/components/course/wizard/steps/StepDuration.tsx` 전체를 교체:

```tsx
import { Clock, Sun, Coffee, Moon } from 'lucide-react';
import { DURATION_LABELS } from '@/lib/weekend-types';
import type { Duration, VisitDay } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

const DURATIONS: { type: Duration; Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }[] = [
  { type: 'half_day', Icon: Clock },
  { type: 'full_day', Icon: Sun },
  { type: 'leisurely', Icon: Coffee },
  { type: 'overnight', Icon: Moon },
];

const VISIT_DAYS: { type: VisitDay; label: string }[] = [
  { type: 'sat', label: '토요일' },
  { type: 'sun', label: '일요일' },
];

export default function StepDuration({ state, dispatch }: Props) {
  const isOvernight = state.duration === 'overnight';

  return (
    <div className="space-y-8">
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

      {!isOvernight && (
        <div>
          <p className="text-sm font-semibold text-ink-1 mb-1">언제 가세요?</p>
          <p className="text-xs text-ink-3 mb-3">선택한 날에 문 여는 곳으로 코스를 짜드려요.</p>
          <div className="flex gap-2">
            {VISIT_DAYS.map(({ type, label }) => {
              const selected = state.visitDay === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_VISIT_DAY', value: type })}
                  aria-pressed={selected}
                  className={`px-5 py-2.5 rounded-full border text-sm font-semibold transition-colors ${
                    selected
                      ? 'bg-brand text-white border-brand'
                      : 'bg-surface-elevated text-ink-2 border-line hover:border-ink-4'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isOvernight && (
        <p className="text-xs text-ink-3">1박 2일은 토요일·일요일 모두 방문해요.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: 검증**

Run: `npm run lint && npm run build && npm test`
Expected: lint 0 errors · build exit 0 · 테스트 29개 통과

- [ ] **Step 7: 브라우저 확인**

Run: `npm run dev` 후 `/course` 진입 → 3단계(일정)에서 토/일 칩이 보이고, "1박 2일" 선택 시 칩이 사라지고 안내 문구로 바뀌는지 확인. 375px 폭에서도 칩이 넘치지 않는지 확인.

- [ ] **Step 8: 커밋**

```bash
git add app/components/course/wizard/
git commit -m "feat(wizard): 기간 단계에 방문 요일(토/일) 선택 통합 — 1박2일은 자동 숨김"
```

---

### Task 3: 휴무일 파서 (순수 함수)

**Files:**
- Create: `lib/opening-hours.ts`
- Test: `tests/opening-hours.test.ts`

**Interfaces:**
- Produces: `parseRestDate(raw: string | undefined): number[] | null` — 요일 인덱스 배열(0=일 … 6=토). `[]`는 휴무 없음, `null`은 판정 불가
- Produces: `visitDayToIndex(visitDay: VisitDay): number`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/opening-hours.test.ts` 신규 생성:

```typescript
import { describe, it, expect } from 'vitest';
import { parseRestDate, visitDayToIndex } from '@/lib/opening-hours';

describe('parseRestDate', () => {
  it('연중무휴 계열은 빈 배열 (휴무 없음)', () => {
    expect(parseRestDate('연중무휴')).toEqual([]);
    expect(parseRestDate('없음')).toEqual([]);
    expect(parseRestDate('연중개방')).toEqual([]);
  });

  it('단일 요일 휴무를 인덱스로', () => {
    expect(parseRestDate('매주 월요일')).toEqual([1]);
    expect(parseRestDate('월요일 휴관')).toEqual([1]);
    expect(parseRestDate('매주 일요일 휴무')).toEqual([0]);
    expect(parseRestDate('토요일 휴무')).toEqual([6]);
  });

  it('복수 요일 휴무', () => {
    expect(parseRestDate('매주 월요일, 화요일 휴무')).toEqual([1, 2]);
  });

  it('괄호 부연이 있어도 요일을 추출', () => {
    expect(parseRestDate('매주 월요일(공휴일인 경우 익일 휴무)')).toEqual([1]);
  });

  it('요일 정보가 없으면 null (판정 불가)', () => {
    expect(parseRestDate('1월 1일, 설날 당일')).toBeNull();
    expect(parseRestDate('기상악화 시 휴장')).toBeNull();
    expect(parseRestDate('')).toBeNull();
    expect(parseRestDate(undefined)).toBeNull();
  });

  it('중복 요일은 한 번만', () => {
    expect(parseRestDate('월요일 휴무, 매주 월요일 정기휴무')).toEqual([1]);
  });
});

describe('visitDayToIndex', () => {
  it('토=6, 일=0', () => {
    expect(visitDayToIndex('sat')).toBe(6);
    expect(visitDayToIndex('sun')).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/opening-hours.test.ts`
Expected: FAIL — `Cannot find module '@/lib/opening-hours'`

- [ ] **Step 3: 파서 구현**

`lib/opening-hours.ts` 신규 생성:

```typescript
import type { VisitDay } from './weekend-types';

/** 요일 문자 → JS getDay() 인덱스 (0=일 … 6=토) */
const WEEKDAY_INDEX: Record<string, number> = {
  일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6,
};

/** 휴무가 없음을 뜻하는 표현 */
const NO_REST_PATTERN = /연중무휴|무휴|연중개방|상시개방|^없음$/;

/**
 * TourAPI `restdate`(쉬는날) 자유 텍스트에서 정기 휴무 요일을 추출한다.
 *
 * @returns 요일 인덱스 배열. `[]` = 휴무 없음(연중무휴), `null` = 판정 불가.
 *          **`null`과 `[]`는 반드시 구분해서 다뤄야 한다. 정보 없음 ≠ 휴무 없음이 아니라,
 *          정보 없음은 "모른다"이므로 감점 대상이 아니다.**
 */
export function parseRestDate(raw: string | undefined): number[] | null {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  if (NO_REST_PATTERN.test(text)) return [];

  // "X요일" 형태만 신뢰한다. "토,일"처럼 요일 글자가 단독으로 쓰인 경우는
  // 날짜·기타 표현과 구분이 어려워 판정 불가로 둔다(안전 측).
  const matches = text.matchAll(/([월화수목금토일])요일/g);
  const days = new Set<number>();
  for (const m of matches) {
    days.add(WEEKDAY_INDEX[m[1]]);
  }

  if (days.size === 0) return null;
  return [...days].sort((a, b) => a - b);
}

/** 방문일 → JS getDay() 인덱스 */
export function visitDayToIndex(visitDay: VisitDay): number {
  return visitDay === 'sun' ? 0 : 6;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/opening-hours.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/opening-hours.ts tests/opening-hours.test.ts
git commit -m "feat(lib): restdate 휴무 요일 파서 — null/빈배열 삼상태 구분"
```

---

### Task 4: restdate 추출 + 휴무 페널티

**Files:**
- Modify: `lib/weekend-ai.ts:33-49` (`ScoredSpot`), `:704-738` (`enrichWithFacilities`), `:392-415` (`scoreAndRankCandidates`)
- Test: `tests/opening-hours.test.ts` (페널티 케이스 추가)

**Interfaces:**
- Consumes: `parseRestDate`, `visitDayToIndex` (Task 3) · `VisitDay` (Task 1)
- Produces: `ScoredSpot.restdate?: string` · `ScoredSpot.closedWeekdays?: number[] | null` · 상수 `CLOSED_PENALTY = -200`

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/opening-hours.test.ts`의 **상단 import 구문에** 다음 3줄을 추가한다:

```typescript
import { scoreAndRankCandidates } from '@/lib/weekend-ai';
import type { ScoredSpot } from '@/lib/weekend-ai';
import type { WeekendWeather } from '@/lib/weekend-types';
```

그리고 파일 **끝**에 아래를 추가한다:

```typescript
const CLEAR: WeekendWeather = {
  saturday: { sky: '맑음', precipitation: '없음', tempMin: 18, tempMax: 24, pop: 10, summary: '맑음' },
  sunday:   { sky: '맑음', precipitation: '없음', tempMin: 18, tempMax: 24, pop: 10, summary: '맑음' },
  recommendation: '둘 다 좋아요',
};

function spot(id: string, closedWeekdays: number[] | null | undefined): ScoredSpot {
  return {
    contentId: id, contentTypeId: 12, title: `장소${id}`, addr1: '서울',
    cat1: 'A01', cat2: 'A0101', cat3: '', latitude: 37.5, longitude: 127.0,
    distanceKm: 5, score: 0, closedWeekdays,
  };
}

describe('휴무일 페널티', () => {
  it('일요일 휴무 spot은 일요일 방문 시 점수가 크게 깎인다', () => {
    const closedSun = spot('1', [0]);
    const open = spot('2', []);
    const ranked = scoreAndRankCandidates([closedSun, open], ['nature'], 'solo', 'half_day', CLEAR, undefined, 'sun');
    const a = ranked.find(r => r.contentId === '1')!;
    const b = ranked.find(r => r.contentId === '2')!;
    expect(a.score).toBeLessThan(0);
    expect(b.score).toBeGreaterThan(a.score);
  });

  it('일요일 휴무 spot도 토요일 방문이면 감점 없다', () => {
    const ranked = scoreAndRankCandidates([spot('1', [0])], ['nature'], 'solo', 'half_day', CLEAR, undefined, 'sat');
    expect(ranked[0].score).toBeGreaterThan(0);
  });

  it('판정 불가(null)는 감점하지 않는다', () => {
    const unknown = scoreAndRankCandidates([spot('1', null)], ['nature'], 'solo', 'half_day', CLEAR, undefined, 'sun');
    const known = scoreAndRankCandidates([spot('2', [])], ['nature'], 'solo', 'half_day', CLEAR, undefined, 'sun');
    expect(unknown[0].score).toBe(known[0].score);
  });

  it('휴무 spot도 후보 목록에서 제거되지는 않는다', () => {
    const ranked = scoreAndRankCandidates([spot('1', [0])], ['nature'], 'solo', 'half_day', CLEAR, undefined, 'sun');
    expect(ranked).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/opening-hours.test.ts`
Expected: FAIL — `closedWeekdays`가 `ScoredSpot`에 없어 타입 에러, 페널티 미적용으로 첫 테스트 실패

- [ ] **Step 3: ScoredSpot 필드 추가**

`lib/weekend-ai.ts:33-49`의 `ScoredSpot`에 추가:

```typescript
  restdate?: string;                  // 쉬는날 원문 (detailIntro)
  closedWeekdays?: number[] | null;   // 파싱된 휴무 요일. null=판정 불가
```

- [ ] **Step 4: 휴무 페널티 적용**

`lib/weekend-ai.ts` 상단에 import 추가:

```typescript
import { parseRestDate, visitDayToIndex } from './opening-hours';
```

`scoreAndRankCandidates`(392-415행) 부근에 상수와 함수를 추가:

```typescript
/** 방문일 휴무 페널티. 최대 획득 가능 점수(약 134)를 단독으로 상회해 사실상 배제한다. */
const CLOSED_PENALTY = -200;

function closedPenalty(spot: ScoredSpot, visitDay?: VisitDay): number {
  if (!visitDay) return 0;                       // 방문일 미지정 → 판정 불가
  const closed = spot.closedWeekdays;
  if (closed == null) return 0;                  // null = 판정 불가 → 감점 없음
  return closed.includes(visitDayToIndex(visitDay)) ? CLOSED_PENALTY : 0;
}
```

`scoreAndRankCandidates` 본문의 점수 합산부(402-412행)를 수정:

```typescript
  const scored = candidates.map(spot => {
    const pScore = preferenceScore(spot, preferences) * 35;
    const cScore = companionScore(spot, companion) * 20;
    const wScore = weatherScore(spot, weather, visitDay) * 15;
    const dScore = distanceScore(spot.distanceKm, duration) * 20;
    const sBonus = seasonBonus(spot, month) * 10;
    const fBonus = facilityBonus(spot, companion);
    const feelBonus = feelingScore(spot, feeling);
    const closed = closedPenalty(spot, visitDay);

    return { ...spot, score: pScore + cScore + wScore + dScore + sBonus + fBonus + feelBonus + closed };
  });
```

- [ ] **Step 5: enrichWithFacilities에서 restdate 추출**

`lib/weekend-ai.ts:725-735`의 운영시간 추출 블록 **다음에** 추가:

```typescript
      // 쉬는날 추출 + 요일 파싱 (contentTypeId별 필드명이 다름)
      const rawRest = intro.restdate ?? intro.restdatefood ?? intro.restdateculture ?? '';
      if (rawRest.trim()) {
        const cleaned = rawRest
          .replace(/<br\s*\/?>/gi, ', ')
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ')
          .trim()
          .slice(0, 120);
        targets[i].restdate = cleaned;
        targets[i].closedWeekdays = parseRestDate(cleaned);
      } else {
        targets[i].closedWeekdays = null;   // 정보 없음 = 판정 불가
      }
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run tests/opening-hours.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 7: 전체 검증 + 커밋**

Run: `npm test && npm run lint && npm run build`
Expected: 전체 통과

```bash
git add lib/weekend-ai.ts tests/opening-hours.test.ts
git commit -m "feat(course): restdate 추출 + 방문일 휴무 페널티 (판정불가는 감점 0)"
```

---

### Task 5: 코스 검증 단계에서 휴무 stop 교체

**Files:**
- Modify: `app/api/course/route.ts` (코스 생성 직후, `enrichStops` 앞)
- Test: `tests/opening-hours.test.ts` (교체 로직 케이스 추가)

**Interfaces:**
- Consumes: `parseRestDate`, `visitDayToIndex` (Task 3) · `ScoredSpot.closedWeekdays` (Task 4)
- Produces: `replaceClosedStops(stops, ranked, visitDay): { stops: CourseStop[]; replaced: number }` — `lib/opening-hours.ts`에 배치

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/opening-hours.test.ts`의 **상단 import 구문에** `replaceClosedStops`와 `CourseStop`을 추가한다(기존 `parseRestDate` import에 합쳐도 된다):

```typescript
import { parseRestDate, visitDayToIndex, replaceClosedStops } from '@/lib/opening-hours';
import type { CourseStop } from '@/lib/weekend-types';
```

그리고 파일 **끝**에 아래를 추가한다:

```typescript
function stop(contentId: string, order: number): CourseStop {
  return {
    order, contentId, title: `장소${contentId}`, timeStart: '10:00', durationMin: 60,
    description: '설명', tip: '', latitude: 37.5, longitude: 127.0, isFestival: false,
    contentTypeId: '12',
  };
}

describe('replaceClosedStops', () => {
  it('일요일 휴무 stop을 같은 역할의 영업 후보로 교체한다', () => {
    const stops = [stop('1', 1)];
    const ranked = [spot('1', [0]), spot('9', [])];
    const result = replaceClosedStops(stops, ranked, 'sun');
    expect(result.replaced).toBe(1);
    expect(result.stops[0].contentId).toBe('9');
    expect(result.stops[0].order).toBe(1);   // order는 유지
  });

  it('대체 후보가 없으면 원본을 유지한다 (코스 붕괴 방지)', () => {
    const stops = [stop('1', 1)];
    const ranked = [spot('1', [0])];
    const result = replaceClosedStops(stops, ranked, 'sun');
    expect(result.replaced).toBe(0);
    expect(result.stops[0].contentId).toBe('1');
  });

  it('visitDay 미지정이면 아무것도 하지 않는다', () => {
    const stops = [stop('1', 1)];
    const ranked = [spot('1', [0]), spot('9', [])];
    const result = replaceClosedStops(stops, ranked, undefined);
    expect(result.replaced).toBe(0);
  });

  it('이미 코스에 있는 장소로는 교체하지 않는다', () => {
    const stops = [stop('1', 1), stop('9', 2)];
    const ranked = [spot('1', [0]), spot('9', [])];
    const result = replaceClosedStops(stops, ranked, 'sun');
    expect(result.replaced).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/opening-hours.test.ts`
Expected: FAIL — `replaceClosedStops` 미정의

- [ ] **Step 3: 교체 함수 구현**

`lib/opening-hours.ts` **상단의 import 구문**을 다음으로 바꾼다:

```typescript
import type { VisitDay, CourseStop } from './weekend-types';
```

그리고 파일 **끝**에 아래를 추가한다:

```typescript
/** 교체 후보 판정에 필요한 최소 형태 (ScoredSpot 구조적 부분집합) */
interface ReplacementCandidate {
  contentId: string;
  contentTypeId: number;
  title: string;
  latitude: number;
  longitude: number;
  firstImage?: string;
  overview?: string;
  closedWeekdays?: number[] | null;
}

/**
 * 방문일에 휴무인 stop을 같은 contentTypeId의 영업 후보로 교체한다.
 * 대체 후보가 없으면 원본을 유지한다 — 코스에서 제거하면 시간표가 붕괴하기 때문.
 */
export function replaceClosedStops<T extends ReplacementCandidate>(
  stops: CourseStop[],
  ranked: T[],
  visitDay: VisitDay | undefined,
): { stops: CourseStop[]; replaced: number } {
  if (!visitDay) return { stops, replaced: 0 };

  const dayIndex = visitDayToIndex(visitDay);
  const isClosed = (closed: number[] | null | undefined) =>
    closed != null && closed.includes(dayIndex);

  const used = new Set(stops.map(s => s.contentId));
  let replaced = 0;

  const next = stops.map(stop => {
    const current = ranked.find(c => c.contentId === stop.contentId);
    if (!current || !isClosed(current.closedWeekdays)) return stop;

    const alt = ranked.find(c =>
      c.contentId !== stop.contentId &&
      !used.has(c.contentId) &&
      c.contentTypeId === current.contentTypeId &&
      !isClosed(c.closedWeekdays)
    );
    if (!alt) return stop;

    used.add(alt.contentId);
    replaced++;
    return {
      ...stop,
      contentId: alt.contentId,
      title: alt.title,
      latitude: alt.latitude,
      longitude: alt.longitude,
      imageUrl: alt.firstImage,
      description: alt.overview?.slice(0, 100) ?? stop.description,
    };
  });

  return { stops: next, replaced };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/opening-hours.test.ts`
Expected: PASS (15 tests)

- [ ] **Step 5: 라우트에 연결**

`app/api/course/route.ts`에서 A/B 코스를 받은 직후(578-581행의 `await Promise.all` 다음), `enrichStops` 호출(584행) **앞에** 추가:

```typescript
    // 4-0. 방문일 휴무 stop 교체 (AI가 프롬프트 지시를 어긴 경우의 최종 안전망)
    if (req.visitDay) {
      const fixedA = replaceClosedStops(course.stops, ranked, req.visitDay);
      course.stops = fixedA.stops;
      if (courseB) {
        const fixedB = replaceClosedStops(courseB.stops, ranked, req.visitDay);
        courseB.stops = fixedB.stops;
      }
      if (fixedA.replaced > 0) {
        console.warn(`[이모추API] 휴무 stop 교체: ${fixedA.replaced}건 (visitDay=${req.visitDay})`);
      }
    }
```

파일 상단에 `import { replaceClosedStops } from '@/lib/opening-hours';`를 추가한다.

- [ ] **Step 6: 프롬프트에 휴무 정보 노출**

먼저 `CourseGenerationInput`(`lib/weekend-ai.ts:72-83`)에 `visitDay?: VisitDay;`를 추가하고, `app/api/course/route.ts`의 `input` 객체(545-556행)에 `visitDay: req.visitDay,`를 추가한다.

다음으로 `formatFacilities` 함수(474-492행)의 운영시간 라인(479행) **바로 아래**에 휴무 정보를 추가한다:

```typescript
  // 운영시간
  if (spot.usetime) parts.push(`운영: ${spot.usetime}`);
  // 쉬는날 — AI가 방문일과 대조할 수 있도록 원문 그대로 노출
  if (spot.restdate) parts.push(`휴무: ${spot.restdate}`);
```

마지막으로 방문일 지시를 프롬프트에 넣는다. `buildUserMessage`(494행~)는 **배열이 아니라 템플릿 리터럴 하나를 반환**하므로 `push`가 아니라 문자열 보간으로 삽입해야 한다. 502행의 `- 현재: ${month}월 ...` 라인 **바로 앞**에 다음 보간을 추가한다:

```typescript
- 취향: ${input.preferences.map(p => PREFERENCE_KOREAN[p]).join(', ')}${input.feeling ? `\n- 🎭 오늘의 기분: ${FEELING_DETAIL[input.feeling]}` : ''}${input.saju ? `\n- ☯️ 오늘의 사주 기운: ${input.saju.headline} — ${input.saju.message}\n  → 위 기운의 정서를 코스 내러티브(storyArc·summary)의 톤에 자연스럽게 녹이되, 장소 선택 자체는 위 취향·동반자·기분 조건을 따르세요.` : ''}${input.visitDay ? `\n- 📅 방문일: ${input.visitDay === 'sun' ? '일요일' : '토요일'} — **후보의 "휴무" 표기를 확인해, 이 날 문을 닫는 곳은 절대 코스에 넣지 마세요.**` : ''}
```

> 즉 501행 끝(사주 보간 뒤)에 `${input.visitDay ? ... : ''}` 하나를 이어 붙이는 것이다. 기존 보간들과 동일한 패턴이라 줄 구조는 바뀌지 않는다.

- [ ] **Step 7: 전체 검증 + 커밋**

Run: `npm test && npm run lint && npm run build`
Expected: 전체 통과

```bash
git add lib/opening-hours.ts lib/weekend-ai.ts app/api/course/route.ts tests/opening-hours.test.ts
git commit -m "feat(course): 휴무 stop 자동 교체 + 프롬프트 방문일 지시"
```

---

### Task 6: StopCard 운영 상태 배지

**Files:**
- Modify: `lib/weekend-types.ts` (`CourseStop`)
- Modify: `app/api/course/route.ts:584-610` (`enrichStops`)
- Modify: `app/components/course/result/StopCard.tsx:62-70`

**Interfaces:**
- Consumes: `ScoredSpot.closedWeekdays`, `ScoredSpot.restdate` (Task 4)
- Produces: `CourseStop.openStatus?: 'open' | 'unknown'` · `CourseStop.restdate?: string`

- [ ] **Step 1: 타입 추가**

`lib/weekend-types.ts`의 `CourseStop`(194-214행)에 추가:

```typescript
  openStatus?: 'open' | 'unknown';   // 방문일 영업 확인 여부
  restdate?: string;                 // 쉬는날 원문 (툴팁·보조 표시용)
```

- [ ] **Step 2: enrichStops에서 주입**

`app/api/course/route.ts`의 `enrichStops` 함수(584-610행) 안, 기존 `contentTypeId` 복원 로직 옆에 아래를 추가한다. 파일 상단에 `import { visitDayToIndex } from '@/lib/opening-hours';`가 이미 있으면 재사용하고, 없으면 기존 `replaceClosedStops` import에 합친다.

```typescript
        const cand = candidates.find(c => c.contentId === stop.contentId);
        if (cand) {
          if (cand.restdate) stop.restdate = cand.restdate;
          if (req.visitDay) {
            // 판정 불가(null/undefined)거나, 교체에 실패해 휴무인 채로 남은 stop → 'unknown'
            // 방문일에 영업이 확인된 경우만 'open'
            stop.openStatus =
              cand.closedWeekdays != null && !cand.closedWeekdays.includes(visitDayToIndex(req.visitDay))
                ? 'open'
                : 'unknown';
          }
        }
```

> Task 5에서 휴무 stop은 이미 영업 후보로 교체됐다. 여기 남은 휴무 stop은 **대체 후보가 없어 교체에 실패한 경우**이므로, 'open'으로 잘못 표시하지 않고 'unknown'으로 떨어뜨린다.

- [ ] **Step 3: 배지 렌더**

`app/components/course/result/StopCard.tsx`의 역할 라벨 span 다음(68행 뒤)에 추가:

```tsx
          {stop.openStatus === 'open' && (
            <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              영업 확인
            </span>
          )}
          {stop.openStatus === 'unknown' && (
            <span
              className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-ink-3 bg-surface-sunken border border-line px-2 py-0.5 rounded-md"
              title={stop.restdate ? `쉬는날: ${stop.restdate}` : undefined}
            >
              운영시간 확인 필요
            </span>
          )}
```

`aria-label`(38행)에 상태를 반영해 스크린리더에도 전달한다:

```tsx
        aria-label={`${stop.order}번째 코스: ${stop.title}, ${timeRange}, ${label}${
          stop.openStatus === 'open' ? ', 방문일 영업 확인됨' : stop.openStatus === 'unknown' ? ', 운영시간 확인 필요' : ''
        }${isActive ? '. 다시 눌러 상세 보기' : ''}`}
```

- [ ] **Step 4: 검증**

Run: `npm run lint && npm run build && npm test`
Expected: 전체 통과

- [ ] **Step 5: 브라우저 확인**

`npm run dev` → 코스 생성(일요일 선택) → 결과 화면에서 배지가 보이는지, 375px에서 줄바꿈이 깨지지 않는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add lib/weekend-types.ts app/api/course/route.ts app/components/course/result/StopCard.tsx
git commit -m "feat(result): StopCard 영업 확인 / 운영시간 확인 필요 배지"
```

---

### Task 7: enrich 타임아웃 가드

**Files:**
- Modify: `app/api/course/route.ts:516-522`

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (기존 동작 보호)

- [ ] **Step 1: 타임아웃 적용**

`app/api/course/route.ts:516-522`의 try/catch 블록을 교체:

```typescript
    // 1.5. 편의시설 정보 보강 (detailIntro 병렬 조회, 상위 20개)
    // family 동행자는 유모차/키즈시설 정보가 핵심, 그 외에도 주차 정보 유용
    // 외부 API 지연이 maxDuration(60s)을 잠식하지 않도록 상한을 둔다. 초과 시 보강 없이 진행.
    const ENRICH_TIMEOUT_MS = 8_000;
    try {
      await Promise.race([
        enrichWithFacilities(candidates, 20),
        new Promise<void>((resolve) => setTimeout(() => {
          console.warn('[이모추API] 편의시설 보강 타임아웃 → 보강 없이 진행');
          resolve();
        }, ENRICH_TIMEOUT_MS)),
      ]);
    } catch (enrichErr) {
      console.warn('[이모추API] 편의시설 조회 실패 (무시):', enrichErr);
    }
```

> `enrichWithFacilities`는 `ScoredSpot` 배열을 제자리 변경(mutate)하므로, 타임아웃으로 먼저 resolve되어도 그때까지 채워진 항목은 유지된다. 미완료 항목은 `closedWeekdays`가 `undefined`로 남고, `closedPenalty`가 `null == undefined` 비교로 감점 0 처리한다.

- [ ] **Step 2: 검증**

Run: `npm test && npm run lint && npm run build`
Expected: 전체 통과 (동작 변화 없음, 상한만 추가)

- [ ] **Step 3: 커밋**

```bash
git add app/api/course/route.ts
git commit -m "fix(course): enrich 단계 8초 타임아웃 가드 — maxDuration 잠식 방지"
```

---

### Task 8: detailWithTour discovery

**Files:**
- Create: `docs/tour-api-barrier-free-discovery.md`
- Create: `scripts/probe-barrier-free.mjs` (일회성 조사 스크립트)

**Interfaces:**
- Produces: 검증된 오퍼레이션명·파라미터·응답 필드 목록 (Task 9의 입력)

> ⚠️ **이 태스크는 코드를 확정하지 않는다.** 실제 응답을 확인해 문서화하는 것이 산출물이다. Task 9는 이 문서 없이 시작할 수 없다.

- [ ] **Step 1: 조사 스크립트 작성**

`scripts/probe-barrier-free.mjs` 신규 생성:

```javascript
// 일회성 조사 스크립트: 무장애 정보 오퍼레이션의 실제 이름·응답 필드 확인
// 실행: TOUR_API_KEY=... node scripts/probe-barrier-free.mjs <contentId>
const BASE = 'https://apis.data.go.kr/B551011/KorService2';
const KEY = process.env.TOUR_API_KEY;
const contentId = process.argv[2] ?? '126508'; // 기본값: 경복궁

if (!KEY) {
  console.error('TOUR_API_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

// 후보 오퍼레이션명 (공공데이터포털 "무장애정보" 항목)
const CANDIDATES = ['detailWithTour2', 'detailWithTour'];

for (const op of CANDIDATES) {
  const url = new URL(`${BASE}/${op}`);
  url.searchParams.set('serviceKey', KEY);
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', '이모추');
  url.searchParams.set('_type', 'json');
  url.searchParams.set('contentId', contentId);

  try {
    const res = await fetch(url.toString());
    const text = await res.text();
    console.log(`\n===== ${op} (HTTP ${res.status}) =====`);
    try {
      const json = JSON.parse(text);
      const item = json?.response?.body?.items?.item;
      const first = Array.isArray(item) ? item[0] : item;
      if (first) {
        console.log('필드 목록:', Object.keys(first).join(', '));
        console.log(JSON.stringify(first, null, 2));
      } else {
        console.log('items 없음. resultMsg:', json?.response?.header?.resultMsg);
      }
    } catch {
      console.log('JSON 아님 (앞 500자):', text.slice(0, 500));
    }
  } catch (err) {
    console.log(`${op} 호출 실패:`, err.message);
  }
}
```

- [ ] **Step 2: 실행**

Run: `TOUR_API_KEY=<실제키> node scripts/probe-barrier-free.mjs 126508`

`.env.local`에 키가 있다면: `set -a && . ./.env.local && set +a && node scripts/probe-barrier-free.mjs 126508`

Expected: 두 후보 중 하나가 HTTP 200 + `items.item` 반환. 실패 시 [콘텐츠랩 API 명세](https://api.visitkorea.or.kr/)에서 정확한 오퍼레이션명을 확인해 `CANDIDATES`에 추가하고 재실행.

- [ ] **Step 3: 결과 문서화**

`docs/tour-api-barrier-free-discovery.md`에 다음을 기록한다:

- 확인된 오퍼레이션명 (예: `detailWithTour2`)
- 필수/선택 파라미터
- 응답 필드 전체 목록과 각 필드의 의미·샘플값 (예: `wheelchair`, `parking`, `braileblock`, `helpdog` 등 — **실제 응답 기준으로만 기록. 추측 금지**)
- 무장애 정보가 없는 contentId의 응답 형태 (빈 items인지, 필드가 빈 문자열인지)
- 최소 3개 이상의 contentId로 확인한 결과

- [ ] **Step 4: 판정**

문서를 근거로 Task 9 진행 여부를 결정한다:

- **진행**: 오퍼레이션이 200을 반환하고 무장애 관련 필드가 존재
- **중단**: 오퍼레이션이 존재하지 않거나 별도 인증키·별도 서비스 등록이 필요 → **Task 9를 스킵하고 계획을 여기서 종료한다.** M1+M2로 이미 완결된 상태이므로 문제없다. 이 경우 문서에 중단 사유를 남기고 커밋한다.

- [ ] **Step 5: 커밋**

```bash
git add docs/tour-api-barrier-free-discovery.md scripts/probe-barrier-free.mjs
git commit -m "docs(tourapi): 무장애 정보 오퍼레이션 실호출 조사 결과"
```

---

### Task 9: 무장애 정보 연동 + 배지

> **선행 조건:** Task 8의 판정이 "진행"일 때만 수행한다.

**Files:**
- Modify: `lib/tour-api.ts` (신규 함수 추가)
- Modify: `lib/weekend-ai.ts:33-49` (`ScoredSpot`), `:704-738` (`enrichWithFacilities`), `:741-774` (`facilityBonus`)
- Modify: `lib/weekend-types.ts` (`CourseStop`)
- Modify: `app/api/course/route.ts` (`enrichStops`)
- Modify: `app/components/course/result/StopCard.tsx`
- Test: `tests/barrier-free.test.ts` (신규)

**Interfaces:**
- Consumes: Task 8이 확정한 오퍼레이션명·필드명
- Produces: `detailWithTour({ contentId }): Promise<DetailWithTourItem | null>` · `ScoredSpot.barrierFree?: BarrierFreeInfo` · `CourseStop.barrierFree?: string[]`

- [ ] **Step 1: TourAPI 클라이언트 함수 추가**

`lib/tour-api.ts`의 `detailIntro`(186-195행) 아래에 추가. **필드명은 Task 8 문서의 실제 응답을 따른다** — 아래는 `wheelchair` / `parking` / `braileblock` / `helpdog`가 확인된 경우의 형태다:

```typescript
// ─── detailWithTour: 무장애 여행 정보 ───

export interface DetailWithTourItem {
  contentid: string;
  [key: string]: string;   // 무장애 항목은 콘텐츠 타입별로 다름
}

export async function detailWithTour(params: {
  contentId: string;
}): Promise<DetailWithTourItem | null> {
  const items = await callTourApi<DetailWithTourItem>('detailWithTour2', {
    contentId: params.contentId,
  });
  return items[0] ?? null;
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/barrier-free.test.ts` 신규 생성. **`parseBarrierFree`에 넣는 샘플은 Task 8 문서의 실제 응답값을 사용한다**:

```typescript
import { describe, it, expect } from 'vitest';
import { parseBarrierFree } from '@/lib/weekend-ai';

describe('parseBarrierFree', () => {
  it('가능 표현을 항목으로 수집한다', () => {
    const result = parseBarrierFree({
      contentid: '1',
      wheelchair: '휠체어 대여 가능',
      parking: '장애인 전용 주차구역 있음',
    });
    expect(result).toContain('휠체어');
    expect(result).toContain('장애인 주차');
  });

  it('불가·없음 표현은 제외한다', () => {
    const result = parseBarrierFree({ contentid: '1', wheelchair: '없음' });
    expect(result).not.toContain('휠체어');
  });

  it('빈 응답은 빈 배열', () => {
    expect(parseBarrierFree(null)).toEqual([]);
    expect(parseBarrierFree({ contentid: '1' })).toEqual([]);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run tests/barrier-free.test.ts`
Expected: FAIL — `parseBarrierFree` 미정의

- [ ] **Step 4: 파서 + enrich 구현**

`lib/weekend-ai.ts`의 `ScoredSpot`에 추가:

```typescript
  barrierFree?: string[];   // 무장애 항목 라벨 목록
```

`parseCompanionFacilities`(667-698행) 아래에 추가. **필드 키는 Task 8 문서 기준으로 조정한다**:

```typescript
/** 무장애 응답에서 "가능"으로 확인된 항목만 라벨로 수집 */
export function parseBarrierFree(item: Record<string, string> | null): string[] {
  if (!item) return [];
  const LABELS: Array<[key: string, label: string]> = [
    ['wheelchair', '휠체어'],
    ['parking', '장애인 주차'],
    ['braileblock', '점자블록'],
    ['helpdog', '보조견 동반'],
    ['elevator', '엘리베이터'],
    ['restroom', '장애인 화장실'],
    ['stroller', '유모차 대여'],
  ];
  const positive = /가능|있|대여|구비|설치|완비/;
  const negative = /불가|없|미설치|미비/;

  const result: string[] = [];
  for (const [key, label] of LABELS) {
    const value = item[key];
    if (!value) continue;
    if (positive.test(value) && !negative.test(value)) result.push(label);
  }
  return result;
}
```

`enrichWithFacilities`(704-738행)를 무장애 병렬 조회까지 하도록 수정. `detailIntro` import 옆에 `detailWithTour`를 추가하고, 기존 `Promise.allSettled` 블록을 다음으로 교체:

```typescript
  const [introResults, tourResults] = await Promise.all([
    Promise.allSettled(
      targets.map(spot => detailIntro({ contentId: spot.contentId, contentTypeId: spot.contentTypeId }))
    ),
    Promise.allSettled(
      targets.map(spot => detailWithTour({ contentId: spot.contentId }))
    ),
  ]);
```

기존 for 루프에서 `results` → `introResults`로 이름을 바꾸고, 루프 끝에 추가:

```typescript
    const tourResult = tourResults[i];
    if (tourResult.status === 'fulfilled' && tourResult.value) {
      const labels = parseBarrierFree(tourResult.value as Record<string, string>);
      if (labels.length > 0) targets[i].barrierFree = labels;
    }
```

- [ ] **Step 5: family 가산**

`facilityBonus`(741-774행)의 `family` case를 수정:

```typescript
    case 'family': {
      let bonus = 0;
      if (f.babyCarriage) bonus += 8;
      if (f.kidsFacility) bonus += 10;
      if (f.parking) bonus += 3;
      // 무장애 항목은 유모차·고령자 동반 가족에게 직접적인 편의 → 항목당 +2 (상한 6)
      if (spot.barrierFree?.length) bonus += Math.min(spot.barrierFree.length * 2, 6);
      // 반려동물 불가는 가족에게 중립
      return bonus;
    }
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run tests/barrier-free.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: 결과 화면 배지**

`lib/weekend-types.ts`의 `CourseStop`에 추가:

```typescript
  barrierFree?: string[];   // 무장애 항목 라벨
```

`app/api/course/route.ts`의 `enrichStops` 안, Task 6에서 추가한 `if (cand)` 블록에 추가:

```typescript
          if (cand.barrierFree?.length) stop.barrierFree = cand.barrierFree;
```

`StopCard.tsx`의 배지 영역(Task 6에서 추가한 블록 뒤)에 추가:

```tsx
          {stop.barrierFree?.map((item) => (
            <span
              key={item}
              className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md"
            >
              ♿ {item}
            </span>
          ))}
```

- [ ] **Step 8: 전체 검증**

Run: `npm test && npm run lint && npm run build`
Expected: 전체 통과

- [ ] **Step 9: 실호출 확인**

`npm run dev` → 무장애 정보가 있는 지역(예: 서울 도심)으로 코스 생성 → 배지가 실제로 렌더되는지 확인. 하나도 안 나오면 Task 8 문서의 필드명과 `parseBarrierFree`의 `LABELS` 키가 일치하는지 재확인.

- [ ] **Step 10: 커밋**

```bash
git add lib/tour-api.ts lib/weekend-ai.ts lib/weekend-types.ts app/api/course/route.ts app/components/course/result/StopCard.tsx tests/barrier-free.test.ts
git commit -m "feat(course): 무장애 정보 연동 (TourAPI 12번째) — 배지 표시 + family 가산"
```

---

## 완료 후 확인

- [ ] `npm test` — 기존 27 + 신규 약 20개 통과
- [ ] `npm run lint` 0 errors · `npm run build` exit 0
- [ ] 회귀: `visitDay` 없이 `POST /api/course` 호출 → 기존과 동일 동작
- [ ] 4 브레이크포인트(1440/1024/768/375)에서 StopCard 배지 레이아웃 확인
- [ ] 기능설명서용: 활용 TourAPI 목록을 11개 → 12개로 갱신 (`docs/2026-06-29-실행계획-마스터.md` §6 체크리스트)
