import type { CourseResponse } from './weekend-types';

// 저장소가 차단된 브라우저도 생성 직후 결과를 볼 수 있다. 새로고침까지 보장하지는 않는다.
let current: CourseResponse | null = null;
export function rememberCourse(data: CourseResponse): void {
  current = data;
  try { sessionStorage.setItem('weekendCourse', JSON.stringify(data)); } catch { /* 메모리 결과 유지 */ }
}
export function readCourseCache(slug: string): CourseResponse | null {
  const matches = (data: CourseResponse | null) => data?.shareUrl?.split('/').pop() === slug && Array.isArray(data.course?.stops);
  if (matches(current)) return current;
  try {
    const data = JSON.parse(sessionStorage.getItem('weekendCourse') ?? 'null') as CourseResponse | null;
    return matches(data) ? data : null;
  } catch { return null; }
}
