import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase admin 클라이언트 모킹 (체이너블)
const { single, select, createAdminClient } = vi.hoisted(() => {
  const single = vi.fn();
  const select = vi.fn(() => ({ eq: () => ({ single }) }));
  const createAdminClient = vi.fn(() => ({
    from: () => ({
      select,
      update: () => ({ eq: () => ({ then: (cb: any) => { cb(); return Promise.resolve(); } }) }),
    }),
  }));
  return { single, select, createAdminClient };
});
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }));

import { GET } from '@/app/api/course/[slug]/route';

const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeEach(() => {
  single.mockReset();
  select.mockClear();
});

describe('GET /api/course/[slug]', () => {
  it('공유 조회는 허용 컬럼만 요청하고 추가 민감 컬럼이 있어도 응답하지 않는다', async () => {
    single.mockResolvedValue({
      data: {
        id: 'id1', share_slug: 'abcd1234', view_count: 0, course_b_data: null,
        course_data: { title: '코스', summary: '', totalDistanceKm: 0, tip: '', stops: [] },
        edit_token: 'fixture-private-edit-capability', user_id: 'fixture-private-owner',
        departure_lat: 37.123, departure_lng: 127.123, request_params: { private: true },
      },
      error: null,
    });
    const res = await GET({} as any, ctx('abcd1234'));
    expect(res.status).toBe(200);
    expect(select).toHaveBeenCalledExactlyOnceWith('id, share_slug, course_data, course_b_data, view_count, is_public');
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(['course', 'courseId', 'isPublic', 'kakaoNaviUrl', 'shareUrl']);
    expect(JSON.stringify(body)).not.toContain('fixture-private');
  });

  it('짧은 slug → 400', async () => {
    const res = await GET({} as any, ctx('abc'));
    expect(res.status).toBe(400);
  });

  it('없는 코스 → 404', async () => {
    single.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const res = await GET({} as any, ctx('abcd1234'));
    expect(res.status).toBe(404);
  });

  it('존재 → 200 + 응답 형태', async () => {
    single.mockResolvedValue({
      data: {
        id: 'id1', share_slug: 'abcd1234', view_count: 3, course_b_data: null,
        course_data: {
          title: '코스', summary: '요약', totalDistanceKm: 0, tip: '', stops: [
            { order: 1, contentId: '1', title: '장소', timeStart: '10:00', durationMin: 60,
              description: '', tip: '', latitude: 37.5, longitude: 127, isFestival: false },
          ],
        },
      },
      error: null,
    });
    const res = await GET({} as any, ctx('abcd1234'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.course.title).toBe('코스');
    expect(body.shareUrl).toContain('abcd1234');
    expect(typeof body.kakaoNaviUrl).toBe('string');
  });

  // 🔴 커뮤니티 opt-in 토글(SaveShareBar)의 초기 상태가 여기서 나온다 — 값이 안 실리면
  //    토글이 항상 꺼진 채로 그려진다.
  it('is_public=true 인 코스는 isPublic:true 로 응답한다', async () => {
    single.mockResolvedValue({
      data: {
        id: 'id1', share_slug: 'abcd1234', view_count: 3, course_b_data: null, is_public: true,
        course_data: { title: '코스', summary: '', totalDistanceKm: 0, tip: '', stops: [] },
      },
      error: null,
    });
    const res = await GET({} as any, ctx('abcd1234'));
    const body = await res.json();
    expect(body.isPublic).toBe(true);
  });

  it('is_public 이 없거나 false 면 isPublic:false 로 응답한다(단언하지 않는다)', async () => {
    single.mockResolvedValue({
      data: {
        id: 'id1', share_slug: 'abcd1234', view_count: 0, course_b_data: null,
        course_data: { title: '코스', summary: '', totalDistanceKm: 0, tip: '', stops: [] },
      },
      error: null,
    });
    const res = await GET({} as any, ctx('abcd1234'));
    const body = await res.json();
    expect(body.isPublic).toBe(false);
  });
});
