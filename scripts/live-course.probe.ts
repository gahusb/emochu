import { it, expect } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { collectCandidates, collectFestivals, collectStays } from '@/lib/course-candidates';
import { getWeekendForecast } from '@/lib/weather-api';
import { fetchBarrierFree } from '@/lib/barrier-free-api';
import { getNextWeekend, formatDateYMD } from '@/lib/tour-api';
import { getTripSaju } from '@/lib/trip-context';
import { enrichWithFacilities, scoreAndRankCandidates, filterByAccessibility, generateCourse, generateFallbackCourse, matchesElement, classifySpotRole, type CourseGenerationInput } from '@/lib/weekend-ai';
import { finalizeCourse } from '@/lib/course-quality';
import { getTripDates } from '@/lib/trip-context';
import type { CourseRequest, CourseData } from '@/lib/weekend-types';
import { matrixBatch, MATRIX_VERSION } from './course-matrix';
import { auditCourse } from './course-audit';
import { canSendProbeAi } from './live-course-options.mjs';

const profile = process.env.EMOCHU_LIVE_PROFILE ?? 'default';
const rulesOnly = process.env.EMOCHU_LIVE_RULES === '1';
const cases: (CourseRequest & { label: string; caseId?: string; theme?: boolean })[] = profile === 'matrix' ? matrixBatch(Number(process.env.EMOCHU_LIVE_BATCH)) : profile === 'festival' ? [
  { label: '서울 축제·토요일·하루', lat: 37.5665, lng: 126.978, destinationType: 'city', cityAreaCode: 1, duration: 'full_day', companion: 'couple', preferences: ['culture', 'food'], feeling: 'excited', visitDay: 'sat' },
  { label: '부산 축제·토요일·하루', lat: 35.1796, lng: 129.0756, destinationType: 'city', cityAreaCode: 6, duration: 'full_day', companion: 'friends', preferences: ['culture', 'photo'], feeling: 'excited', visitDay: 'sat' },
  { label: '전주 축제·1박2일', lat: 35.8242, lng: 127.148, destinationType: 'city', cityAreaCode: 37, duration: 'overnight', companion: 'family', preferences: ['culture', 'food'], feeling: 'healing', visitDay: 'sat' },
] : [
  { label: '서울 반나절·토요일', lat: 37.5665, lng: 126.978, destinationType: 'city', cityAreaCode: 1, duration: 'half_day', companion: 'solo', preferences: ['nature'], feeling: 'healing', visitDay: 'sat' },
  { label: '강릉 하루·일요일·이동약자 정보', lat: 37.7519, lng: 128.8761, destinationType: 'city', cityAreaCode: 32, duration: 'full_day', companion: 'family', preferences: ['nature', 'food'], feeling: 'healing', visitDay: 'sun', accessibility: ['mobility'] },
  { label: '안동 1박2일', lat: 36.5684, lng: 128.7294, destinationType: 'city', cityAreaCode: 35, duration: 'overnight', companion: 'couple', preferences: ['culture', 'food'], feeling: 'healing', visitDay: 'sat' },
];

type Call = { service: string; operation: string; http?: number; resultCode?: string; ms: number; error?: string; usage?: Record<string, number>; totalCount?: number; returnedItems?: number; forecastCoverage?: Record<string, { times: string[]; categories: string[] }> };
const errorCode = (e: unknown) => {
  const err = e as { name?: string; cause?: { code?: string } };
  return err.cause?.code ?? err.name ?? 'UnknownError';
};

it.skipIf(process.env.EMOCHU_LIVE_PROBE !== '1')('실제 관광정보 → AI → 최종 검증 (비공개·DB 미사용)', async () => {
  const replayName = process.env.EMOCHU_LIVE_REPLAY;
  if (replayName && !/^report-[0-9TZ.-]+\.json$/.test(replayName)) throw new Error('REPLAY_FILENAME_INVALID');
  // 이전 보고서에는 AI 설명 원문이 없다. 장소/일차/시간만 재현하고 설명 품질은 평가하지 않는다.
  const replay = replayName ? JSON.parse(readFileSync(`.scratch-live-course/${replayName}`, 'utf8')) as { matrixVersion?: string; results: { caseId?: string; label: string; raw: CourseData; final: CourseData }[] } : undefined;
  if (replay && profile === 'matrix' && !['2026-09-09-v1', MATRIX_VERSION].includes(replay.matrixVersion ?? '')) throw new Error('REPLAY_MATRIX_VERSION_CHANGED');
  if (rulesOnly && (profile !== 'matrix' || replay)) throw new Error('RULES_MODE_INVALID');
  const originalFetch = globalThis.fetch;
  const calls: Call[] = [];
  const results: Record<string, unknown>[] = [];
  const startedAt = new Date().toISOString();
  let paidCalls = 0;
  let caseAiCalls = 0;
  let blockedAiCalls = 0;
  let failures = 0;
  let aiRateLimited = false;
  let currentController: AbortController | undefined;
  let availableModels: string[] = [];
  const logs: string[] = [];
  const originalLog = console.log, originalWarn = console.warn;
  const mask = (text: string) => {
    for (const name of ['TOUR_API_KEY', 'WEATHER_API_KEY', 'GEMINI_API_KEY']) {
      const key = process.env[name];
      if (!key) continue;
      const variants = [key, encodeURIComponent(key)];
      try { variants.push(decodeURIComponent(key)); } catch { /* 원문만 사용 */ }
      for (const value of variants) if (value.length >= 8) text = text.replaceAll(value, '<KEY>');
    }
    return text.replace(/(serviceKey|key)=([^&\s"']+)/gi, '$1=<KEY>');
  };
  console.log = console.warn = (...args) => { logs.push(mask(args.map(String).join(' '))); };
  globalThis.fetch = async (resource, init) => {
    const url = new URL(typeof resource === 'string' ? resource : resource instanceof URL ? resource.href : resource.url);
    // DB, 임의 URL, 인증/사용자 데이터 전송은 실측 중에도 차단한다.
    const method = (init?.method ?? (resource instanceof Request ? resource.method : 'GET')).toUpperCase();
    const ai = url.hostname === 'generativelanguage.googleapis.com' && url.pathname.endsWith(':generateContent');
    const allowed = (url.hostname === 'apis.data.go.kr' && method === 'GET') ||
      (!replay && !rulesOnly && url.hostname === 'generativelanguage.googleapis.com' && (method === 'GET' || (ai && method === 'POST')));
    if (!allowed) throw new Error('LIVE_PROBE_NETWORK_TARGET_BLOCKED');
    if (calls.length >= 240) { currentController?.abort(); throw new Error('LIVE_PROBE_TOTAL_CALL_CAP'); }
    if (ai && !canSendProbeAi(paidCalls, caseAiCalls, profile === 'matrix', aiRateLimited)) {
      blockedAiCalls++;
      currentController?.abort();
      throw new Error('LIVE_PROBE_AI_CALL_CAP');
    }
    if (ai) { paidCalls++; caseAiCalls++; }
    const service = url.hostname === 'apis.data.go.kr' ? url.pathname.split('/').at(-2)! : 'Gemini';
    const operation = url.pathname.split('/').at(-1)!;
    const time = Date.now();
    const row: Call = { service, operation, ms: 0 }; calls.push(row);
    try {
      const response = await originalFetch(resource, { ...init, signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), ...(currentController ? [currentController.signal] : []), AbortSignal.timeout(ai ? 25_000 : 8_000)]) });
      row.http = response.status;
      if (ai && response.status === 429) aiRateLimited = true;
      try {
        const body = await response.clone().json();
        row.resultCode = body?.response?.header?.resultCode;
        row.totalCount = body?.response?.body?.totalCount;
        const items = body?.response?.body?.items?.item;
        row.returnedItems = Array.isArray(items) ? items.length : items ? 1 : 0;
        if (operation === 'getVilageFcst' && Array.isArray(items)) {
          row.forecastCoverage = Object.fromEntries([...new Set(items.map(i => String(i.fcstDate)))].map(date => {
            const daily = items.filter(i => i.fcstDate === date);
            return [date, { times: [...new Set(daily.map(i => String(i.fcstTime)))].sort(), categories: [...new Set(daily.map(i => String(i.category)))].sort() }];
          }));
        }
        if (body.usageMetadata) row.usage = Object.fromEntries(Object.entries(body.usageMetadata).filter(([, value]) => typeof value === 'number')) as Record<string, number>;
      } catch { /* 비JSON: HTTP 상태만 기록. 원문/URL/키는 저장하지 않는다. */ }
      return response;
    } catch (e) { row.error = errorCode(e); throw e; }
    finally { row.ms = Date.now() - time; }
  };
  try {
    if (!replay && !rulesOnly) {
      const modelResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', { headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! } });
      expect(modelResponse.ok, 'Gemini 모델 목록 접근 불가').toBe(true);
      const models = await modelResponse.json();
      availableModels = (models.models ?? []).filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent')).map((m: { name: string }) => m.name.replace('models/', ''));
    }
    const { saturday, sunday } = getNextWeekend();
    for (const req of cases) {
      const archived = replay?.results.find(r => req.caseId ? r.caseId === req.caseId : r.label === req.label);
      if (replay) {
        expect(archived?.raw?.stops?.length, 'REPLAY_CASE_MISSING').toBeGreaterThan(0);
        expect(archived?.final.verification?.visitDates, 'REPLAY_VISIT_DATES_CHANGED: 다른 주말의 일정은 이 재검증에서 지원하지 않음').toEqual(getTripDates(req.duration, req.visitDay));
        expect(archived?.raw.stops.every(s => typeof s.contentId === 'string' && Number.isFinite(s.latitude) && Number.isFinite(s.longitude)), 'REPLAY_COORDINATES_MISSING').toBe(true);
      }
      const start = Date.now(), callStart = calls.length, blockedStart = blockedAiCalls;
      caseAiCalls = 0;
      currentController = new AbortController();
      const deadline = setTimeout(() => currentController?.abort(), 53_000);
      try {
        const [candidates, festivals, stays, weather] = await Promise.all([
          collectCandidates(req), collectFestivals(req), collectStays(req),
          getWeekendForecast({ lat: req.lat, lng: req.lng, saturdayDate: formatDateYMD(saturday), sundayDate: formatDateYMD(sunday) }),
        ]);
        expect(candidates.length, `${req.label} 관광 후보 부족`).toBeGreaterThan(0);
        await enrichWithFacilities(candidates, 20);
        const saju = req.theme === false ? undefined : getTripSaju('wood', req.duration, req.visitDay);
        const rank = (theme?: NonNullable<typeof saju>['todayElement']) => scoreAndRankCandidates(candidates, req.preferences, req.companion, req.duration, weather, req.feeling, req.visitDay, theme);
        const plain = rank(), ranked = rank(saju?.todayElement);
        const info = req.accessibility?.length ? await fetchBarrierFree(ranked.map(s => s.contentId)) : new Map();
        const pool = filterByAccessibility(ranked, req.accessibility ?? [], info).map(s => ({ ...s, barrierFree: info.get(s.contentId) }));
        // 당시 AI 선택을 재현하되 원본 근거는 이번 관광 API 응답에 실제 존재해야 한다.
        const archivedIds = new Set(archived?.raw.stops.map(s => s.contentId));
        const selected = [...pool, ...candidates.filter(c => archivedIds.has(c.contentId) && !pool.some(p => p.contentId === c.contentId))];
        const input: CourseGenerationInput = { ...req, departure: { name: req.label, lat: req.lat, lng: req.lng }, candidates: selected, repairCandidates: candidates, festivals, stays, weather, saju, signal: currentController.signal };
        const generated: CourseData = archived ? {
          title: archived.raw.title, generationMode: archived.raw.generationMode,
          summary: '이전 일정의 장소·시간 재현 (AI 설명 원문 평가 제외)', tip: '', totalDistanceKm: archived.raw.totalDistanceKm,
          stops: archived.raw.stops.map((s, i) => ({ ...s, order: i + 1, description: '이전 일정 재검증용', tip: '' })),
        } : rulesOnly ? generateFallbackCourse(input.candidates, input.duration, input.departure, input.stays) : await generateCourse(input);
        const raw = structuredClone(generated);
        const quality = (data: CourseData) => auditCourse(data, input);
        const qualityBefore = quality(raw);
        const course = finalizeCourse(generated, input);
        const snapshot = (data: CourseData) => ({ title: data.title, generationMode: data.generationMode, stops: data.stops.map(s => ({ contentId: s.contentId, title: s.title, latitude: s.latitude, longitude: s.longitude, day: s.day, timeStart: s.timeStart, durationMin: s.durationMin, role: s.role, isStay: s.isStay, isFestival: s.isFestival, source: s.source, openStatus: s.openStatus, hoursStatus: s.hoursStatus, themeMatched: s.themeMatched, accessibilityStatus: s.accessibilityStatus, operatingHours: s.facilities?.operatingHours })), verification: data.verification, totalDistanceKm: data.totalDistanceKm });
        expect(course.stops.length).toBeGreaterThan(0);
        expect(course.stops.every(s => s.source === 'tourapi')).toBe(true);
        expect(new Set(course.stops.map(s => s.contentId)).size).toBe(course.stops.length);
        results.push({ caseId: req.caseId, label: req.label, request: req, status: 'completed', limitedByProbe: blockedAiCalls > blockedStart, duration: req.duration, elapsedMs: Date.now() - start, candidates: candidates.length, enriched: candidates.filter(c => c.facilities).length, ranked: pool.length, candidateRoles: Object.fromEntries([...new Set(candidates.map(classifySpotRole))].map(role => [role, candidates.filter(c => classifySpotRole(c) === role).length])), festivals: festivals.length, festivalCandidates: festivals.map(f => ({ contentId: f.contentId, title: f.title, eventStartDate: f.eventStartDate, eventEndDate: f.eventEndDate, playtime: f.playtime })), stays: stays.length, accessibilityRecords: info.size, weather, saju: saju ? { basisDate: saju.basisDate, element: saju.todayElement, matchedPool: ranked.filter(c => matchesElement(c, saju.todayElement)).length, changedRankPositions: ranked.filter((c, i) => c.contentId !== plain[i]?.contentId).length } : null, qualityBefore, qualityAfter: quality(course), raw: snapshot(raw), final: snapshot(course), calls: calls.slice(callStart) });
      } catch (error) {
        failures++;
        results.push({ caseId: req.caseId, label: req.label, request: req, status: 'failed', error: errorCode(error), elapsedMs: Date.now() - start, limitedByProbe: blockedAiCalls > blockedStart, calls: calls.slice(callStart) });
        // 실패도 표본으로 남긴다. 새 장소·응답을 만들어 성공으로 채우지 않는다.
      } finally { clearTimeout(deadline); currentController.abort(); currentController = undefined; }
    }
    expect(failures, '실측 중 실패한 조건이 있습니다. 보고서의 failed 행을 확인하세요.').toBe(0);
  } finally {
    globalThis.fetch = originalFetch; console.log = originalLog; console.warn = originalWarn;
    const dir = '.scratch-live-course'; mkdirSync(dir, { recursive: true });
    const path = `${dir}/report-${startedAt.replace(/[:.]/g, '-')}.json`;
    writeFileSync(path, mask(JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), mode: replay ? 'replay' : rulesOnly ? 'rules-only' : 'new-generation', profile, batch: profile === 'matrix' ? Number(process.env.EMOCHU_LIVE_BATCH) : undefined, matrixVersion: profile === 'matrix' ? MATRIX_VERSION : undefined, replayedFrom: replayName, plannedCases: cases.map(c => c.caseId ?? c.label), paidCalls, blockedAiCalls, aiRateLimited, aiPolicy: rulesOnly ? 'no AI' : profile === 'matrix' ? 'one initial attempt per case' : 'max 3 attempts per batch', scope: replay ? '3 archived itineraries + fresh external data; no AI calls; no DB writes; no AI prose evaluation; same visit dates only; inspect quality warnings separately' : '3 synthetic requests; real external data; no DB writes; AI request cap 3; total network cap 240; availability/grounding assertions only; inspect quality warnings separately', availableModels, calls, results, logs }, null, 2)));
    console.log(`실측 보고서: ${path}; 완료 표본 ${results.length - failures}/3; AI 전송 ${paidCalls}회, 상한 차단 ${blockedAiCalls}회`);
  }
});
