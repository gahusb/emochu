'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Props {
  locationName: string;
  onLocationClick?: () => void;
}

export default function WeekendHeader({ locationName, onLocationClick }: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
        scrolled
          ? 'bg-white/70 backdrop-blur-2xl shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-lg mx-auto flex items-center justify-between px-5 h-14">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-2xl">🧳</span>
          <span className="text-lg font-black text-orange-500 tracking-tight" style={{ fontFamily: "'CookieRun', sans-serif" }}>
            이모추!
          </span>
        </Link>

        <button
          onClick={onLocationClick}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-orange-500 transition-colors bg-white/60 hover:bg-white rounded-full px-3 py-1.5 shadow-sm border border-orange-100"
        >
          <svg className="w-3.5 h-3.5 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
          </svg>
          <span>{locationName}</span>
        </button>
      </div>
    </header>
  );
}
