'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase } from 'lucide-react';
import LocationSelector from './LocationSelector';
import GlobalSearchBar from './GlobalSearchBar';

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
          <Briefcase size={22} className="text-brand" strokeWidth={1.8} />
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
      </div>

      {/* Mobile (<lg) */}
      <div className="lg:hidden max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5">
          <Briefcase size={20} className="text-brand" strokeWidth={1.8} />
          <span
            className="text-lg font-bold text-ink-1 tracking-tight"
            style={{ fontFamily: 'var(--font-logo)' }}
          >
            이모추
          </span>
        </Link>
        <LocationSelector variant="compact" />
      </div>
    </header>
  );
}
