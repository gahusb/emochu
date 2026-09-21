import type { CourseAdjustment, CourseStop, Duration } from './weekend-types';
import type { FestivalCandidate } from './weekend-ai';
import { absoluteStart, minutes, travelMinutes } from './course-timing';
import { festivalClosedOn, parseFestivalTiming } from './festival-timing';

/** 원본의 회차당 시간을 줄이지 않는다. 길어진 결과의 충돌은 후속 보완/경고에서 다룬다. */
export function repairFestivalDurations(stops: CourseStop[], festivals: FestivalCandidate[]): CourseAdjustment[] {
  const changes: CourseAdjustment[] = [];
  for (const stop of stops) {
    if (!stop.isFestival) continue;
    const timing = parseFestivalTiming(festivals.find(f => f.contentId === stop.contentId)?.playtime);
    if (!timing?.durationMin || stop.durationMin >= timing.durationMin) continue;
    stop.durationMin = timing.durationMin;
    stop.description = `원본에 안내된 회차당 ${timing.durationMin}분을 일정에 반영했어요. 실제 회차 시작과 예약은 확인해주세요.`;
    stop.tip = ''; stop.hook = undefined; stop.whyNow = undefined;
    changes.push({ kind: 'festival_timing', day: stop.day ?? 1, contentId: stop.contentId });
  }
  return changes;
}

/** 명시된 시작 시각만 선택하며, 앞뒤 일정·일차·시간 예산을 밀어내지 않는다. */
export function repairFestivalSessions(stops: CourseStop[], festivals: FestivalCandidate[], dates: string[], duration: Duration): CourseAdjustment[] {
  const changes: CourseAdjustment[] = [];
  const budget = { half_day: 240, full_day: 480, leisurely: 360, overnight: 720 }[duration];
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    if (!stop.isFestival) continue;
    const day = stop.day ?? 1, offset = (day - 1) * 1440;
    const timing = parseFestivalTiming(festivals.find(f => f.contentId === stop.contentId)?.playtime);
    if (!timing?.starts || festivalClosedOn(timing, dates[day - 1])) continue;
    const prev = stops[i - 1], next = stops[i + 1];
    const first = minutes(stops.find(s => (s.day ?? 1) === day)!.timeStart);
    const limit = duration === 'overnight' ? (day === 1 ? 21 : 19) * 60 : first + budget;
    const earliest = Math.max(0, prev ? absoluteStart(prev) + prev.durationMin + travelMinutes(prev, stop) - offset : 0);
    const latest = Math.min(1440, limit, next ? absoluteStart(next) - travelMinutes(stop, next) - offset : 1440) - stop.durationMin;
    const options = timing.starts.filter(t => t >= earliest && t <= latest &&
      // 첫 장소를 앞당겼을 때도 마지막 방문까지의 총 예산을 초과하지 않는다.
      (duration === 'overnight' || i !== 0 || minutes(stops.at(-1)!.timeStart) + stops.at(-1)!.durationMin - t <= budget));
    const current = minutes(stop.timeStart);
    const chosen = options.sort((a, b) => Math.abs(a - current) - Math.abs(b - current) || a - b)[0];
    if (chosen == null || chosen === current) continue;
    stop.timeStart = `${String(Math.floor(chosen / 60)).padStart(2, '0')}:${String(chosen % 60).padStart(2, '0')}`;
    stop.description = '원본에 명시된 행사 시작 시각으로 조정했어요. 당일 운영과 실제 이동시간·예약을 확인해주세요.';
    stop.tip = ''; stop.hook = undefined; stop.whyNow = undefined;
    changes.push({ kind: 'festival_timing', day, contentId: stop.contentId });
  }
  return changes;
}
