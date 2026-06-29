// Next.js 16 네이티브 ESLint flat config (eslint-config-next 16+).
// FlatCompat는 v16 설정과 충돌하므로 native export를 직접 사용한다.
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const eslintConfig = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // 마운트 시 localStorage 로드 · fetch 전 setLoading · dep 변경 시 리셋 등은
      // Next SSR 환경에서 effect가 올바른 선택이며 관용적 패턴이다. 새로 추가된 이 규칙이
      // 작동 중인 코드를 에러로 막지 않도록 경고로 완화 (React Compiler 도입 시 재검토).
      'react-hooks/set-state-in-effect': 'warn',
      // `_` 접두사 인자/변수는 의도적 미사용으로 간주
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];

export default eslintConfig;
