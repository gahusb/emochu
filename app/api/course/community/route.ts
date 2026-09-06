// ============================================================
// GET /api/course/community — 공개 동의한 코스 목록 (신선도 + 공개 필터)
// ============================================================
//
// 재검증 없음(1차 범위, 2026-09-04): TourAPI·날씨를 다시 부르지 않는다.
// lib/course-community.ts 의 신선도 필터가 오래된 코스를 자동으로 뺀다.

import { NextRequest, NextResponse } from 'next/server';
import { fetchCommunityCourses } from '@/lib/course-community';
import type { CommunitySort } from '@/lib/weekend-types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const sort: CommunitySort = sp.get('sort') === 'newest' ? 'newest' : 'popular';
  const pageParam = Number(sp.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 0;

  const { cards, hasMore } = await fetchCommunityCourses({ sort, page });

  return NextResponse.json({ courses: cards, hasMore, sort, page });
}
