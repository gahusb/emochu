import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    // tsconfig의 `@/*` → 프로젝트 루트 별칭과 정합
    alias: { '@': path.resolve(process.cwd()) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
