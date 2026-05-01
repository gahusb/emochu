import { Route, Wallet, Footprints } from 'lucide-react';
import type { CourseDifficulty } from '@/lib/weekend-types';

interface Props {
  course: {
    title: string;
    summary: string;
    totalDistanceKm: number;
    tip: string;
    estimatedCostWon?: number;
    difficulty?: CourseDifficulty;
  };
}

const DIFFICULTY_META: Record<CourseDifficulty, { label: string; color: string }> = {
  easy:     { label: '가볍게',   color: 'bg-success/15 text-success border-success/30' },
  moderate: { label: '보통',     color: 'bg-warning/15 text-amber-700 border-warning/30' },
  active:   { label: '활동적',   color: 'bg-brand-soft text-brand border-brand/30' },
};

export default function CourseSummary({ course }: Props) {
  const diffMeta = course.difficulty ? DIFFICULTY_META[course.difficulty] : null;

  const costLabel = course.estimatedCostWon !== undefined
    ? course.estimatedCostWon === 0
      ? '무료'
      : course.estimatedCostWon < 10000
        ? `약 ${(course.estimatedCostWon / 1000).toFixed(0)}천원`
        : `약 ${(course.estimatedCostWon / 10000).toFixed(1).replace(/\.0$/, '')}만원`
    : null;

  return (
    <section className="bg-surface-sunken border-b border-line">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8 lg:py-10">
        <h1
          className="text-2xl lg:text-4xl font-bold text-ink-1 break-keep"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {course.title}
        </h1>
        {course.summary && (
          <p className="text-sm lg:text-base text-ink-2 mt-3 max-w-3xl break-keep">{course.summary}</p>
        )}

        {/* 메타 정보 뱃지 행 */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {course.totalDistanceKm > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-3">
              <Route size={13} strokeWidth={1.75} aria-hidden="true" />
              총 {course.totalDistanceKm.toFixed(1)}km
            </span>
          )}

          {diffMeta && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${diffMeta.color}`}>
              <Footprints size={12} strokeWidth={1.75} aria-hidden="true" />
              {diffMeta.label}
            </span>
          )}

          {costLabel && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-surface-elevated text-ink-2 border-line">
              <Wallet size={12} strokeWidth={1.75} aria-hidden="true" />
              1인 {costLabel}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
