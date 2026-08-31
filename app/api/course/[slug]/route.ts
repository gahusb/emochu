// ============================================================
// GET /api/course/[slug] — 공유 코스 조회
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildKakaoNaviUrl } from '@/lib/weekend-ai';
import type { CourseResponse, CourseData, CourseStop } from '@/lib/weekend-types';
import { authorizeEdit, findAlternatives, applyReplacement, recalcRoute, moveStop } from '@/lib/course-edit';

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

// ============================================================
// PATCH /api/course/[slug] — 코스 편집 (장소 교체 · 순서 변경)
// ============================================================
//
// 🔑 AI 를 다시 부르지 않는다. 코스를 통째로 재생성하면 사용자가 마음에 들어 했던
//    나머지 장소까지 바뀌고, 「이 한 곳만 마음에 안 든다」에 대한 답으로는 과하다.
//
// 🔴 클라이언트가 보낸 stops 배열을 그대로 저장하지 않는다. 「무엇을 어떻게 바꿀지」만
//    받고 실제 조작은 서버가 한다 — 통째로 받으면 아무 좌표·아무 문구나 심을 수 있다.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const course = await authorizeEdit(slug, request.headers.get('x-edit-token'));
  if (!course) {
    return NextResponse.json({ error: '코스를 찾을 수 없어요.' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const data = course.courseData;
  const stops = data?.stops ?? [];
  const order = Number(body.order);

  if (!Number.isInteger(order) || !stops.some((s) => s.order === order)) {
    return NextResponse.json({ error: '그 장소를 찾을 수 없어요.' }, { status: 400 });
  }

  let nextStops: CourseStop[] | null = null;

  if (body.op === 'move') {
    const direction = body.direction === 'up' ? 'up' : body.direction === 'down' ? 'down' : null;
    if (!direction) {
      return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 });
    }
    nextStops = moveStop(stops, order, direction);
    if (!nextStops) {
      // 날짜 경계이거나 끝자리다. 실패가 아니라 「할 수 없음」이라 400 이 맞다.
      return NextResponse.json({ error: '더 옮길 수 없어요.' }, { status: 400 });
    }

  } else if (body.op === 'replace') {
    const contentId = typeof body.contentId === 'string' ? body.contentId : '';
    const target = stops.find((s) => s.order === order)!;

    // 🔴 클라이언트가 준 contentId 를 그대로 믿지 않는다. 지금 다시 후보를 뽑아
    //    그 안에 있는 것만 허용한다 — 이러면 검증과 데이터 출처가 한 번에 해결된다.
    let picked;
    try {
      const alternatives = await findAlternatives(target, stops.map((s) => s.contentId));
      picked = alternatives.find((a) => a.contentId === contentId);
    } catch (err) {
      console.error('[이모추API] 교체 후보 조회 실패:', err);
      return NextResponse.json({ error: '주변 장소를 불러오지 못했어요.' }, { status: 502 });
    }
    if (!picked) {
      return NextResponse.json({ error: '고른 장소를 지금은 쓸 수 없어요.' }, { status: 400 });
    }

    const replaced = await applyReplacement(target, picked);
    nextStops = stops.map((s) => (s.order === order ? replaced : s));

  } else {
    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 });
  }

  const { stops: finalStops, totalDistanceKm } = recalcRoute(nextStops);
  const updated: CourseData = { ...data, stops: finalStops, totalDistanceKm };

  try {
    await createAdminClient()
      .from('wk_courses')
      .update({
        course_data: updated,
        // 손을 댔다는 건 아낀다는 뜻이다. 30일 뒤 사라지지 않게 보존으로 돌린다.
        is_kept: true,
        expires_at: null,
      })
      .eq('id', course.id);
  } catch (dbErr) {
    console.error('[이모추API] 코스 편집 저장 실패:', dbErr);
    return NextResponse.json({ error: '수정을 저장하지 못했어요.' }, { status: 500 });
  }

  return NextResponse.json({ course: updated });
}
