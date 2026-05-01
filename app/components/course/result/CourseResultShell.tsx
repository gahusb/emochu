'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle, Sparkles, Compass } from 'lucide-react';
import type { CourseResponse, CourseData, CourseStop } from '@/lib/weekend-types';
import { useActiveStop } from '@/lib/use-active-stop';
import Container from '@/app/components/ui/Container';
import CourseSummary from './CourseSummary';
import DayTabs from './DayTabs';
import Timeline from './Timeline';
import CourseTip from './CourseTip';
import SaveShareBar from './SaveShareBar';
import CourseMapPane from './CourseMapPane';

interface Props {
  slug: string;
}

export default function CourseResultShell({ slug }: Props) {
  const [data, setData] = useState<CourseResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = sessionStorage.getItem('weekendCourse');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CourseResponse;
        const parsedSlug = parsed.shareUrl?.split('/').pop();
      if (parsedSlug === slug) {
          setData(parsed);
          setLoading(false);
          return;
        }
      } catch { /* 무시 */ }
    }

    const controller = new AbortController();
    fetch(`/api/course/${slug}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('코스를 찾을 수 없어요');
        return res.json();
      })
      .then(setData)
      .catch((err) => {
        if (err.name !== 'AbortError') setData(null);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] pt-20">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-brand-soft" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand animate-spin" />
        </div>
        <p className="text-ink-3 text-sm mt-4">코스를 불러오는 중...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] pt-20 px-6">
        <AlertCircle size={48} strokeWidth={1.5} className="text-ink-4 mb-4" aria-hidden="true" />
        <h2 className="text-lg font-bold text-ink-1" style={{ fontFamily: 'var(--font-display)' }}>
          코스를 찾을 수 없어요
        </h2>
        <p className="text-sm text-ink-3 mt-2 text-center break-keep">
          링크가 만료되었거나 잘못된 주소예요
        </p>
        <Link
          href="/course"
          className="mt-6 px-6 py-3 bg-brand text-white text-sm font-semibold rounded-lg"
        >
          새 코스 만들기
        </Link>
      </div>
    );
  }

  return <CourseResultView course={data} slug={slug} />;
}

// ─── A/B 탭 스위처 ───

interface ABTabProps {
  active: 'a' | 'b';
  onChange: (v: 'a' | 'b') => void;
}

function ABTabSwitcher({ active, onChange }: ABTabProps) {
  return (
    <div className="flex items-center gap-1 bg-surface-sunken rounded-xl p-1 w-full max-w-sm mx-auto">
      <button
        type="button"
        onClick={() => onChange('a')}
        className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-semibold transition-all ${
          active === 'a'
            ? 'bg-surface-elevated text-brand shadow-sm'
            : 'text-ink-3 hover:text-ink-1'
        }`}
      >
        <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
        추천 코스
      </button>
      <button
        type="button"
        onClick={() => onChange('b')}
        className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-semibold transition-all ${
          active === 'b'
            ? 'bg-surface-elevated text-brand shadow-sm'
            : 'text-ink-3 hover:text-ink-1'
        }`}
      >
        <Compass size={14} strokeWidth={2} aria-hidden="true" />
        이색 발견
      </button>
    </div>
  );
}

// ─── Inner view ───

function CourseResultView({ course, slug }: { course: CourseResponse; slug: string }) {
  const hasAB = Boolean(course.courseB);
  const [activeVariant, setActiveVariant] = useState<'a' | 'b'>('a');

  const courseData: CourseData | undefined =
    activeVariant === 'b' && course.courseB ? course.courseB : course.course;

  const allStops: CourseStop[] = courseData?.stops ?? [];

  const days = useMemo(() => {
    const uniq = Array.from(new Set(allStops.map((s) => s.day ?? 1)));
    return uniq.sort((a, b) => a - b);
  }, [allStops]);

  const [activeDay, setActiveDay] = useState<number>(days[0] ?? 1);

  // 탭 전환 시 일차 리셋
  useEffect(() => {
    setActiveDay(days[0] ?? 1);
  }, [activeVariant, days]);

  const visibleStops = allStops.filter((s) => (s.day ?? 1) === activeDay);
  const { activeIndex, setActive } = useActiveStop();
  const isMultiDay = days.length > 1;

  const shareUrl =
    course.shareUrl ??
    (typeof window !== 'undefined' ? `${window.location.origin}/course/${slug}` : `/course/${slug}`);

  return (
    <>
      {/* ─── 코스 요약 헤더 ─── */}
      {courseData && (
        <CourseSummary
          course={{
            title: courseData.title,
            summary: courseData.summary,
            totalDistanceKm: courseData.totalDistanceKm,
            tip: courseData.tip,
            estimatedCostWon: courseData.estimatedCostWon,
            difficulty: courseData.difficulty,
          }}
        />
      )}

      {/* ─── A/B 탭 스위처 (두 코스가 있을 때만) ─── */}
      {hasAB && (
        <div className="bg-surface-base border-b border-line">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-3">
            <ABTabSwitcher active={activeVariant} onChange={(v) => { setActiveVariant(v); setActive(null); }} />
          </div>
        </div>
      )}

      <Container>
        <div className="py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-8 pb-20 lg:pb-0">
          {/* ─── 좌: 타임라인 ─── */}
          <section
            className="min-w-0"
            {...(isMultiDay && {
              role: 'tabpanel',
              id: `panel-${activeDay}`,
              'aria-labelledby': `tab-${activeDay}`,
              tabIndex: 0,
            })}
          >
            <DayTabs
              days={days}
              active={activeDay}
              onChange={(d) => { setActiveDay(d); setActive(null); }}
            />
            <Timeline
              stops={visibleStops}
              activeIndex={activeIndex}
              onActivate={setActive}
            />
            {courseData?.tip && <CourseTip tip={courseData.tip} />}
            <div className="mt-6">
              <SaveShareBar
                shareUrl={shareUrl}
                title={courseData?.title ?? '이모추 코스'}
                summary={courseData?.summary}
                stops={allStops}
              />
            </div>
          </section>

          {/* ─── 우: sticky 지도 (desktop) ─── */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 h-[calc(100vh-7rem)]">
              <CourseMapPane
                stops={visibleStops}
                activeIndex={activeIndex}
                onMarkerClick={setActive}
              />
            </div>
          </aside>

          {/* ─── 지도 (mobile) ─── */}
          <div className="lg:hidden h-80 mb-20 lg:mb-0">
            <CourseMapPane
              stops={visibleStops}
              activeIndex={activeIndex}
              onMarkerClick={setActive}
            />
          </div>
        </div>
      </Container>
    </>
  );
}
