import { describe, it, expect, vi, beforeEach } from 'vitest';

// TourAPI 모킹 (실호출 없이 라우트 로직만 검증)
const { searchKeyword } = vi.hoisted(() => ({ searchKeyword: vi.fn() }));
vi.mock('@/lib/tour-api', () => ({ searchKeyword }));

import { GET } from '@/app/api/search/route';

// 핸들러는 request.nextUrl.searchParams만 사용 → 최소 객체로 충분
const req = (qs: string) => ({ nextUrl: new URL(`http://localhost/api/search${qs}`) }) as any;

beforeEach(() => searchKeyword.mockReset());

describe('GET /api/search', () => {
  it('검색어 없음 → 400', async () => {
    const res = await GET(req(''));
    expect(res.status).toBe(400);
    expect(searchKeyword).not.toHaveBeenCalled();
  });

  it('성공 → TourAPI 결과 매핑 200', async () => {
    searchKeyword.mockResolvedValue([
      { contentid: '1', title: '경복궁', addr1: '서울 종로구', firstimage: 'http://img',
        contenttypeid: '12', cat2: 'A0201', mapx: '126.977', mapy: '37.579' },
    ]);
    const res = await GET(req('?keyword=경복궁'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].contentId).toBe('1');
    expect(body.results[0].title).toBe('경복궁');
  });

  it('TourAPI 응답 이상 → 500 (graceful)', async () => {
    // 비정상 응답(null)을 받으면 라우트 내부 매핑이 실패 → catch가 500으로 방어
    searchKeyword.mockResolvedValue(null as any);
    const res = await GET(req('?keyword=x'));
    expect(res.status).toBe(500);
  });
});
