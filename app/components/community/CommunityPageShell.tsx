'use client';

// FestivalPageShell 의 fetch → 상태 → 그리드 구조를 본뜨되, GPS·반경·지역 필터는
// 없다 — 정렬(인기순/최신순) 하나뿐이다. 재검증을 안 하는 1차 범위(2026-09-04)라
// 위치 기반 정렬도 아직 없다.

import { useCallback, useEffect, useState } from 'react';
import type { CommunityCourseCard, CommunitySort } from '@/lib/weekend-types';
import CommunityHeader from './CommunityHeader';
import CommunitySortTabs from './CommunitySortTabs';
import CommunityGrid from './CommunityGrid';

interface CommunityResponse {
  courses: CommunityCourseCard[];
  hasMore: boolean;
}

export default function CommunityPageShell() {
  const [sort, setSort] = useState<CommunitySort>('popular');
  const [courses, setCourses] = useState<CommunityCourseCard[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (targetSort: CommunitySort, targetPage: number, signal?: AbortSignal) => {
    const res = await fetch(`/api/course/community?sort=${targetSort}&page=${targetPage}`, { signal });
    if (!res.ok) return null;
    return (await res.json()) as CommunityResponse;
  }, []);

  // 정렬이 바뀌면 처음부터 다시 — 페이지 0.
  useEffect(() => {
    setLoading(true);
    setPage(0);
    const controller = new AbortController();
    fetchPage(sort, 0, controller.signal)
      .then((data) => {
        if (!data) return;
        setCourses(data.courses);
        setHasMore(data.hasMore);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') { /* 목록이 비어있는 채로 남는다 — CommunityEmpty 가 대신 안내한다 */ }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [sort, fetchPage]);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const data = await fetchPage(sort, nextPage);
      if (data) {
        setCourses((prev) => [...prev, ...data.courses]);
        setHasMore(data.hasMore);
        setPage(nextPage);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <CommunityHeader count={courses.length} loading={loading} hasMore={hasMore} />
      <CommunitySortTabs sort={sort} onChange={setSort} />
      <CommunityGrid
        courses={courses}
        loading={loading}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={handleLoadMore}
      />
    </>
  );
}
