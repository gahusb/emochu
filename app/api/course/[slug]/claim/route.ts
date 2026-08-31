// ============================================================
// POST /api/course/[slug]/claim — 이 기기의 코스를 내 계정에 붙인다
// ============================================================
//
// 🔑 로그인과 편집 토큰을 잇는 다리다.
//    로그인 전에 만든 코스는 브라우저에만 증거(편집 토큰)가 있다. 로그인한 뒤
//    그 토큰으로 「이건 내 코스다」를 증명해 user_id 를 붙인다.
//    이 다리가 없으면 로그인해도 그동안 만든 코스는 영영 남의 것이 된다.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { authorizeEdit } from '@/lib/course-edit';
import { getCurrentUserId, isAuthEnabled } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!isAuthEnabled()) {
    return NextResponse.json({ claimed: false, reason: 'disabled' });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }

  // 편집 토큰이 곧 소유 증명이다. 없으면 남의 코스를 가져가는 셈이 된다.
  const course = await authorizeEdit(slug, request.headers.get('x-edit-token'));
  if (!course) {
    return NextResponse.json({ error: '코스를 찾을 수 없어요.' }, { status: 404 });
  }

  try {
    await createAdminClient()
      .from('wk_courses')
      // 내 것으로 표시한 코스는 만료 대상이 아니다.
      .update({ user_id: userId, is_kept: true, expires_at: null })
      .eq('id', course.id);
  } catch (dbErr) {
    console.warn('[이모추:auth] 코스 귀속 실패:', dbErr);
    return NextResponse.json({ error: '저장하지 못했어요.' }, { status: 500 });
  }

  return NextResponse.json({ claimed: true });
}
