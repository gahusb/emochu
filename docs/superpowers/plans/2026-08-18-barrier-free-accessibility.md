# 무장애 접근성 축 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한국관광공사 무장애 여행 정보 API(상품ID 15101897)를 이모추에 통합해, 휠체어·유아차·시각장애·어르신 동반 사용자가 실제로 갈 수 있는 코스만 추천받게 한다.

**Architecture:** `KorService2`(기존 11개)와 `KorWithService2`(무장애)는 **서로 다른 API 상품**이므로 클라이언트를 파일로 분리한다. 원시 응답 필드명은 어댑터 한 곳에 가두고 나머지 코드는 우리가 정의한 타입만 본다 — 그래야 M0에서 필드명이 무엇으로 밝혀지든 파급이 한 파일에 머문다. 접근성은 동반자와 직교하는 독립 축이며, 가중치가 아니라 하드 필터다.

**Tech Stack:** Next.js 16 App Router · TypeScript 5 · Vitest · Google Gemini · TourAPI 4.0

**Spec:** `docs/superpowers/specs/2026-08-18-barrier-free-accessibility-design.md`

## Global Constraints

- 접근성 미선택(`accessibility`가 `undefined` 또는 빈 배열) 시 **무장애 API를 호출조차 하지 않는다.** 기존 코스 생성 경로에 지연·동작 변화 0.
- "미확인"을 "접근 가능"으로 표시하지 않는다. 3-state(`true`/`false`/`undefined`)를 끝까지 유지한다.
- 인증키는 어떤 로그·응답·리포트에도 남기지 않는다. `lib/tour-api.ts`의 기존 마스킹 관례를 따른다.
- 무장애 API 실패는 **코스 생성 실패가 아니다.** 전부 "미확인"으로 degrade하고 코스는 정상 생성한다.
- 테스트 기준선은 현재 **61**(`loops/release-green/gate.mjs`의 `BASELINE`). 테스트가 늘면 같은 커밋에서 이 값을 올린다.
- 소스 수정 금지 규칙은 **Loop 세션**에만 적용된다. 이 계획의 실행 세션은 해당하지 않는다.
- 출처 표기 `출처: ⓒ한국관광공사`는 이미 전역 푸터에 있다. 무장애 데이터도 같은 출처이므로 추가 표기는 불필요하다.

---

## 🔴 선행 게이트 — 이 계획은 여기서 시작한다

**Task 1을 시작하기 전에 박재오가 직접 완료해야 하는 일:**

[data.go.kr/data/15101897](https://www.data.go.kr/data/15101897/openapi.do) → 활용신청 → **개발단계(자동승인)**.
🔴 반드시 기존 `TOUR_API_KEY`와 **같은 계정**으로 신청한다. 다른 계정이면 키가 둘로 갈라진다.

승인 확인 방법은 Task 1 Step 1에 있다.

---

## 계획의 구조 — 왜 Task 1만 코드까지 확정돼 있는가

2026-07-31 조사에서 이 API는 **단 한 번도 200을 반환하지 않았다**(전부 403). 따라서 오퍼레이션명·파라미터·응답 필드명이 **전부 미확정**이다. `data.go.kr` 문서에 있는 "휠체어 접근성·점자블록·장애인화장실·보조견"은 한글 설명이지 JSON 키가 아니다.

추측한 필드명으로 코드를 쓰면 M0 직후 전부 다시 써야 한다. 그래서:

- **Task 1(M0)**: 실호출로 사실을 확보한다. 지금 완전히 실행 가능하다.
- **Task 2 이후**: 구조·인터페이스·테스트 전략은 지금 확정한다. **원시 필드명이 필요한 단 한 곳**(Task 3의 `RAW_FIELD_MAP`)만 Task 1 산출물에서 가져온다.

이건 placeholder가 아니라 **명시된 데이터 의존성**이다. Task 1을 끝내면 그 한 곳을 채울 수 있고, 나머지 태스크는 그것과 무관하게 이미 확정돼 있다.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `lib/barrier-free-api.ts` (신규) | `KorWithService2` 호출 + 원시 응답 → `BarrierFreeInfo` 정규화. **원시 필드명을 아는 유일한 파일** |
| `lib/weekend-types.ts` (수정) | `AccessibilityNeed` 타입, `BarrierFreeInfo`, `CourseRequest.accessibility` |
| `lib/weekend-ai.ts` (수정) | 하드 필터 `filterByAccessibility` |
| `app/components/course/wizard/steps/StepAccessibility.tsx` (신규) | 선택적 위저드 스텝 |
| `app/components/FacilityBadges.tsx` (수정) | 무장애 뱃지 + "미확인" 표시 |
| `tests/barrier-free-api.test.ts` (신규) | 어댑터·degrade |
| `tests/accessibility-filter.test.ts` (신규) | 하드 필터 + **미선택 시 무영향 회귀** |

---

### Task 1: M0 — 무장애 API 실호출로 사실 확보

이 태스크의 산출물은 코드가 아니라 **문서**다. Task 3이 이 문서를 읽고 어댑터를 만든다.

**Files:**
- Modify: `docs/tour-api-barrier-free-discovery.md` (2026-07-31 판정 "중단"을 갱신)
- 사용: `scripts/probe-barrier-free.mjs` (이미 존재)

**Interfaces:**
- Consumes: 없음 (계획의 시작점)
- Produces: 확정된 **서비스ID**, **오퍼레이션명**, **파라미터 목록**, **응답 필드명 → 의미 매핑 표**, **무장애 정보가 없는 콘텐츠의 응답 형태**, **contentId 체계 동일 여부**. Task 3이 이 전부를 쓴다.

- [ ] **Step 1: 활용신청이 실제로 승인됐는지 확인한다**

```bash
set -a && . ./.env.local && set +a
node scripts/probe-barrier-free.mjs 126508
```

Expected: `KorWithService2` 행이 **403이 아닌 다른 코드**로 바뀌어 있어야 한다.

| 관찰 | 의미 | 다음 |
|---|---|---|
| 여전히 **403** | 승인이 반영되지 않음 | 여기서 멈추고 박재오에게 알린다. 재시도해도 소용없다 |
| **200** | 승인됨 | Step 2 |
| **404** | 승인은 됐으나 오퍼레이션명이 틀림 | Step 2에서 이름을 찾는다 |

- [ ] **Step 2: 오퍼레이션명을 확정한다**

`scripts/probe-barrier-free.mjs`는 이미 서비스ID 2종 × 오퍼레이션 접미사 5종을 전수 조합한다. 200을 반환하는 조합을 찾는다.

200이 하나도 없으면 `data.go.kr` 상품 페이지의 **Swagger 가이드 문서(첨부파일)** 를 내려받아 정확한 오퍼레이션명을 확인한 뒤, 그 이름을 스크립트의 후보 배열에 추가해 다시 돌린다.

- [ ] **Step 3: 응답 원문을 확보하고 키가 새지 않는지 확인한다**

```bash
node scripts/probe-barrier-free.mjs 126508  > /tmp/bf-1.txt 2>&1
node scripts/probe-barrier-free.mjs 129703  > /tmp/bf-2.txt 2>&1
node scripts/probe-barrier-free.mjs 1947036 > /tmp/bf-3.txt 2>&1
node -e "const fs=require('fs');const k=fs.readFileSync('.env.local','utf8').match(/^TOUR_API_KEY=(.*)$/m)[1].trim().replace(/^[\"']|[\"']$/g,'');let n=0;for(const f of ['/tmp/bf-1.txt','/tmp/bf-2.txt','/tmp/bf-3.txt']){const s=fs.readFileSync(f,'utf8');if(s.includes(k)||s.includes(encodeURIComponent(k)))n++;}console.log('키가 노출된 파일 수:',n)"
```

Expected: `키가 노출된 파일 수: 0`

0이 아니면 스크립트의 마스킹이 새는 것이므로 **먼저 그것부터 고친다.** 세 contentId는 서로 다른 `contentTypeId`(관광지 12 / 문화시설 14 / 음식점 39)라 타입별 필드 차이를 볼 수 있다.

- [ ] **Step 4: 필드 매핑 표를 문서에 기록한다**

`docs/tour-api-barrier-free-discovery.md`의 "판정: 중단" 섹션 위에 아래를 추가한다. **관찰한 것만 적는다 — 추측 금지**(이 문서의 기존 원칙).

```markdown
## 확정된 사실 (2026-08-__ 실호출)

- 서비스ID: (관찰값)
- 오퍼레이션명: (관찰값)
- 필수 파라미터: (관찰값)

| 원시 응답 필드 | 관찰된 값의 예 | 의미 |
|---|---|---|
| (관찰값) | (관찰값) | 휠체어 접근 |
| (관찰값) | (관찰값) | 장애인화장실 |
| (관찰값) | (관찰값) | 점자블록 |
| (관찰값) | (관찰값) | 보조견 동반 |

### 무장애 정보가 없는 콘텐츠의 응답 형태
- (빈 items / 빈 문자열 필드 / 필드 자체 없음 중 관찰된 것)

### contentId 체계가 KorService2 와 같은가
- (같다 / 다르다)
```

- [ ] **Step 5: 커밋**

```bash
git add docs/tour-api-barrier-free-discovery.md
git commit -m "docs(tourapi): 무장애 API 실호출 성공 — 오퍼레이션·필드 확정"
```

- [ ] **Step 6: 게이트 판정 — 계속할지 멈출지 결정한다**

| 관찰 결과 | 판정 |
|---|---|
| 200 + 무장애 필드 존재 + contentId 체계 동일 | ✅ Task 2로 진행 |
| 200이지만 **contentId 체계가 다름** | 🔴 **멈춘다.** 교차 대조 불가 → 설계 재작성 필요. 박재오에게 보고 |
| 끝내 403/404 | 🔴 **멈춘다.** Task 8(제출물)로 직행 |

**이 판정을 건너뛰고 Task 2를 시작하지 마라.** 스펙 8장이 명시한 중단 조건이다.

---

### Task 2: 타입 정의 — 접근성 축과 3-state 무장애 정보

Task 1의 결과와 **무관하게** 지금 확정 가능하다. 우리가 정의하는 타입이지 API가 주는 타입이 아니다.

**Files:**
- Modify: `lib/weekend-types.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `AccessibilityNeed`, `ACCESSIBILITY_LABELS`, `BarrierFreeInfo`, `CourseRequest.accessibility`, `FacilityInfo.barrierFree`. Task 3~6이 전부 이 이름을 쓴다.

- [ ] **Step 1: 타입을 추가한다**

`lib/weekend-types.ts`의 `Companion`(66행) 바로 아래에 넣는다.

```ts
// 동반자와 직교한다. "부모님과 함께인데 휠체어가 필요"는 Companion 4종으로 표현할 수 없다.
export type AccessibilityNeed = 'wheelchair' | 'stroller' | 'visual' | 'senior';

export const ACCESSIBILITY_LABELS: Record<AccessibilityNeed, string> = {
  wheelchair: '휠체어 이용',
  stroller: '유아차 동반',
  visual: '시각장애',
  senior: '어르신 동반',
};

// 3-state 다. undefined 는 "미확인"이며 절대 false 로 접지 않는다 —
// 정보가 없는 곳을 "접근 불가"로 단정하면 갈 수 있는 곳을 숨기게 되고,
// true 로 접으면 못 가는 곳을 갈 수 있다고 속이게 된다.
export interface BarrierFreeInfo {
  wheelchairAccessible?: boolean;
  accessibleRestroom?: boolean;
  brailleBlock?: boolean;
  guideDogAllowed?: boolean;
}
```

- [ ] **Step 2: `CourseRequest`에 선택적 필드를 추가한다**

`lib/weekend-types.ts:172`의 `CourseRequest` 안에 넣는다. **반드시 optional이어야** 기존 호출부가 그대로 컴파일된다.

```ts
  /** 미지정 = 접근성 조건 없음. 이때 무장애 API 를 호출하지 않는다. */
  accessibility?: AccessibilityNeed[];
```

- [ ] **Step 3: `FacilityInfo`를 확장한다**

`lib/weekend-types.ts:188`의 `FacilityInfo`에 넣는다.

```ts
  /** 무장애 정보. 조회하지 않았거나 실패하면 undefined 다. */
  barrierFree?: BarrierFreeInfo;
```

- [ ] **Step 4: 타입 검사와 기존 테스트를 돌린다**

Run: `npm run build && npm test`
Expected: 빌드 성공, 테스트 **61/61 통과**. 하나라도 깨지면 optional을 빠뜨린 것이다.

- [ ] **Step 5: 커밋**

```bash
git add lib/weekend-types.ts
git commit -m "feat(types): 접근성 축 타입 + 3-state 무장애 정보"
```

---

### Task 3: 무장애 API 클라이언트 — 원시 필드명을 가두는 어댑터

**Files:**
- Create: `lib/barrier-free-api.ts`
- Test: `tests/barrier-free-api.test.ts`

**Interfaces:**
- Consumes: Task 1의 **필드 매핑 표**, Task 2의 `BarrierFreeInfo`
- Produces: `normalizeBarrierFree(raw: Record<string, unknown>): BarrierFreeInfo` 와 `fetchBarrierFree(contentIds: string[]): Promise<Map<string, BarrierFreeInfo>>`. Task 4가 후자를 호출한다. 실패한 contentId는 Map에 **키가 없다** — 부재로 "미확인"을 표현해 "조회 성공했으나 정보 없음"(빈 객체)과 구분한다.

> 🔴 **Task 1 Step 4의 매핑 표를 먼저 펼쳐놓고 시작한다.** 아래 `RAW_FIELD_MAP`과 `BASE_URL`, 오퍼레이션명은 그 표를 그대로 옮기는 자리다. 표가 비어 있으면 Task 1이 끝나지 않은 것이다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// tests/barrier-free-api.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizeBarrierFree } from '@/lib/barrier-free-api';

describe('normalizeBarrierFree', () => {
  it('빈 문자열은 "정보 없음"이지 "접근 불가"가 아니다', () => {
    const result = normalizeBarrierFree({ wheelchair: '' });
    expect(result.wheelchairAccessible).toBeUndefined();
  });

  it('값이 있으면 true 로 읽는다', () => {
    const result = normalizeBarrierFree({ wheelchair: '경사로 있음' });
    expect(result.wheelchairAccessible).toBe(true);
  });

  it('키가 아예 없으면 undefined 다', () => {
    const result = normalizeBarrierFree({});
    expect(result.wheelchairAccessible).toBeUndefined();
  });
});
```

> 테스트의 원시 키 `wheelchair`는 Task 1 매핑 표의 실제 값으로 교체한다. 표의 값이 다르면 이 테스트도 함께 고친다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run tests/barrier-free-api.test.ts`
Expected: FAIL — `Cannot find module '@/lib/barrier-free-api'`

- [ ] **Step 3: 어댑터를 구현한다**

```ts
// lib/barrier-free-api.ts
import type { BarrierFreeInfo } from './weekend-types';

// Task 1 Step 4 로 확정한 값으로 교체한다
const BASE_URL = 'https://apis.data.go.kr/B551011/KorWithService2';
const OPERATION = 'detailWithTour2';
const TIMEOUT_MS = 8_000; // lib/weekend-ai.ts 의 enrich 가드와 같은 값

// 🔴 원시 필드명을 아는 유일한 지점이다. Task 1 매핑 표를 그대로 옮긴다.
const RAW_FIELD_MAP: Record<keyof BarrierFreeInfo, string> = {
  wheelchairAccessible: 'wheelchair',
  accessibleRestroom: 'restroom',
  brailleBlock: 'braileblock',
  guideDogAllowed: 'helpdog',
};

/** TourAPI 는 "없음"을 빈 문자열로 준다. 빈 문자열과 미조회를 모두 undefined 로 접는다. */
function readFlag(raw: Record<string, unknown>, key: string): boolean | undefined {
  if (!(key in raw)) return undefined;
  const v = raw[key];
  if (typeof v !== 'string' || v.trim() === '') return undefined;
  return true;
}

export function normalizeBarrierFree(raw: Record<string, unknown>): BarrierFreeInfo {
  const out: BarrierFreeInfo = {};
  for (const key of Object.keys(RAW_FIELD_MAP) as (keyof BarrierFreeInfo)[]) {
    const flag = readFlag(raw, RAW_FIELD_MAP[key]);
    if (flag !== undefined) out[key] = flag;
  }
  return out;
}
```

- [ ] **Step 4: 테스트를 통과시킨다**

Run: `npx vitest run tests/barrier-free-api.test.ts`
Expected: PASS 3/3

- [ ] **Step 5: degrade 테스트를 추가한다**

```ts
// tests/barrier-free-api.test.ts 에 추가
import { fetchBarrierFree } from '@/lib/barrier-free-api';

afterEach(() => vi.restoreAllMocks());

it('403 이면 던지지 않고 빈 Map 을 준다 (코스 생성을 막지 않는다)', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 403, ok: false }));
  const result = await fetchBarrierFree(['126508']);
  expect(result.size).toBe(0);
});

it('타임아웃이면 빈 Map 을 준다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
    Object.assign(new Error('aborted'), { name: 'AbortError' }),
  ));
  const result = await fetchBarrierFree(['126508']);
  expect(result.size).toBe(0);
});

it('빈 배열이면 fetch 를 호출조차 하지 않는다', async () => {
  const spy = vi.fn();
  vi.stubGlobal('fetch', spy);
  const result = await fetchBarrierFree([]);
  expect(spy).not.toHaveBeenCalled();
  expect(result.size).toBe(0);
});
```

- [ ] **Step 6: `fetchBarrierFree`를 구현한다**

```ts
// lib/barrier-free-api.ts 에 추가
function getServiceKey(): string {
  const key = process.env.TOUR_API_KEY;
  if (!key) throw new Error('TOUR_API_KEY 미설정');
  return key;
}

export async function fetchBarrierFree(
  contentIds: string[],
): Promise<Map<string, BarrierFreeInfo>> {
  const out = new Map<string, BarrierFreeInfo>();
  if (contentIds.length === 0) return out; // 호출조차 하지 않는다

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const settled = await Promise.allSettled(
      contentIds.map(async (id) => {
        const url = new URL(`${BASE_URL}/${OPERATION}`);
        url.searchParams.set('serviceKey', getServiceKey());
        url.searchParams.set('contentId', id);
        url.searchParams.set('MobileOS', 'ETC');
        url.searchParams.set('MobileApp', 'emochu');
        url.searchParams.set('_type', 'json');
        const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
        if (res.status !== 200) return null; // 403/429 등 — 던지지 않는다
        const json = await res.json();
        const item = json?.response?.body?.items?.item;
        const raw = Array.isArray(item) ? item[0] : item;
        return raw ? ([id, normalizeBarrierFree(raw)] as const) : null;
      }),
    );
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value) out.set(s.value[0], s.value[1]);
    }
  } catch {
    // 전체 실패도 빈 Map — 무장애는 부가 데이터이지 코스 생성의 전제가 아니다
  } finally {
    clearTimeout(timer);
  }
  return out;
}
```

- [ ] **Step 7: 전체 테스트 + 커밋**

Run: `npm test`
Expected: **67/67** (기존 61 + 신규 6)

```bash
git add lib/barrier-free-api.ts tests/barrier-free-api.test.ts
git commit -m "feat(api): 무장애 여행 정보 클라이언트 — 원시 필드명을 어댑터에 격리"
```

---

### Task 4: 하드 필터 + 미선택 시 무영향 회귀

**Files:**
- Modify: `lib/weekend-ai.ts`, `loops/release-green/gate.mjs`
- Test: `tests/accessibility-filter.test.ts`

**Interfaces:**
- Consumes: Task 2의 `AccessibilityNeed`·`BarrierFreeInfo`, Task 3의 `fetchBarrierFree`
- Produces:
  - `filterByAccessibility<T extends { contentId: string }>(spots: T[], needs: AccessibilityNeed[] | undefined, info: Map<string, BarrierFreeInfo>): T[]` — Task 5·6의 UI가 이 결과를 렌더한다.
  - `buildAccessibilityPrompt(needs: AccessibilityNeed[] | undefined): string` — Gemini 프롬프트 조각. 미선택 시 빈 문자열.

- [ ] **Step 1: 회귀 테스트를 먼저 쓴다 — 이게 가장 중요하다**

```ts
// tests/accessibility-filter.test.ts
import { describe, it, expect } from 'vitest';
import { filterByAccessibility } from '@/lib/weekend-ai';
import type { BarrierFreeInfo } from '@/lib/weekend-types';

const spots = [
  { contentId: '1', title: '접근가능' },
  { contentId: '2', title: '정보없음' },
  { contentId: '3', title: '조회실패' },
];
const info = new Map<string, BarrierFreeInfo>([
  ['1', { wheelchairAccessible: true }],
  ['2', {}], // 조회는 됐으나 휠체어 정보가 없음
]);
// '3' 은 Map 에 아예 없다 = 조회 실패 = 미확인

describe('filterByAccessibility', () => {
  it('needs 가 비면 입력을 그대로 돌려준다 (기존 사용자 무영향)', () => {
    expect(filterByAccessibility(spots, [], info)).toEqual(spots);
    expect(filterByAccessibility(spots, undefined, info)).toEqual(spots);
  });

  it('확인된 접근 가능이 맨 앞에 온다', () => {
    const out = filterByAccessibility(spots, ['wheelchair'], info);
    expect(out[0].contentId).toBe('1');
  });

  it('미확인을 제외하지 않는다 (제외하면 결과 0 인 지역이 생긴다)', () => {
    const out = filterByAccessibility(spots, ['wheelchair'], info);
    const ids = out.map((s) => s.contentId);
    expect(ids).toContain('2');
    expect(ids).toContain('3');
    expect(out).toHaveLength(3);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run tests/accessibility-filter.test.ts`
Expected: FAIL — `filterByAccessibility is not a function`

- [ ] **Step 3: 필터를 구현한다**

```ts
// lib/weekend-ai.ts 에 추가
import type { AccessibilityNeed, BarrierFreeInfo } from './weekend-types';

const NEED_TO_FIELD: Record<AccessibilityNeed, keyof BarrierFreeInfo> = {
  wheelchair: 'wheelchairAccessible',
  stroller: 'wheelchairAccessible', // 유아차는 휠체어와 물리 요건이 같다(경사로·단차)
  visual: 'brailleBlock',
  senior: 'wheelchairAccessible',
};

export function filterByAccessibility<T extends { contentId: string }>(
  spots: T[],
  needs: AccessibilityNeed[] | undefined,
  info: Map<string, BarrierFreeInfo>,
): T[] {
  if (!needs || needs.length === 0) return spots; // 미선택 = 무영향

  const confirmed: T[] = [];
  const unknown: T[] = [];
  for (const spot of spots) {
    const bf = info.get(spot.contentId);
    if (bf === undefined) {
      unknown.push(spot); // 조회 실패 = 미확인
      continue;
    }
    const ok = needs.every((n) => bf[NEED_TO_FIELD[n]] === true);
    if (ok) confirmed.push(spot);
    else unknown.push(spot); // 정보가 없을 뿐 "불가"로 단정하지 않는다
  }
  return [...confirmed, ...unknown];
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/accessibility-filter.test.ts`
Expected: PASS 3/3

- [ ] **Step 5: Gemini 프롬프트에 접근성 제약을 넣는다**

필터만으로는 AI가 접근성을 **인지하지 못한다.** 후보는 걸러지지만 코스 설명문에는 그 사실이 드러나지 않아, 사용자가 "왜 이 코스인지"를 알 수 없다.

`lib/weekend-ai.ts`에서 Gemini에 보내는 프롬프트를 만드는 지점을 찾는다:

```bash
grep -n "동반자\|companion\|프롬프트\|prompt" lib/weekend-ai.ts | head -20
```

동반자·감정 조건이 문자열로 조립되는 곳 바로 뒤에 아래를 잇는다.

```ts
// needs 가 비면 이 블록 전체가 빈 문자열이라 프롬프트가 기존과 완전히 동일하다.
const accessibilityPrompt =
  needs && needs.length > 0
    ? `\n\n[접근성 요구 — 반드시 지킬 것]\n` +
      `이용자에게 다음 조건이 있습니다: ${needs.map((n) => ACCESSIBILITY_LABELS[n]).join(', ')}.\n` +
      `- 각 장소를 소개할 때 무장애 정보가 확인된 곳은 그 사실을 한 문장으로 밝히세요.\n` +
      `- 무장애 정보가 확인되지 않은 곳을 넣을 때는 "무장애 정보가 확인되지 않았으니 방문 전 전화 확인을 권합니다"라고 반드시 덧붙이세요.\n` +
      `- 확인되지 않은 곳을 "접근 가능"이라고 단정하지 마세요.`
    : '';
```

🔴 마지막 두 줄이 이 블록의 존재 이유다. LLM은 정보가 없을 때 그럴듯하게 지어내는 경향이 있는데, 접근성에서 그건 사용자를 헛걸음시킨다.

- [ ] **Step 6: 프롬프트 회귀를 테스트한다**

```ts
// tests/accessibility-filter.test.ts 에 추가
import { buildAccessibilityPrompt } from '@/lib/weekend-ai';

describe('buildAccessibilityPrompt', () => {
  it('미선택이면 빈 문자열이다 (프롬프트가 기존과 완전히 동일해야 한다)', () => {
    expect(buildAccessibilityPrompt(undefined)).toBe('');
    expect(buildAccessibilityPrompt([])).toBe('');
  });

  it('선택하면 미확인 장소에 대한 경고 지시가 들어간다', () => {
    const out = buildAccessibilityPrompt(['wheelchair']);
    expect(out).toContain('휠체어 이용');
    expect(out).toContain('단정하지 마세요');
  });
});
```

위 인라인 상수를 `export function buildAccessibilityPrompt(needs: AccessibilityNeed[] | undefined): string`로 빼내 테스트 가능하게 만든다.

Run: `npx vitest run tests/accessibility-filter.test.ts`
Expected: PASS 5/5

- [ ] **Step 7: 기준선을 올린다**

```bash
npm test   # 실제 총 개수를 확인한다
```

`loops/release-green/gate.mjs`의 `const BASELINE = 61;`을 방금 확인한 총 개수로 바꾼다. 이걸 빼먹으면 회귀 감시가 헐거워진다(테스트가 줄어도 GREEN이 나온다).

- [ ] **Step 8: 게이트로 검증하고 커밋한다**

Run: `node loops/release-green/gate.mjs`
Expected: `GREEN`, exit 0

```bash
git add lib/weekend-ai.ts tests/accessibility-filter.test.ts loops/release-green/gate.mjs
git commit -m "feat(ai): 접근성 하드 필터 + Gemini 제약 — 미확인을 지어내지 않게"
```

---

### Task 5: 위저드 스텝

**Files:**
- Create: `app/components/course/wizard/steps/StepAccessibility.tsx`
- Modify: `app/components/course/wizard/WizardShell.tsx`, `lib/use-course-generation.ts`

**Interfaces:**
- Consumes: Task 2의 `AccessibilityNeed`, `ACCESSIBILITY_LABELS`
- Produces: `CourseRequest.accessibility`를 채워 `/api/course`로 보낸다.

- [ ] **Step 1: 기존 스텝의 구조를 읽는다**

```bash
sed -n '1,60p' app/components/course/wizard/steps/StepCompanion.tsx
```

`StepCompanion`은 단일 선택이고 이 스텝은 **다중 선택 + 건너뛰기 가능**이다. 마크업·색 토큰·간격은 그대로 따른다.

- [ ] **Step 2: 스텝을 만든다**

```tsx
'use client';
import type { AccessibilityNeed } from '@/lib/weekend-types';
import { ACCESSIBILITY_LABELS } from '@/lib/weekend-types';

const NEEDS: AccessibilityNeed[] = ['wheelchair', 'stroller', 'visual', 'senior'];

export default function StepAccessibility({
  value,
  onChange,
}: {
  value: AccessibilityNeed[];
  onChange: (v: AccessibilityNeed[]) => void;
}) {
  const toggle = (n: AccessibilityNeed) =>
    onChange(value.includes(n) ? value.filter((x) => x !== n) : [...value, n]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-3 break-keep">
        해당되는 항목이 있다면 선택해 주세요. 선택하지 않으셔도 됩니다.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {NEEDS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value.includes(n)}
            onClick={() => toggle(n)}
            className={`rounded-2xl border p-4 text-sm font-semibold transition-colors ${
              value.includes(n)
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-line text-ink-2'
            }`}
          >
            {ACCESSIBILITY_LABELS[n]}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 위저드에 연결한다**

`WizardShell.tsx`의 스텝 배열에 추가하고, `use-course-generation.ts`에서 `accessibility`를 요청 바디에 싣는다. **빈 배열이면 필드를 아예 넣지 않는다**(Global Constraints의 "호출조차 하지 않는다"를 지키려면 서버가 `undefined`를 받아야 한다).

- [ ] **Step 4: 빌드·린트**

Run: `npm run build && npm run lint`
Expected: 에러 0

- [ ] **Step 5: 커밋**

```bash
git add app/components/course/wizard/ lib/use-course-generation.ts
git commit -m "feat(wizard): 접근성 선택 스텝 — 선택 사항, 다중 선택"
```

---

### Task 6: 뱃지 UI — "미확인"을 정직하게 보여준다

**Files:**
- Modify: `app/components/FacilityBadges.tsx`

**Interfaces:**
- Consumes: Task 2의 `BarrierFreeInfo`
- Produces: 없음 (표시 전용)

- [ ] **Step 1: 기존 뱃지 구조를 읽는다**

```bash
cat app/components/FacilityBadges.tsx
```

- [ ] **Step 2: 무장애 뱃지를 추가한다**

규칙 세 가지:

| 상황 | 표시 |
|---|---|
| 접근성 미선택 | **아무것도 띄우지 않는다** (기존 화면 그대로) |
| 선택 + 해당 필드 `true` | ✅ 뱃지 (예: "휠체어 접근 가능") |
| 선택 + 해당 필드 `undefined` | 회색 "무장애 정보 미확인" 뱃지 |

`false`는 이 설계에서 만들지 않는다(빈 문자열을 `undefined`로 접으므로). 혹시 들어와도 미확인과 같이 취급한다.

- [ ] **Step 3: 빌드·린트 후 커밋**

```bash
npm run build && npm run lint
git add app/components/FacilityBadges.tsx
git commit -m "feat(ui): 무장애 뱃지 + 미확인 표시"
```

---

### Task 7: 하네스·문서 연쇄 갱신

스펙 10장이 지적한, **놓치면 조용히 어긋나는** 곳들이다.

**Files:**
- Modify: `loops/submission-check/check.mjs`, `docs/2026-contest-info.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: Task 3의 `lib/barrier-free-api.ts` 존재
- Produces: 없음

- [ ] **Step 1: 무장애 API를 별도 검사 항목으로 추가한다**

`EXPECTED_APIS`(11개, KorService2)는 **건드리지 않는다.** 무장애는 별개 상품이므로 `lib/barrier-free-api.ts`의 존재와 오퍼레이션명을 확인하는 항목을 새로 만든다. 11개 집합에 섞으면 `checkApiList`의 "KorService2 11개와 일치"라는 의미가 무너진다.

- [ ] **Step 2: 제출 서류 문구를 갱신한다**

`docs/2026-contest-info.md`와 `CLAUDE.md`의 "TourAPI 활용 개수 11개"를 **"KorService2 11개 + 무장애 여행 정보 1개 상품"** 으로 바꾼다.

- [ ] **Step 3: 검사를 돌리고 커밋한다**

```bash
node loops/submission-check/check.mjs   # exit 1 정상 (미충족 항목이 남아 있음)
git add loops/submission-check/check.mjs docs/2026-contest-info.md CLAUDE.md
git commit -m "chore(harness): 무장애 API 를 별도 검사 항목으로 추가"
```

---

### Task 8: 제출물 완성 — 무장애와 독립, 무조건 필요

Task 1이 실패해도 **이 태스크는 실행한다.**

**Files:**
- Create: `loops/submission-check/assets/` 아래 이미지 4~6장 + 기능설명서 PDF
- Modify: `loops/submission-check/submission.json` (manual 4종의 `done`)

**Interfaces:**
- Consumes: 없음 (독립)
- Produces: `submission-check` 9/9

- [ ] **Step 1: 지정 양식을 확보한다 (박재오)**

한국관광콘텐츠랩(api.visitkorea.or.kr)에서 기능설명서 양식을 내려받는다.
🔴 **임의 양식은 심사에서 제외된다.**

- [ ] **Step 2: 이미지를 준비한다**

대표 1장 + 상세 3~5장 = **총 4~6장**(`checkImages`가 이 범위를 검사한다). 라이브(`emochu.vercel.app`)에서 캡처한다: 홈 · 위저드 · 코스 결과 · 지도 · **접근성 스텝**(Task 5 완료 시).

- [ ] **Step 3: 자산 검사를 확인한다**

Run: `node loops/submission-check/check.mjs`
Expected: `spec-doc` ✅, `images` ✅

- [ ] **Step 4: manual 4종을 처리한다 (박재오)**

접수 사이트에서 팀 정보·서비스 정보·테스트 계정·인증키를 제출한 뒤 `submission.json`에서 `done: true`로 바꾼다.
🔴 **실제 인증키 값을 `submission.json`에 적지 않는다** — git 추적 대상이다. 제출 완료 표시만 한다.

- [ ] **Step 5: 9/9를 확인한다**

Run: `node loops/submission-check/check.mjs`
Expected: `9/9 충족`, **exit 0**

---

## 실행 순서

```
[박재오] 활용신청 ──→ Task 1 (M0 게이트)
                        │
              ┌─────────┴─────────┐
         ✅ 성공                🔴 실패
              │                    │
      Task 2→3→4→5→6→7            │
              │                    │
              └────────┬───────────┘
                       ↓
                 Task 8 (제출물 — 무조건)
```

Task 8은 Task 1의 성패와 무관하게 **2026-09-21 16:00까지 반드시** 끝나야 한다.
