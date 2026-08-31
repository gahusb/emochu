// ============================================================
// GET /api/course/[slug]/alternatives?order=N — 특정 장소의 대체 후보
// ============================================================
//
// 코스 편집의 「무엇으로 바꿀까」를 채운다. AI 를 부르지 않는다 —
// 후보는 TourAPI 에서 직접 가져오고, 같은 역할·가까운 순으로만 추린다.
//
// 🔴 편집 토큰이 필요하다. 후보 조회는 무해해 보이지만 TourAPI 호출을 유발하므로,
//    편집할 수 없는 사람이 반복해서 부를 수 있게 두지 않는다.

import { NextRequest, NextResponse } from 'next/server';
import { authorizeEdit, findAlternatives } from '@/lib/course-edit';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const order = Number(request.nextUrl.searchParams.get('order'));

  if (!Number.isInteger(order) || order < 1) {
    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 });
  }

  const course = await authorizeEdit(slug, request.headers.get('x-edit-token'));
  if (!course) {
    // 권한 없음과 없는 코스를 구분해서 알려주지 않는다.
    return NextResponse.json({ error: '코스를 찾을 수 없어요.' }, { status: 404 });
  }

  const stops = course.courseData?.stops ?? [];
  const target = stops.find((s) => s.order === order);
  if (!target) {
    return NextResponse.json({ error: '그 장소를 찾을 수 없어요.' }, { status: 404 });
  }

  try {
    const alternatives = await findAlternatives(target, stops.map((s) => s.contentId));
    return NextResponse.json({ alternatives });
  } catch (err) {
    console.error('[이모추API] 대체 후보 조회 실패:', err);
    return NextResponse.json({ error: '주변 장소를 불러오지 못했어요.' }, { status: 502 });
  }
}
