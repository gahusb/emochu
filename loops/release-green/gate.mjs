#!/usr/bin/env node
// ============================================================
// release-green — 배포 가능 상태 Gate
// test / lint / build 를 순서대로 돌리고 결과를 리포트로 남긴다.
// 이 스크립트가 검사의 단일 경유점이다. 에이전트는 실행하고 판정만 한다.
// 판정 4단계: LEAK(비밀값 유출 감지 — 다른 무엇보다 우선) / RED(하나라도 실패) /
//            WARN(전부 통과했지만 테스트 개수 회귀) / GREEN(전부 통과 + 테스트 기준선 이상)
// 종료 코드: 0 = GREEN만 / 1 = LEAK·WARN·RED 전부
//   (비밀값이 새거나 테스트가 조용히 사라지는 걸 "성공"으로 읽으면 안 된다)
// ============================================================
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const OUT_DIR = resolve(HERE, 'outputs');
const BASELINE = 61;

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const CHECKS = [
  { id: 'test',  label: '단위 테스트', cmd: 'npm', args: ['test'] },
  { id: 'lint',  label: 'ESLint',      cmd: 'npm', args: ['run', 'lint'] },
  { id: 'build', label: 'Next 빌드',   cmd: 'npm', args: ['run', 'build'] },
];

// 비밀값이 로그에 섞여 나올 수 있으므로 흔한 패턴을 지운다.
// 이름에 KEY/SECRET/TOKEN/PASSWORD 가 없어도 새는 실전 케이스 두 가지를 추가로 막는다:
//  - URL에 박힌 자격증명: postgres://user:P@ssw0rd@host/db
//  - Authorization 헤더의 Bearer 토큰
const scrub = (s) =>
  String(s)
    .replace(/([A-Z_]*(?:KEY|SECRET|TOKEN|PASSWORD)[A-Z_]*\s*[=:]\s*)\S+/gi, '$1<REDACTED>')
    .replace(/serviceKey=[^&\s"']+/gi, 'serviceKey=<REDACTED>')
    .replace(/\/\/[^/\s:@]+:[^/\s@]+@/g, '//<REDACTED>@')        // postgres://user:pass@host
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]{16,}=*/gi, '$1<REDACTED>');

// timeout·maxBuffer 없이 spawnSync 를 돌리면 두 가지 실전 장애가 생긴다:
//  1) next build 가 멈춰버리면 이 프로세스도 무한정 블록되고, 리포트는 세 검사가
//     전부 끝난 뒤에야 쓰이므로 아무 파일도 남지 않는다 — 새벽에 사람이 볼 게 없다.
//  2) 빌드 출력이 기본 버퍼(1MB)를 넘으면 Node 가 자식을 죽이고 res.status 는
//     null 이 된다 — 이걸 그냥 "exit null" 로 찍으면 "실패했다"만 보이고 왜
//     실패했는지(환경 문제 vs 실제 실패)를 사람이 알 수 없다.
// 그래서 명시적으로 timeout 을 걸고, res.error 로 원인을 구분해 렌더링한다.
const SPAWN_TIMEOUT_MS = 600_000;      // 10분
const SPAWN_MAX_BUFFER = 20 * 1024 * 1024; // 20MB

// res.error 를 사람이 읽을 한 줄로 바꾼다. 타임아웃/버퍼초과는 "실패"가 아니라
// "환경 문제" 다 — bare exit code 로 뭉개지 않고 별도 문구로 드러낸다.
function describeSpawnError(res) {
  if (!res.error) return null;
  if (res.error.code === 'ETIMEDOUT') return `시간 초과(${SPAWN_TIMEOUT_MS / 60000}분)`;
  if (res.error.code === 'ENOBUFS') return '출력 과다';
  return `실행 오류(${res.error.code ?? res.error.message ?? '알 수 없음'})`;
}

const rows = [];
for (const c of CHECKS) {
  const t0 = Date.now();
  const res = spawnSync(c.cmd, c.args, {
    cwd: REPO,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: SPAWN_TIMEOUT_MS,
    maxBuffer: SPAWN_MAX_BUFFER,
  });
  const ms = Date.now() - t0;
  const spawnError = describeSpawnError(res);
  const out = scrub(`${res.stdout ?? ''}\n${res.stderr ?? ''}`).trim();
  const tail = spawnError ?? out.split('\n').slice(-6).join('\n');
  // spawnError 가 있으면(=res.status 가 null) pass 는 당연히 false 다 — 이 값은
  // 아래 렌더링에서 "exit null" 대신 spawnError 문구를 보여주는 데 쓰인다.
  rows.push({ ...c, status: res.status, ms, tail, pass: res.status === 0, spawnError });
  process.stdout.write(res.status === 0 ? '.' : 'X');
}
process.stdout.write('\n');

// 테스트 개수 추출 (회귀 감시용)
const testRow = rows.find((r) => r.id === 'test');
const m = testRow?.tail.match(/Tests\s+(\d+)\s+passed/);
const testCount = m ? Number(m[1]) : null;

const failed = rows.filter((r) => !r.pass);
const regressed = testCount === null || testCount < BASELINE;

// GREEN: 3종 전부 통과 + 테스트 기준선 이상
// WARN : 3종 전부 통과했지만 테스트 개수가 null 이거나 기준선 미만 (테스트가 삭제·skip 됐을 수 있다)
// RED  : 하나라도 실패
// (비밀값 유출 여부는 아래에서 따로 검사한 뒤, 발견되면 이 tier를 덮어쓰고 LEAK로 확정한다)
const tier = failed.length > 0 ? 'RED' : regressed ? 'WARN' : 'GREEN';

// ── 리포트 본문(헤딩 제외)을 먼저 조립한다 ──
// 비밀값 유출 검사는 "완성된 리포트 본문"을 대상으로 해야 하므로, 헤딩을 확정하기 전에
// 본문부터 만들고 그 문자열을 스캔한다. 유출이 있으면 헤딩 자체를 LEAK로 바꾼다.
let body = `| 검사 | 판정 | exit | 소요(ms) |\n|---|---|---|---|\n`;
for (const r of rows) {
  // res.status 가 null 인 건 두 가지 경우다: 우리가 건 timeout/maxBuffer 에 걸렸거나
  // (spawnError 있음), 아니면 다른 이유로 신호에 죽었거나. "exit null" 을 그대로
  // 찍으면 사람이 원인을 못 읽으므로, spawnError 가 있으면 그 문구를 exit 칸에 쓴다.
  const exitCell = r.spawnError ?? r.status;
  body += `| ${r.label} | ${r.pass ? '✅ PASS' : '🔴 FAIL'} | ${exitCell} | ${r.ms} |\n`;
}
body += `\n- 테스트 개수: **${testCount ?? '판독 실패'}** (기준선 ${BASELINE} — 줄었으면 회귀를 의심한다)\n`;

if (failed.length) {
  body += `\n## 실패 상세\n`;
  for (const f of failed) {
    // spawnError 가 있으면 f.tail 은 이미 "시간 초과(10분)"/"출력 과다" 같은 한 줄
    // 문구다(출력의 마지막 6줄이 아니다) — 그 사실을 헤딩에서 구분해 보여준다.
    const heading = f.spawnError ? `${f.label} — ${f.spawnError} (환경 문제, 재시도 없이 기록)` : f.label;
    body += `\n### ${heading}\n\n\`\`\`\n${f.tail}\n\`\`\`\n`;
  }
}

body += `\n## 검증 체크리스트\n\n`;
body += `- [${rows.length === 3 ? 'x' : ' '}] 검사 3종 전부 실행됨\n`;
body += `- [${failed.length === 0 ? 'x' : ' '}] 전부 통과\n`;
body += `- [${!regressed ? 'x' : ' '}] 테스트 개수 ${BASELINE} 이상 (현재 ${testCount ?? '?'})\n`;

// ── 비밀값 유출 검사 ──
// "scrub 적용"은 "스크립트가 지우기를 시도했다"는 주장일 뿐, "실제로 안 남았다"는 증거가 아니었다.
// .env.local 의 실제 값을 (이 스크립트 안에서만) 읽어, 완성된 리포트 본문에 그대로 남아있는지 대조한다.
// 값 자체는 절대 콘솔·리포트에 출력하지 않는다 — 대조 건수만 남긴다.
function loadSecretValues() {
  const envPath = resolve(REPO, '.env.local');
  if (!existsSync(envPath)) return null; // .env.local 없음 — 대조 불가
  let raw;
  try {
    raw = readFileSync(envPath, 'utf8');
  } catch {
    return null; // 권한 문제 등으로 못 읽어도 스크립트를 죽이지 말고 "대조 불가"로 degrade
  }
  const values = [];
  for (const line of raw.split('\n')) {
    const mm = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!mm) continue;
    const name = mm[1];
    if (name.startsWith('NEXT_PUBLIC_')) continue; // 브라우저로 나가는 값이라 비밀이 아니다 — 오탐(특히 실패 상세의 진단 텍스트 마스킹) 방지
    let val = mm[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val.length >= 8) values.push(val); // 너무 짧은 값(true/1 등)은 오탐이 많아 제외
  }
  return values;
}

const secretValues = loadSecretValues();
let leaks = 0;
let secretRow;
if (secretValues === null) {
  secretRow = `- [ ] 비밀값 대조 불가 — \`.env.local\` 없음 또는 읽기 실패\n`;
} else {
  for (const v of secretValues) {
    if (body.includes(v)) {
      leaks++;
      body = body.split(v).join('<REDACTED>');
    }
  }
  if (leaks > 0) {
    secretRow = `- [ ] 리포트에서 비밀값 ${leaks}건 발견 — 마스킹함\n`;
    console.error(`LEAK: 리포트에서 비밀값 ${leaks}건 발견 — 마스킹함`);
  } else {
    secretRow = `- [x] .env.local 값 ${secretValues.length}건 대조 (NEXT_PUBLIC_* 제외), 유출 0건\n`;
  }
}
body += secretRow;

// 유출이 있으면 tier가 뭐였든 LEAK로 덮어쓴다 — 안전 검사는 게이트를 실패시키지 못하면 게이트가 아니다.
const outcome = leaks > 0 ? 'LEAK' : tier;

let md = `# release-green — ${stamp}\n\n`;
md += `> \`node loops/release-green/gate.mjs\` 산출물. 배포 가능 상태 판정.\n\n`;
if (outcome === 'LEAK') {
  md += `## 🔴 LEAK — 리포트에서 비밀값 ${leaks}건 발견, 마스킹함\n\n`;
} else if (outcome === 'GREEN') {
  md += `## ✅ GREEN — 배포 가능\n\n`;
} else if (outcome === 'WARN') {
  md += `## 🟡 WARN — 테스트 개수 회귀 의심\n\n`;
} else {
  md += `## 🔴 RED — ${failed.map((f) => f.label).join(', ')} 실패\n\n`;
}
md += body;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const outPath = resolve(OUT_DIR, `green-${stamp}.md`);
writeFileSync(outPath, md, 'utf8');

const tierLine =
  outcome === 'LEAK' ? `LEAK: 비밀값 ${leaks}건 발견 (마스킹함)` :
  outcome === 'GREEN' ? 'GREEN' :
  outcome === 'WARN' ? `WARN: tests=${testCount ?? '?'} (기준선 ${BASELINE})` :
  `RED: ${failed.map((f) => f.id).join(',')}`;
console.log(tierLine);
console.log(`tests=${testCount ?? '?'} (기준선 ${BASELINE})`);
console.log(`report: ${outPath.replace(REPO, '.')}`);
process.exit(outcome === 'GREEN' ? 0 : 1);
