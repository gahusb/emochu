// ============================================================
// POST /api/course/[slug]/public — 커뮤니티 추천 opt-in 토글
// ============================================================
//
// 🔴 권한: edit_token 보유자만. 링크를 받은 누구나 남의 코스를 추천 풀에
//    넣거나 뺄 수 있으면 안 된다 — lib/course-edit.ts 의 authorizeEdit() 를 그대로 쓴다.
//
// 🔑 켤 때는 keepCourse() 도 같이 부른다. 추천 후보가 된 코스가 TTL 만료로
//    갑자기 사라지면 "추천했는데 링크가 깨지는" 최악의 경우가 된다.
//    끌 때는 되돌리지 않는다 — keepCourse 와 같은 단방향 원칙이다.

import { NextRequest, NextResponse } from 'next/server';
import { authorizeEdit } from '@/lib/course-edit';
import { keepCourse } from '@/lib/course-lifecycle';
import { setCoursePublic } from '@/lib/course-community';

export const runtime = 'nodejs';

export async function POST(
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

  const isPublic = body.isPublic === true;

  const ok = await setCoursePublic(course.id, isPublic);
  if (!ok) {
    return NextResponse.json({ error: '설정을 저장하지 못했어요.' }, { status: 500 });
  }

  if (isPublic) void keepCourse(slug);

  return NextResponse.json({ isPublic });
}
