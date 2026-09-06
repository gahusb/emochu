import { describe, it, expect, vi, beforeEach } from 'vitest';

const { authorizeEdit, keepCourse, setCoursePublic } = vi.hoisted(() => ({
  authorizeEdit: vi.fn(),
  keepCourse: vi.fn(),
  setCoursePublic: vi.fn(),
}));
vi.mock('@/lib/course-edit', () => ({ authorizeEdit }));
vi.mock('@/lib/course-lifecycle', () => ({ keepCourse }));
vi.mock('@/lib/course-community', () => ({ setCoursePublic }));

import { POST } from '@/app/api/course/[slug]/public/route';

const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });

function req(token: string | null, body: unknown) {
  return {
    headers: { get: (k: string) => (k === 'x-edit-token' ? token : null) },
    json: async () => body,
  } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  authorizeEdit.mockReset();
  keepCourse.mockReset();
  setCoursePublic.mockReset();
});

describe('POST /api/course/[slug]/public', () => {
  it('토큰 없음/불일치 → 404, DB 를 건드리지 않는다', async () => {
    authorizeEdit.mockResolvedValue(null);
    const res = await POST(req(null, { isPublic: true }), ctx('abcd1234'));
    expect(res.status).toBe(404);
    expect(setCoursePublic).not.toHaveBeenCalled();
    expect(keepCourse).not.toHaveBeenCalled();
  });

  it('JSON 파싱 실패 → 400', async () => {
    authorizeEdit.mockResolvedValue({ id: 'id1', courseData: {} });
    const bad = {
      headers: { get: () => 'tok' },
      json: async () => { throw new Error('bad json'); },
    } as unknown as Parameters<typeof POST>[0];
    const res = await POST(bad, ctx('abcd1234'));
    expect(res.status).toBe(400);
  });

  it('isPublic:true → setCoursePublic(true) 그리고 keepCourse 호출', async () => {
    authorizeEdit.mockResolvedValue({ id: 'id1', courseData: {} });
    setCoursePublic.mockResolvedValue(true);
    const res = await POST(req('tok', { isPublic: true }), ctx('abcd1234'));
    expect(res.status).toBe(200);
    expect(setCoursePublic).toHaveBeenCalledWith('id1', true);
    expect(keepCourse).toHaveBeenCalledWith('abcd1234');
    expect(await res.json()).toEqual({ isPublic: true });
  });

  // 🔴 회귀 방지: 끌 때 되돌리지 않는다는 설계를 여기서 고정한다.
  it('isPublic:false → setCoursePublic(false)만, keepCourse 는 호출되지 않는다', async () => {
    authorizeEdit.mockResolvedValue({ id: 'id1', courseData: {} });
    setCoursePublic.mockResolvedValue(true);
    const res = await POST(req('tok', { isPublic: false }), ctx('abcd1234'));
    expect(res.status).toBe(200);
    expect(setCoursePublic).toHaveBeenCalledWith('id1', false);
    expect(keepCourse).not.toHaveBeenCalled();
  });

  it('isPublic 필드가 true 가 아닌 값(누락 등)은 false 로 취급된다', async () => {
    authorizeEdit.mockResolvedValue({ id: 'id1', courseData: {} });
    setCoursePublic.mockResolvedValue(true);
    await POST(req('tok', {}), ctx('abcd1234'));
    expect(setCoursePublic).toHaveBeenCalledWith('id1', false);
  });

  it('setCoursePublic 실패 → 500', async () => {
    authorizeEdit.mockResolvedValue({ id: 'id1', courseData: {} });
    setCoursePublic.mockResolvedValue(false);
    const res = await POST(req('tok', { isPublic: true }), ctx('abcd1234'));
    expect(res.status).toBe(500);
    expect(keepCourse).not.toHaveBeenCalled();
  });
});
