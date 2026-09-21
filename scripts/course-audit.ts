import type { CourseData } from '@/lib/weekend-types';
import { classifySpotRole, type CourseGenerationInput } from '@/lib/weekend-ai';
import { repairCandidatePool } from '@/lib/course-repair';
import { scheduleWarnings, minutes } from '@/lib/course-timing';
import { validateComposition } from '@/lib/course-composition';
import { getTripDates, festivalRunsOn } from '@/lib/trip-context';
import { parseFestivalTiming, festivalClosedOn, festivalTimingStatus } from '@/lib/festival-timing';
import { operatingWindowStatus } from '@/lib/operating-window';
import { hasForecast, selectedForecasts } from '@/lib/weather-coverage';

/** 성공률로 합치기 전에 서로 다른 품질 축과 미확인 분모를 보존한다. 실시간 운영 검증이 아니다. */
export function auditCourse(course: CourseData, input: CourseGenerationInput, now = new Date()) {
  const dates = getTripDates(input.duration, input.visitDay, now);
  const pool = repairCandidatePool(input);
  const sources = [...pool, ...input.festivals, ...input.stays];
  const ungrounded: string[] = [], wrongDate: string[] = [], hoursOutside: string[] = [], hoursUnknown: string[] = [];
  for (const stop of course.stops) {
    const source = sources.find(s => s.contentId === stop.contentId);
    if (!source || source.title !== stop.title || !Number.isFinite(source.latitude + source.longitude + stop.latitude + stop.longitude) || stop.latitude < 33 || stop.latitude > 43 || stop.longitude < 124 || stop.longitude > 132 || Math.abs(source.latitude - stop.latitude) > 0.000001 || Math.abs(source.longitude - stop.longitude) > 0.000001) ungrounded.push(stop.contentId);
    const date = dates[(stop.day ?? 1) - 1], day = new Date(`${date}T00:00:00Z`).getUTCDay();
    const candidate = pool.find(c => c.contentId === stop.contentId);
    const festival = input.festivals.find(f => f.contentId === stop.contentId);
    if (!date || candidate?.closedWeekdays?.includes(day) || (festival && (!festivalRunsOn(festival.eventStartDate, festival.eventEndDate, date) || festivalClosedOn(parseFestivalTiming(festival.playtime), date)))) wrongDate.push(stop.contentId);
    const hours = festival ? festivalTimingStatus(festival.playtime, date, minutes(stop.timeStart), stop.durationMin)
      : operatingWindowStatus(candidate?.usetime, minutes(stop.timeStart), stop.durationMin);
    if (hours === 'outside') hoursOutside.push(stop.contentId);
    if (hours === 'unknown') hoursUnknown.push(stop.contentId);
  }
  const schedule = scheduleWarnings(course.stops, input.duration);
  const composition = validateComposition(course.stops, input.duration, new Set(pool.map(classifySpotRole)));
  const duplicateCount = course.stops.length - new Set(course.stops.map(s => s.contentId)).size;
  return {
    // 카페/식당 후보 자체가 없으면 구성 검사가 요구하지 않는다. 후보 역할도 반드시 같이 해석한다.
    knownChecksPass: course.stops.length > 0 && !ungrounded.length && !wrongDate.length && !hoursOutside.length && !schedule.length && composition.ok && duplicateCount === 0,
    schedule, composition, ungrounded, wrongDate, hoursOutside, hoursUnknown, duplicateCount,
    totalStops: course.stops.length, candidateRoles: [...new Set(pool.map(classifySpotRole))].sort(),
    accessibility: { requested: input.accessibility ?? [], checkedStops: input.accessibility?.length ? course.stops.length : 0, withAllRequestedInfo: input.accessibility?.length ? course.stops.filter(s => input.accessibility!.every(n => pool.find(c => c.contentId === s.contentId)?.barrierFree?.[n] === true)).length : 0 },
    forecastUnknownDates: selectedForecasts(input.weather, input.duration, input.visitDay).flatMap((d, i) => hasForecast(input.weather, d) ? [] : [dates[i]]),
  };
}
