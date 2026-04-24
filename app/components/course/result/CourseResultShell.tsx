'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { CourseResponse, CourseStop } from '@/lib/weekend-types';
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
    // sessionStorage에서 먼저 확인 (CourseWizard에서 저장한 데이터)
    const cached = sessionStorage.getItem('weekendCourse');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CourseResponse;
        // I1: courseId 직접 비교로 느슨한 includes 매칭 대신 정확한 일치 확인
        if (parsed.courseId === slug) {
          setData(parsed);
          setLoading(false);
          return;
        }
      } catch { /* 무시 */ }
    }

    // DB에서 조회 (공유 URL로 접근한 경우)
    // I1: AbortController로 언마운트 시 fetch 취소
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

  // ─── 로딩 ───
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

  // ─── 코스 없음 ───
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] pt-20 px-6">
        <span className="text-5xl mb-4" aria-hidden="true">😢</span>
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

// ─── Inner view (course data guaranteed) ───

function CourseResultView({ course, slug }: { course: CourseResponse; slug: string }) {
  const courseData = course.course;
  const allStops: CourseStop[] = courseData?.stops ?? [];

  const days = useMemo(() => {
    const uniq = Array.from(new Set(allStops.map((s) => s.day ?? 1)));
    return uniq.sort((a, b) => a - b);
  }, [allStops]);

  const [activeDay, setActiveDay] = useState<number>(days[0] ?? 1);
  const visibleStops = allStops.filter((s) => (s.day ?? 1) === activeDay);

  const { activeIndex, setActive } = useActiveStop();

  const shareUrl =
    course.shareUrl ??
    (typeof window !== 'undefined' ? `${window.location.origin}/course/${slug}` : `/course/${slug}`);

  return (
    <>
      {courseData && (
        <CourseSummary
          course={{
            title: courseData.title,
            summary: courseData.summary,
            totalDistanceKm: courseData.totalDistanceKm,
            tip: courseData.tip,
          }}
        />
      )}
      <Container>
        <div className="py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-8">
          {/* ─── 좌: 타임라인 ─── */}
          <section
            role="tabpanel"
            id={`panel-${activeDay}`}
            aria-labelledby={`tab-${activeDay}`}
            tabIndex={0}
            className="min-w-0"
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

          {/* ─── 지도 (mobile, 타임라인 아래) ─── */}
          <div className="lg:hidden h-80">
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
