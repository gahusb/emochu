'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle, Sparkles, Compass, Loader2 } from 'lucide-react';
import type { CourseResponse, CourseData, CourseStop } from '@/lib/weekend-types';
import { useActiveStop } from '@/lib/use-active-stop';
import Container from '@/app/components/ui/Container';
import CourseSummary from './CourseSummary';
import SajuCard from './SajuCard';
import DayTabs from './DayTabs';
import Timeline from './Timeline';
import CourseTip from './CourseTip';
import SaveShareBar from './SaveShareBar';
import CourseMapPane from './CourseMapPane';
import StopReplaceSheet from './StopReplaceSheet';
import { getEditToken } from '@/lib/edit-token';
import { readCourseCache, rememberCourse } from '@/lib/course-cache';
import CourseEvidence from './CourseEvidence';

interface Props {
  slug: string;
}

export default function CourseResultShell({ slug }: Props) {
  const [data, setData] = useState<CourseResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    const cached = readCourseCache(slug);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
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
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] pt-20">
        <div
          role="status"
          aria-label="코스 불러오는 중"
          className="relative w-16 h-16"
        >
          <div className="absolute inset-0 rounded-full border-4 border-brand-soft" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand motion-safe:animate-spin" />
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

  return <CourseResultView key={slug} course={data} slug={slug} />;
}

// ─── A/B 탭 스위처 ───

interface ABTabProps {
  active: 'a' | 'b';
  onChange: (v: 'a' | 'b') => void;
  /** B 코스가 이미 만들어져 있는지. 없으면 탭이 「만들기」 버튼으로 동작한다. */
  hasB: boolean;
  loadingB: boolean;
}

function ABTabSwitcher({ active, onChange, hasB, loadingB }: ABTabProps) {
  return (
    <div role="tablist" aria-label="코스 선택" className="flex items-center gap-1 bg-surface-sunken rounded-xl p-1 w-full max-w-sm mx-auto">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'a'}
        onClick={() => onChange('a')}
        className={`flex-1 flex items-center justify-center gap-1.5 min-h-11 rounded-lg text-sm font-semibold transition-all ${
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
        role="tab"
        aria-selected={active === 'b'}
        onClick={() => onChange('b')}
        disabled={loadingB}
        aria-busy={loadingB}
        className={`flex-1 flex items-center justify-center gap-1.5 min-h-11 rounded-lg text-sm font-semibold transition-all disabled:opacity-70 ${
          active === 'b'
            ? 'bg-surface-elevated text-brand shadow-sm'
            : 'text-ink-3 hover:text-ink-1'
        }`}
      >
        {loadingB
          ? <Loader2 size={14} strokeWidth={2} aria-hidden="true" className="animate-spin" />
          : <Compass size={14} strokeWidth={2} aria-hidden="true" />}
        {loadingB ? '만드는 중…' : hasB ? '이색 발견' : '이색 발견 만들기'}
      </button>
    </div>
  );
}

// ─── Inner view ───

function CourseResultView({ course, slug }: { course: CourseResponse; slug: string }) {
  // 🔑 B 코스는 이제 「눌러야 만들어진다」. 예전엔 요청마다 A/B 를 같이 만들어
  //    비용이 정확히 2배였는데, B 를 보는 사람은 일부다.
  const [courseB, setCourseB] = useState<CourseData | undefined>(course.courseB);
  const [loadingB, setLoadingB] = useState(false);
  const [errorB, setErrorB] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<'a' | 'b'>('a');
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const temporary = course.persistence === 'temporary';

  // ─── 편집 ───
  // 편집 토큰은 코스를 만든 브라우저에만 있다. 없으면 편집 조작 자체를 안 보여준다 —
  // 눌러도 안 되는 버튼은 없느니만 못하다.
  const [courseA, setCourseA] = useState<CourseData>(course.course);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [busyOrder, setBusyOrder] = useState<number | null>(null);
  const [replaceOrder, setReplaceOrder] = useState<number | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // localStorage 는 서버에 없다. 마운트 후에 읽는다.
  useEffect(() => {
    const token = getEditToken(slug);
    setEditToken(token);

    // 🔑 로그인과 편집 토큰을 잇는 다리.
    //    로그인 전에 만든 코스를 로그인한 계정에 붙인다. 이게 없으면 로그인해도
    //    그동안 만든 코스는 「내 코스」에 안 나타난다.
    //    비로그인이면 서버가 401 을 주는데, 그건 정상이라 조용히 넘긴다.
    if (!token || process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'true') return;
    const claimedKey = `emochu.claimed.${slug}`;
    try {
      if (localStorage.getItem(claimedKey)) return;   // 한 번 성공했으면 다시 안 부른다
    } catch { return; }

    void fetch(`/api/course/${slug}/claim`, {
      method: 'POST',
      headers: { 'x-edit-token': token },
    })
      .then((r) => { if (r.ok) { try { localStorage.setItem(claimedKey, '1'); } catch { /* 무시 */ } } })
      .catch(() => { /* 귀속 실패는 사용자에게 알릴 일이 아니다 */ });
  }, [slug]);

  /** 편집은 추천 코스(A)에만 건다. B 는 곁들여 보는 것이라 편집 대상이 아니다. */
  const editable = !temporary && Boolean(editToken) && activeVariant === 'a';

  const patchCourse = async (payload: Record<string, unknown>, order: number) => {
    if (!editToken || busyOrder !== null || temporary) return;
    setBusyOrder(order);
    setEditError(null);
    try {
      const res = await fetch(`/api/course/${slug}`, {
        method: 'PATCH',
        signal: AbortSignal.timeout(20_000),
        headers: { 'Content-Type': 'application/json', 'x-edit-token': editToken },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '수정하지 못했어요.');
      setCourseA(json.course as CourseData);
      rememberCourse({ ...course, course: json.course as CourseData, courseB });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '수정하지 못했어요.');
    } finally {
      setBusyOrder(null);
    }
  };

  const handleSelectVariant = async (v: 'a' | 'b') => {
    if (v === 'a' || courseB) { setActiveVariant(v); return; }
    if (loadingB) return;

    setLoadingB(true);
    setErrorB(null);
    try {
      const res = await fetch('/api/course', {
        method: 'POST',
        signal: AbortSignal.timeout(65_000),
        headers: { 'Content-Type': 'application/json' },
        // 조건을 보내지 않는다 — 서버가 저장된 원본 조건을 읽는다.
        // 공유 링크로 들어온 사람도 이 버튼을 누를 수 있어야 한다.
        body: JSON.stringify({ alternativeFor: slug }),
      });
      const json = await res.json();
      if (!res.ok || !json.courseB) {
        throw new Error(json.error ?? '다른 코스를 만들지 못했어요.');
      }
      setCourseB(json.courseB as CourseData);
      rememberCourse({ ...course, course: courseA, courseB: json.courseB as CourseData });
      setActiveVariant('b');
    } catch (err) {
      setErrorB(err instanceof Error ? err.message : '다른 코스를 만들지 못했어요.');
    } finally {
      setLoadingB(false);
    }
  };

  const courseData: CourseData | undefined =
    activeVariant === 'b' && courseB ? courseB : courseA;

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
            storyArc: courseData.storyArc,
          }}
        />
      )}

      {courseData?.saju && <SajuCard saju={courseData.saju} />}
      {courseData && <CourseEvidence course={courseData} />}
      {temporary && <Container className="pt-4"><p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">코스는 만들었지만 서버에 저장하지 못했어요. 현재 화면에서만 볼 수 있는 임시 결과로, 공유·편집·다른 코스 생성은 사용할 수 없어요. 페이지를 닫기 전 필요한 내용을 남겨주세요.</p></Container>}

      {/* ─── A/B 탭 스위처 ───
           예전엔 두 코스가 다 있을 때만 보였다. 이제 B 는 눌러야 만들어지므로
           탭 자체가 「만들기」 진입점이라 항상 보여준다. */}
      {!temporary && <div className="bg-surface-base border-b border-line">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-3">
          <ABTabSwitcher
            active={activeVariant}
            hasB={Boolean(courseB)}
            loadingB={loadingB}
            onChange={(v) => { setActive(null); void handleSelectVariant(v); }}
          />
          {errorB && (
            <p role="alert" className="mt-2 text-xs text-center text-red-500">{errorB}</p>
          )}
        </div>
      </div>}

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
            <div className="lg:hidden flex gap-2 mb-5" role="group" aria-label="일정과 지도 보기">
              {(['list', 'map'] as const).map(view => <button key={view} type="button" aria-pressed={mobileView === view} onClick={() => setMobileView(view)} className={`min-h-11 flex-1 rounded-lg border text-sm font-semibold ${mobileView === view ? 'bg-brand text-white border-brand' : 'bg-surface-elevated border-line text-ink-2'}`}>{view === 'list' ? '일정 보기' : '지도 보기'}</button>)}
            </div>
            {mobileView === 'map' && <div className="lg:hidden h-[60dvh] min-h-80 mb-5"><CourseMapPane stops={visibleStops} activeIndex={activeIndex} onMarkerClick={setActive} /></div>}
            <div className={mobileView === 'map' ? 'hidden lg:block' : ''}>
            <Timeline
              stops={visibleStops}
              activeIndex={activeIndex}
              onActivate={setActive}
              editable={editable && busyOrder === null}
              busyOrder={busyOrder}
              onReplace={(order) => { setEditError(null); setReplaceOrder(order); }}
              onMove={(order, direction) => void patchCourse({ op: 'move', order, direction }, order)}
            />
            </div>
            {editError && (
              <p role="alert" className="mt-2 text-xs text-red-500 text-center">{editError}</p>
            )}
            {courseData?.tip && <CourseTip tip={courseData.tip} />}
            <div className="mt-6">
              {!temporary && <SaveShareBar
                slug={slug}
                shareUrl={shareUrl}
                title={courseData?.title ?? '이모추 코스'}
                summary={courseData?.summary}
                stops={allStops}
                editToken={editToken}
                initialIsPublic={course.isPublic ?? false}
              />}
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

        </div>
      </Container>

      {replaceOrder !== null && editToken && (
        <StopReplaceSheet
          slug={slug}
          editToken={editToken}
          order={replaceOrder}
          currentTitle={allStops.find((s) => s.order === replaceOrder)?.title ?? '이 장소'}
          onClose={() => setReplaceOrder(null)}
          onPick={async (contentId) => {
            await patchCourse({ op: 'replace', order: replaceOrder, contentId }, replaceOrder);
            setReplaceOrder(null);
          }}
        />
      )}
    </>
  );
}
