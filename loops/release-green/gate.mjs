#!/usr/bin/env node
// ============================================================
// release-green — 배포 가능 상태 Gate
// test / lint / build 를 순서대로 돌리고 결과를 리포트로 남긴다.
// 이 스크립트가 검사의 단일 경유점이다. 에이전트는 실행하고 판정만 한다.
// 판정 3단계: GREEN(전부 통과 + 테스트 기준선 이상) / WARN(전부 통과했지만 테스트 개수 회귀) / RED(하나라도 실패)
// 종료 코드: 0 = GREEN만 / 1 = WARN·RED 둘 다 (테스트가 조용히 사라지는 걸 "성공"으로 읽으면 안 된다)
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
const regressed = testCount === null || testCount < BASELINE;

// GREEN: 3종 전부 통과 + 테스트 기준선 이상
// WARN : 3종 전부 통과했지만 테스트 개수가 null 이거나 기준선 미만 (테스트가 삭제·skip 됐을 수 있다)
// RED  : 하나라도 실패
const tier = failed.length > 0 ? 'RED' : regressed ? 'WARN' : 'GREEN';

let md = `# release-green — ${stamp}\n\n`;
md += `> \`node loops/release-green/gate.mjs\` 산출물. 배포 가능 상태 판정.\n\n`;
if (tier === 'GREEN') {
  md += `## ✅ GREEN — 배포 가능\n\n`;
} else if (tier === 'WARN') {
  md += `## 🟡 WARN — 테스트 개수 회귀 의심\n\n`;
} else {
  md += `## 🔴 RED — ${failed.map((f) => f.label).join(', ')} 실패\n\n`;
}
md += `| 검사 | 판정 | exit | 소요(ms) |\n|---|---|---|---|\n`;
for (const r of rows) {
  md += `| ${r.label} | ${r.pass ? '✅ PASS' : '🔴 FAIL'} | ${r.status} | ${r.ms} |\n`;
}
md += `\n- 테스트 개수: **${testCount ?? '판독 실패'}** (기준선 ${BASELINE} — 줄었으면 회귀를 의심한다)\n`;

if (failed.length) {
  md += `\n## 실패 상세 (마지막 6줄)\n`;
  for (const f of failed) {
    md += `\n### ${f.label}\n\n\`\`\`\n${f.tail}\n\`\`\`\n`;
  }
}

md += `\n## 검증 체크리스트\n\n`;
md += `- [${rows.length === 3 ? 'x' : ' '}] 검사 3종 전부 실행됨\n`;
md += `- [${failed.length === 0 ? 'x' : ' '}] 전부 통과\n`;
md += `- [${!regressed ? 'x' : ' '}] 테스트 개수 ${BASELINE} 이상 (현재 ${testCount ?? '?'})\n`;

// ── 비밀값 유출 검사 ──
// "scrub 적용"은 "스크립트가 지우기를 시도했다"는 주장일 뿐, "실제로 안 남았다"는 증거가 아니었다.
// .env.local 의 실제 값을 (이 스크립트 안에서만) 읽어, 완성된 리포트 본문에 그대로 남아있는지 대조한다.
// 값 자체는 절대 콘솔·리포트에 출력하지 않는다 — 대조 건수만 남긴다.
function loadSecretValues() {
  const envPath = resolve(REPO, '.env.local');
  if (!existsSync(envPath)) return null; // .env.local 없음 — 대조 불가
  const raw = readFileSync(envPath, 'utf8');
  const values = [];
  for (const line of raw.split('\n')) {
    const mm = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!mm) continue;
    let val = mm[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val.length >= 8) values.push(val); // 너무 짧은 값(true/1 등)은 오탐이 많아 제외
  }
  return values;
}

const secretValues = loadSecretValues();
let secretRow;
if (secretValues === null) {
  secretRow = `- [ ] 비밀값 대조 불가 — \`.env.local\` 없음\n`;
} else {
  let leaks = 0;
  for (const v of secretValues) {
    if (md.includes(v)) {
      leaks++;
      md = md.split(v).join('<REDACTED>');
    }
  }
  if (leaks > 0) {
    secretRow = `- [ ] 리포트에서 비밀값 ${leaks}건 발견 — 마스킹함\n`;
    console.error(`LEAK: 리포트에서 비밀값 ${leaks}건 발견 — 마스킹함`);
  } else {
    secretRow = `- [x] .env.local 값 ${secretValues.length}건 대조, 유출 0건\n`;
  }
}
md += secretRow;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const outPath = resolve(OUT_DIR, `green-${stamp}.md`);
writeFileSync(outPath, md, 'utf8');

const tierLine =
  tier === 'GREEN' ? 'GREEN' :
  tier === 'WARN' ? `WARN: tests=${testCount ?? '?'} (기준선 ${BASELINE})` :
  `RED: ${failed.map((f) => f.id).join(',')}`;
console.log(tierLine);
console.log(`tests=${testCount ?? '?'} (기준선 ${BASELINE})`);
console.log(`report: ${outPath.replace(REPO, '.')}`);
process.exit(tier === 'GREEN' ? 0 : 1);
