import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fetchCommunityCourses } = vi.hoisted(() => ({
  fetchCommunityCourses: vi.fn(),
}));
vi.mock('@/lib/course-community', () => ({ fetchCommunityCourses }));

import { GET } from '@/app/api/course/community/route';

function req(url: string) {
  return { nextUrl: new URL(url) } as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  fetchCommunityCourses.mockReset();
  fetchCommunityCourses.mockResolvedValue({ cards: [], hasMore: false });
});

describe('GET /api/course/community', () => {
  it('sort 없으면 popular 로 조회한다', async () => {
    await GET(req('http://x/api/course/community'));
    expect(fetchCommunityCourses).toHaveBeenCalledWith({ sort: 'popular', page: 0 });
  });

  it('sort=newest 는 그대로 전달된다', async () => {
    await GET(req('http://x/api/course/community?sort=newest'));
    expect(fetchCommunityCourses).toHaveBeenCalledWith({ sort: 'newest', page: 0 });
  });

  it('화이트리스트 밖 sort 값은 popular 로 폴백한다', async () => {
    await GET(req('http://x/api/course/community?sort=garbage'));
    expect(fetchCommunityCourses).toHaveBeenCalledWith({ sort: 'popular', page: 0 });
  });

  it('음수·비정수 page 는 0 으로 보정된다', async () => {
    await GET(req('http://x/api/course/community?page=-1'));
    expect(fetchCommunityCourses).toHaveBeenCalledWith({ sort: 'popular', page: 0 });

    fetchCommunityCourses.mockClear();
    await GET(req('http://x/api/course/community?page=abc'));
    expect(fetchCommunityCourses).toHaveBeenCalledWith({ sort: 'popular', page: 0 });
  });

  it('정상 page 는 그대로 전달된다', async () => {
    await GET(req('http://x/api/course/community?page=2'));
    expect(fetchCommunityCourses).toHaveBeenCalledWith({ sort: 'popular', page: 2 });
  });

  it('응답 셰이프는 { courses, hasMore, sort, page } 다', async () => {
    fetchCommunityCourses.mockResolvedValue({
      cards: [{ slug: 'a', title: 't', summary: '', stopCount: 1, totalDistanceKm: 1, duration: 'half_day', companion: 'solo', viewCount: 1, createdAt: '2026-01-01' }],
      hasMore: true,
    });
    const res = await GET(req('http://x/api/course/community?sort=newest&page=1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      courses: [{ slug: 'a', title: 't', summary: '', stopCount: 1, totalDistanceKm: 1, duration: 'half_day', companion: 'solo', viewCount: 1, createdAt: '2026-01-01' }],
      hasMore: true,
      sort: 'newest',
      page: 1,
    });
  });
});
