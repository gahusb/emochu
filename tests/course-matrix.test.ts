import { describe, expect, it } from 'vitest';
import { COURSE_MATRIX, matrixBatch } from '../scripts/course-matrix';
import { auditCourse } from '../scripts/course-audit';
import { liveCourseOptions, canSendProbeAi } from '../scripts/live-course-options.mjs';
import { summarizeMatrix } from '../scripts/matrix-summary.mjs';
import { getTripDates } from '@/lib/trip-context';
import type { CourseGenerationInput, ScoredSpot } from '@/lib/weekend-ai';
import type { CourseData } from '@/lib/weekend-types';

describe('24조건 실행 계약', () => {
  it('429가 관측되면 묶음의 남은 AI 요청도 차단한다', () => {
    expect(canSendProbeAi(1, 0, true, true)).toBe(false);
    expect(canSendProbeAi(1, 0, false, true)).toBe(false);
  });
  it('규칙 전용 실행은 AI/재생과 명시적으로 구분한다', () => {
    expect(liveCourseOptions(['--matrix', '6', '--rules'])).toMatchObject({ rulesOnly: true, replay: '' });
    expect(() => liveCourseOptions(['--matrix', '6', '--rules', '--replay', 'report-1.json'])).toThrow();
  });
  it('앞 조건의 재시도로 다음 조건의 AI 기회를 소진하지 않는다', () => {
    expect(canSendProbeAi(1, 1, true)).toBe(false);
    expect(canSendProbeAi(1, 0, true)).toBe(true);
    expect(canSendProbeAi(2, 0, true)).toBe(true);
    expect(canSendProbeAi(3, 0, true)).toBe(false);
    expect(canSendProbeAi(1, 1, false)).toBe(true);
  });
  it('3지역 × 4길이 × 2조건이고 배치마다 3개씩 중복 없이 나뉜다', () => {
    expect(COURSE_MATRIX).toHaveLength(24);
    expect(new Set(COURSE_MATRIX.map(c => c.caseId)).size).toBe(24);
    const batches = Array.from({ length: 8 }, (_, i) => matrixBatch(i + 1));
    expect(batches.every(b => b.length === 3)).toBe(true);
    expect(batches.flat()).toEqual(COURSE_MATRIX);
    expect(COURSE_MATRIX.filter(c => c.theme)).toHaveLength(12);
  });
  it.each(COURSE_MATRIX)('$caseId의 일차·공개 좌표·접근성 조건을 확인한다', req => {
    expect(req.lat).toBeGreaterThanOrEqual(33); expect(req.lat).toBeLessThanOrEqual(43);
    expect(req.lng).toBeGreaterThanOrEqual(124); expect(req.lng).toBeLessThanOrEqual(132);
    expect(getTripDates(req.duration, req.visitDay, new Date('2026-09-09T00:00:00Z'))).toHaveLength(req.duration === 'overnight' ? 2 : 1);
    if (req.duration === 'overnight') expect(req.visitDay).toBe('sat');
    if (req.companion === 'family') expect(req.accessibility?.length).toBeGreaterThan(0);
    expect(Object.keys(req)).not.toContain('birthYear');
  });
  it.each([0, 9, 1.2, NaN])('잘못된 배치 %s는 거부한다', value => expect(() => matrixBatch(value)).toThrow());
  it('기존 실행·축제·재생 명령을 유지한다', () => {
    expect(liveCourseOptions([])).toEqual({ profile: 'default', batch: '', replay: '' });
    expect(liveCourseOptions(['--festival', '--replay', 'report-2026-09-09T00-00-00-000Z.json'])).toMatchObject({ profile: 'festival', replay: 'report-2026-09-09T00-00-00-000Z.json' });
    expect(liveCourseOptions(['--matrix', '8'])).toEqual({ profile: 'matrix', batch: '8', replay: '' });
  });
  it.each([['--matrix'], ['--matrix', '0'], ['--matrix', '9'], ['--matrix', 'all'], ['--matrix', '01'], ['--matrix', '1', '--festival'], ['--replay', '../secret.json'], ['--replay', 'report-1.json', 'extra']])('잘못된 CLI %j는 호출 전에 거부한다', args => expect(() => liveCourseOptions(args)).toThrow());
});

const now = new Date('2026-09-09T00:00:00Z');
const candidates: ScoredSpot[] = [12, 39, 39].map((type, i) => ({ contentId: String(i), title: String(i), contentTypeId: type, cat1: 'A01', cat2: '', cat3: i === 2 ? 'A05020900' : '', addr1: '', latitude: 37.5, longitude: 127, score: 0, distanceKm: 0, usetime: '09:00~21:00' }));
const fixture = (): { input: CourseGenerationInput; course: CourseData } => ({
  input: { departure: { name: '검증', lat: 37.5, lng: 127 }, duration: 'half_day', visitDay: 'sat', companion: 'solo', preferences: ['nature'], candidates: structuredClone(candidates), festivals: [], stays: [], weather: { saturday: { date: '20260912', sky: 'clear', precipitation: 'none', tempMin: 0, tempMax: 0, pop: 0, summary: '' }, sunday: { date: '20260913', sky: 'cloudy', precipitation: 'none', tempMin: 0, tempMax: 0, pop: 0, summary: '', unavailable: true }, recommendation: '' } },
  course: { title: '검증', summary: '', tip: '', totalDistanceKm: 0, stops: candidates.map((c, i) => ({ contentId: c.contentId, title: c.title, latitude: c.latitude, longitude: c.longitude, day: 1, order: i + 1, timeStart: ['10:00', '11:30', '13:00'][i], durationMin: 60, isFestival: false, description: '', tip: '', role: (['attraction', 'restaurant', 'cafe'] as const)[i] })) },
});
describe('성공·품질·미확인을 구분하는 집계', () => {
  it('알려진 검사는 통과하되 선택하지 않은 일요일 실패는 세지 않는다', () => {
    const { input, course } = fixture(); const result = auditCourse(course, input, now);
    expect(result.knownChecksPass).toBe(true); expect(result.forecastUnknownDates).toEqual([]); expect(result.accessibility.checkedStops).toBe(0);
  });
  it('빈 코스는 품질 통과가 아니다', () => {
    const { input, course } = fixture(); course.stops = []; expect(auditCourse(course, input, now).knownChecksPass).toBe(false);
  });
  it.each(['id', 'coordinate', 'title', 'invalid-coordinate'])('원본 %s 불일치는 잡는다', kind => {
    const { input, course } = fixture();
    if (kind === 'id') course.stops[0].contentId = 'unknown';
    else if (kind === 'coordinate') course.stops[0].latitude = 37.6;
    else if (kind === 'title') course.stops[0].title = '가짜';
    else course.stops[0].latitude = input.candidates[0].latitude = NaN;
    expect(auditCourse(course, input, now).ungrounded).toHaveLength(1);
  });
  it('운영시간 미확인과 실제 시간 불일치를 분리한다', () => {
    const { input, course } = fixture(); input.candidates[0].usetime = undefined; input.candidates[2].usetime = '09:00~12:00';
    const result = auditCourse(course, input, now); expect(result.hoursUnknown).toEqual(['0']); expect(result.hoursOutside).toEqual(['2']); expect(result.knownChecksPass).toBe(false);
  });
  it('휴무·선택일 날씨·접근성 정보 분모를 기록한다', () => {
    const { input, course } = fixture(); input.visitDay = 'sun'; input.accessibility = ['mobility']; input.candidates[0].closedWeekdays = [0]; input.candidates[1].barrierFree = { mobility: true, details: { exit: '계단 있음' } };
    const result = auditCourse(course, input, now); expect(result.wrongDate).toEqual(['0']); expect(result.forecastUnknownDates).toEqual(['2026-09-13']); expect(result.accessibility).toMatchObject({ checkedStops: 3, withAllRequestedInfo: 1 });
  });
  it('식사 부족·시간 겹침·중복도 성공과 별개로 판정한다', () => {
    const { input, course } = fixture(); course.stops[1] = { ...course.stops[0], timeStart: '10:30' };
    const result = auditCourse(course, input, now); expect(result.composition.ok).toBe(false); expect(result.schedule.length).toBeGreaterThan(0); expect(result.duplicateCount).toBe(1);
  });
});

describe('표본 집계의 누락·중복·혼합 방지', () => {
  const reports = () => Array.from({ length: 8 }, (_, i) => {
    const { input, course } = fixture(), audit = auditCourse(course, input, now);
    return { matrixVersion: '2026-09-09-v2', profile: 'matrix', batch: i + 1, mode: 'new-generation', startedAt: now.toISOString(), calls: [], results: matrixBatch(i + 1).map((c, j) => ({ caseId: c.caseId, status: 'completed', limitedByProbe: false, elapsedMs: 1000 * (i * 3 + j + 1), final: { ...course, generationMode: 'ai' }, qualityBefore: audit, qualityAfter: audit, calls: [] })) };
  });
  it('24개를 중복 없이 집계하고 미시도 AI를 따로 센다', () => {
    const result = summarizeMatrix(reports());
    expect(result.recorded).toBe(24); expect(result.missing).toEqual([]); expect(result.knownChecksAfter).toBe(24);
    expect(result.observedCompletedLatencyMs).toEqual({ p50: 12000, p95: 23000 }); expect(result.noAiAttempt).toBe(24);
  });
  it('부분 보고서는 24개 성공처럼 채우지 않는다', () => {
    const result = summarizeMatrix(reports().slice(0, 1)); expect(result.recorded).toBe(3); expect(result.missing).toHaveLength(21);
  });
  it('실패와 규칙 대체는 AI 성공과 구별한다', () => {
    const data = reports(); data[0].results[0].status = 'failed'; data[0].results[1].final.generationMode = 'rules'; data[0].results[1].limitedByProbe = true;
    const result = summarizeMatrix(data); expect(result.completed).toBe(23); expect(result.failed).toBe(1); expect(result.ai).toBe(22); expect(result.rules).toBe(1); expect(result.probeLimited).toBe(1);
  });
  it('빈 표본은 지연 0ms 대신 미측정이다', () => {
    const data = reports()[0]; data.results = []; expect(summarizeMatrix([data]).observedCompletedLatencyMs).toEqual({ p50: null, p95: null });
  });
  it.each(['duplicate', 'mode', 'rules-mode', 'date', 'version', 'wrong-batch', 'unknown-id', 'status'])('%s가 섞이면 집계를 거부한다', kind => {
    const data = reports();
    if (kind === 'duplicate') data[1] = data[0];
    if (kind === 'mode') data[1].mode = 'replay';
    if (kind === 'rules-mode') data[1].mode = 'rules-only';
    if (kind === 'date') data[1].startedAt = '2026-09-10T00:00:00Z';
    if (kind === 'version') data[1].matrixVersion = '2026-09-09-v1';
    if (kind === 'wrong-batch') data[1].results[0].caseId = data[0].results[0].caseId;
    if (kind === 'unknown-id') data[1].results[0].caseId = 'not-planned';
    if (kind === 'status') data[1].results[0].status = 'success-ish';
    expect(() => summarizeMatrix(data)).toThrow();
  });
});
