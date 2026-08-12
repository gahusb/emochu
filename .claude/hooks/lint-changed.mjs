#!/usr/bin/env node
// PostToolUse(Edit|Write) 훅 — 방금 수정된 파일만 lint 한다.
// 좋은 Hook은 성공할 때 조용하고, 실패할 때만 크게 말한다.
// 🔴 --fix 를 쓰지 않는다: 마감 전에 코드를 자동 변형시키지 않는다. 보고만 한다.
// 에러에만 발화한다. 경고는 통과시킨다 — npm run lint 와 같은 기준.
// (2026-08-12 박재오 결정: 기존 경고 12건은 프로젝트가 의도적으로 허용한 것이다.
//  예: eslint.config.mjs가 react-hooks/set-state-in-effect를 Next SSR 관용구로 보고
//  일부러 warn으로 낮춰둔 룰이 있다. --max-warnings 0을 쓰면 그 결정을 Hook이 뒤엎고
//  해당 파일을 고칠 때마다 매번 시끄러워진다 — "성공 시 조용히"라는 원칙에 위배된다.)
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const file = process.env.CLAUDE_FILE_PATH;

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
