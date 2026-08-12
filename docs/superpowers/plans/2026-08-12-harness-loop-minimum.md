# 하네스·루프 최소본 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 9/21 1차 심사자료 접수 전까지 실제로 값을 내는 하네스 3종(lint hook · `release-green` Loop · `submission-check` Loop)만 깔아, 배포 그린 상태와 제출물 준비 상태가 **매번 사람 기억이 아니라 파일로 확인**되게 한다.

**Architecture:** 이미 깔린 `tourapi-watch`와 같은 형태를 따른다 — **검사는 결정적 스크립트가 단일 경유점**으로 수행하고(`gate.mjs`·`check.mjs`), 에이전트는 판정·기록만 한다. 각 Loop는 `TASK.md`(목표·금지) · `LOOP_INSTRUCTIONS.md`(절차·판정·실패정책) · `PROGRESS.md`(기억) · `outputs/`(결과물) 4파일 구조를 재사용한다. Hook은 `.claude/settings.json`에 등록해 파일이 수정될 때마다 lint를 **조용히 통과시키거나 크게 실패**시킨다.

**Tech Stack:** Node.js 24 (ESM, `node --test` 아님 — 검증은 스크립트 exit code) · Next.js 16 · Vitest 4 · ESLint 9 (`eslint.config.mjs`) · Claude Code hooks/skills/agents

## Global Constraints

이 계획의 **모든 태스크**에 적용된다.

- **소스 코드 로직을 바꾸지 않는다.** `app/`·`lib/`·`components/`는 **읽기만** 한다. 이 계획은 하네스만 깐다. (예외: Task 3에서 발견되는 출처 표기 누락은 **고치지 않고 리포트만** 한다 — 수정은 사람이 별도로)
- **새 npm 의존성을 추가하지 않는다.** prettier·husky·lint-staged 전부 금지. 마감 전에 의존성을 늘리는 것은 리스크다. 이미 있는 `eslint`·`vitest`·`next`만 쓴다.
- **권한 사다리 1~2단계**를 넘지 않는다. 읽기·검사·리포트까지만. `git commit`/`push`/배포는 Loop가 하지 않는다.
- 🔴 **인증키·비밀값을 어떤 출력에도 남기지 않는다.** `.claude/settings.json`의 `Read(./.env.local)` deny를 **유지**한다. 스크립트가 값을 읽으면 반드시 마스킹한다.
- **기존 검증 통과 유지**: `npm test` **61개 전부 통과** · `npm run lint` 0 errors · `npm run build` exit 0.
- **새로 만드는 Gate는 반드시 red-green으로 확인한다.** 오류를 주입해 **exit 1**이 나오는 것을 눈으로 본 뒤에야 통과로 친다. *늘 통과하는 검증은 장식이다.*
- **호출·검사는 스크립트가 단일 경유점**이다. 에이전트가 직접 `fetch`나 검사 로직을 만들지 않는다.
- 커밋 메시지는 기존 컨벤션 `feat(scope): 한국어 설명` / `chore(scope): …`.
- 스크립트는 **ESM**(`.mjs`)으로 쓰고 `node <path>`로 직접 실행 가능해야 한다.

---

## 착수 시점 현황 (2026-08-12 실측)

### 이미 있는 것

```
.claude/settings.json                     # allow/deny 있음, hooks 없음
.claude/agents/verifier.md                # haiku, JSON 판정만
.claude/skills/tourapi-watch/SKILL.md
loops/tourapi-watch/{TASK,LOOP_INSTRUCTIONS,PROGRESS}.md + smoke.mjs + outputs/
```

`tourapi-watch`는 도입 5단계 중 **1~4 완료, 5단계(스케줄) 대기** 상태다. 이 계획은 그 옆에 Loop 둘을 더 세운다.

### 하네스 7조각 현황

| 조각 | 상태 | 이 계획에서 |
|---|---|---|
| `CLAUDE.md` | ✅ 155줄 | 유지 (Task 3에서 3줄 추가) |
| `settings.json` | ✅ allow/deny | **Task 1에서 hooks 추가** |
| `hooks/` | ❌ 없음 | **Task 1** |
| `agents/` | ✅ verifier | 재사용 |
| `skills/` | ✅ tourapi-watch | Task 2·3에서 각 1개 추가 |
| `.mcp.json` | ❌ | **이 계획 범위 밖** (필요 없음) |
| `MEMORY.md` | ❌ | **이 계획 범위 밖** (옵시디언 위키가 대신함) |

### 🔴 Task 3이 즉시 잡아낼 실제 결함

`grep -rn "출처\|ⓒ" app components` → **0건**.

공모전 규정은 출처 표기를 **필수**로 요구한다(`출처: ⓒ한국관광공사` 또는 `ⓒ한국관광콘텐츠랩`, 로고 불가·텍스트만). 현재 UI에는 `HomeView.tsx:154`의 *"한국관광공사 TourAPI와 AI를 활용해"*라는 **본문 설명문**만 있고 **정식 출처 표기가 없다.**

> ⚠️ **그래서 `submission-check`는 첫 실행에서 반드시 FAIL한다. 그게 정상이고, 이 Loop가 쓸모 있다는 증거다.** 표기 추가는 **사람이 별도로** 한다(이 계획 범위 밖 — Global Constraints의 "소스 로직 불변" 원칙).

---

## File Structure

| 파일 | 역할 | 태스크 |
|---|---|---|
| `.claude/settings.json` | hooks 등록 (수정) | 1 |
| `.claude/hooks/lint-changed.mjs` | 변경 파일 lint — 통과 시 침묵, 실패 시 크게 | 1 |
| `loops/release-green/gate.mjs` | test·lint·build 실행 → 리포트 + exit code | 2 |
| `loops/release-green/{TASK,LOOP_INSTRUCTIONS,PROGRESS}.md` | Loop Contract | 2 |
| `.claude/skills/release-green/SKILL.md` | 판정 기준·금지 | 2 |
| `loops/submission-check/submission.json` | **제출 항목 단일 소스**(손 편집) | 3 |
| `loops/submission-check/check.mjs` | 기계 검사 + 사람 항목 집계 | 3 |
| `loops/submission-check/{TASK,LOOP_INSTRUCTIONS,PROGRESS}.md` | Loop Contract | 3 |
| `.claude/skills/submission-check/SKILL.md` | 판정 기준·금지 | 3 |
| `CLAUDE.md` | Loop 3종 포인터로 갱신 | 3 |

---

### Task 1: 파일 수정 시 lint 자동 점검 Hook

**Files:**
- Create: `.claude/hooks/lint-changed.mjs`
- Modify: `.claude/settings.json` (hooks 블록 추가)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: 없음. 이후 태스크는 이 Hook의 존재에 의존하지 않는다.

- [ ] **Step 1: 현재 settings.json 확인**

Run: `cat .claude/settings.json`

`permissions.allow`/`deny`만 있고 `hooks` 키가 없는 것을 확인한다. 있다면 덮어쓰지 말고 병합한다.

- [ ] **Step 2: Hook 스크립트 작성**

Create `.claude/hooks/lint-changed.mjs`:

> 🔴 **2026-08-12 정정 — 이 계획서의 초판 코드가 틀렸었다.** `process.env.CLAUDE_FILE_PATH`를 읽게 써놨으나 **그런 환경변수는 존재하지 않는다.** PostToolUse 훅은 **stdin으로 JSON**을 받고 경로는 `tool_input.file_path`에 있다(공식 문서 *"For command hooks, input arrives on stdin."*). 초판대로 두면 첫 가드에서 항상 빠져나가 **영구 무동작**이 된다. 아래가 수정본이다.

```javascript
#!/usr/bin/env node
// PostToolUse(Edit|Write) 훅 — 방금 수정된 파일만 lint 한다.
// 좋은 Hook은 성공할 때 조용하고, 실패할 때만 크게 말한다.
// 입력은 stdin JSON: { tool_input: { file_path } }  ← 환경변수가 아니다
// 에러에만 발화한다(경고는 통과) — `npm run lint` 와 같은 기준
// 🔴 --fix 를 쓰지 않는다: 마감 전에 코드를 자동 변형시키지 않는다. 보고만 한다.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// stdin 을 끝까지 읽는다. 비었거나 JSON 이 아니면 조용히 통과한다.
function readFilePathFromStdin() {
  let raw;
  try {
    raw = readFileSync(0, 'utf8');        // fd 0 = stdin. 훅은 파이프로 받으므로 즉시 EOF
  } catch {
    return undefined;
  }
  if (!raw || !raw.trim()) return undefined;
  try {
    return JSON.parse(raw)?.tool_input?.file_path;
  } catch {
    return undefined;                      // 예기치 못한 입력에 죽지 않는다
  }
}

const file = readFilePathFromStdin();

// 대상이 아니면 조용히 통과
if (!file || !existsSync(file)) process.exit(0);
if (!/\.(ts|tsx|mjs|js|jsx)$/.test(file)) process.exit(0);
if (/[\\/](node_modules|\.next|loops[\\/][^\\/]+[\\/]outputs)[\\/]/.test(file)) process.exit(0);

const res = spawnSync('npx', ['eslint', file], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

if (res.status === 0) process.exit(0);   // 조용히

// 크게 말한다
console.error(`[lint-changed] ${file} 에 lint 문제가 있습니다.`);
console.error((res.stdout || '').trim());
if (res.stderr) console.error(res.stderr.trim());
process.exit(2);   // PostToolUse: exit 2 → stderr 가 에이전트에게 전달된다
```

> ⚠️ **`--max-warnings 0`을 쓰지 않는다** (2026-08-12 결정). 이 저장소엔 **기존 경고 12건 / 7파일**이 있고 `npm run lint`는 그걸 허용해 exit 0이며, `eslint.config.mjs`가 `react-hooks/set-state-in-effect`를 *"Next SSR 환경에서 관용적 패턴"*이라며 **의도적으로 warn으로 낮춰** 뒀다. 훅이 그 결정을 뒤엎으면 **매 편집마다 발화**해 *"성공할 때 조용하다"*를 깨뜨린다.

- [ ] **Step 3: Hook을 settings.json에 등록**

Modify `.claude/settings.json` — 기존 `permissions`는 그대로 두고 `hooks` 키를 **추가**한다:

```json
{
  "permissions": {
    "allow": [
      "Read(*)",
      "Glob(*)",
      "Grep(*)",
      "Bash(node loops/tourapi-watch/smoke.mjs)",
      "Bash(node loops/release-green/gate.mjs)",
      "Bash(node loops/submission-check/check.mjs)",
      "Bash(npm test:*)",
      "Bash(npm run lint:*)",
      "Bash(npm run build:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)"
    ],
    "deny": [
      "Read(./.env.local)",
      "Read(./.env)",
      "Bash(rm -rf:*)",
      "Bash(git push:*)",
      "Bash(git commit:*)",
      "Bash(npx vercel:*)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "node .claude/hooks/lint-changed.mjs" }
        ]
      }
    ]
  }
}
```

> `allow`에 Task 2·3의 스크립트 경로를 미리 넣어둔다. 나중에 권한 때문에 막히는 일을 없앤다.

- [ ] **Step 4: 🔴 red 확인 — Hook이 실제로 발화하는가**

**실제 훅과 같은 방식(stdin JSON)으로** 돌린다. 환경변수로 테스트하면 실사용 경로를 검증하지 못한다.

```bash
printf 'export const broken = ;\n' > loops/_hooktest.mjs
echo '{"hook_event_name":"PostToolUse","tool_name":"Write","tool_input":{"file_path":"loops/_hooktest.mjs"}}' \
  | node .claude/hooks/lint-changed.mjs; echo "exit=$?"
rm -f loops/_hooktest.mjs
```

Expected: **exit=2** + `[lint-changed] … lint 문제가 있습니다` + `Parsing error: Expression expected`

> **경고가 아니라 에러여야 발화한다.** 파스 에러는 eslint가 항상 error로 보고하므로 red 재료로 안전하다.

- [ ] **Step 5: green 확인 — 경고가 있는 파일도 통과하는가**

```bash
echo '{"hook_event_name":"PostToolUse","tool_name":"Edit","tool_input":{"file_path":"loops/tourapi-watch/smoke.mjs"}}' \
  | node .claude/hooks/lint-changed.mjs; echo "exit=$?"
```

Expected: **exit=0**, 출력 없음 — `smoke.mjs:94`에 알려진 unused-`e` **경고가 있는데도** 통과해야 한다. 이게 *"경고는 통과"* 결정이 실제로 반영됐다는 증거다.

- [ ] **Step 5b: 잘못된 입력에 죽지 않는가**

```bash
echo 'not json'            | node .claude/hooks/lint-changed.mjs; echo "exit=$?"
printf ''                  | node .claude/hooks/lint-changed.mjs; echo "exit=$?"
echo '{"tool_input":{}}'   | node .claude/hooks/lint-changed.mjs; echo "exit=$?"
echo '{"tool_input":{"file_path":"CLAUDE.md"}}' | node .claude/hooks/lint-changed.mjs; echo "exit=$?"
```

Expected: **전부 exit=0, 출력 없음.** 훅이 예기치 못한 입력에 죽으면 모든 편집이 시끄러워진다.

- [ ] **Step 6: 임시 파일 정리**

```bash
rm -f loops/_hooktest.mjs
```

- [ ] **Step 7: 기존 검증 유지 확인**

Run: `npm run lint && npm test`
Expected: lint 0 errors · **61 tests passed**

- [ ] **Step 8: 커밋**

```bash
git add .claude/hooks/lint-changed.mjs .claude/settings.json
git commit -m "feat(harness): 수정 파일 lint 점검 PostToolUse 훅 — 통과 시 침묵, 실패 시 exit 2"
```

---

### Task 2: `release-green` Loop — 배포 가능 상태 감시

**Files:**
- Create: `loops/release-green/gate.mjs`
- Create: `loops/release-green/TASK.md`
- Create: `loops/release-green/LOOP_INSTRUCTIONS.md`
- Create: `loops/release-green/PROGRESS.md`
- Create: `.claude/skills/release-green/SKILL.md`

**Interfaces:**
- Consumes: `.claude/settings.json`의 `Bash(node loops/release-green/gate.mjs)` 허용 (Task 1에서 추가됨)
- Produces: `loops/release-green/outputs/green-YYYY-MM-DD.md` · exit code 0(그린)/1(레드)

- [ ] **Step 1: Gate 스크립트 작성**

Create `loops/release-green/gate.mjs`:

```javascript
#!/usr/bin/env node
// ============================================================
// release-green — 배포 가능 상태 Gate
// test / lint / build 를 순서대로 돌리고 결과를 리포트로 남긴다.
// 이 스크립트가 검사의 단일 경유점이다. 에이전트는 실행하고 판정만 한다.
// 종료 코드: 0 = 전부 통과 / 1 = 하나라도 실패
// ============================================================
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const OUT_DIR = resolve(HERE, 'outputs');

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const CHECKS = [
  { id: 'test',  label: '단위 테스트', cmd: 'npm', args: ['test'] },
  { id: 'lint',  label: 'ESLint',      cmd: 'npm', args: ['run', 'lint'] },
  { id: 'build', label: 'Next 빌드',   cmd: 'npm', args: ['run', 'build'] },
];

// 비밀값이 로그에 섞여 나올 수 있으므로 흔한 키 패턴을 지운다
const scrub = (s) =>
  String(s)
    .replace(/([A-Z_]*(?:KEY|SECRET|TOKEN|PASSWORD)[A-Z_]*\s*[=:]\s*)\S+/gi, '$1<REDACTED>')
    .replace(/serviceKey=[^&\s"']+/gi, 'serviceKey=<REDACTED>');

const rows = [];
for (const c of CHECKS) {
  const t0 = Date.now();
  const res = spawnSync(c.cmd, c.args, {
    cwd: REPO,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const ms = Date.now() - t0;
  const out = scrub(`${res.stdout ?? ''}\n${res.stderr ?? ''}`).trim();
  const tail = out.split('\n').slice(-6).join('\n');
  rows.push({ ...c, status: res.status, ms, tail, pass: res.status === 0 });
  process.stdout.write(res.status === 0 ? '.' : 'X');
}
process.stdout.write('\n');

// 테스트 개수 추출 (회귀 감시용)
const testRow = rows.find((r) => r.id === 'test');
const m = testRow?.tail.match(/Tests\s+(\d+)\s+passed/);
const testCount = m ? Number(m[1]) : null;

const failed = rows.filter((r) => !r.pass);

let md = `# release-green — ${stamp}\n\n`;
md += `> \`node loops/release-green/gate.mjs\` 산출물. 배포 가능 상태 판정.\n\n`;
md += failed.length === 0
  ? `## ✅ GREEN — 배포 가능\n\n`
  : `## 🔴 RED — ${failed.map((f) => f.label).join(', ')} 실패\n\n`;
md += `| 검사 | 판정 | exit | 소요(ms) |\n|---|---|---|---|\n`;
for (const r of rows) {
  md += `| ${r.label} | ${r.pass ? '✅ PASS' : '🔴 FAIL'} | ${r.status} | ${r.ms} |\n`;
}
md += `\n- 테스트 개수: **${testCount ?? '판독 실패'}** (기준선 61 — 줄었으면 회귀를 의심한다)\n`;

if (failed.length) {
  md += `\n## 실패 상세 (마지막 6줄)\n`;
  for (const f of failed) {
    md += `\n### ${f.label}\n\n\`\`\`\n${f.tail}\n\`\`\`\n`;
  }
}

md += `\n## 검증 체크리스트\n\n`;
md += `- [${rows.length === 3 ? 'x' : ' '}] 검사 3종 전부 실행됨\n`;
md += `- [${failed.length === 0 ? 'x' : ' '}] 전부 통과\n`;
md += `- [${testCount !== null && testCount >= 61 ? 'x' : ' '}] 테스트 개수 61 이상 (현재 ${testCount ?? '?'})\n`;
md += `- [x] 리포트에 비밀값 없음 (scrub 적용)\n`;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const outPath = resolve(OUT_DIR, `green-${stamp}.md`);
writeFileSync(outPath, md, 'utf8');

console.log(failed.length === 0 ? 'GREEN' : `RED: ${failed.map((f) => f.id).join(',')}`);
console.log(`tests=${testCount ?? '?'} (기준선 61)`);
console.log(`report: ${outPath.replace(REPO, '.')}`);
process.exit(failed.length === 0 ? 0 : 1);
```

> 🔴 **2026-08-12 구현 중 이 초안이 세 군데 부족한 것으로 판명됐다. 실제 정본은 `loops/release-green/gate.mjs`다.**
>
> 1. **판정은 4계층이어야 한다** — `GREEN`(전부 통과 + 테스트 ≥ 61) / `WARN`(전부 통과했으나 **테스트 개수 회귀**) / `RED`(검사 실패) / **`LEAK`**(리포트에 비밀값 잔존). **GREEN만 exit 0**, 나머지는 전부 exit 1. 위 초안은 `testCount`를 계산만 하고 판정에 쓰지 않아, **테스트가 61→10으로 사라져도 ✅ GREEN + exit 0**을 냈다.
> 2. **`- [x] 리포트에 비밀값 없음`을 하드코딩하지 않는다.** 그건 *"scrub이 돌았다"*를 *"비밀이 없다"*로 바꿔 말하는 것이다. `.env.local` 실제 값을 스크립트 안에서만 읽어 **완성된 본문과 대조**하고, 걸리면 본문을 마스킹한 뒤 **`LEAK`로 확정하고 exit 1**을 낸다. *안전 검사가 게이트를 실패시키지 못하면 게이트가 아니다.*
> 3. 🔴 **`NEXT_PUBLIC_*`는 비밀 대상에서 제외한다.** 브라우저로 나가는 값이라 비밀이 아니다(이 저장소에 **9건**). 포함하면 RED 경로에서 **진짜 빌드 오류의 진단문을 오탐 마스킹**해, 실패 상세가 존재하는 이유를 없앤다.
>
> `scrub()`도 이름에 KEY/SECRET이 없는 비밀을 놓쳤다 → URL 내 자격증명(`//user:pass@`)과 `Bearer` 토큰 패턴을 추가했다.

- [ ] **Step 2: Loop Contract 3파일 작성**

Create `loops/release-green/TASK.md`:

```markdown
# release-green Loop

## Goal

`npm test` · `npm run lint` · `npm run build` 세 검사를 돌려 **지금 배포해도 되는 상태인지**를 매번 파일로 남긴다.

## 왜 이 Loop인가

- 9/21 접수 전 **아무 때나 제출 가능한 상태**를 유지해야 한다. 제출 직전에 빌드가 깨져 있으면 손 쓸 시간이 없다.
- 테스트 개수 **기준선 61**을 감시한다. 줄었으면 회귀다.

## Expected Output

- `loops/release-green/outputs/green-YYYY-MM-DD.md`
- `loops/release-green/PROGRESS.md`

## Scope

권한 사다리 **1단계**. 검사와 리포트만.

Claude가 하면 안 되는 것:
- 소스 파일 수정 (실패해도 **고치지 않는다**. 리포트에 적고 사람에게 넘긴다)
- 파일 삭제·이름 변경
- `git commit` / `git push` / 배포

## Stop condition

- **성공**: 3종 전부 PASS + 테스트 61 이상 → 종료
- **실패**: 리포트에 남기고 `PROGRESS.md`의 `Needs Human Review`에 적은 뒤 **종료**. 재시도하지 않는다
  (빌드 실패는 재시도로 낫지 않는다 — 코드를 고쳐야 한다)
```

Create `loops/release-green/LOOP_INSTRUCTIONS.md`:

```markdown
# Loop Instructions — release-green

## Before You Start

1. `TASK.md`, `PROGRESS.md` 를 읽는다 (특히 `Do Not Repeat`)
2. 오늘 날짜 리포트가 `outputs/` 에 이미 있으면 **중복 실행하지 않는다**

## What You Should Do

1. `node loops/release-green/gate.mjs` 실행 — **직접 npm 명령을 조합하지 않는다**
2. `outputs/green-YYYY-MM-DD.md` 를 읽고 판정
3. `PROGRESS.md` 갱신

## 판정 규칙

| 신호 | 판정 |
|---|---|
| 3종 전부 exit 0 + 테스트 ≥ 61 | ✅ GREEN |
| 3종 전부 exit 0 + **테스트 < 61** | 🟡 WARN — 회귀 의심 |
| 하나라도 exit ≠ 0 | 🔴 RED |

> 🔴 **테스트 개수가 줄었는데 전부 통과했다고 GREEN으로 넘기지 마라.** 테스트가 삭제됐거나 skip 됐을 수 있다.

## Safety Rules

- 실패해도 **소스를 고치지 않는다.** 이 Loop는 진단만 한다
- `outputs/` 와 `PROGRESS.md` 외에는 쓰지 않는다
- `git commit`/`push`/배포 금지
- 허용 여부가 애매하면 멈추고 물어본다

## Verification Checklist

1. 검사 3종이 전부 실행됐다
2. 각 exit code 가 리포트에 기록됐다
3. 테스트 개수가 기록됐고 61과 비교됐다
4. `outputs/` 와 `PROGRESS.md` 외 파일이 수정되지 않았다
5. 리포트에 비밀값이 없다

## Failure Policy

1. **RED** → `PROGRESS.md` 의 `Needs Human Review` 에 실패 검사와 마지막 6줄을 적고 **멈춘다**. 재시도 없음
2. **테스트 개수 감소** → `Needs Human Review` 에 적고 멈춘다
3. 스크립트 자체가 실행 안 됨(exit 2 이상) → 환경 문제. 적고 멈춘다
4. 금지 경로 파일이 수정됨 → 즉시 멈춘다
```

Create `loops/release-green/PROGRESS.md`:

```markdown
# Loop Progress — release-green

> 창고가 아니라 조종석이다. 다음 실행에 필요한 것만 남긴다.

## Current State

- Status: **Active** (권한 사다리 1단계 — 검사 + 리포트만)
- Main objective: 9/21 접수 전까지 배포 가능 상태 유지
- Current focus: 손으로 3~5회 실행하며 안정성 확인 (스케줄 미등록)
- Last updated: (첫 실행 시 기록)

## Last Run

- (아직 없음)

## Open Items

- 손 실행 0/5회
- `/loop` 스케줄 등록 — 손 실행 3~5회 안정 확인 전에는 금지

## Blockers

- 없음

## Needs Human Review

- 없음

## Next Run Should

1. `node loops/release-green/gate.mjs` 실행
2. 테스트 개수를 **61과 비교**
3. 이 파일의 `Last Run` 갱신 + 손 실행 횟수(N/5) 올리기

## Decisions Made

- 2026-08-12 — 실패해도 **고치지 않는다**로 확정. 진단과 수정을 섞으면 Loop가 소스를 건드리게 되고 권한 1단계가 깨진다.

## Do Not Repeat

- (아직 없음)
```

- [ ] **Step 3: 🔴 green 확인 — 정상 상태에서 exit 0**

Run: `node loops/release-green/gate.mjs; echo "exit=$?"`
Expected: `GREEN` · `tests=61 (기준선 61)` · **exit=0**

> 실측(2026-08-12): `GREEN` · `tests=61 (기준선 61)` · **exit 0**.

- [ ] **Step 4: 🔴 red 확인 — 실패를 주입하면 exit 1**

임시로 lint가 반드시 깨지는 파일을 만든다:

```bash
printf 'export const a = undefinedSymbolForRedTest;\n' > lib/_redtest.ts
node loops/release-green/gate.mjs; echo "exit=$?"
rm -f lib/_redtest.ts
```

Expected: `RED: lint` (또는 `RED: lint,build`) · **exit=1** · 리포트에 실패 상세 6줄

> 이걸 보지 않고 통과로 치지 않는다. **늘 통과하는 검증은 장식이다.**

- [ ] **Step 5: 정리 후 다시 그린 확인**

Run: `node loops/release-green/gate.mjs; echo "exit=$?"`
Expected: `GREEN` · **exit=0**

- [ ] **Step 6: Skill 작성**

Create `.claude/skills/release-green/SKILL.md`:

```markdown
---
name: release-green
description: 이모추가 지금 배포 가능한 상태인지 test·lint·build 로 판정하고 리포트·상태 파일을 갱신한다.
when_to_use: 제출 전 상태 확인, 배포 전 점검, 큰 변경 후 회귀 확인
---

# release-green

## 절차

1. `loops/release-green/TASK.md` · `PROGRESS.md` 를 읽는다
2. 오늘 리포트가 이미 있으면 중복 실행하지 않는다
3. `node loops/release-green/gate.mjs` 실행 — **직접 npm 명령을 조합하지 않는다**
4. 리포트를 읽고 판정, `PROGRESS.md` 갱신

## 판정

| 신호 | 판정 |
|---|---|
| 3종 exit 0 + 테스트 ≥ 61 | ✅ GREEN |
| 3종 exit 0 + 테스트 < 61 | 🟡 WARN (회귀 의심) |
| 하나라도 exit ≠ 0 | 🔴 RED |

## 금지

- 실패해도 **소스를 고치지 않는다** (진단 전용)
- `outputs/`·`PROGRESS.md` 외 쓰기 금지
- `git commit`/`push`/배포 금지

## 에스컬레이션

RED 또는 테스트 개수 감소 → `Needs Human Review` 에 적고 **재시도 없이 멈춘다**.
```

- [ ] **Step 7: 커밋**

```bash
git add loops/release-green .claude/skills/release-green
git commit -m "feat(loop): release-green — test·lint·build 게이트와 Loop Contract"
```

---

### Task 3: `submission-check` Loop — 제출물 준비 상태 추적

**Files:**
- Create: `loops/submission-check/submission.json`
- Create: `loops/submission-check/check.mjs`
- Create: `loops/submission-check/TASK.md`
- Create: `loops/submission-check/LOOP_INSTRUCTIONS.md`
- Create: `loops/submission-check/PROGRESS.md`
- Create: `.claude/skills/submission-check/SKILL.md`
- Modify: `CLAUDE.md` (「🔁 Loop」 섹션을 3종으로)

**Interfaces:**
- Consumes: `.claude/settings.json`의 `Bash(node loops/submission-check/check.mjs)` 허용 (Task 1)
- Produces: `loops/submission-check/outputs/submission-YYYY-MM-DD.md`

- [ ] **Step 1: 제출 항목 단일 소스 작성**

Create `loops/submission-check/submission.json`:

```json
{
  "_doc": "1차 심사자료 제출 항목. 사람이 손으로 편집한다. check.mjs 가 auto 항목만 기계 검사하고 manual 은 이 파일의 done 값을 그대로 읽는다.",
  "deadline": "2026-09-21T16:00:00+09:00",
  "serviceUrl": "",
  "items": [
    { "id": "team-info",      "kind": "manual", "label": "팀 정보 — 팀명(변경불가)·최종 팀원 확정 입력", "done": false, "note": "팀원 전원 사전 회원가입 필요" },
    { "id": "service-info",   "kind": "manual", "label": "서비스 정보 — 서비스명·개요·유형(웹)·지역특화 유무", "done": false, "note": "이모추는 전국 단위 → 지역특화 '무'" },
    { "id": "service-url",    "kind": "auto",   "label": "서비스 URL 이 200 으로 응답", "done": false },
    { "id": "test-account",   "kind": "manual", "label": "테스트 계정 — 로그인 방식 선택(개인 계정 제출 불가)", "done": false, "note": "로그인 불필요면 '불필요' 선택" },
    { "id": "api-keys",       "kind": "manual", "label": "OpenAPI 인증키(인코딩·디코딩) 제출", "done": false, "note": "운영계정 신청은 선택 사항" },
    { "id": "api-list",       "kind": "auto",   "label": "활용 OpenAPI 목록이 11개와 일치", "done": false },
    { "id": "attribution",    "kind": "auto",   "label": "UI 에 출처 표기 존재 (ⓒ한국관광공사 / ⓒ한국관광콘텐츠랩)", "done": false },
    { "id": "spec-doc",       "kind": "auto",   "label": "기능설명서 PDF 준비 (지정 양식)", "done": false },
    { "id": "images",         "kind": "auto",   "label": "대표 이미지 1장 + 상세 이미지 3~5장", "done": false }
  ]
}
```

- [ ] **Step 2: 검사 스크립트 작성**

Create `loops/submission-check/check.mjs`:

```javascript
#!/usr/bin/env node
// ============================================================
// submission-check — 1차 심사자료 제출 준비 상태 점검
// auto 항목만 기계 검사하고, manual 항목은 submission.json 의 done 을 읽는다.
// 이 스크립트는 판정만 한다. 소스도 submission.json 도 고치지 않는다.
// 종료 코드: 0 = 미충족 0건 / 1 = 미충족 있음
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const OUT_DIR = resolve(HERE, 'outputs');
const ASSET_DIR = resolve(HERE, 'assets');      // 대표/상세 이미지·기능설명서를 두는 자리

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const cfg = JSON.parse(readFileSync(resolve(HERE, 'submission.json'), 'utf8'));

// ─── auto 검사기 ───
function walk(dir, exts, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) walk(p, exts, acc);
    else if (exts.some((x) => e.name.toLowerCase().endsWith(x))) acc.push(p);
  }
  return acc;
}

function grepUi(pattern) {
  const files = walk(resolve(REPO, 'app'), ['.tsx', '.ts'])
    .concat(walk(resolve(REPO, 'components'), ['.tsx', '.ts']));
  for (const f of files) {
    if (pattern.test(readFileSync(f, 'utf8'))) return f.replace(REPO, '.');
  }
  return null;
}

async function checkServiceUrl(url) {
  if (!url) return { ok: false, detail: 'submission.json 의 serviceUrl 이 비어 있음' };
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    return { ok: res.status === 200, detail: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, detail: `요청 실패: ${String(e.message).slice(0, 80)}` };
  }
}

function checkApiList() {
  const src = readFileSync(resolve(REPO, 'lib', 'tour-api.ts'), 'utf8');
  const ops = new Set((src.match(/'(?:area|category|location|search|detail)[A-Za-z0-9]*2'/g) || []));
  return { ok: ops.size === 11, detail: `lib/tour-api.ts 에서 ${ops.size}개 검출 (기대 11)` };
}

function checkAttribution() {
  const hit = grepUi(/출처\s*[:：]?\s*ⓒ\s*한국관광(공사|콘텐츠랩)/);
  if (hit) return { ok: true, detail: `발견: ${hit}` };
  const loose = grepUi(/ⓒ\s*한국관광/);
  return {
    ok: false,
    detail: loose
      ? `느슨한 표기만 발견(${loose}) — "출처: ⓒ한국관광공사" 형식 필요`
      : 'UI 에 출처 표기 없음 — 규정상 필수. "출처: ⓒ한국관광공사" 추가 필요',
  };
}

function checkSpecDoc() {
  const pdfs = walk(ASSET_DIR, ['.pdf']);
  return { ok: pdfs.length >= 1, detail: `${ASSET_DIR.replace(REPO, '.')} 에 PDF ${pdfs.length}개` };
}

function checkImages() {
  const imgs = walk(ASSET_DIR, ['.png', '.jpg', '.jpeg', '.webp']);
  const ok = imgs.length >= 4 && imgs.length <= 6;   // 대표 1 + 상세 3~5
  return { ok, detail: `이미지 ${imgs.length}개 (필요: 대표1 + 상세3~5 = 4~6)` };
}

// ─── 실행 ───
const results = [];
for (const item of cfg.items) {
  if (item.kind === 'manual') {
    results.push({ ...item, ok: item.done === true, detail: item.done ? '사람이 완료 표시' : '미완료(submission.json 에서 done: true 로 바꿀 것)' });
    continue;
  }
  let r;
  if (item.id === 'service-url') r = await checkServiceUrl(cfg.serviceUrl);
  else if (item.id === 'api-list') r = checkApiList();
  else if (item.id === 'attribution') r = checkAttribution();
  else if (item.id === 'spec-doc') r = checkSpecDoc();
  else if (item.id === 'images') r = checkImages();
  else r = { ok: false, detail: `알 수 없는 auto 항목: ${item.id}` };
  results.push({ ...item, ...r });
}

const done = results.filter((r) => r.ok).length;
const todo = results.filter((r) => !r.ok);
const daysLeft = Math.ceil((new Date(cfg.deadline) - now) / 86400000);

let md = `# 제출 준비 상태 — ${stamp}\n\n`;
md += `> \`node loops/submission-check/check.mjs\` 산출물. 마감 **${cfg.deadline}** (D-${daysLeft})\n\n`;
md += `## 요약\n\n**${done} / ${results.length} 충족** · 남은 항목 ${todo.length}건\n\n`;
md += `| 항목 | 종류 | 상태 | 상세 |\n|---|---|---|---|\n`;
for (const r of results) {
  md += `| ${r.label} | ${r.kind === 'auto' ? '기계' : '사람'} | ${r.ok ? '✅' : '🔴'} | ${r.detail.replaceAll('|', '\\|')} |\n`;
}
if (todo.length) {
  md += `\n## 남은 일\n\n`;
  for (const t of todo) md += `- **${t.label}** — ${t.detail}${t.note ? ` *(${t.note})*` : ''}\n`;
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const outPath = resolve(OUT_DIR, `submission-${stamp}.md`);
writeFileSync(outPath, md, 'utf8');

console.log(`${done}/${results.length} 충족 · D-${daysLeft}`);
for (const t of todo) console.log(`  TODO ${t.id}: ${t.detail}`);
console.log(`report: ${outPath.replace(REPO, '.')}`);
process.exit(todo.length === 0 ? 0 : 1);
```

- [ ] **Step 3: 자산 폴더 자리 만들기**

```bash
mkdir -p loops/submission-check/assets
printf '# 제출 자산\n\n대표 이미지 1장 + 상세 이미지 3~5장 + 기능설명서 PDF 를 여기에 둔다.\n\n- 기능설명서는 **지정 양식**을 써야 한다(임의 양식은 심사 제외).\n- 이미지 파일명에 개인정보·좌표를 넣지 않는다.\n' > loops/submission-check/assets/README.md
```

- [ ] **Step 4: 🔴 첫 실행 — FAIL 이 정상이다**

Run: `node loops/submission-check/check.mjs; echo "exit=$?"`

Expected: **exit=1**. 특히 이 두 줄이 보여야 한다:

```
TODO attribution: UI 에 출처 표기 없음 — 규정상 필수. "출처: ⓒ한국관광공사" 추가 필요
TODO api-list: lib/tour-api.ts 에서 11개 검출 (기대 11)   ← 이건 ✅ 여야 정상
```

> ⚠️ **`attribution` 이 🔴로 나오는 것이 이 Loop가 작동한다는 증거다.** 실측(2026-08-12)에서 `grep -rn "출처\|ⓒ" app components` 가 0건이었다. 고치는 것은 이 계획 범위 밖 — 리포트에 남기고 사람에게 넘긴다.
> `api-list` 가 11이 아니면 검출 정규식이 틀린 것이다. `lib/tour-api.ts` 의 실제 오퍼레이션 문자열을 확인해 정규식을 맞춘다.

- [ ] **Step 5: 🔴 red-green — 검사가 실제로 갈리는가**

`attribution` 검사가 **통과도 할 수 있는지** 확인한다(늘 실패하는 검사도 장식이다):

```bash
printf 'export const ATTRIBUTION = "출처: ⓒ한국관광공사";\n' > app/_attrtest.ts
node loops/submission-check/check.mjs 2>&1 | grep -E "attribution|충족"
rm -f app/_attrtest.ts
```

Expected: `attribution` 이 TODO 목록에서 **사라진다**(충족 수가 1 증가). 삭제 후 다시 실행하면 **다시 나타난다**.

> 🔴 **2026-08-12 구현 중 확정 — 위 `check.mjs` 초안은 세 검사가 전부 헐거웠다. 정본은 `loops/submission-check/check.mjs`다.**
>
> 1. **`checkAttribution` 이 주석·죽은 코드까지 매치했다** → *"검사했다고 믿으며 규정 위반을 출품"* 하는 false PASS 경로. **주석을 제거한 뒤** 매칭하고, `ⓒ`·`©`·`&copy;` 변형을 인정하며, **`file:line` 을 리포트에 남긴다.** ✅ 는 *"문자열이 존재한다"* 일 뿐 *"화면에 뜬다"* 가 아니므로 **최초 ✅ 전환 시 사람이 페이지를 열어 확인**하도록 문서에 못박았다.
> 2. **`checkApiList` 가 개수만 비교했다**(`size === 11`) → 오퍼레이션이 교체돼도 11이면 통과. **11종 집합을 명시해 양방향 대조**하고 `누락`/`초과` 를 각각 보고한다.
> 3. **`checkServiceUrl` 에 타임아웃이 없었다** → 행이면 9개 항목 전체가 멈춘다. **`AbortController` 10초** + `finally` 해제, 그리고 **비200(배포 문제) / 무응답(타임아웃·네트워크, 확인 필요)** 을 구분해 표현한다.
>
> 주석 제거기(`stripComments`)는 그 자체가 규정 검사 둘을 떠받치므로 **단일 패스 문자 스캐너**로 만들었다. 불변식은 **`stripped.length === src.length` 이고 개행이 보존된다** — `file:line` 보고가 정확해야 하기 때문이다. (정규식 방식은 블록 주석의 개행을 삼켜 줄 번호를 어긋나게 했고, 문자열 상태를 줄마다 초기화해 여러 줄 템플릿 안의 진짜 표기를 지웠으며, 여는 `/*` 에서 한 글자만 소비해 `/*/` 형태에서 주석이 일찍 닫혔다 — 셋 다 실측으로 잡았다.)

- [ ] **Step 6: Loop Contract 3파일 작성**

Create `loops/submission-check/TASK.md`:

```markdown
# submission-check Loop

## Goal

1차 심사자료 **제출 항목 9종**의 충족 여부를 매번 파일로 남겨, 마감(2026-09-21 16:00) 직전에 빠진 것을 발견하는 사고를 막는다.

## 왜 이 Loop인가

- 제출은 **게임/서비스 완성과 별개의 작업**이다. 개발이 끝나도 제출물이 안 끝난다.
- 🔴 **출처 표기가 규정상 필수인데 현재 UI에 없다**(2026-08-12 실측). 사람이 기억으로 관리하면 놓친다.
- 기계로 검사 가능한 5종(URL·API 개수·출처 표기·기능설명서·이미지)은 **매번 자동 확인**한다.

## Expected Output

- `loops/submission-check/outputs/submission-YYYY-MM-DD.md`
- `loops/submission-check/PROGRESS.md`

## Scope

권한 사다리 **1단계**. 검사와 리포트만.

Claude가 하면 안 되는 것:
- 소스 파일 수정 — **출처 표기 누락을 발견해도 직접 추가하지 않는다.** 리포트에 적는다
- `submission.json` 의 `done` 값 임의 변경 — **사람만 바꾼다**
- 파일 삭제·이름 변경, `git commit`/`push`/배포
- 🔴 리포트에 인증키·좌표 등 민감값 기록

## Stop condition

- **성공**: 9종 전부 충족 → 종료
- **미충족**: 리포트와 `PROGRESS.md` 에 남기고 종료. 재시도하지 않는다(사람이 해야 낫는 일이다)
```

Create `loops/submission-check/LOOP_INSTRUCTIONS.md`:

```markdown
# Loop Instructions — submission-check

## Before You Start

1. `TASK.md`, `PROGRESS.md` 를 읽는다
2. 오늘 리포트가 `outputs/` 에 이미 있으면 중복 실행하지 않는다

## What You Should Do

1. `node loops/submission-check/check.mjs` 실행 — **직접 검사 로직을 만들지 않는다**
2. 리포트를 읽고 **남은 항목과 D-day** 를 확인
3. `PROGRESS.md` 갱신 — 특히 `Needs Human Review` 에 사람이 해야 할 항목을 옮겨 적는다

## 판정 규칙

| 신호 | 판정 |
|---|---|
| 9/9 충족 | ✅ READY |
| 미충족 있음 + D-14 초과 | 🟡 진행 중 |
| 미충족 있음 + **D-14 이내** | 🔴 위험 — `Needs Human Review` 최상단에 올린다 |

## Safety Rules

- 🔴 **출처 표기 누락을 발견해도 코드를 고치지 않는다.** 리포트에 적고 사람에게 넘긴다
- 🔴 **`submission.json` 의 `done` 을 바꾸지 않는다.** 사람만 바꾼다
- `outputs/` 와 `PROGRESS.md` 외에는 쓰지 않는다
- 리포트에 인증키·좌표를 남기지 않는다
- 허용 여부가 애매하면 멈추고 물어본다

## Verification Checklist

1. 항목 9종이 전부 판정됐다
2. auto 5종은 기계 검사 결과가, manual 4종은 `submission.json` 의 `done` 이 반영됐다
3. D-day 가 리포트에 있다
4. `outputs/` 와 `PROGRESS.md` 외 파일이 수정되지 않았다
5. 리포트에 민감값이 없다

## Failure Policy

1. 미충족 항목 → 리포트에 남기고 **재시도하지 않는다**. 사람이 해야 낫는다
2. `api-list` 가 11이 아님 → 🔴 **TourAPI 사용 목록이 바뀌었다는 뜻.** 즉시 사람 호출(제출 서류의 활용 API 목록과 어긋난다)
3. `serviceUrl` 이 200이 아님 → 🔴 **배포가 죽었다.** 즉시 사람 호출
4. 스크립트 실행 실패 → 환경 문제. 적고 멈춘다
5. 같은 검증이 2회 연속 실패 → `Needs Human Review` 에 적고 멈춘다
```

Create `loops/submission-check/PROGRESS.md`:

```markdown
# Loop Progress — submission-check

> 창고가 아니라 조종석이다.

## Current State

- Status: **Active** (권한 사다리 1단계)
- Main objective: 2026-09-21 16:00 제출 항목 9종 충족
- Current focus: 손으로 3~5회 실행하며 안정성 확인
- Last updated: (첫 실행 시 기록)

## Last Run

- (아직 없음)

## Open Items

- 손 실행 0/5회
- `submission.json` 의 `serviceUrl` 이 비어 있음 → **사람이 배포 URL 을 채워야 한다**
- 제출 자산(대표1+상세3~5 이미지, 기능설명서 PDF)이 `assets/` 에 없음

## Blockers

- 없음

## Needs Human Review

- 🔴 **UI 출처 표기 누락** — 규정상 필수인 `출처: ⓒ한국관광공사` 가 없다. 푸터에 텍스트로 추가해야 한다. **로고 이미지는 불가, 텍스트만.** `TourAPI` 단독 표기는 지양

## Next Run Should

1. `node loops/submission-check/check.mjs` 실행
2. D-day 를 확인하고, D-14 이내면 미충족 항목을 최상단으로 올린다
3. 이 파일의 `Last Run` 갱신 + 손 실행 횟수(N/5) 올리기

## Decisions Made

- 2026-08-12 — `submission.json` 을 **단일 소스**로 두고 manual 항목은 사람만 `done` 을 바꾼다. 에이전트가 자기 숙제를 채점하지 않게 하기 위함.
- 2026-08-12 — 출처 표기 누락을 **Loop 가 고치지 않는다**로 확정. 권한 1단계 유지 + UI 문구는 사람이 판단할 문제.

## Do Not Repeat

- 2026-08-12: `attribution` 검사는 **느슨한 표기(`ⓒ한국관광`)도 실패로 본다.** 규정이 요구하는 형식은 `출처: ⓒ한국관광공사`(또는 `ⓒ한국관광콘텐츠랩`)다. 느슨하게 통과시키면 규정 미준수를 통과로 착각한다.
```

- [ ] **Step 7: Skill 작성**

Create `.claude/skills/submission-check/SKILL.md`:

```markdown
---
name: submission-check
description: 이모추 1차 심사자료 제출 항목 9종의 충족 여부를 점검하고 리포트·상태 파일을 갱신한다.
when_to_use: 제출 준비 상태 확인, 마감 전 점검, 무엇이 남았는지 물을 때
---

# submission-check

## 절차

1. `loops/submission-check/TASK.md` · `PROGRESS.md` 를 읽는다
2. 오늘 리포트가 이미 있으면 중복 실행하지 않는다
3. `node loops/submission-check/check.mjs` 실행 — **직접 검사 로직을 만들지 않는다**
4. 리포트를 읽고 `PROGRESS.md` 갱신

## 판정

| 신호 | 판정 |
|---|---|
| 9/9 충족 | ✅ READY |
| 미충족 + D-14 초과 | 🟡 진행 중 |
| 미충족 + D-14 이내 | 🔴 위험 |

## 금지

- 🔴 출처 표기 누락을 발견해도 **코드를 고치지 않는다**
- 🔴 `submission.json` 의 `done` 을 **바꾸지 않는다** (사람만)
- `outputs/`·`PROGRESS.md` 외 쓰기 금지
- 리포트에 인증키·좌표 기록 금지

## 에스컬레이션

- `api-list` ≠ 11 → 활용 API 목록이 바뀐 것. 제출 서류와 어긋나므로 **즉시 사람 호출**
- `serviceUrl` ≠ 200 → 배포가 죽음. **즉시 사람 호출**
```

- [ ] **Step 8: `CLAUDE.md` 의 Loop 섹션을 3종으로 갱신**

Modify `CLAUDE.md` — 기존 「🔁 Loop (tourapi-watch)」 섹션을 아래로 교체한다 (줄 수가 늘지 않게 유지):

```markdown
## 🔁 Loops
- **먼저 해당 Loop 의 `PROGRESS.md` 를 읽어라.** 상태·다음 할 일·`Do Not Repeat` 이 거기 있다
- `loops/tourapi-watch/` — TourAPI 11개 실호출 감시 + 폐기 예정 API 경보 (`node loops/tourapi-watch/smoke.mjs`)
- `loops/release-green/` — test·lint·build 배포 가능 상태 (`node loops/release-green/gate.mjs`)
- `loops/submission-check/` — 1차 제출 항목 9종 (`node loops/submission-check/check.mjs`)
- 공통: 스크립트가 **검사 단일 경유점**. 권한 **사다리 1단계**(읽기+리포트). 소스 수정·commit·push 금지
```

- [ ] **Step 9: 전체 검증**

```bash
npm run lint && npm test
node loops/tourapi-watch/smoke.mjs;    echo "tourapi exit=$?"
node loops/release-green/gate.mjs;     echo "green   exit=$?"
node loops/submission-check/check.mjs; echo "submit  exit=$?"
git status --short
```

Expected:
- lint 0 errors · **61 tests passed**
- tourapi exit=0 · green exit=0 · **submit exit=1** (출처 표기 미충족이 남아 있으므로 **정상**)
- `git status` 에 `app/`·`lib/`·`components/` 변경이 **없어야** 한다

- [ ] **Step 10: 키 유출 최종 스캔**

```bash
KEY=$(grep -oE "^TOUR_API_KEY=.*" .env.local | cut -d= -f2- | tr -d '"'"'"'' | xargs)
grep -rqF "$KEY" loops/ .claude/ CLAUDE.md docs/superpowers/plans/ && echo "🔴 유출!" || echo "✅ 없음"
```

Expected: `✅ 없음`

- [ ] **Step 11: 커밋**

```bash
git add loops/submission-check .claude/skills/submission-check CLAUDE.md
git commit -m "feat(loop): submission-check — 제출 항목 9종 점검, 출처 표기 누락 검출"
```

---

## 완료 후 확인

- [ ] `npm test` **61개 전부 통과** · `npm run lint` 0 errors · `npm run build` exit 0
- [ ] Loop 3종이 각각 손으로 실행되고 리포트를 남긴다
- [ ] **Gate 3종이 전부 red-green 확인을 거쳤다** (오류 주입 시 exit 1을 눈으로 봤다)
- [ ] `git status` 에 `app/`·`lib/`·`components/` 변경 없음 (하네스만 깔았다)
- [ ] 키 유출 스캔 0건
- [ ] `CLAUDE.md` 가 Loop 3종을 가리키고 **300줄 아래**를 유지한다

## 이 계획에서 하지 않는 것

- **출처 표기 추가** — `submission-check` 가 검출만 한다. UI 문구는 사람이 정한다
- **`/loop` 스케줄 등록** — 각 Loop 를 손으로 3~5회 돌려 안정성을 확인한 뒤에 한다
- **`.mcp.json`·`MEMORY.md`** — 이 프로젝트엔 필요 없다(기억은 옵시디언 위키가 맡는다)
- **권한 사다리 3단계 이상** — 자동 수정·자동 커밋은 마감 전에 하지 않는다
- **`areaCode2`·`categoryCode2` 마이그레이션** — 별도 트랙. `tourapi-watch` 가 감시만 한다
- **비용 상한(`--max-turns`·`--max-budget-usd`)** — 스케줄 등록 시점에 붙인다

## 사람이 별도로 해야 할 일 (이 계획 밖)

1. 🔴 **UI 푸터에 `출처: ⓒ한국관광공사` 텍스트 추가** — 규정 필수. 로고 불가
2. `submission.json` 의 `serviceUrl` 채우기 (배포 URL)
3. 제출 자산 준비 — 대표 이미지 1장 + 상세 3~5장 + 기능설명서 PDF(**지정 양식**)를 `loops/submission-check/assets/` 에
4. `submission.json` 의 manual 4종을 완료하면 `done: true` 로 변경
