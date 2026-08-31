'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass } from 'lucide-react';
import LocationSelector from './LocationSelector';
import GlobalSearchBar from './GlobalSearchBar';
import AuthButton from './AuthButton';

const NAV_ITEMS = [
  { href: '/', label: '홈', match: (p: string) => p === '/' },
  { href: '/course', label: '코스 만들기', match: (p: string) => p.startsWith('/course') },
  { href: '/festival', label: '축제', match: (p: string) => p.startsWith('/festival') },
];

export default function GlobalHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 inset-x-0 z-40 bg-surface-base/95 backdrop-blur transition-shadow ${
        scrolled ? 'shadow-[var(--shadow-soft)] border-b border-line' : ''
      }`}
    >
      {/* Desktop (lg+) */}
      <div className="hidden lg:flex max-w-7xl mx-auto px-8 h-16 items-center gap-6">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Compass size={22} className="text-brand" strokeWidth={1.8} aria-hidden="true" />
          <span
            className="text-xl font-bold text-ink-1 tracking-tight"
            style={{ fontFamily: 'var(--font-logo)' }}
          >
            이모추
          </span>
        </Link>

        <nav className="flex items-center gap-1 ml-2">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? 'text-ink-1' : 'text-ink-3 hover:text-ink-1'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-brand rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <GlobalSearchBar />
        <LocationSelector />
        {/* 로그인이 꺼져 있으면 아무것도 렌더링하지 않는다 (AuthButton 내부에서 판단) */}
        <AuthButton />
      </div>

      {/* Mobile (<lg) */}
      <div className="lg:hidden max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5">
          <Compass size={20} className="text-brand" strokeWidth={1.8} aria-hidden="true" />
          <span
            className="text-lg font-bold text-ink-1 tracking-tight"
            style={{ fontFamily: 'var(--font-logo)' }}
          >
            이모추
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <LocationSelector variant="compact" />
          {/* 🔴 모바일에 진입점이 없었다. 이 앱은 모바일 퍼스트인데 로그인·내 코스로
              갈 방법이 데스크톱 헤더에만 있었다. */}
          <AuthButton variant="compact" />
        </div>
      </div>
    </header>
  );
}
