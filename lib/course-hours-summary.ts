import type { CourseStop } from './weekend-types';

// 클라이언트에서도 사용하므로 API/AI 엔진 의존성을 가져오지 않는다.
export const HOURS_LABELS = {
  within: '제안 시간은 원문 운영구간 내',
  outside: '제안 시간과 운영시간 불일치',
  unknown: '운영시간 미확인',
} as const;

export function courseHoursCounts(stops: CourseStop[]) {
  return stops.reduce((counts, stop) => { counts[stop.hoursStatus ?? 'unknown']++; return counts; }, { within: 0, outside: 0, unknown: 0 });
}
