import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase admin 클라이언트 모킹 (체이너블)
const { single, createAdminClient } = vi.hoisted(() => {
  const single = vi.fn();
  const createAdminClient = vi.fn(() => ({
    from: () => ({
      select: () => ({ eq: () => ({ single }) }),
      update: () => ({ eq: () => ({ then: (cb: any) => { cb(); return Promise.resolve(); } }) }),
    }),
  }));
  return { single, createAdminClient };
});
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }));

import { GET } from '@/app/api/course/[slug]/route';

const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeEach(() => single.mockReset());

describe('GET /api/course/[slug]', () => {
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
});
