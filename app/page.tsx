import { Suspense } from 'react';
import HomeView from './components/home/HomeView';
import Container from './components/ui/Container';

/**
 * 🔴 이 자리표시자는 첫 화면과 **같은 모양**이어야 한다.
 *    예전에는 60vh 짜리 그라데이션 블록이었는데, 홈에서 히어로를 걷어낸 뒤로는
 *    큰 색면이 번쩍였다가 작은 조건 바로 줄어드는 점프가 생겼다.
 *    지금은 WeekendConditionBar 의 골격(제목 + 타일 4칸)을 그대로 흉내 낸다.
 */
function HomeSkeleton() {
  return (
    <Container aria-hidden="true">
      <div className="pt-6 lg:pt-10">
        <div className="skeleton h-4 w-28 rounded mb-2" />
        <div className="skeleton h-8 lg:h-10 w-64 lg:w-96 rounded mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="skeleton col-span-2 h-24 rounded-xl" />
          <div className="skeleton h-24 rounded-xl" />
          <div className="skeleton h-24 rounded-xl" />
        </div>
        <div className="skeleton h-12 w-full lg:w-52 rounded-lg mt-4" />
      </div>
    </Container>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeView />
    </Suspense>
  );
}
