import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CourseResponse } from '@/lib/weekend-types';

const fixture = (title: string): CourseResponse => ({ courseId: 'qa', shareUrl: '/course/qa123', kakaoNaviUrl: '', course: { title, summary: '', tip: '', totalDistanceKm: 0, stops: [] } });
beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());
describe('생성·편집 결과 캐시', () => {
  it('저장소 접근이 거부돼도 생성 직후 메모리 결과는 남는다', async () => {
    vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    const { rememberCourse, readCourseCache } = await import('@/lib/course-cache');
    rememberCourse(fixture('현재 코스'));
    expect(readCourseCache('qa123')?.course.title).toBe('현재 코스');
  });
  it('다른 슬러그에 이전 코스를 노출하지 않는다', async () => {
    const { rememberCourse, readCourseCache } = await import('@/lib/course-cache');
    rememberCourse(fixture('이전 코스'));
    expect(readCourseCache('other')).toBeNull();
  });
  it('편집한 코스가 세션 저장소에도 반영된다', async () => {
    const setItem = vi.fn();
    vi.stubGlobal('sessionStorage', { getItem: () => null, setItem });
    const { rememberCourse, readCourseCache } = await import('@/lib/course-cache');
    rememberCourse(fixture('수정 전')); rememberCourse(fixture('수정 후'));
    expect(readCourseCache('qa123')?.course.title).toBe('수정 후');
    expect(JSON.parse(setItem.mock.calls.at(-1)![1]).course.title).toBe('수정 후');
  });
});
