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
const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
// 파일명에 시각을 넣는다 — 제출 항목은 하루에도 여러 번 바뀐다(자산 추가, 출처 표기
// 반영 등). 날짜만 쓰면 직전 실행 리포트가 덮어써져 "언제부터 충족됐나"를 잃는다.
const fileStamp = `${stamp}-${pad(now.getHours())}${pad(now.getMinutes())}`;

const cfg = JSON.parse(readFileSync(resolve(HERE, 'submission.json'), 'utf8'));

// ─── auto 검사기 ───
// excludeDirs: 재귀에서 통째로 건너뛸 절대경로 디렉터리 목록 (Fix B — app/api 제외용)
function walk(dir, exts, acc = [], excludeDirs = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) {
      if (excludeDirs.includes(p)) continue;
      walk(p, exts, acc, excludeDirs);
    } else if (exts.some((x) => e.name.toLowerCase().endsWith(x))) acc.push(p);
  }
  return acc;
}

// 한 글자씩 훑는 단일 패스 상태기계(완전한 TS 파서는 아니지만, 문자열/템플릿 리터럴
// 상태를 파일 전체에 걸쳐 유지한다 — 줄 단위로 끊어 처리하면 여러 줄짜리 템플릿
// 리터럴 안의 "//" 처럼 보이는 내용(예: URL)에 뒤가 통째로 잘려나간다).
// 불변식: 주석은 공백으로 치환하되 줄 구조는 보존한다 — file:line 보고가 정확해야
// 하므로, 개행 문자는 (블록 주석 내부를 포함해) 절대 지우지 않는다.
// 그래서 stripComments(src).text.length === src.length 가 항상 성립해야 한다.
//
// 🔴 알려진 맹점: 정규식 리터럴(/.../ )을 별도 상태로 다루지 않는다. 예를 들어
// `/href="([^"]+)"/` 안의 따옴표 3개는 sq/dq 상태를 오르내리다 파일 끝까지 dq에
// 갇힐 수 있다 — 그러면 그 뒤의 모든 "주석"이 문자열 취급되어 스트립되지 않고
// 그대로 남는다(= 주석이 실제 코드로 오인되어 매칭에 잡히는 구멍). 정규식 리터럴을
// 완전히 파싱하는 비용을 들이는 대신, **파서가 code 상태로 끝나지 않으면(state !==
// 'code') 그 파일을 신뢰하지 않는다** — 호출자가 balanced 플래그로 이를 감지해
// 해당 파일을 매칭에서 제외하고 "파싱 실패"로 보고한다.
function stripComments(src) {
  const n = src.length;
  let out = '';
  let state = 'code'; // code | line | block | sq | dq | tpl
  for (let i = 0; i < n; i++) {
    const ch = src[i];
    const next = i + 1 < n ? src[i + 1] : '';

    if (state === 'code') {
      // 여는 기호는 두 글자(// 또는 /*)를 한 번에 소비한다 — close 쪽(*/)과 동일하게.
      // 하나만 소비하면 남은 글자(예: /* 의 '*')가 다음 루프에서 독립적으로 재해석되어
      // 바로 뒤따르는 '/'와 잘못 짝지어 주석을 너무 일찍 닫아버릴 수 있다(Finding 8).
      if (ch === '/' && next === '/') { state = 'line'; out += '  '; i++; continue; }
      if (ch === '/' && next === '*') { state = 'block'; out += '  '; i++; continue; }
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
  // balanced: 파일 끝에서 code 상태였는가. false 면 sq/dq/tpl/line/block 중 하나에
  // 갇힌 채 끝난 것 — 정규식 리터럴의 따옴표 등으로 상태가 어긋났을 가능성이 높으므로
  // 호출자는 이 파일의 stripped 결과를 매칭에 쓰지 말아야 한다.
  return { text: out, balanced: state === 'code' };
}

// app/ 아래만 스캔한다. 최상위 components/ 는 이 저장소에 없다 —
// 실제 컴포넌트는 app/components 아래에 있고 위 walk 이 이미 재귀적으로 포함한다.
// app/api/ 는 제외한다 — 서버 라우트 핸들러는 렌더링되는 화면이 아니라서, 거기 있는
// 문자열은 "심사자가 실제로 보는 화면에 출처가 표기됐다"는 증거가 되지 못한다
// (Fix B). UI 로 렌더링될 수 있는 코드만 봐야 이 검사가 의미가 있다.
// unscannable: Set<string> — balanced=false 로 나온 파일의 경로를 여기에 누적한다
// (넘기지 않으면 조용히 스킵만 한다). 그런 파일은 신뢰할 수 없으므로 매칭에 쓰지
// 않는다(Fix A) — 파서가 code 상태로 끝나지 않으면 그 파일을 신뢰하지 않는다.
function grepUi(pattern, unscannable) {
  const apiDir = resolve(REPO, 'app', 'api');
  const files = walk(resolve(REPO, 'app'), ['.tsx', '.ts'], [], [apiDir]);
  let hit = null;
  for (const f of files) {
    const { text, balanced } = stripComments(readFileSync(f, 'utf8'));
    if (!balanced) {
      if (unscannable) unscannable.add(f.replace(REPO, '.'));
      continue;
    }
    // 히트를 찾은 뒤에도 루프를 끝까지 돈다. 예전엔 첫 히트에서 즉시 반환해서,
    // 그 뒤에 있는 파싱 실패 파일이 unscannable 에 누적되지 않았다 — 판정은 맞아도
    // "무엇을 못 봤는지"를 사람에게 절반만 알려주는 셈이었다.
    // 판정 자체는 첫 히트로 고정되므로 결과는 이전과 동일하다.
    if (hit) continue;
    const m = pattern.exec(text);
    if (m) {
      const line = text.slice(0, m.index).split('\n').length;
      hit = { file: f.replace(REPO, '.'), line };
    }
  }
  return hit;
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
  const { text, balanced } = stripComments(readFileSync(resolve(REPO, 'lib', 'tour-api.ts'), 'utf8'));
  if (!balanced) {
    // 이 검사는 lib/tour-api.ts 딱 한 파일만 읽는다 — 그 하나가 신뢰할 수 없으면
    // 대체할 다른 소스가 없다. 신뢰 못 할 파싱 결과로 조용히 통과시키느니 실패시킨다(Fix A).
    return {
      ok: false,
      detail: 'lib/tour-api.ts 를 신뢰할 수 없음(주석 제거 파서가 문자열/정규식 리터럴 상태에서 끝남) — 자동판정 불가, 사람이 직접 확인할 것',
    };
  }
  const found = new Set(
    (text.match(/'(?:area|category|location|search|detail)[A-Za-z0-9]*2'/g) || [])
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
  // unscannable: STRICT/LOOSE 두 번의 grepUi 호출에서 balanced=false 로 나온 파일을
  // 같은 Set에 누적한다(둘 다 같은 파일 목록을 훑으므로 자동 중복 제거된다).
  const unscannable = new Set();
  const hit = grepUi(ATTRIBUTION_STRICT, unscannable);
  const loose = hit ? null : grepUi(ATTRIBUTION_LOOSE, unscannable);
  // ✅ 로 나오더라도 일부 파일을 못 읽었으면(=매칭 대상에서 제외됐으면) 그 사실을
  // detail 에 반드시 남긴다 — "찾았다"가 "전체를 봤다"를 의미하지 않는다(Fix A).
  const skipNote = unscannable.size
    ? ` (파싱 실패 ${unscannable.size}개 파일 제외: ${[...unscannable].join(', ')})`
    : '';
  if (hit) {
    return {
      ok: true,
      detail: `발견: ${hit.file}:${hit.line} (주석 제외) — ⚠️ 문자열 존재만 확인함. 실제 렌더링 여부는 사람이 페이지를 열어 확인할 것${skipNote}`,
    };
  }
  return {
    ok: false,
    detail: loose
      ? `느슨한 표기만 발견(${loose.file}:${loose.line}) — "출처: ⓒ한국관광공사" 형식 필요${skipNote}`
      : `UI 에 출처 표기 없음(주석 제외) — 규정상 필수. "출처: ⓒ한국관광공사" 추가 필요${skipNote}`,
  };
}

// 무장애 여행 정보는 KorService2 의 12번째 오퍼레이션이 아니라 **별개 API 상품**이다
// (상품ID 15101897, 서비스ID KorWithService2). 그래서 EXPECTED_APIS 11개 집합에
// 섞지 않고 독립 항목으로 검사한다 — 섞으면 checkApiList 의 "KorService2 11개와
// 일치"라는 의미가 무너진다.
function checkBarrierFree() {
  const p = resolve(REPO, 'lib', 'barrier-free-api.ts');
  if (!existsSync(p)) {
    return { ok: false, detail: 'lib/barrier-free-api.ts 없음 — 무장애 API 미연동' };
  }
  const { text, balanced } = stripComments(readFileSync(p, 'utf8'));
  if (!balanced) {
    return {
      ok: false,
      detail: 'lib/barrier-free-api.ts 를 신뢰할 수 없음(주석 제거 파서가 문자열/정규식 상태에서 끝남) — 사람이 직접 확인할 것',
    };
  }
  const hasService = text.includes('KorWithService2');
  const hasOperation = text.includes('detailWithTour2');
  const ok = hasService && hasOperation;
  return {
    ok,
    detail: ok
      ? 'lib/barrier-free-api.ts — KorWithService2/detailWithTour2 연동 확인(주석 제외)'
      : `lib/barrier-free-api.ts 에서 누락: ${[!hasService && 'KorWithService2', !hasOperation && 'detailWithTour2'].filter(Boolean).join(', ')}`,
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
  else if (item.id === 'barrier-free') r = checkBarrierFree();
  else if (item.id === 'attribution') r = checkAttribution();
  else if (item.id === 'spec-doc') r = checkSpecDoc();
  else if (item.id === 'images') r = checkImages();
  else r = { ok: false, detail: `알 수 없는 auto 항목: ${item.id}` };
  results.push({ ...item, ...r });
}

const done = results.filter((r) => r.ok).length;
const todo = results.filter((r) => !r.ok);
const daysLeft = Math.ceil((new Date(cfg.deadline) - now) / 86400000);

let md = `# 제출 준비 상태 — ${stamp} ${clock}\n\n`;
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
const outPath = resolve(OUT_DIR, `submission-${fileStamp}.md`);
writeFileSync(outPath, md, 'utf8');

console.log(`${done}/${results.length} 충족 · D-${daysLeft}`);
for (const t of todo) console.log(`  TODO ${t.id}: ${t.detail}`);
console.log(`report: ${outPath.replace(REPO, '.')}`);

// 🔴 process.exit() 를 쓰지 않는다. checkServiceUrl 이 fetch 를 하고 나면 undici 가
// 만든 핸들이 아직 정리 중인데, 그 상태에서 강제 종료하면 Windows + Node 24 에서
// libuv 가 죽는다: "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)".
// 그러면 종료 코드가 0/1 이 아니라 127 이 되어, exit code 로 판정하는 Loop 가
// "미충족 1건"과 "스크립트 붕괴"를 구분하지 못한다.
// (2026-08-13 실측: serviceUrl 이 비어 fetch 를 건너뛸 땐 안 터지고, 채우자마자 매번 터졌다.
//  응답 body 를 소비해도 소용없었다 — 원인은 body 가 아니라 process.exit() 자체다.)
// exitCode 만 설정하고 이벤트 루프가 스스로 비도록 둔다(실측 종료까지 ~300ms).
process.exitCode = todo.length === 0 ? 0 : 1;
