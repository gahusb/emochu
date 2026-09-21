import type { CourseAdjustment, CourseStop, Duration } from './weekend-types';
import { minutes, scheduleWarnings, travelMinutes } from './course-timing';
import { validateComposition } from './course-composition';
import { earliestOperatingStart } from './operating-window';
import type { ScoredSpot } from './weekend-ai';

/** 체류는 보존한다. 대기 간격 축소 → 끝의 선택 관람 하나 제외 순으로, 해결되는 경우만 반영한다. */
export function repairTimeBudget(stops: CourseStop[], duration: Duration, pool: ScoredSpot[] = []): CourseAdjustment[] {
  if (duration === 'overnight') return []; // 숙박/2일차에 단일 하루 예산을 적용하지 않는다.
  const budget = { half_day: 240, full_day: 480, leisurely: 360 }[duration];
  const minimum = { half_day: 3, full_day: 5, leisurely: 4 }[duration];
  if (stops.length < minimum) return [];
  const last = stops.at(-1)!;
  const span = minutes(last.timeStart) + last.durationMin - minutes(stops[0].timeStart);
  if (!Number.isFinite(span) || span <= budget) return [];
  const trial = stops.map(s => ({ ...s })), compacted: CourseAdjustment[] = [];
  for (let i = 1; i < trial.length; i++) {
    const stop = trial[i], prev = trial[i - 1], current = minutes(stop.timeStart);
    if (stop.isFestival || stop.isStay || (stop.day ?? 1) !== (prev.day ?? 1)) continue;
    let earliest = minutes(prev.timeStart) + prev.durationMin + travelMinutes(prev, stop);
    // 기존 점심/저녁 역할을 더 이른 다른 끼니로 바꾸지 않는다.
    if (stop.role === 'restaurant') {
      if (current >= 660 && current <= 840) earliest = Math.max(earliest, 660);
      else if (current >= 1020 && current <= 1200) earliest = Math.max(earliest, 1020);
      else continue;
    }
    const visit = earliestOperatingStart(pool.find(c => c.contentId === stop.contentId)?.usetime, earliest, current, stop.durationMin);
    if (!visit || visit.start >= current) continue;
    stop.timeStart = `${String(Math.floor(visit.start / 60)).padStart(2, '0')}:${String(visit.start % 60).padStart(2, '0')}`;
    stop.description = '체류시간은 유지하고 이동 추정 뒤의 대기 간격을 줄였어요. 운영시간과 실제 길찾기는 확인해주세요.';
    stop.tip = ''; stop.hook = undefined; stop.whyNow = undefined;
    compacted.push({ kind: 'time_compacted', day: stop.day ?? 1, contentId: stop.contentId });
  }
  if (compacted.length && !scheduleWarnings(trial, duration).length && validateComposition(trial, duration).ok) {
    stops.splice(0, stops.length, ...trial);
    return compacted;
  }
  // 간격만 줄여 해결되지 않으면 그 시도는 버리고 원래 일정에서 마지막 선택 관람만 검토한다.
  if (stops.length <= minimum || last.isFestival || last.isStay || !['attraction', 'culture'].includes(last.role ?? '')) return [];
  const remaining = stops.slice(0, -1);
  // 식사·카페만 남는 일정, 미해결 겹침/장거리, 최소 개수 미달로 바꾸지 않는다.
  if (!remaining.some(s => s.isFestival || ['attraction', 'culture', 'activity'].includes(s.role ?? '')) || scheduleWarnings(remaining, duration).length || !validateComposition(remaining, duration).ok) return [];
  stops.pop();
  return [{ kind: 'budget_trim', day: last.day ?? 1, contentId: remaining.at(-1)!.contentId, previousContentId: last.contentId, previousTitle: last.title }];
}
