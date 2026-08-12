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
