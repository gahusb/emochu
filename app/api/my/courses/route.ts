// ============================================================
// GET /api/my/courses — 내 계정에 붙은 코스 목록
// ============================================================

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUserId, isAuthEnabled } from '@/lib/auth';
import type { CourseData } from '@/lib/weekend-types';

export const runtime = 'nodejs';

export async function GET() {
  if (!isAuthEnabled()) {
    return NextResponse.json({ courses: [] });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }

  const { data, error } = await createAdminClient()
    .from('wk_courses')
    .select('share_slug, course_data, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('[이모추:my] 코스 목록 조회 실패:', error.message);
    return NextResponse.json({ error: '목록을 불러오지 못했어요.' }, { status: 500 });
  }

  // 🔴 course_data 를 통째로 내려보내지 않는다. 목록에 필요한 건 제목·장소 수뿐인데
  //    코스 하나가 수 KB 라 50개면 응답이 무거워진다.
  const courses = (data ?? []).map((row) => {
    const c = (row as { course_data: CourseData }).course_data;
    return {
      slug: (row as { share_slug: string }).share_slug,
      title: c?.title ?? '코스',
      summary: c?.summary ?? '',
      stopCount: c?.stops?.length ?? 0,
      totalDistanceKm: c?.totalDistanceKm ?? 0,
      imageUrl: c?.stops?.find((s) => s.imageUrl)?.imageUrl,
      createdAt: (row as { created_at: string }).created_at,
    };
  });

  return NextResponse.json({ courses });
}
