// ============================================================
// 코스 수명 — 만들어진 코스를 언제까지 보관할 것인가
// ============================================================
//
// 예전에는 생성된 코스가 **전부 영구 저장**되고 삭제 수단이 없었다.
// 대부분의 코스는 한 번 보고 버려지는데, 그게 전부 남으면
//   · DB 가 계속 불어나고
//   · 출발 좌표(집일 수 있다)를 포함한 기록이 무기한 남는다
//
// 그래서 기본은 30일 만료, **공유·저장을 누른 코스만 영구 보존**한다.
// 🔑 이미 공유된 링크가 어느 날 깨지는 것이 가장 나쁜 결과이므로,
//    「누른 적 있으면 절대 안 지운다」를 규칙으로 삼는다.

import { createAdminClient } from '@/lib/supabase/admin';

/** 공유·저장을 누르지 않은 코스의 보관 기간(일). */
export const COURSE_TTL_DAYS = Number(process.env.COURSE_TTL_DAYS ?? 30);

/** 한 번에 지우는 최대 건수. 저장 경로에 얹혀 도는 작업이라 짧아야 한다. */
const SWEEP_BATCH = 50;

/**
 * 만료된 코스를 조금씩 지운다.
 *
 * 🔴 호출부는 await 하지 않는다(`void sweepExpiredCourses()`). 정리가 늦어지는 건
 *    괜찮지만, 정리 때문에 사용자의 코스 생성이 느려지는 건 안 된다.
 *    실패도 삼킨다 — 정리 실패가 코스 생성 실패로 번지면 안 된다.
 */
export async function sweepExpiredCourses(): Promise<number> {
  try {
    const supabase = createAdminClient();

    const { data: expired } = await supabase
      .from('wk_courses')
      .select('id')
      .eq('is_kept', false)
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())
      .limit(SWEEP_BATCH);

    if (!expired?.length) return 0;

    const ids = expired.map((r) => (r as { id: string }).id);
    const { error } = await supabase.from('wk_courses').delete().in('id', ids);
    if (error) {
      console.warn('[이모추:lifecycle] 만료 코스 삭제 실패:', error.message);
      return 0;
    }
    console.log(`[이모추:lifecycle] 만료 코스 ${ids.length}건 정리`);
    return ids.length;
  } catch (err) {
    console.warn('[이모추:lifecycle] 정리 중 예외 (무시):', err);
    return 0;
  }
}

/**
 * 코스를 영구 보존으로 바꾼다. 공유·저장을 눌렀을 때 호출한다.
 * 이미 보존 중이면 아무 일도 하지 않는다(멱등).
 */
export async function keepCourse(slug: string): Promise<boolean> {
  try {
    const { error } = await createAdminClient()
      .from('wk_courses')
      .update({ is_kept: true, expires_at: null })
      .eq('share_slug', slug);

    if (error) {
      console.warn('[이모추:lifecycle] 보존 표시 실패:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[이모추:lifecycle] 보존 표시 예외:', err);
    return false;
  }
}
