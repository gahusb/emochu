'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, PartyPopper } from 'lucide-react';

const TABS = [
  { href: '/', label: '홈', icon: Home, match: (p: string) => p === '/' },
  { href: '/course', label: '코스', icon: Sparkles, match: (p: string) => p.startsWith('/course') },
  { href: '/festival', label: '축제', icon: PartyPopper, match: (p: string) => p.startsWith('/festival') },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  // Wizard(/course)는 자체 하단 Nav가 있어 탭바 중첩 시 버튼이 가려짐 → 해당 라우트에서만 숨김.
  // 결과 페이지(/course/[slug])에서는 유지.
  if (pathname === '/course') return null;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface-base/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-1 px-5 py-2 transition-colors ${
                active ? 'text-ink-1' : 'text-ink-3 hover:text-ink-1'
              }`}
            >
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand rounded-full" />}
              <Icon
                size={22}
                strokeWidth={active ? 2.2 : 1.8}
                fill={active ? 'currentColor' : 'none'}
              />
              <span className="text-[11px] font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
