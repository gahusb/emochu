// ============================================================
// POST /api/course/[slug]/keep — 코스를 영구 보존으로 표시
// ============================================================
//
// 공유·저장을 누른 코스만 남긴다(013 마이그레이션). 이 엔드포인트가 그 「눌렀다」다.
// 🔑 멱등이다. 여러 번 눌러도, 이미 보존 중이어도 같은 결과를 준다 —
//    공유 버튼은 사용자가 반복해서 누르는 버튼이다.

import { NextRequest, NextResponse } from 'next/server';
import { keepCourse } from '@/lib/course-lifecycle';

export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!slug || slug.length < 4) {
    return NextResponse.json({ error: '잘못된 주소입니다.' }, { status: 400 });
  }

  const ok = await keepCourse(slug);

  // 🔴 실패해도 200 을 준다. 이건 사용자가 명시적으로 요청한 동작이 아니라
  //    공유 버튼에 딸려 도는 부수 효과다 — 여기서 에러를 띄우면
  //    "공유했는데 왜 에러가 나지?" 가 된다. 실패는 서버 로그로 남는다.
  return NextResponse.json({ kept: ok });
}
