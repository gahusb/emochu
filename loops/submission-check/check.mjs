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

// 한 글자씩 훑는 단일 패스 상태기계(완전한 TS 파서는 아니지만, 문자열/템플릿 리터럴
// 상태를 파일 전체에 걸쳐 유지한다 — 줄 단위로 끊어 처리하면 여러 줄짜리 템플릿
// 리터럴 안의 "//" 처럼 보이는 내용(예: URL)에 뒤가 통째로 잘려나간다).
// 불변식: 주석은 공백으로 치환하되 줄 구조는 보존한다 — file:line 보고가 정확해야
// 하므로, 개행 문자는 (블록 주석 내부를 포함해) 절대 지우지 않는다.
// 그래서 stripComments(src).length === src.length 가 항상 성립해야 한다.
function stripComments(src) {
  const n = src.length;
  let out = '';
  let state = 'code'; // code | line | block | sq | dq | tpl
  for (let i = 0; i < n; i++) {
    const ch = src[i];
    const next = i + 1 < n ? src[i + 1] : '';

    if (state === 'code') {
      if (ch === '/' && next === '/') { state = 'line'; out += ' '; continue; }
      if (ch === '/' && next === '*') { state = 'block'; out += ' '; continue; }
      if (ch === "'") { state = 'sq'; out += ch; continue; }
      if (ch === '"') { state = 'dq'; out += ch; continue; }
      if (ch === '`') { state = 'tpl'; out += ch; continue; }
      out += ch;
      continue;
    }

    if (state === 'line') {
      if (ch === '\n') { state = 'code'; out += '\n'; continue; }
      out += ' ';
      continue;
    }

    if (state === 'block') {
      if (ch === '*' && next === '/') {
        out += '  '; // "*/" 두 글자를 한 번에 공백 처리하고 같이 건너뛴다
        i++;
        state = 'code';
        continue;
      }
      out += ch === '\n' ? '\n' : ' ';
      continue;
    }

    // sq(작은따옴표) | dq(큰따옴표) | tpl(템플릿 리터럴) — 문자열 내용은 그대로 보존한다.
    // 출처 표기 문구가 여기 들어있으므로 공백으로 지우면 안 되고, 안에서는
    // "//"·"/*" 를 주석 시작으로 오인해서도 안 된다.
    {
      const quote = state === 'sq' ? "'" : state === 'dq' ? '"' : '`';
      if (ch === '\\' && next !== '') {
        out += ch + next; // 이스케이프 문자는 다음 글자와 함께 그대로 보존(따옴표 오판 방지)
        i++;
        continue;
      }
      if (ch === quote) { state = 'code'; out += ch; continue; }
      out += ch;
    }
  }

  if (out.length !== src.length) {
    // 길이가 어긋나면 file:line 계산이 조용히 틀어진다 — 틀린 줄 번호를 보고하느니 즉시 죽는다.
    throw new Error(`stripComments 불변식 위반: out.length=${out.length} !== src.length=${src.length}`);
  }
  return out;
}

// app/ 아래만 스캔한다. 최상위 components/ 는 이 저장소에 없다 —
// 실제 컴포넌트는 app/components 아래에 있고 위 walk 이 이미 재귀적으로 포함한다.
function grepUi(pattern) {
  const files = walk(resolve(REPO, 'app'), ['.tsx', '.ts']);
  for (const f of files) {
    const stripped = stripComments(readFileSync(f, 'utf8'));
    const m = pattern.exec(stripped);
    if (m) {
      const line = stripped.slice(0, m.index).split('\n').length;
      return { file: f.replace(REPO, '.'), line };
    }
  }
  return null;
}

const SERVICE_URL_TIMEOUT_MS = 10_000;

async function checkServiceUrl(url) {
  if (!url) return { ok: false, detail: 'submission.json 의 serviceUrl 이 비어 있음' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SERVICE_URL_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store', signal: controller.signal });
    if (res.status === 200) return { ok: true, detail: `HTTP ${res.status}` };
    return { ok: false, detail: `배포 응답 이상 — HTTP ${res.status} (200 아님)` };
  } catch (e) {
    const reason = e.name === 'AbortError'
      ? `타임아웃 ${SERVICE_URL_TIMEOUT_MS / 1000}s`
      : String(e.message).slice(0, 80);
    return {
      ok: false,
      detail: `응답 없음(타임아웃/네트워크: ${reason}) — 배포 중단인지 일시 장애인지 사람이 확인`,
    };
  } finally {
    clearTimeout(timer);
  }
}

// 활용 API 목록의 "단일 소스" — 제출 서류에 적을 11개와 정확히 같아야 한다.
// 개수만 비교하면 하나가 다른 걸로 바뀌어도(모양만 맞으면) 조용히 통과한다 — 그래서 이름 집합으로 비교한다.
const EXPECTED_APIS = new Set([
  'searchFestival2', 'locationBasedList2', 'areaBasedList2', 'searchKeyword2', 'searchStay2',
  'detailCommon2', 'detailIntro2', 'detailInfo2', 'detailImage2', 'areaCode2', 'categoryCode2',
]);

function checkApiList() {
  const stripped = stripComments(readFileSync(resolve(REPO, 'lib', 'tour-api.ts'), 'utf8'));
  const found = new Set(
    (stripped.match(/'(?:area|category|location|search|detail)[A-Za-z0-9]*2'/g) || [])
      .map((s) => s.slice(1, -1)),
  );
  const missing = [...EXPECTED_APIS].filter((n) => !found.has(n));
  const extra = [...found].filter((n) => !EXPECTED_APIS.has(n));
  const ok = missing.length === 0 && extra.length === 0;
  const detail = ok
    ? `lib/tour-api.ts — 11개 전부 일치(주석 제외)`
    : `lib/tour-api.ts 불일치(주석 제외) — 누락: ${missing.length ? missing.join(', ') : '없음'} / 초과: ${extra.length ? extra.join(', ') : '없음'}`;
  return { ok, detail };
}

// 출처 표기 허용 형태: ⓒ(U+24D2) / ©(U+00A9) / &copy; 모두 인정. 구분자·개행은 자유.
// ⚠️ 이 검사는 "주석이 아닌 소스에 매칭 문자열이 존재한다"만 증명한다.
// "실제로 화면에 렌더링된다"의 증거가 아니다 — 그건 사람이 페이지를 열어 봐야 안다.
const ATTRIBUTION_STRICT = /출처\s*[:：]?\s*(?:ⓒ|©|&copy;)\s*한국관광(?:공사|콘텐츠랩)/;
const ATTRIBUTION_LOOSE = /(?:ⓒ|©|&copy;)\s*한국관광/;

function checkAttribution() {
  const hit = grepUi(ATTRIBUTION_STRICT);
  if (hit) {
    return {
      ok: true,
      detail: `발견: ${hit.file}:${hit.line} (주석 제외) — ⚠️ 문자열 존재만 확인함. 실제 렌더링 여부는 사람이 페이지를 열어 확인할 것`,
    };
  }
  const loose = grepUi(ATTRIBUTION_LOOSE);
  return {
    ok: false,
    detail: loose
      ? `느슨한 표기만 발견(${loose.file}:${loose.line}) — "출처: ⓒ한국관광공사" 형식 필요`
      : 'UI 에 출처 표기 없음(주석 제외) — 규정상 필수. "출처: ⓒ한국관광공사" 추가 필요',
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
