import { Route } from 'lucide-react';

interface Props {
  course: { title: string; summary: string; totalDistanceKm: number; tip: string };
}

export default function CourseSummary({ course }: Props) {
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
        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-ink-3">
          {course.totalDistanceKm > 0 && (
            <span className="inline-flex items-center gap-1">
              <Route size={14} strokeWidth={1.75} aria-hidden="true" />
              총 {course.totalDistanceKm.toFixed(1)}km
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
