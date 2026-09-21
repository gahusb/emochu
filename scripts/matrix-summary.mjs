const expected = ['half_day', 'full_day', 'leisurely', 'overnight'].flatMap(d => ['general', 'family'].flatMap(p => ['seoul', 'gangneung', 'ulleung'].map(r => `${r}-${d}-${p}`)));
const percentile = (values, p) => values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1] : null;
const sum = (rows, get) => rows.reduce((n, r) => n + (get(r) ?? 0), 0);

/** 명시한 보고서만 집계한다. 재생·신규 생성, 중복, 누락을 섞지 않는다. */
export function summarizeMatrix(reports) {
  if (!reports.length || reports.length > 8) throw new Error('MATRIX_REPORT_COUNT_INVALID');
  const modes = new Set(), dates = new Set(), seen = new Set(), batches = new Set();
  const rows = [], calls = [];
  for (const report of reports) {
    if (report.profile !== 'matrix' || report.matrixVersion !== '2026-09-09-v2' || !['new-generation', 'replay', 'rules-only'].includes(report.mode) || !Array.isArray(report.results) || !Array.isArray(report.calls)) throw new Error('MATRIX_REPORT_SCHEMA_INVALID');
    if (!Number.isInteger(report.batch) || report.batch < 1 || report.batch > 8 || batches.has(report.batch)) throw new Error('MATRIX_BATCH_INVALID_OR_DUPLICATE');
    batches.add(report.batch);
    const planned = expected.slice((report.batch - 1) * 3, report.batch * 3);
    modes.add(report.mode);
    const time = Date.parse(report.startedAt);
    if (!Number.isFinite(time)) throw new Error('MATRIX_REPORT_DATE_INVALID');
    // 다른 날짜의 실험을 실수로 한 번의 실행처럼 묶지 않는다.
    dates.add(new Date(time + 9 * 3600000).toISOString().slice(0, 10));
    for (const row of report.results) {
      if (!planned.includes(row.caseId) || seen.has(row.caseId)) throw new Error('MATRIX_CASE_INVALID_OR_DUPLICATE');
      if (!['completed', 'failed'].includes(row.status)) throw new Error('MATRIX_CASE_STATUS_INVALID');
      if (row.status === 'completed' && (!row.qualityAfter || !row.qualityBefore || !row.final?.stops)) throw new Error('MATRIX_CASE_METRICS_MISSING');
      seen.add(row.caseId); rows.push(row);
    }
    calls.push(...report.calls);
  }
  if (modes.size !== 1 || dates.size !== 1) throw new Error('MATRIX_MIXED_RUNS');
  const completed = rows.filter(r => r.status === 'completed');
  const generated = calls.filter(c => c.service === 'Gemini' && c.operation.endsWith(':generateContent'));
  const elapsed = completed.map(r => r.elapsedMs).filter(Number.isFinite);
  return {
    mode: [...modes][0], checkedDateKst: [...dates][0], planned: 24, recorded: rows.length,
    completed: completed.length, failed: rows.length - completed.length, missing: expected.filter(id => !seen.has(id)),
    ai: completed.filter(r => r.final.generationMode === 'ai').length,
    rules: completed.filter(r => r.final.generationMode === 'rules').length,
    probeLimited: rows.filter(r => r.limitedByProbe).length,
    noAiAttempt: rows.filter(r => !r.calls?.some(c => c.service === 'Gemini' && c.operation.endsWith(':generateContent'))).length,
    knownChecksBefore: completed.filter(r => r.qualityBefore.knownChecksPass).length,
    knownChecksAfter: completed.filter(r => r.qualityAfter.knownChecksPass).length,
    final: {
      stops: sum(completed, r => r.qualityAfter.totalStops), ungrounded: sum(completed, r => r.qualityAfter.ungrounded.length),
      wrongDate: sum(completed, r => r.qualityAfter.wrongDate.length), duplicate: sum(completed, r => r.qualityAfter.duplicateCount),
      hoursOutside: sum(completed, r => r.qualityAfter.hoursOutside.length), hoursUnknown: sum(completed, r => r.qualityAfter.hoursUnknown.length),
      accessibilityStops: sum(completed, r => r.qualityAfter.accessibility.checkedStops), accessibilityInfo: sum(completed, r => r.qualityAfter.accessibility.withAllRequestedInfo),
      unknownForecastDays: sum(completed, r => r.qualityAfter.forecastUnknownDates.length),
    },
    observedCompletedLatencyMs: { p50: percentile(elapsed, 0.5), p95: percentile(elapsed, 0.95) },
    network: { total: calls.length, aiSent: generated.length, aiHttp200: generated.filter(c => c.http === 200).length,
      errors: calls.filter(c => c.error || (c.http != null && c.http !== 200) || (c.resultCode != null && !['0000', '00'].includes(c.resultCode))).map(c => ({ service: c.service, operation: c.operation, http: c.http, resultCode: c.resultCode, error: c.error })),
      tokens: { input: sum(generated, c => c.usage?.promptTokenCount), output: sum(generated, c => c.usage?.candidatesTokenCount), total: sum(generated, c => c.usage?.totalTokenCount) },
    },
    cases: [...rows].sort((a, b) => expected.indexOf(a.caseId) - expected.indexOf(b.caseId)).map(r => ({ caseId: r.caseId, status: r.status, mode: r.final?.generationMode, limitedByProbe: r.limitedByProbe, candidates: r.candidates, elapsedMs: r.elapsedMs, qualityBefore: r.qualityBefore, qualityAfter: r.qualityAfter, adjustments: r.final?.verification?.adjustments, warnings: r.final?.verification?.warnings })),
    limitations: ['Synthetic local pipeline, no database or real-device checks', 'One AI attempt per case; production retry/fallback chain is not measured', 'Probe-limited rules and unattempted AI are not AI successes', 'Known checks passing does not verify unknown hours, booking or actual transport', 'Latency is this small mixed sample, not production P50/P95', 'Replay is not new AI generation'],
  };
}
