import { Suspense } from 'react';
import HomeView from './components/home/HomeView';

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="w-full h-[50vh] lg:h-[60vh] min-h-[420px] bg-gradient-to-br from-hero-fallback-start via-hero-fallback-mid to-hero-fallback-end" aria-hidden="true" />
    }>
      <HomeView />
    </Suspense>
  );
}
