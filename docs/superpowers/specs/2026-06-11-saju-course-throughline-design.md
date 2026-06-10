# 사주 코스 관통 (Saju Course Through-line) 설계 (Spec)

> **작성일**: 2026-06-11
> **트랙**: 트랙 A(운세) 확장 — 이미 구현된 솔로 사주를 코스 end-to-end로 관통
> **점수 레버**: 기획력 25 (감정+동반자+**사주** 3축 차별화)
> **승인**: 설계 승인 (2026-06-11, 접근법 A)

---

## 1. 배경 / 현재 상태

원격(병렬 작업)에서 `lib/saju.ts` 솔로 사주 운세 엔진이 이미 구현·배포됨:
- `calcSaju(birthYear, today)` → `SajuResult { birthElement, todayElement, relation, feeling, headline, message }`
- 생년 천간 → 5행, 오늘 → 5행, 상생/상극 관계 → 6가지 feeling 도출 + headline/message
- `StepFeeling.tsx`에서만 소비: "사주로 오늘의 기운 받기" → 생년 입력 → 결과 카드 → "이 기운으로 코스 만들기"가 **feeling만** dispatch

**문제**: 사주가 Wizard 안에 갇혀 있다. `SajuResult`의 headline/message/5행은 feeling을 고르고 나면 버려진다. AI 프롬프트엔 feeling만 들어가고(`weekend-ai.ts:494`), 코스 결과·공유 링크엔 사주가 안 보인다. 즉 "내 사주 기운이 이 코스에 반영됐다"는 차별화 스토리가 끊겨 있다.

현재 흐름:
```
StepFeeling(feeling만 dispatch) → generate() POST(feeling) → /api/course
 → CourseGenerationInput{feeling} → buildUserMessage("🎭 오늘의 기분") 
 → generateCourseFortuneMessage(title, feeling) = 제너릭 운세 한 줄
 → wk_courses.insert(course_data) → 결과 페이지(course + fortuneMessage)
```

참고 — 이미 존재하는 자산:
- `CourseResponse.fortuneMessage?` (한 줄 운세, 결과에 표시 중)
- `CourseData { summary, tip, storyArc }` (AI 내러티브)
- `StepFeeling`의 `ELEMENT_META` 기반 5행 시각화 카드(재사용 대상)

---

## 2. 목표 / 비목표

### 목표 (접근법 A — "톤만 주입")
- `SajuResult`를 Wizard → AI 프롬프트 → 저장 → 결과/공유까지 **관통**
- AI 프롬프트에 사주 headline/message를 **톤 컨텍스트**로 주입 → `storyArc`/`summary`/`fortuneMessage`가 그 기운 반영
- 결과 페이지(및 공유 링크)에 "오늘의 사주 기운" 카드 표시 (5행 시각화 재사용)
- 사주 사용 시 `fortuneMessage`를 사주 메시지로 개인화 (제너릭 AI 호출 절약)

### 비목표 (YAGNI)
- **장소 선택 로직 변경 X** — 사주는 이미 feeling→스코어링으로 장소에 반영됨. AI는 톤만. (위키 가드레일: 사주가 장소 로직 압도 금지)
- 5행→취향 추가 가중치 (접근법 B) — feeling과 중복, 과설계
- Home 운세 노출 — 별도 스코프, 이번 제외
- 커플 사주 합(옵션 D) — 향후
- 생년 외 생월·생일·시 입력 (만세력) — 현 엔진 범위 유지
- `wk_courses` 스키마 변경(ALTER) — 사주는 `course_data`(JSON)에 저장

---

## 3. 설계 (접근법 A)

### 3.1 데이터 흐름

```
StepFeeling: "이 기운으로 코스 만들기"
   → dispatch SET_FEELING + SET_SAJU (SajuResult 전체)
   ↓ WizardState.saju
handleNext → generate({ ..., saju })
   ↓ POST /api/course body.saju
route: req.saju → CourseGenerationInput.saju
   ↓
buildUserMessage: saju 있으면 "☯️ 오늘의 사주 기운: {headline} — {message}
  이 기운의 정서를 코스 내러티브(storyArc/summary) 톤에 자연스럽게 반영하세요" 주입
generateCourseFortuneMessage: saju 있으면 saju.message 사용(AI 호출 skip)
course_data.saju = CourseSaju (저장)
   ↓
결과 페이지: course.saju 있으면 "오늘의 사주 기운" 카드 렌더
```

### 3.2 타입 (레이어링 — `saju.ts` 미변경)

`lib/saju.ts`는 방금 병합된 병렬 작업이므로 **건드리지 않는다**(머지 충돌 위험 최소화). 대신 `weekend-types.ts`에 직렬화/저장용 구조체를 정의:

```ts
// weekend-types.ts — 저장·표시용 사주 컨텍스트 (saju.ts SajuResult가 구조적으로 할당 가능)
export interface CourseSaju {
  birthElement: string;   // 'wood'|'fire'|'earth'|'metal'|'water' (저장 시 string)
  todayElement: string;
  relation: string;       // 'same'|'generates'|'generated'|'controls'|'controlled'
  headline: string;
  message: string;
}
```
`CourseData`에 `saju?: CourseSaju` 추가. `SajuResult`(saju.ts)는 이 필드들을 모두 가지므로 별도 매핑 없이 할당 가능(구조적 타이핑). 결과 카드는 `ELEMENT_META`를 `saju.ts`에서 import하고 `birthElement`를 `Element5`로 캐스팅해 조회.

### 3.3 변경 단위

| 파일 | 변경 |
|---|---|
| `lib/weekend-types.ts` | `CourseSaju` 인터페이스 추가. `CourseData`에 `saju?: CourseSaju` |
| `lib/saju.ts` | **변경 없음** |
| `app/components/course/wizard/WizardShell.tsx` | `WizardState.saju: SajuResult \| null` + `INITIAL`. `SET_SAJU` 액션. 수동 feeling 선택 시 saju=null(StepFeeling에서 처리). `handleNext` generate에 `saju: state.saju ?? undefined` |
| `app/components/course/wizard/steps/StepFeeling.tsx` | `handleApplySaju`에서 `SET_FEELING` + `SET_SAJU` 둘 다 dispatch. 일반 기분 버튼 클릭 시 `SET_SAJU(null)` |
| `lib/use-course-generation.ts` | `GenerateParams.saju?: SajuResult`, POST body에 `saju` |
| `app/api/course/route.ts` | 요청 파싱에 `saju` 추가 → `input.saju`. `fortuneMessage`: saju 있으면 `saju.message`. 저장 전 `course.saju = req.saju`(있을 때) |
| `lib/weekend-ai.ts` | `CourseGenerationInput.saju?: SajuResult`. `buildUserMessage`에 톤 주입 1블록 |
| `app/components/course/result/CourseResultShell.tsx` (및 필요 시 `CourseSummary.tsx`) | `course.saju` 있을 때 "오늘의 사주 기운" 카드 렌더. `ELEMENT_META` 재사용 |

> 구현 계획 단계에서 `CourseResultShell`/`CourseSummary`의 정확한 삽입 위치와 공유 경로(`course/[slug]`가 `course_data`를 그대로 넘기는지)를 확인한다.

### 3.4 AI 프롬프트 주입 (buildUserMessage)

`feeling` 라인 뒤에, saju 있을 때만:
```
- ☯️ 오늘의 사주 기운: {saju.headline} — {saju.message}
  → 위 기운의 정서를 코스 내러티브(storyArc·summary)의 톤에 자연스럽게 녹이되,
    장소 선택은 위 조건(취향·동반자·기분)에 따르세요.
```
장소 후보·선택 규칙은 불변. 톤 지시만 추가.

---

## 4. 하위호환 / 에러 처리

- 사주 관련 필드는 **전부 optional**. 사주 미사용 시: `WizardState.saju=null` → POST에 saju 없음 → 프롬프트·fortuneMessage·저장 모두 **현 동작 그대로**.
- 기존 저장 코스(`course_data`에 `saju` 없음): 결과 카드는 `course.saju` 없으면 렌더 안 함 → 깨지지 않음.
- `calcSaju`/saju 값 자체는 클라이언트에서 이미 계산됨(서버 재계산 불필요). 서버는 받은 값을 신뢰해 톤·저장에만 사용(장소·정합성 로직과 무관하므로 위험 낮음).

---

## 5. 검증 기준

테스트 러너 없음 → `npx tsc --noEmit` + `npm run build` + 수동:
- [ ] 사주 입력→"이 기운으로 코스 만들기"→코스 생성 시 결과에 "오늘의 사주 기운" 카드 표시(birth↔today 5행 + headline + message)
- [ ] `storyArc`/`summary` 톤이 사주 기운을 반영(주관 확인 — 동일 조건 사주 유/무 A/B 비교 1회)
- [ ] `fortuneMessage`가 사주 사용 시 `saju.message`로 표시
- [ ] 공유 링크(`/course/[slug]`)에서도 사주 카드 표시
- [ ] 사주 **미사용** 경로(일반 기분 선택): 코스·운세·저장 동작 변화 없음
- [ ] 기존 저장 코스 열람 시 깨짐 없음
- [ ] `tsc`/`build` 통과

---

## 6. 위험 / 가드레일

- **장소 로직 침범 금지**: 사주는 톤·표시·feeling경유 스코어링까지만. 후보 선택·검증 로직 불변.
- **`saju.ts` 미변경**: 병렬 작업 파일이므로 import/로직 손대지 않음 → 향후 머지 충돌 회피.
- **AI 호출 비용**: 사주 사용 시 `generateCourseFortuneMessage` AI 호출을 saju.message로 대체 → 호출 1건 절약(악화 아님).
- **공유 데이터 일관성**: 사주는 `course_data`에 저장돼 공유 링크에서 동일하게 노출. 결정적(클라 계산 시점 고정).
