'use client';

import type { CourseSaju } from '@/lib/weekend-types';
import { ELEMENT_META, type Element5 } from '@/lib/saju';
import Container from '@/app/components/ui/Container';

export default function SajuCard({ saju }: { saju: CourseSaju }) {
  const birth = ELEMENT_META[saju.birthElement as Element5];
  const today = ELEMENT_META[saju.todayElement as Element5];
  if (!birth || !today) return null;

  return (
    <Container className="pt-4">
      <div className="rounded-xl border border-brand/30 bg-surface-elevated overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-brand-soft/60 to-transparent border-b border-line flex items-center gap-3">
          <span className="text-lg" aria-hidden="true">☯️</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded-md border ${birth.color}`}>
              {birth.emoji} {birth.name}
            </span>
            <span className="text-ink-4" aria-hidden="true">↔</span>
            <span className={`text-xs font-bold px-2 py-1 rounded-md border ${today.color}`}>
              {today.emoji} 오늘 {today.name}
            </span>
          </div>
          <p className="ml-auto text-sm font-bold text-ink-1 hidden sm:block">{saju.headline}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm font-bold text-ink-1 mb-1 sm:hidden">{saju.headline}</p>
          <p className="text-sm text-ink-2 leading-relaxed break-keep">{saju.message}</p>
        </div>
      </div>
    </Container>
  );
}
