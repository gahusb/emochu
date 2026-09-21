import type { CourseData } from './weekend-types';
import { classifySpotRole, crossValidateContentIds, haversineKm, matchesElement, type CourseGenerationInput } from './weekend-ai';
import { festivalRunsOn, getTripDates } from './trip-context';
import { validateComposition } from './course-composition';
import { hasForecast, selectedForecasts } from './weather-coverage';
import { repairCandidatePool, repairLongLegs, repairMeals } from './course-repair';
import { operatingWindowStatus } from './operating-window';
import { festivalClosedOn, festivalTimingStatus, parseFestivalTiming } from './festival-timing';
import { repairFestivalDurations, repairFestivalSessions } from './course-festival';
import { repairTimeBudget } from './course-budget';
import { stopHoursStatus } from './course-hours';
import { courseHoursCounts } from './course-hours-summary';

import { minutes, repairSchedule, scheduleWarnings } from './course-timing';
export { repairSchedule, scheduleWarnings } from './course-timing';

/** AI·규칙 대체 모두 통과하는 최종 경계. 원본 확인과 방문 가능 보장은 구별한다. */
export function finalizeCourse(course: CourseData, input: CourseGenerationInput, now = new Date()): CourseData {
  const dates = getTripDates(input.duration, input.visitDay, now);
  const warnings = new Set<string>();
  crossValidateContentIds(course.stops, input.candidates, input.festivals, input.stays);
  // AI 원본 대조를 통과한 뒤에만 더 넓은 서버 수집 후보로 보완한다.
  const pool = repairCandidatePool(input);
  const used = new Set(course.stops.map(s => s.contentId));
  let changed = false;
  let stops = course.stops.filter((stop, i, all) => all.findIndex(s => s.contentId === stop.contentId) === i);
  changed = stops.length !== course.stops.length;
  stops = stops.flatMap(stop => {
    stop.day = input.duration === 'overnight' && stop.day === 2 ? 2 : 1;
    const date = dates[(stop.day ?? 1) - 1];
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const festival = input.festivals.find(f => f.contentId === stop.contentId);
    if (festival && !festivalRunsOn(festival.eventStartDate, festival.eventEndDate, date)) {
      changed = true;
      warnings.add('방문일에 열리지 않는 축제를 제외했어요. 남은 시간에 일정을 추가할 수 있어요.');
      return [];
    }
    if (festival && festivalClosedOn(parseFestivalTiming(festival.playtime), date)) {
      changed = true;
      warnings.add(`${stop.title}: 원본 행사시간의 운영 요일·휴무와 방문일이 맞지 않아 제외했어요.`);
      return [];
    }
    const candidate = pool.find(c => c.contentId === stop.contentId);
    if (candidate?.closedWeekdays?.includes(weekday)) {
      const role = classifySpotRole(candidate);
      const alt = pool.find(c => !used.has(c.contentId) && classifySpotRole(c) === role && !c.closedWeekdays?.includes(weekday) && operatingWindowStatus(c.usetime, minutes(stop.timeStart), stop.durationMin) !== 'outside');
      changed = true;
      if (!alt) {
        warnings.add('정기 휴무인 장소를 제외했어요. 대체 장소는 직접 추가해주세요.');
        return [];
      }
      used.add(alt.contentId);
      stop = { ...stop, contentId: alt.contentId, description: '정기 휴무인 장소 대신 고른 같은 역할의 장소예요.', tip: '', hook: undefined, whyNow: undefined };
      crossValidateContentIds([stop], pool, [], []);
      warnings.add('정기 휴무인 장소를 다른 후보로 바꿨어요. 변경된 동선을 확인해주세요.');
    }
    return [stop];
  });
  let adjustments = repairLongLegs(stops, input, pool, dates);
  adjustments.push(...repairFestivalDurations(stops, input.festivals));
  if (repairSchedule(stops, input.duration) > 0) {
    changed = true;
    warnings.add('체류·이동시간 추정치를 반영해 겹치는 방문 시간을 조정했어요. 운영시간과 실제 길찾기를 확인해주세요.');
  }
  adjustments.push(...repairFestivalSessions(stops, input.festivals, dates, input.duration));
  adjustments.push(...repairMeals(stops, input, pool, dates));
  adjustments.push(...repairTimeBudget(stops, input.duration, pool));
  // 식사로 대체되어 사라진 축제의 시간 보완 배지를 남기지 않는다.
  adjustments = adjustments.filter((a, i, all) => stops.some(s => s.contentId === a.contentId) && all.findIndex(b => b.kind === a.kind && b.contentId === a.contentId) === i);
  if (adjustments.length) changed = true;
  if (adjustments.some(a => a.kind === 'shorter_leg')) warnings.add('긴 이동 구간을 줄이기 위해 가까운 같은 역할의 관광 후보로 바꿨어요. 실제 길찾기를 확인해주세요.');
  if (adjustments.some(a => a.kind === 'meal_added')) warnings.add('누락된 식사를 관광정보의 음식점 후보로 보완했어요. 추가·변경된 장소와 운영시간을 확인해주세요.');
  if (adjustments.some(a => a.kind === 'festival_timing')) warnings.add('원본에 명시된 행사 시작 시각·회차당 소요시간을 반영했어요. 실제 운영과 예약은 확인해주세요.');
  for (const change of adjustments.filter(a => a.kind === 'festival_meal')) warnings.add(`${change.previousTitle}: 식사 시간과 겹치는 축제 대신 음식점을 넣었어요. 같은 날 다른 축제는 유지했으며 예약·운영을 보장하지 않아요.`);
  for (const change of adjustments.filter(a => a.kind === 'budget_trim')) warnings.add(`${change.previousTitle}: 선택한 시간 예산에 맞춰 마지막 선택 관광을 제외했어요. 다른 볼거리와 식사·휴식 시간은 유지했어요.`);
  if (adjustments.some(a => a.kind === 'time_compacted')) warnings.add('체류시간은 유지하고 이동 추정 뒤의 대기 간격을 줄여 시간 예산에 맞췄어요. 운영시간과 실제 길찾기는 확인해주세요.');
  crossValidateContentIds(stops, [...input.candidates, ...pool], input.festivals, input.stays);
  for (const stop of stops) {
    const candidate = pool.find(c => c.contentId === stop.contentId);
    const weekday = new Date(`${dates[(stop.day ?? 1) - 1]}T00:00:00Z`).getUTCDay();
    const festival = input.festivals.find(f => f.contentId === stop.contentId);
    if (festival) {
      const hours = festivalTimingStatus(festival.playtime, dates[(stop.day ?? 1) - 1], minutes(stop.timeStart), stop.durationMin);
      warnings.add(hours === 'outside'
        ? `${stop.title}: 제안 시간이 원본 행사시간과 맞지 않아요. 공연 회차·방문 시간을 조정해주세요.`
        : `${stop.title}: 개최기간 안이라도 매일 열리는 것은 아니에요. 공연 회차·운영일·예약을 확인해주세요.`);
      const timing = parseFestivalTiming(festival.playtime);
      if (timing?.durationMin && !timing.starts) warnings.add(`${stop.title}: 회차당 ${timing.durationMin}분은 반영했지만 회차별 시작 시각은 미확인이에요. 제안 시간의 실제 회차·예약을 확인해주세요.`);
    }
    stop.restdate = candidate?.restdate;
    stop.themeMatched = Boolean(input.saju && candidate && matchesElement(candidate, input.saju.todayElement));
    stop.openStatus = candidate?.closedWeekdays != null && !candidate.closedWeekdays.includes(weekday) ? 'open' : 'unknown';
    stop.hoursStatus = stopHoursStatus(stop, dates[(stop.day ?? 1) - 1]);
    if (input.accessibility?.length) {
      stop.accessibilityNeeds = input.accessibility;
      stop.accessibilityStatus = input.accessibility.every(need => candidate?.barrierFree?.[need] === true) ? 'confirmed' : 'unverified';
    }
    if (candidate && operatingWindowStatus(candidate.usetime, minutes(stop.timeStart), stop.durationMin) === 'outside') {
      warnings.add(`${stop.title}: 제안 시간이 원본 운영시간·준비시간·입장/주문 마감과 맞지 않아요. 방문 시간을 조정해주세요.`);
    }
  }
  const hours = courseHoursCounts(stops);
  if (hours.unknown > 0) warnings.add(`${hours.unknown}곳의 운영시간은 미확인이에요. 원문이 없거나 복합 조건으로 판정하지 못했으니 출발 전 확인해주세요.`);
  let distance = 0;
  stops.forEach((stop, i) => {
    stop.order = i + 1;
    stop.transitInfo = undefined;
    if (i === 0) return;
    const prev = stops[i - 1];
    const km = haversineKm(prev.latitude, prev.longitude, stop.latitude, stop.longitude);
    distance += km;
    stop.transitInfo = `이동 약 ${Math.max(10, Math.round(km * 3))}분 · 직선 ${km.toFixed(1)}km (추정)`;
  });
  scheduleWarnings(stops, input.duration).forEach(w => warnings.add(w));
  validateComposition(stops, input.duration, new Set(pool.map(classifySpotRole))).problems.forEach(w => warnings.add(`일정 구성 확인: ${w}`));
  selectedForecasts(input.weather, input.duration, input.visitDay).forEach((day, i) => {
    if (!hasForecast(input.weather, day)) warnings.add(`${dates[i]} 날씨 예보를 확인하지 못했어요. 출발 전 예보를 확인해주세요.`);
  });
  if (changed) {
    course.storyArc = undefined;
    course.summary = '방문 날짜와 관광정보를 대조해 일정을 조정했어요. 변경된 장소와 시간을 확인해주세요.';
    course.estimatedCostWon = undefined;
    course.tip = '일정이 조정됐어요. 식사·휴식, 운영시간과 실제 이동 경로를 출발 전에 확인해주세요.';
  }
  return {
    ...course, stops, totalDistanceKm: Math.round(distance * 10) / 10,
    saju: input.saju,
    verification: { visitDates: dates, checkedAt: now.toISOString(), warnings: [...warnings], adjustments },
  };
}
