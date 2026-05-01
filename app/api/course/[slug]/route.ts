// ============================================================
// GET /api/course/[slug] — 공유 코스 조회
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildKakaoNaviUrl } from '@/lib/weekend-ai';
import type { CourseResponse, CourseData } from '@/lib/weekend-types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!slug || slug.length < 4) {
    return NextResponse.json({ error: '잘못된 주소입니다.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('wk_courses')
      .select('id, share_slug, course_data, course_b_data, view_count')
      .eq('share_slug', slug)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '코스를 찾을 수 없어요.' }, { status: 404 });
    }

    // 조회수 증가 (실패해도 무시) — 괄호로 연산자 우선순위 명시
    supabase
      .from('wk_courses')
      .update({ view_count: ((data.view_count as number) ?? 0) + 1 })
      .eq('id', data.id)
      .then(() => {});

    const course = data.course_data as CourseData;
    const courseB = data.course_b_data as CourseData | null | undefined;

    const response: CourseResponse = {
      courseId: data.id,
      shareUrl: `/course/${data.share_slug}`,
      course,
      ...(courseB ? { courseB } : {}),
      kakaoNaviUrl: buildKakaoNaviUrl(course.stops),
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: '코스 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
