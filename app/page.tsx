import { Suspense } from 'react';
import HomeView from './components/home/HomeView';

/**
 * 🔴 이 자리표시자는 첫 화면과 **같은 모양**이어야 한다.
 *    모양이 다르면 로드 직후 레이아웃이 튄다 — 예전에 조건 바(작은 타일)에서
 *    히어로(큰 색면)로 바뀌며 화면이 번쩍였다.
 *    지금 첫 화면은 어두운 풀블리드 히어로라, 골격도 그 크기·색으로 맞춘다.
 */
function HomeSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="relative w-full min-h-[34rem] lg:min-h-[38rem] flex items-end bg-gradient-to-br from-hero-fallback-start via-hero-fallback-mid to-hero-fallback-end"
    >
      <div className="w-full max-w-7xl mx-auto px-5 lg:px-8 pt-24 pb-10 lg:pt-28 lg:pb-14">
        <div className="h-4 w-40 rounded bg-white/15" />
        <div className="mt-3 h-9 lg:h-12 w-72 lg:w-[30rem] rounded bg-white/20" />
        <div className="mt-2 h-9 lg:h-12 w-56 lg:w-96 rounded bg-white/20" />
        <div className="mt-6 max-w-xl border-y border-white/15 divide-y divide-white/15">
          <div className="py-4"><div className="h-4 w-64 rounded bg-white/15" /></div>
          <div className="py-4"><div className="h-4 w-72 rounded bg-white/15" /></div>
        </div>
        <div className="mt-7 h-14 w-64 rounded-xl bg-white/25" />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeView />
    </Suspense>
  );
}
