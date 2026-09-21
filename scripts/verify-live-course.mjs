#!/usr/bin/env node
// 명시적으로 실행할 때만 네트워크/유료 AI 호출. 운영 DB 및 공개 저장 경로는 사용하지 않는다.
import { spawnSync } from 'node:child_process';
import { loadLiveEnv, scrubLiveOutput } from './live-env.mjs';
import { liveCourseOptions } from './live-course-options.mjs';

loadLiveEnv();
let options;
try { options = liveCourseOptions(process.argv.slice(2)); } catch { /* 잘못된 인자는 네트워크 전에 거부 */ }
if (!options) {
  console.error('사용법: node scripts/verify-live-course.mjs [--festival | --matrix 1~8] [--replay report-날짜.json] (3조건/AI 최대 3회, 재생은 AI 없음)');
  process.exitCode = 2;
} else if (!process.env.TOUR_API_KEY || (!options.replay && !options.rulesOnly && !process.env.GEMINI_API_KEY)) {
  console.error('실측 중단: TOUR_API_KEY 또는 신규 생성에 필요한 GEMINI_API_KEY가 없습니다. 키 값은 출력하지 않습니다.');
  process.exitCode = 2;
} else {
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--config', 'scripts/live-course.config.ts'], {
    env: { ...process.env, EMOCHU_LIVE_PROBE: '1', EMOCHU_LIVE_REPLAY: options.replay, EMOCHU_LIVE_RULES: options.rulesOnly ? '1' : '0', EMOCHU_LIVE_PROFILE: options.profile, EMOCHU_LIVE_BATCH: options.batch, COURSE_COMPOSITION_RETRY: '0' },
    encoding: 'utf8', timeout: 240_000, maxBuffer: 8 * 1024 * 1024, shell: false,
  });
  console.log(scrubLiveOutput((result.stdout ?? '') + (result.stderr ?? '')));
  if (result.error) console.error(`실측 실행 오류: ${result.error.code ?? result.error.name}`);
  process.exitCode = result.status ?? 1;
}
