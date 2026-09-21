import type { CourseStop } from './weekend-types';
import { operatingWindowStatus } from './operating-window';
import { festivalTimingStatus } from './festival-timing';
import { minutes } from './course-timing';

/** 정기 휴무와 별개인, 제안 시각/체류와 원문 운영시간의 대조 결과. */
export function stopHoursStatus(stop: CourseStop, date?: string): NonNullable<CourseStop['hoursStatus']> {
  if (stop.isStay) return 'unknown'; // 체크인/숙박을 일반 관람 운영구간으로 판정하지 않는다.
  if (stop.isFestival) return date ? festivalTimingStatus(stop.facilities?.operatingHours, date, minutes(stop.timeStart), stop.durationMin) : 'unknown';
  return operatingWindowStatus(stop.facilities?.operatingHours, minutes(stop.timeStart), stop.durationMin);
}
