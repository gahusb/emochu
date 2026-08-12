#!/usr/bin/env node
// ============================================================
// TourAPI 실호출 감시 — 이모추가 쓰는 11개 오퍼레이션 스모크
//
// 이 스크립트가 호출의 **단일 경유점**이다. 에이전트는 이걸 실행만 하고
// 직접 fetch 를 만들지 않는다. (결정적 작업은 모델이 아니라 스크립트가 한다)
//
// 🔴 인증키는 어떤 출력에도 남기지 않는다. 모든 출력은 mask() 를 거친다.
//
// 사용: node loops/tourapi-watch/smoke.mjs
// 종료 코드: 0 = FAIL 없음 / 1 = FAIL 있음 (Gate 로 쓸 수 있게)
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const OUT_DIR = resolve(HERE, 'outputs');
const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';

// ─── 인증키 (이 파일만 읽는다) ───
function loadKey() {
  for (const f of ['.env.local', '.env']) {
    const p = resolve(REPO, f);
    if (!existsSync(p)) continue;
    const m = readFileSync(p, 'utf8').match(/^TOUR_API_KEY=(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  if (process.env.TOUR_API_KEY) return process.env.TOUR_API_KEY;
  console.error('TOUR_API_KEY 를 찾을 수 없습니다 (.env.local / .env / 환경변수).');
  process.exit(2);
}
const KEY = loadKey();

// 키는 세 가지 모습으로 새어나갈 수 있다. TourAPI 인증키는 애초에 인코딩본·디코딩본이
// 따로 발급되고(공모전에도 둘 다 제출한다), URL 에 실리면서 한 번 더 인코딩된다.
// 원문만 지우면 `%2F`·`%2B` 가 섞인 변형이 그대로 남는다 — mask() 와 최종 안전망이
// 같은 목록을 봐야 "지웠다"와 "안 남았다"가 어긋나지 않는다.
const KEY_VARIANTS = (() => {
  const set = new Set([KEY, encodeURIComponent(KEY)]);
  try {
    set.add(decodeURIComponent(KEY)); // 이미 인코딩된 키가 들어온 경우의 원문
  } catch {
    // 잘못된 % 시퀀스 — 디코딩 변형은 존재하지 않는다고 보고 넘어간다
  }
  return [...set].filter((v) => v.length >= 8); // 빈 값·짧은 값으로 전체를 치환하는 사고 방지
})();

const mask = (s) => {
  let out = String(s);
  for (const v of KEY_VARIANTS) out = out.replaceAll(v, '<KEY>');
  return out;
};

// ─── 날짜 ───
const today = new Date();
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const stamp = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
const plusDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

// ─── 대상: 이모추가 실제 쓰는 11개 (lib/tour-api.ts 의 export 함수와 1:1) ───
const SAMPLE_CONTENT_ID = 126508; // 경복궁 — 폐지될 일이 없는 대표 관광지
const OPS = [
  ['searchFestival2',    { eventStartDate: ymd(today), eventEndDate: ymd(plusDays(30)), numOfRows: 3, pageNo: 1 }],
  ['locationBasedList2', { mapX: 126.9780, mapY: 37.5665, radius: 5000, numOfRows: 3, pageNo: 1 }],
  ['areaBasedList2',     { areaCode: 1, contentTypeId: 12, numOfRows: 3, pageNo: 1 }],
  ['searchKeyword2',     { keyword: '경복궁', numOfRows: 3, pageNo: 1 }],
  ['searchStay2',        { areaCode: 1, numOfRows: 3, pageNo: 1 }],
  ['detailCommon2',      { contentId: SAMPLE_CONTENT_ID }],
  ['detailIntro2',       { contentId: SAMPLE_CONTENT_ID, contentTypeId: 12 }],
  ['detailInfo2',        { contentId: SAMPLE_CONTENT_ID, contentTypeId: 12 }],
  ['detailImage2',       { contentId: SAMPLE_CONTENT_ID, imageYN: 'Y' }],
  ['areaCode2',          { numOfRows: 5, pageNo: 1 }],   // 🔴 2026 폐기 예정
  ['categoryCode2',      { numOfRows: 5, pageNo: 1 }],   // 🔴 2026 폐기 예정
];
const DEPRECATED = new Set(['areaCode2', 'categoryCode2']);

// ─── 호출 ───
async function callOnce(op, params) {
  const url = new URL(`${BASE_URL}/${op}`);
  url.searchParams.set('serviceKey', KEY);
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', '이모추');
  url.searchParams.set('_type', 'json');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const t0 = Date.now();
  // 🔴 no-store: 심사가 보는 것은 "개발 기간 내 실호출 이력"이다. 캐시로 때우면 이력이 안 남는다.
  const res = await fetch(url.toString(), { cache: 'no-store' });
  const ms = Date.now() - t0;
  const text = await res.text();

  let resultCode = null, resultMsg = null, count = null, totalCount = null, parseErr = null;
  try {
    const j = JSON.parse(text);
    resultCode = j?.response?.header?.resultCode ?? null;
    resultMsg = j?.response?.header?.resultMsg ?? null;
    const items = j?.response?.body?.items?.item;
    count = items ? (Array.isArray(items) ? items.length : 1) : 0;
    totalCount = j?.response?.body?.totalCount ?? null;
  } catch {
    parseErr = mask(text).replace(/\s+/g, ' ').slice(0, 160);
  }
  return { op, http: res.status, ms, resultCode, resultMsg, count, totalCount, parseErr };
}

async function call(op, params) {
  try {
    return await callOnce(op, params);
  } catch (e) {
    // Failure Policy 1: 일시적 오류는 1회 재시도
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await callOnce(op, params);
      r.retried = true;
      return r;
    } catch (e2) {
      return { op, http: 'ERR', ms: 0, error: mask(e2.message).slice(0, 160), retried: true };
    }
  }
}

// ─── 판정 ───
function verdictOf(r) {
  if (r.http !== 200) return 'FAIL';
  if (r.parseErr) return 'FAIL';
  if (r.resultCode !== '0000') return 'FAIL';
  if (r.count === 0) return 'WARN';   // 폐기는 404가 아니라 "200인데 0"으로 먼저 온다
  return 'PASS';
}

const rows = [];
for (const [op, p] of OPS) {
  const r = await call(op, p);
  r.verdict = verdictOf(r);
  rows.push(r);
  process.stdout.write(`${r.verdict === 'PASS' ? '.' : r.verdict === 'WARN' ? '?' : 'X'}`);
  await new Promise((r) => setTimeout(r, 350));   // rate limit 배려
}
process.stdout.write('\n');

const pass = rows.filter((r) => r.verdict === 'PASS').length;
const warn = rows.filter((r) => r.verdict === 'WARN').length;
const fail = rows.filter((r) => r.verdict === 'FAIL').length;
const depBad = rows.filter((r) => DEPRECATED.has(r.op) && r.verdict !== 'PASS');

// ─── 리포트 ───
let md = `# TourAPI 실호출 감시 — ${stamp}\n\n`;
md += `> \`node loops/tourapi-watch/smoke.mjs\` 산출물. \`cache: 'no-store'\` 직접 호출 — **심사용 호출 이력 확보** 목적.\n\n`;
md += `## 요약\n\n| PASS | WARN | FAIL | 합계 |\n|---|---|---|---|\n| ${pass} | ${warn} | ${fail} | ${rows.length} |\n\n`;
md += depBad.length === 0
  ? `- **폐기 예정 오퍼레이션**: ✅ \`areaCode2\`·\`categoryCode2\` 모두 정상 응답\n\n`
  : `- 🔴 **폐기 예정 오퍼레이션 이상: ${depBad.map((r) => `\`${r.op}\`(${r.verdict})`).join(', ')} — 즉시 사람 확인. 서비스가 곧 깨진다는 신호다.**\n\n`;

md += `## 오퍼레이션별\n\n`;
md += `| 오퍼레이션 | 판정 | HTTP | resultCode | 항목 | totalCount | 응답(ms) | 비고 |\n|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) {
  const icon = r.verdict === 'PASS' ? '✅' : r.verdict === 'WARN' ? '🟡' : '🔴';
  const note = [
    DEPRECATED.has(r.op) ? '**폐기 예정**' : '',
    r.retried ? '재시도 1회' : '',
    r.parseErr ? `파싱실패: ${r.parseErr.replaceAll('|', '\\|')}` : '',
    r.error ? `에러: ${r.error.replaceAll('|', '\\|')}` : '',
    r.resultCode && r.resultCode !== '0000' ? String(r.resultMsg ?? '') : '',
  ].filter(Boolean).join(' / ');
  md += `| \`${r.op}\` | ${icon} ${r.verdict} | ${r.http} | ${r.resultCode ?? '-'} | ${r.count ?? '-'} | ${r.totalCount ?? '-'} | ${r.ms} | ${note} |\n`;
}

md += `\n## 검증 체크리스트\n\n`;
const ck = (b, s) => `- [${b ? 'x' : ' '}] ${s}\n`;
md += ck(rows.length === OPS.length, `11개 오퍼레이션 전부 호출됨 (${rows.length}/${OPS.length})`);
md += ck(true, 'HTTP 상태와 resultCode 가 기록됨');
md += ck(warn === 0, `결과 항목 수가 0인 오퍼레이션 없음 (WARN ${warn}건)`);
md += ck(depBad.length === 0, '폐기 예정 오퍼레이션 생존 확인');
md += ck(true, '리포트에 인증키 문자열 없음 (mask 적용)');

// 마지막 안전망: 그래도 키가 남았으면 실패시킨다.
// 🔴 **파일을 쓰기 전에** 검사한다. 쓰고 나서 검사하면, 이미 인증키가 담긴 파일이
// 디스크에 남은 뒤에 exit 3 을 내는 셈이라 안전망 노릇을 못 한다.
// 검사 대상도 원문뿐 아니라 인코딩·디코딩 변형 전부다(KEY_VARIANTS).
const leaked = KEY_VARIANTS.filter((v) => md.includes(v));
if (leaked.length) {
  console.error(`FATAL: 리포트에 인증키가 남아 있습니다 (변형 ${leaked.length}종 일치). 파일을 쓰지 않고 중단합니다.`);
  process.exit(3);
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const outPath = resolve(OUT_DIR, `api-health-${stamp}.md`);
writeFileSync(outPath, md, 'utf8');

console.log(`PASS=${pass} WARN=${warn} FAIL=${fail}`);
if (depBad.length) console.log(`DEPRECATED-ALERT: ${depBad.map((r) => r.op).join(',')}`);
console.log(`report: ${outPath.replace(REPO, '.')}`);

process.exit(fail > 0 ? 1 : 0);
