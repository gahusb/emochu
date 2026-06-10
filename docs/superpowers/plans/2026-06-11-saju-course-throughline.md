# 사주 코스 관통 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wizard에서 계산된 `SajuResult`를 코스 생성 AI 프롬프트(톤)·`fortuneMessage`·저장·결과/공유 화면까지 end-to-end로 관통시켜, "내 사주 기운이 이 코스에 반영됐다"는 차별화를 완성한다.

**Architecture:** 접근법 A(톤만 주입) — 장소 선택 로직 불변. `saju.ts`는 미변경(병렬 작업 보호). `weekend-types.ts`에 직렬화용 `CourseSaju`를 두고 `SajuResult`를 구조적으로 할당. 사주는 `wk_courses.course_data`(JSON)에 저장(스키마 변경 없음). 모든 사주 필드 optional → 미사용/기존 코스 하위호환.

**Tech Stack:** Next.js 16(App Router), React 19, TypeScript, Gemini, Supabase.

> **테스트 인프라 주의:** 이 프로젝트엔 테스트 러너가 없다(scripts = dev/build/start/lint, lint는 eslint.config 부재로 깨져 있음). 신규 테스트 프레임워크 도입은 YAGNI·패턴 위반이므로 금지. 검증 게이트는 각 Task마다 **`npx tsc --noEmit` + `npm run build`** + 마지막 Task의 수동 end-to-end 확인. 모든 명령은 Windows PowerShell 기준 한 줄로(`cd "C:\Users\jaeoh\Desktop\workspace\emochu"; <cmd>`).

> **브랜치:** 작업은 `feat/saju-course-throughline`에서 진행(이미 생성됨, spec 커밋 `6c10558` 존재). main 머지/배포는 전체 완료 후 별도 결정.

---

## File Structure

| 파일 | 책임 | 변경 |
|---|---|---|
| `lib/weekend-types.ts` | 공용 타입 | `CourseSaju` 추가, `CourseData.saju?`, `CourseRequest.saju?` |
| `lib/saju.ts` | 사주 엔진 | **변경 없음** (읽기 전용 import 대상) |
| `lib/weekend-ai.ts` | AI 코스 생성 | `CourseGenerationInput.saju?` + `buildUserMessage` 톤 주입 |
| `app/api/course/route.ts` | 코스 API | saju 검증·파싱 → input·fortuneMessage·저장 |
| `app/components/course/wizard/WizardShell.tsx` | Wizard 상태 | `WizardState.saju` + `SET_SAJU` + generate 전달 |
| `app/components/course/wizard/steps/StepFeeling.tsx` | 기분/사주 입력 | 적용 시 feeling+saju dispatch |
| `lib/use-course-generation.ts` | 코스 생성 훅 | `GenerateParams.saju` + POST body |
| `app/components/course/result/SajuCard.tsx` | 결과 사주 카드 | **신규** |
| `app/components/course/result/CourseResultShell.tsx` | 결과 뷰 | `SajuCard` 렌더 |

---

## Task 1: 타입 — CourseSaju + CourseData.saju + CourseRequest.saju

**Files:**
- Modify: `lib/weekend-types.ts`

- [ ] **Step 1: `CourseSaju` 인터페이스 추가 + `CourseData.saju` + `CourseRequest.saju`**

`lib/weekend-types.ts`에서 `CourseData` 인터페이스(현재 `storyArc?` 다음 줄, 닫는 `}` 앞)에 `saju?` 필드를 추가하고, 인터페이스 바로 위에 `CourseSaju`를 정의한다. 현재 `CourseData`:

```ts
export interface CourseData {
  title: string;
  summary: string;
  totalDistanceKm: number;
  tip: string;
  stops: CourseStop[];
  estimatedCostWon?: number;
  difficulty?: CourseDifficulty;
  storyArc?: string;
}
```

다음으로 교체:

```ts
/** 저장·표시용 사주 컨텍스트 (lib/saju.ts SajuResult가 구조적으로 할당 가능) */
export interface CourseSaju {
  birthElement: string;   // 'wood'|'fire'|'earth'|'metal'|'water'
  todayElement: string;
  relation: string;       // 'same'|'generates'|'generated'|'controls'|'controlled'
  headline: string;
  message: string;
}

export interface CourseData {
  title: string;
  summary: string;
  totalDistanceKm: number;
  tip: string;
  stops: CourseStop[];
  estimatedCostWon?: number;
  difficulty?: CourseDifficulty;
  storyArc?: string;
  saju?: CourseSaju;            // 사주 사용 시 — 코스에 관통된 오늘의 기운
}
```

- [ ] **Step 2: `CourseRequest`에 `saju?` 추가**

현재 `CourseRequest`(171행 부근):

```ts
export interface CourseRequest {
  lat: number;
  lng: number;
  duration: Duration;
  companion: Companion;
  preferences: Preference[];
  feeling?: Feeling;
  destinationType?: DestinationType;
  cityAreaCode?: number;
  mood?: MoodType;
}
```

`mood?: MoodType;` 다음 줄에 `saju?: CourseSaju;`를 추가:

```ts
  mood?: MoodType;
  saju?: CourseSaju;
}
```

- [ ] **Step 3: 타입 체크**

Run: `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npx tsc --noEmit`
Expected: 출력 없음(0 에러).

- [ ] **Step 4: Commit**

```
git add lib/weekend-types.ts
git commit -m "feat(types): CourseSaju + CourseData.saju + CourseRequest.saju (사주 관통 기반)"
```
커밋 본문 끝에:
`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 2: weekend-ai — CourseGenerationInput.saju + 프롬프트 톤 주입

**Files:**
- Modify: `lib/weekend-ai.ts`

- [ ] **Step 1: `CourseGenerationInput`에 `saju?` 추가**

현재(66행 부근):

```ts
export interface CourseGenerationInput {
  departure: { name: string; lat: number; lng: number };
  duration: Duration;
  companion: Companion;
  preferences: Preference[];
  feeling?: Feeling;
  candidates: ScoredSpot[];
  festivals: FestivalCandidate[];
  stays: StayCandidate[];
  weather: WeekendWeather;
}
```

`weather: WeekendWeather;` 다음 줄에 `saju?: CourseSaju;`를 추가하고, 파일 상단의 `weekend-types` import에 `CourseSaju`를 포함시킨다. (이 파일은 이미 `weekend-types`에서 여러 타입을 import 중 — 그 import 목록에 `CourseSaju` 추가. 예: `import type { ..., CourseSaju } from './weekend-types';`)

```ts
  weather: WeekendWeather;
  saju?: CourseSaju;
}
```

- [ ] **Step 2: `buildUserMessage`에 사주 톤 주입**

현재 494~495행:

```ts
- 취향: ${input.preferences.map(p => PREFERENCE_KOREAN[p]).join(', ')}${input.feeling ? `\n- 🎭 오늘의 기분: ${FEELING_DETAIL[input.feeling]}` : ''}
- 현재: ${month}월 (${SEASON_NAME[month]})${(input.feeling !== 'adventurous' && input.feeling !== 'excited') ? '\n⚠️ 레포츠·등산·자전거 등 체력 소모 활동은 포함하지 마세요. 관광·맛집·카페·문화 중심 코스를 설계하세요.' : ''}
```

`- 취향:` 줄의 끝(템플릿 리터럴 닫는 백틱 직후)에 사주 톤 라인을 덧붙인다. `${input.feeling ? ... : ''}` 표현식 뒤에 사주 표현식을 이어 붙이는 형태:

```ts
- 취향: ${input.preferences.map(p => PREFERENCE_KOREAN[p]).join(', ')}${input.feeling ? `\n- 🎭 오늘의 기분: ${FEELING_DETAIL[input.feeling]}` : ''}${input.saju ? `\n- ☯️ 오늘의 사주 기운: ${input.saju.headline} — ${input.saju.message}\n  → 위 기운의 정서를 코스 내러티브(storyArc·summary)의 톤에 자연스럽게 녹이되, 장소 선택 자체는 위 취향·동반자·기분 조건을 따르세요.` : ''}
- 현재: ${month}월 (${SEASON_NAME[month]})${(input.feeling !== 'adventurous' && input.feeling !== 'excited') ? '\n⚠️ 레포츠·등산·자전거 등 체력 소모 활동은 포함하지 마세요. 관광·맛집·카페·문화 중심 코스를 설계하세요.' : ''}
```

- [ ] **Step 3: 타입 체크 + 빌드**

Run: `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npx tsc --noEmit`
Expected: 0 에러.
Run: `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npm run build`
Expected: `✓ Compiled successfully`, 정적 페이지 생성 완료.

- [ ] **Step 4: Commit**

```
git add lib/weekend-ai.ts
git commit -m "feat(ai): 사주 기운을 코스 프롬프트 톤 컨텍스트로 주입 (장소 로직 불변)"
```
본문 끝에 Co-Authored-By 라인 포함.

---

## Task 3: route — saju 검증·파싱·주입·개인화·저장

**Files:**
- Modify: `app/api/course/route.ts`

- [ ] **Step 1: import에 `CourseSaju` 추가**

상단 `import type { CourseRequest, ... } from '@/lib/weekend-types';` 목록(32~42행)에 `CourseSaju`를 추가한다.

- [ ] **Step 2: `validateRequest`에 saju 파싱 추가**

현재 `validateRequest` 끝부분(132~137행):

```ts
  const feeling = b.feeling as Feeling | undefined;
  if (feeling && !VALID_FEELINGS.includes(feeling)) {
    throw new Error('기분 선택이 올바르지 않습니다.');
  }

  return { lat, lng, duration, companion, preferences, feeling, destinationType, cityAreaCode, mood };
```

다음으로 교체(사주는 톤·표시용 비핵심 데이터 → 관대하게 검증, 형식이 맞을 때만 채택):

```ts
  const feeling = b.feeling as Feeling | undefined;
  if (feeling && !VALID_FEELINGS.includes(feeling)) {
    throw new Error('기분 선택이 올바르지 않습니다.');
  }

  let saju: CourseSaju | undefined;
  const rawSaju = b.saju as Record<string, unknown> | undefined;
  if (
    rawSaju &&
    typeof rawSaju.birthElement === 'string' &&
    typeof rawSaju.todayElement === 'string' &&
    typeof rawSaju.relation === 'string' &&
    typeof rawSaju.headline === 'string' &&
    typeof rawSaju.message === 'string'
  ) {
    saju = {
      birthElement: rawSaju.birthElement,
      todayElement: rawSaju.todayElement,
      relation: rawSaju.relation,
      headline: rawSaju.headline,
      message: rawSaju.message,
    };
  }

  return { lat, lng, duration, companion, preferences, feeling, destinationType, cityAreaCode, mood, saju };
```

- [ ] **Step 3: `input`에 saju 전달**

현재 `CourseGenerationInput` 조립(524~534행)에서 `weather,` 다음에 `saju: req.saju,`를 추가:

```ts
    const input: CourseGenerationInput = {
      departure: { name: departureName, lat: req.lat, lng: req.lng },
      duration: req.duration,
      companion: req.companion,
      preferences: req.preferences,
      feeling: req.feeling,
      candidates: ranked,
      festivals,
      stays,
      weather,
      saju: req.saju,
    };
```

- [ ] **Step 4: `fortuneMessage` 개인화 + 코스에 saju 저장**

현재 579~587행:

```ts
    // 4.6. 나들이 운세 메시지 생성
    let fortuneMessage = '';
    try {
      fortuneMessage = await generateCourseFortuneMessage(
        course.title,
        req.feeling,
        undefined // weather summary if available
      );
    } catch { /* ignore */ }
```

다음으로 교체(사주 사용 시 saju.message로 대체 → AI 호출 절약·개인화. 동시에 course에 saju 부착):

```ts
    // 4.6. 나들이 운세 메시지 생성 — 사주 사용 시 사주 메시지로 개인화
    let fortuneMessage = '';
    if (req.saju) {
      fortuneMessage = req.saju.message;
      course.saju = req.saju;
      if (courseB) courseB.saju = req.saju;
    } else {
      try {
        fortuneMessage = await generateCourseFortuneMessage(
          course.title,
          req.feeling,
          undefined // weather summary if available
        );
      } catch { /* ignore */ }
    }
```

> 참고: `course.saju`/`courseB.saju`는 `wk_courses.insert`의 `course_data`/`course_b_data`(589행 이후)에 그대로 포함되어 저장된다. 별도 컬럼·마이그레이션 불필요.

- [ ] **Step 5: 타입 체크 + 빌드**

Run: `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npx tsc --noEmit`
Expected: 0 에러.
Run: `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 6: Commit**

```
git add app/api/course/route.ts
git commit -m "feat(course): saju 검증·주입·fortuneMessage 개인화·course_data 저장"
```
본문 끝에 Co-Authored-By 라인 포함.

---

## Task 4: Wizard — WizardState.saju + StepFeeling dispatch + generate 전달

**Files:**
- Modify: `app/components/course/wizard/WizardShell.tsx`
- Modify: `app/components/course/wizard/steps/StepFeeling.tsx`
- Modify: `lib/use-course-generation.ts`

- [ ] **Step 1: `WizardShell.tsx` — 상태·액션·전달 추가**

(a) 상단 import에 `SajuResult` 추가:
```ts
import type { SajuResult } from '@/lib/saju';
```

(b) `WizardState` 인터페이스(23~34행)에 `saju` 추가 — `gpsLoading: boolean;` 다음 줄:
```ts
  saju: SajuResult | null;
```

(c) `WizardAction` 유니온(36~47행)에 액션 추가 — `SET_FEELING` 줄 아래:
```ts
  | { type: 'SET_SAJU'; value: SajuResult | null }
```

(d) `INITIAL`(49~60행)에 `saju: null,` 추가 — `gpsLoading: false,` 다음 줄.

(e) `reducer`(62~85행)에 case 추가 — `case 'SET_FEELING': ...` 줄 아래:
```ts
    case 'SET_SAJU': return { ...state, saju: action.value };
```

(f) `handleNext`의 `generate({ ... })`(218~227행) 호출에 `saju` 추가 — `mood: state.selectedMood,` 다음 줄:
```ts
        saju: state.saju ?? undefined,
```

> 주의: `draft` 자동저장 payload(135~145행)에는 `saju`를 **추가하지 않는다**(transient — 사주는 오늘 날짜 기준 결정적이므로 재방문 시 재계산이 맞음). `RESTORE_DRAFT`는 기존대로 둔다.

- [ ] **Step 2: `StepFeeling.tsx` — 적용 시 feeling+saju 둘 다 dispatch, 수동 선택 시 saju 해제**

(a) `handleApplySaju`(45~49행)를 다음으로 교체:
```ts
  const handleApplySaju = () => {
    if (!sajuResult) return;
    dispatch({ type: 'SET_FEELING', value: sajuResult.feeling });
    dispatch({ type: 'SET_SAJU', value: sajuResult });
    setShowSaju(false);
  };
```

(b) 일반 기분 버튼 `onClick`(72~76행) — 수동 선택 시 사주 컨텍스트 해제:
```ts
              onClick={() => {
                dispatch({ type: 'SET_FEELING', value: opt.type as Feeling });
                dispatch({ type: 'SET_SAJU', value: null });
                setSajuResult(null);
                setShowSaju(false);
              }}
```

- [ ] **Step 3: `use-course-generation.ts` — 파라미터·POST body에 saju**

(a) 상단 import에 `SajuResult` 추가:
```ts
import type { SajuResult } from './saju';
```

(b) `GenerateParams` 인터페이스(7~17행)에 추가 — `mood?: string | null;` 다음 줄:
```ts
  saju?: SajuResult;
```

(c) POST body(50~60행)에 `saju` 추가 — `mood: params.mood,` 다음 줄:
```ts
          saju: params.saju,
```

- [ ] **Step 4: 타입 체크 + 빌드**

Run: `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npx tsc --noEmit`
Expected: 0 에러.
Run: `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```
git add app/components/course/wizard/WizardShell.tsx app/components/course/wizard/steps/StepFeeling.tsx lib/use-course-generation.ts
git commit -m "feat(wizard): SajuResult를 WizardState→generate→POST까지 전달"
```
본문 끝에 Co-Authored-By 라인 포함.

---

## Task 5: 결과 화면 — SajuCard 컴포넌트 + 렌더

**Files:**
- Create: `app/components/course/result/SajuCard.tsx`
- Modify: `app/components/course/result/CourseResultShell.tsx`

- [ ] **Step 1: `SajuCard.tsx` 신규 생성**

`saju.ts`의 `ELEMENT_META`(5행 시각화)를 재사용한다. `birthElement`/`todayElement`가 알 수 없는 값이면 렌더하지 않는다.

```tsx
'use client';

import type { CourseSaju } from '@/lib/weekend-types';
import { ELEMENT_META, type Element5 } from '@/lib/saju';
import Container from '@/app/components/ui/Container';

export default function SajuCard({ saju }: { saju: CourseSaju }) {
  const birth = ELEMENT_META[saju.birthElement as Element5];
  const today = ELEMENT_META[saju.todayElement as Element5];
  if (!birth || !today) return null;

  return (
    <Container className="pt-4">
      <div className="rounded-xl border border-brand/30 bg-surface-elevated overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-brand-soft/60 to-transparent border-b border-line flex items-center gap-3">
          <span className="text-lg" aria-hidden="true">☯️</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded-md border ${birth.color}`}>
              {birth.emoji} {birth.name}
            </span>
            <span className="text-ink-4" aria-hidden="true">↔</span>
            <span className={`text-xs font-bold px-2 py-1 rounded-md border ${today.color}`}>
              {today.emoji} 오늘 {today.name}
            </span>
          </div>
          <p className="ml-auto text-sm font-bold text-ink-1 hidden sm:block">{saju.headline}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm font-bold text-ink-1 mb-1 sm:hidden">{saju.headline}</p>
          <p className="text-sm text-ink-2 leading-relaxed break-keep">{saju.message}</p>
        </div>
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: `CourseResultShell.tsx` — SajuCard 렌더**

(a) import 추가(다른 result 컴포넌트 import 옆, 14행 부근):
```ts
import SajuCard from './SajuCard';
```

(b) `CourseResultView`의 return에서 `CourseSummary` 블록(159~171행) 직후, A/B 탭 스위처(173행) 직전에 사주 카드를 삽입한다. 사주는 변형(A/B)과 무관하게 사용자의 오늘 기운이므로 **`course.course.saju`**(원본 A)에서 읽는다:
```tsx
      {course.course.saju && <SajuCard saju={course.course.saju} />}
```

전체 맥락:
```tsx
      {courseData && (
        <CourseSummary
          course={{ /* ...기존 그대로... */ }}
        />
      )}

      {course.course.saju && <SajuCard saju={course.course.saju} />}

      {/* ─── A/B 탭 스위처 ─── */}
      {hasAB && (
```

- [ ] **Step 3: 타입 체크 + 빌드**

Run: `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npx tsc --noEmit`
Expected: 0 에러.
Run: `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```
git add app/components/course/result/SajuCard.tsx app/components/course/result/CourseResultShell.tsx
git commit -m "feat(result): 결과·공유 화면에 오늘의 사주 기운 카드 (ELEMENT_META 재사용)"
```
본문 끝에 Co-Authored-By 라인 포함.

---

## Task 6: 수동 end-to-end 검증

**Files:** (코드 변경 없음 — 발견 시 해당 Task에서 수정)

- [ ] **Step 1: dev 서버 기동**

Run: `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npm run dev`
브라우저 `http://localhost:3007`.

- [ ] **Step 2: 사주 경로 end-to-end**

`/course` Wizard → 1단계 통과 → 2단계(기분)에서 "사주로 오늘의 기운 받기" → 생년 선택 → "기운 확인하기" → "이 기운으로 코스 만들기" → 3~5단계 완료 → 코스 생성.
확인:
- 결과 페이지에 **"오늘의 사주 기운" 카드**(birth↔today 5행 + headline + message) 표시
- 한 줄 운세(`fortuneMessage`)가 사주 message로 표시
- `storyArc`/`summary` 톤이 사주 기운을 반영(주관 확인). 가능하면 동일 조건으로 일반 기분 선택 1회와 비교.

- [ ] **Step 3: 공유 링크 확인**

생성된 `/course/<slug>` URL을 **새 시크릿 탭**(sessionStorage 미사용)에서 열어 `/api/course/<slug>`(course_data) 경로로도 사주 카드가 표시되는지 확인.

- [ ] **Step 4: 사주 미사용 경로 — 회귀 없음**

새 코스에서 사주 대신 **일반 기분 버튼**만 선택 → 생성. 확인:
- 사주 카드 **표시 안 됨**
- `fortuneMessage`는 기존 제너릭 AI 운세로 정상
- 코스 생성·저장 정상

- [ ] **Step 5: 기존 저장 코스 — 깨짐 없음**

(가능 시) 사주 필드가 없는 이전 `/course/<기존slug>`를 열어 카드 미표시 + 정상 렌더 확인.

---

## 완료 기준 (Definition of Done)

- `npx tsc --noEmit` · `npm run build` 통과(전 Task)
- 사주 경로: 결과·공유 화면에 사주 카드 + 개인화 fortuneMessage + 톤 반영 확인
- 사주 미사용/기존 코스: 동작 변화 없음
- `lib/saju.ts` 미변경 확인(`git diff main -- lib/saju.ts` 비어 있음)
