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
