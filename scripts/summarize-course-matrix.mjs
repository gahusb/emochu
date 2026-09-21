import { readFileSync, writeFileSync } from 'node:fs';
import { summarizeMatrix } from './matrix-summary.mjs';
import { loadLiveEnv, scrubLiveOutput } from './live-env.mjs';

const names = process.argv.slice(2);
if (!names.length || names.length > 8 || names.some(n => !/^report-[0-9TZ.-]+\.json$/.test(n)) || new Set(names).size !== names.length) {
  console.error('보고서 파일명 1~8개를 명시하세요. .scratch-live-course 내부의 서로 다른 matrix 보고서만 허용합니다.');
  process.exitCode = 2;
} else {
  loadLiveEnv();
  try {
    const summary = summarizeMatrix(names.map(name => JSON.parse(readFileSync(`.scratch-live-course/${name}`, 'utf8'))));
    const path = `.scratch-live-course/matrix-summary-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    writeFileSync(path, scrubLiveOutput(JSON.stringify({ sources: names, ...summary }, null, 2)));
    console.log(`집계: ${path}; 기록 ${summary.recorded}/24; 완료 ${summary.completed}; 알려진 검사 통과 ${summary.knownChecksAfter}; AI ${summary.ai}; 규칙 ${summary.rules}; 검증기 상한 영향 ${summary.probeLimited}`);
  } catch (error) {
    console.error(scrubLiveOutput(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}
