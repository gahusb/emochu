import { defineConfig } from 'vitest/config';
import path from 'node:path';

// 일반 npm test/release-green에서 절대 실행되지 않는 별도 진입점.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(process.cwd()) } },
  test: { environment: 'node', include: ['scripts/live-course.probe.ts'], testTimeout: 210_000 },
});
