// 명시적 진단만: 관광 GET 최대 3회, AI·DB 사용 없음. 키·요청 URL을 출력하지 않는다.
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadLiveEnv, scrubLiveOutput } from './live-env.mjs';

loadLiveEnv();
if (!process.env.TOUR_API_KEY) throw new Error('TOUR_API_KEY_MISSING');
const startedAt = new Date().toISOString();
const calendar = new Date(Date.now() + 9 * 3600000);
calendar.setUTCHours(0, 0, 0, 0);
calendar.setUTCDate(calendar.getUTCDate() + (calendar.getUTCDay() === 0 ? -1 : (6 - calendar.getUTCDay() + 7) % 7));
const sat = calendar.toISOString().slice(0, 10).replaceAll('-', '');
const sunday = new Date(calendar); sunday.setUTCDate(sunday.getUTCDate() + 1);
const sun = sunday.toISOString().slice(0, 10).replaceAll('-', '');
const previous = new Date(calendar); previous.setUTCDate(previous.getUTCDate() - 30);
const from = previous.toISOString().slice(0, 10).replaceAll('-', '');
const windowCheck = process.argv[2] === '--window';
if (process.argv.length > (windowCheck ? 3 : 2)) throw new Error('USAGE: verify-live-festivals.mjs [--window]');
const queries = windowCheck ? [
  { label: '주말 기간만 전국', eventStartDate: sat, eventEndDate: sun },
  { label: '주말 기간+기존 서울 코드', eventStartDate: sat, eventEndDate: sun, areaCode: 1 },
  { label: '기존 30일+기존 서울 코드', eventStartDate: from, eventEndDate: sun, areaCode: 1 },
] : [
  { label: '기존 30일+종료 상한', eventStartDate: from, eventEndDate: sun },
  { label: '30일+종료 조건 생략', eventStartDate: from },
  { label: '연초+종료 조건 생략', eventStartDate: `${sat.slice(0, 4)}0101` },
];
const results = [];
try {
  for (const query of queries) {
    const url = new URL('https://apis.data.go.kr/B551011/KorService2/searchFestival2');
    for (const [key, value] of Object.entries({ serviceKey: process.env.TOUR_API_KEY, MobileOS: 'ETC', MobileApp: '이모추', _type: 'json', numOfRows: 1000, pageNo: 1, arrange: 'A', ...query })) if (key !== 'label') url.searchParams.set(key, String(value));
    const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' });
    const json = await response.json();
    const code = json?.response?.header?.resultCode;
    if (!response.ok || !['0000', '00'].includes(String(code))) throw new Error(`FESTIVAL_RESPONSE_${response.status}_${code}`);
    const body = json.response.body, raw = body?.items?.item;
    const items = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(item => Object.fromEntries(['contentid', 'title', 'addr1', 'areacode', 'mapx', 'mapy', 'eventstartdate', 'eventenddate'].map(k => [k, item[k]])));
    const active = items.filter(i => i.eventstartdate <= sun && i.eventenddate >= sat);
    results.push({ query, http: response.status, resultCode: code, totalCount: body?.totalCount, returned: items.length, activeCount: active.length, active, items });
    console.log(`${query.label}: 전체 ${body?.totalCount}, 수신 ${items.length}, 주말 겹침 ${active.length}`);
  }
} catch (err) {
  console.error(scrubLiveOutput(`진단 중단: ${err.cause?.code ?? err.message}`)); process.exitCode = 1;
} finally {
  const dir = '.scratch-live-course'; mkdirSync(dir, { recursive: true });
  const path = `${dir}/festivals-${startedAt.replace(/[:.]/g, '-')}.json`;
  writeFileSync(path, scrubLiveOutput(JSON.stringify({ startedAt, saturday: sat, sunday: sun, scope: 'search semantics survey; GET only; max 3 calls; no AI/DB; page cap 1000', results }, null, 2)));
  console.log(`진단 보고서: ${path}`);
}
