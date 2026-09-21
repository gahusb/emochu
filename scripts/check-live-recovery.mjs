// 명시적 회복 점검: 상세 GET 1회 + 작은 AI POST 1회만. 재시도·DB·계정 설정 변경 없음.
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadLiveEnv, scrubLiveOutput } from './live-env.mjs';

if (process.argv.length !== 2) throw new Error('RECOVERY_ARGUMENTS_INVALID');
loadLiveEnv();
const startedAt = new Date().toISOString(), results = [];
const probe = async (service, operation, request, inspect) => {
  const start = Date.now();
  try {
    const response = await request();
    let data;
    try { data = await response.json(); } catch { /* 원문을 로그에 쓰지 않는다. */ }
    results.push({ service, operation, http: response.status, elapsedMs: Date.now() - start, retryAfter: response.headers.get('retry-after')?.slice(0, 100), ...inspect(data, response.ok) });
  } catch (error) {
    results.push({ service, operation, elapsedMs: Date.now() - start, error: error.cause?.code ?? error.name ?? 'Error', usableResponse: false });
  }
};

if (process.env.TOUR_API_KEY) {
  const url = new URL('https://apis.data.go.kr/B551011/KorService2/detailIntro2');
  for (const [name, value] of Object.entries({ serviceKey: process.env.TOUR_API_KEY, MobileOS: 'ETC', MobileApp: '이모추', _type: 'json', contentId: '2788760', contentTypeId: '39' })) url.searchParams.set(name, value);
  await probe('KorService2', 'detailIntro2', () => fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8_000) }), (data, ok) => {
    const code = data?.response?.header?.resultCode, item = data?.response?.body?.items?.item;
    const items = Array.isArray(item) ? item : item ? [item] : [];
    return { resultCode: code, returnedItems: items.length, hasOperatingHours: items.some(i => Boolean(i.opentimefood?.trim())), usableResponse: ok && ['0000', '00'].includes(String(code)) && items.some(i => String(i.contentid) === '2788760') };
  });
} else results.push({ service: 'KorService2', skipped: 'key unavailable', usableResponse: false });

if (process.env.GEMINI_API_KEY) {
  await probe('Gemini', 'gemini-3.6-flash:generateContent', () => fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY }, signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Connectivity check only. Return exactly the JSON object {"ok":true}.' }] }], generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1024, temperature: 0, thinkingConfig: { thinkingBudget: 512 } } }),
  }), (data, ok) => {
    const content = (data?.candidates?.[0]?.content?.parts ?? []).filter(p => !p.thought).map(p => p.text ?? '').join('');
    let valid = false; try { valid = JSON.parse(content).ok === true; } catch { /* HTTP 성공만 생성 성공으로 세지 않는다. */ }
    return { status: data?.error?.status, finishReason: data?.candidates?.[0]?.finishReason, usage: data?.usageMetadata, usableResponse: ok && valid };
  });
} else results.push({ service: 'Gemini', skipped: 'key unavailable', usableResponse: false });

mkdirSync('.scratch-live-course', { recursive: true });
const path = `.scratch-live-course/recovery-${startedAt.replace(/[:.]/g, '-')}.json`;
const report = { startedAt, finishedAt: new Date().toISOString(), scope: 'one tourism detail GET and one tiny AI POST; no retries, database, quota dashboard or real-device verification', results };
writeFileSync(path, scrubLiveOutput(JSON.stringify(report, null, 2)));
console.log(scrubLiveOutput(JSON.stringify({ path, ...report }, null, 2)));
