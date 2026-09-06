// ============================================================
// 커뮤니티 코스 — 남이 공개 동의한 코스를 추천 후보로 보여준다
// ============================================================
//
// 왜 AI 로 새로 만들지 않나:
//   이미 다른 사람이 좋다고 남긴 코스가 있는데 굳이 새로 Gemini 를 부를 이유가 없다.
//   비용 0, 지연 0 이다.
//
// 왜 재검증(TourAPI·날씨 재호출)을 안 하나 (2026-09-04 결정, 1차 범위):
//   "생성된 지 N일 이내" 라는 신선도 필터만으로 후보를 거른다. 오래된 코스는
//   자동으로 추천 풀에서 빠진다. 축제 종료·영업시간 재확인은 2차 과제다.
//
// 🔴 opt-in 이다. is_public = true 인 코스만, 그것도 소유자가 코스 결과 화면에서
//    직접 켠 것만 후보다. 기본은 비공개 — 이 파일의 어떤 함수도 is_public 을
//    자동으로 켜지 않는다(켜는 동작은 app/api/course/[slug]/public/route.ts 가 한다).

import { createAdminClient } from '@/lib/supabase/admin';
import type { CommunityCourseCard, CommunitySort, CourseData, Duration, Companion } from '@/lib/weekend-types';

/** 추천 후보로 남는 신선도(일). env 로 조정 가능 — course-lifecycle.ts 의 COURSE_TTL_DAYS 와 대칭. */
export const COMMUNITY_FRESH_DAYS = Number(process.env.COMMUNITY_FRESH_DAYS ?? 45);

/** 한 페이지 크기. */
export const COMMUNITY_PAGE_SIZE = 24;

/** 429 응답에 곁들이는 제안 개수. 많이 주면 "코스 만들기" 대신 이걸 누르게 되므로 적게. */
const LIMIT_SUGGESTION_COUNT = 3;

/** select 화이트리스트와 1:1 대응하는 DB 행 셰이프. request_params·edit_token·user_id·
 *  departure_lat/lng 는 여기 없다 — 애초에 select 하지 않는다. */
export interface CommunityCourseRow {
  share_slug: string;
  course_data: CourseData;
  duration: Duration;
  companion: Companion;
  view_count: number;
  created_at: string;
}

/** created_at 이 이 시각 이후인 것만 신선하다고 본다. 순수함수 — 테스트가 이 함수만 검증하면 된다. */
export function freshnessCutoffISO(now: Date = new Date(), freshDays: number = COMMUNITY_FRESH_DAYS): string {
  return new Date(now.getTime() - freshDays * 86_400_000).toISOString();
}

/** DB 행 → 카드 셰이프. app/api/my/courses/route.ts 의 파생 로직과 대칭이다(그쪽은 인라인, 여기는 순수함수로 뽑아 테스트 가능하게 함). */
export function toCommunityCard(row: CommunityCourseRow): CommunityCourseCard {
  const c = row.course_data;
  return {
    slug: row.share_slug,
    title: c?.title ?? '코스',
    summary: c?.summary ?? '',
    stopCount: c?.stops?.length ?? 0,
    totalDistanceKm: c?.totalDistanceKm ?? 0,
    imageUrl: c?.stops?.find((s) => s.imageUrl)?.imageUrl,
    duration: row.duration,
    companion: row.companion,
    viewCount: row.view_count ?? 0,
    createdAt: row.created_at,
  };
}

/**
 * 신선도 + 공개 필터를 만족하는 커뮤니티 코스 목록을 가져온다.
 * 🔴 실패해도 던지지 않는다 — 목록 조회 실패로 페이지 전체가 죽으면 안 된다.
 */
export async function fetchCommunityCourses(opts: {
  sort?: CommunitySort;
  /** 0-based */
  page?: number;
  pageSize?: number;
} = {}): Promise<{ cards: CommunityCourseCard[]; hasMore: boolean }> {
  const sort = opts.sort ?? 'popular';
  const page = Math.max(0, opts.page ?? 0);
  const pageSize = opts.pageSize ?? COMMUNITY_PAGE_SIZE;
  const from = page * pageSize;
  // hasMore 판정을 위해 한 개 더 가져온다.
  const to = from + pageSize;

  try {
    const { data, error } = await createAdminClient()
      .from('wk_courses')
      .select('share_slug, course_data, duration, companion, view_count, created_at')
      .eq('is_public', true)
      .gte('created_at', freshnessCutoffISO())
      .order(sort === 'newest' ? 'created_at' : 'view_count', { ascending: false })
      .range(from, to);

    if (error || !data) return { cards: [], hasMore: false };

    const rows = data as unknown as CommunityCourseRow[];
    const hasMore = rows.length > pageSize;
    return { cards: rows.slice(0, pageSize).map(toCommunityCard), hasMore };
  } catch (err) {
    console.warn('[이모추:community] 목록 조회 예외:', err);
    return { cards: [], hasMore: false };
  }
}

/** 하루 한도(429)에 곁들일 인기 코스 몇 개. AI 재호출 없이 이미 있는 것 중 고른다. */
export async function fetchSuggestionsForLimitError(
  limit: number = LIMIT_SUGGESTION_COUNT,
): Promise<CommunityCourseCard[]> {
  const { cards } = await fetchCommunityCourses({ sort: 'popular', page: 0, pageSize: limit });
  return cards;
}

/**
 * 소유자의 opt-in 토글 상태를 저장한다.
 * 🔴 권한 확인은 이 함수의 책임이 아니다 — 호출부(API 라우트)가 lib/course-edit.ts 의
 *    authorizeEdit() 로 먼저 확인해야 한다. 여기서는 이미 확인된 courseId 만 받는다.
 * 🔑 켤 때 영구 보존(is_kept/expires_at) 처리는 이 함수가 하지 않는다 — 호출부가
 *    lib/course-lifecycle.ts 의 keepCourse() 를 별도로 부른다. 두 관심사를 한 함수에
 *    합치지 않는다(수명 정책이 바뀌어도 이 파일은 안 바뀌어야 한다).
 */
export async function setCoursePublic(courseId: string, isPublic: boolean): Promise<boolean> {
  try {
    const { error } = await createAdminClient()
      .from('wk_courses')
      .update({ is_public: isPublic })
      .eq('id', courseId);
    if (error) {
      console.warn('[이모추:community] 공개 설정 실패:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[이모추:community] 공개 설정 예외:', err);
    return false;
  }
}
