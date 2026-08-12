#!/usr/bin/env node
// PostToolUse(Edit|Write) 훅 — 방금 수정된 파일만 lint 한다.
// 좋은 Hook은 성공할 때 조용하고, 실패할 때만 크게 말한다.
// 🔴 --fix 를 쓰지 않는다: 마감 전에 코드를 자동 변형시키지 않는다. 보고만 한다.
// 에러에만 발화한다. 경고는 통과시킨다 — npm run lint 와 같은 기준.
// (2026-08-12 박재오 결정: 기존 경고 12건은 프로젝트가 의도적으로 허용한 것이다.
//  예: eslint.config.mjs가 react-hooks/set-state-in-effect를 Next SSR 관용구로 보고
//  일부러 warn으로 낮춰둔 룰이 있다. --max-warnings 0을 쓰면 그 결정을 Hook이 뒤엎고
//  해당 파일을 고칠 때마다 매번 시끄러워진다 — "성공 시 조용히"라는 원칙에 위배된다.)
//
// 입력 계약: PostToolUse 커맨드 훅은 대상 파일 경로를 환경변수로 받지 않는다.
// Claude Code는 stdin으로 JSON을 흘려보낸다 — { tool_input: { file_path: "..." }, ... }.
// (https://code.claude.com/docs/en/hooks.md — "For command hooks, input arrives on stdin.")
// (2026-08-12 Fix round 2: 이전 버전은 존재하지 않는 CLAUDE_FILE_PATH 환경변수를 읽어
//  항상 조용히 통과하는 죽은 코드였다. stdin JSON 파싱으로 교체한다.
//  stdin이 비어있거나/JSON이 아니거나/file_path가 없으면 그냥 조용히 통과한다 —
//  예상치 못한 입력에 죽는 Hook은 아무것도 안 하는 Hook보다 나쁘다.)
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

function readFilePathFromStdin() {
  let raw;
  try {
    raw = readFileSync(0, 'utf8');
  } catch {
    return undefined; // stdin 자체를 못 읽으면 조용히 포기
  }
  if (!raw || !raw.trim()) return undefined; // 빈 입력

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return undefined; // JSON이 아니면 조용히 포기
  }

  return payload?.tool_input?.file_path;
}

const file = readFilePathFromStdin();

// 대상이 아니면 조용히 통과
if (!file || !existsSync(file)) process.exit(0);
if (!/\.(ts|tsx|mjs|js|jsx)$/.test(file)) process.exit(0);
if (/[\\/](node_modules|\.next|loops[\\/][^\\/]+[\\/]outputs)[\\/]/.test(file)) process.exit(0);

const res = spawnSync('npx', ['eslint', file], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

if (res.status === 0) process.exit(0);   // 조용히

// 크게 말한다
console.error(`[lint-changed] ${file} 에 lint 문제가 있습니다.`);
console.error((res.stdout || '').trim());
if (res.stderr) console.error(res.stderr.trim());
process.exit(2);   // PostToolUse: 비영점 종료 → 에이전트에게 전달
