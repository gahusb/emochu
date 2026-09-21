import type { Companion, CourseStop, Duration, CourseAdjustment } from './weekend-types';
import { classifySpotRole, crossValidateContentIds, haversineKm, type CourseGenerationInput, type ScoredSpot } from './weekend-ai';
import { absoluteStart, minutes, travelMinutes } from './course-timing';
import { earliestOperatingStart, operatingWindowStatus } from './operating-window';

const MAX_LEG_KM = 20;
// 🟡 2026-09-21 제출 후 관찰: 「가족+아이 / 하루」 코스에 차로 37분(12.5km) 구간이 있었다.
//    20km 기준에 안 걸려 보완이 **아예 돌지 않았다.** 아이를 데리고 다니는 조건에서
//    한 구간 12km 는 체감이 크게 나쁘다 → 그 조건에서만 기준을 좁힌다.
// 🔴 표본 2회다. 다른 동반자는 20km 그대로 두고, 「직선거리 추정이라 실제 도로와 다르다」는
//    기존 한계도 그대로다(docs/2026-09-09-식사-동선-보완-결과.md).
//    보완은 **더 가까운 같은 역할 후보가 있고 총 이동이 줄 때만** 교체하므로,
//    기준을 좁혀도 마땅한 후보가 없으면 코스는 그대로 남는다(코스를 망가뜨리지 않는다).
const LEG_LIMIT_BY_COMPANION: Partial<Record<Companion, number>> = { family: 12 };
const legLimitKm = (companion: Companion) => LEG_LIMIT_BY_COMPANION[companion] ?? MAX_LEG_KM;
const MAX_STOPS: Record<Duration, number> = { half_day: 4, full_day: 7, leisurely: 5, overnight: 10 };
const DAY_BUDGET: Record<Duration, number> = { half_day: 240, full_day: 480, leisurely: 360, overnight: 720 };
const distance = (a: Pick<CourseStop, 'latitude' | 'longitude'>, b: Pick<CourseStop, 'latitude' | 'longitude'>) => haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
const clock = (start: number) => `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
const valid = (c: ScoredSpot) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude) && c.latitude >= 33 && c.latitude <= 43 && c.longitude >= 124 && c.longitude <= 132;
const available = (c: ScoredSpot, day: number, dates: string[]) => valid(c) && !c.closedWeekdays?.includes(new Date(`${dates[day - 1]}T00:00:00Z`).getUTCDay());
const coverage = (c: ScoredSpot | undefined, input: CourseGenerationInput) => input.accessibility?.filter(n => c?.barrierFree?.[n] === true).length ?? 0;
const preservesCoverage = (old: ScoredSpot | undefined, next: ScoredSpot, input: CourseGenerationInput) => input.accessibility?.every(n => old?.barrierFree?.[n] !== true || next.barrierFree?.[n] === true) ?? true;
const cleanStop = (c: ScoredSpot, base: Partial<CourseStop>, description: string): CourseStop => {
  const stop: CourseStop = { order: 0, day: 1, timeStart: '12:00', durationMin: 60, ...base, contentId: c.contentId, title: c.title, latitude: c.latitude, longitude: c.longitude, isFestival: false, description, tip: '', hook: undefined, whyNow: undefined };
  crossValidateContentIds([stop], [c], [], []);
  return stop;
};

/** AI에는 전달하지 않는 예비 후보. AI 응답의 원본 대조 이후 서버 보완에만 쓴다. */
export function repairCandidatePool(input: CourseGenerationInput): ScoredSpot[] {
  const active = input.feeling === 'adventurous' || input.feeling === 'excited';
  const all = [...input.candidates, ...(input.repairCandidates ?? [])];
  return all.filter((c, i) => valid(c) && all.findIndex(s => s.contentId === c.contentId) === i &&
    [12, 14, 28, 39].includes(c.contentTypeId) && (active || classifySpotRole(c) !== 'activity'));
}

/** 같은 역할의 가까운 후보로 큰 우회를 줄인다. 숙박·축제·방문일은 바꾸지 않는다. */
export function repairLongLegs(stops: CourseStop[], input: CourseGenerationInput, pool: ScoredSpot[], dates: string[]): CourseAdjustment[] {
  const changes: CourseAdjustment[] = [];
  const limitKm = legLimitKm(input.companion);
  // 최대 두 번 순회한다. 교체 때마다 거리가 짧아지는 경우에만 반영한다.
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < stops.length; i++) {
    const old = stops[i], prev = stops[i - 1], next = stops[i + 1];
    if (old.isStay || old.isFestival || !old.role || (!prev && !next)) continue;
    const before = [prev, next].filter((s): s is CourseStop => Boolean(s));
    const oldLengths = before.map(s => distance(s, old));
    if (!oldLengths.some(d => d > limitKm)) continue;
    const used = new Set(stops.map(s => s.contentId));
    const previous = pool.find(c => c.contentId === old.contentId);
    const options = pool.filter(c => !used.has(c.contentId) && classifySpotRole(c) === old.role && available(c, old.day ?? 1, dates) && preservesCoverage(previous, c, input))
      .map(c => ({ candidate: c, lengths: before.map(s => distance(s, c)), hours: operatingWindowStatus(c.usetime, minutes(old.timeStart), old.durationMin) }))
      .filter(o => o.hours !== 'outside' && o.lengths.every(d => d <= limitKm) && o.lengths.reduce((a, b) => a + b, 0) + 1 < oldLengths.reduce((a, b) => a + b, 0))
      .filter(o => {
        const replacement = cleanStop(o.candidate, old, '긴 이동 구간을 줄이기 위해 같은 역할의 가까운 관광 후보로 바꿨어요.');
        // 이미 있던 겹침은 이후 시간표 단계가 보정하지만, 더 큰 겹침을 새로 만들지는 않는다.
        const overlap = (a: CourseStop, b: CourseStop) => Math.max(0, absoluteStart(a) + a.durationMin + travelMinutes(a, b) - absoluteStart(b));
        return (!prev || overlap(prev, replacement) <= overlap(prev, old)) && (!next || overlap(replacement, next) <= overlap(old, next));
      })
      .sort((a, b) => Number(b.hours === 'within') - Number(a.hours === 'within') || a.lengths.reduce((x, y) => x + y, 0) - b.lengths.reduce((x, y) => x + y, 0));
    const chosen = options[0]?.candidate;
    if (!chosen) continue;
    stops[i] = cleanStop(chosen, old, '긴 이동 구간을 줄이기 위해 같은 역할의 가까운 관광 후보로 바꿨어요. 운영시간과 실제 길찾기를 확인해주세요.');
    changes.push({ kind: 'shorter_leg', day: old.day ?? 1, contentId: chosen.contentId, previousContentId: old.contentId });
  }
  return changes;
}

interface Meal { day: number; from: number; to: number; label: '점심' | '저녁' }
const mealSlots = (duration: Duration): Meal[] => [
  { day: 1, from: 660, to: 840, label: '점심' },
  ...(duration === 'full_day' || duration === 'overnight' ? [{ day: 1, from: 1020, to: 1200, label: '저녁' as const }] : []),
  ...(duration === 'overnight' ? [{ day: 2, from: 660, to: 840, label: '점심' as const }] : []),
];

/** 빈 구간 → 중복 관광 → 식사와 겹치는 중복 축제 순서로 보완한다. 마지막 축제는 남긴다. */
export function repairMeals(stops: CourseStop[], input: CourseGenerationInput, pool: ScoredSpot[], dates: string[]): CourseAdjustment[] {
  const changes: CourseAdjustment[] = [];
  if (!stops.length) return changes;
  for (const meal of mealSlots(input.duration)) {
    const daily = stops.filter(s => (s.day ?? 1) === meal.day);
    if (!daily.length || daily.some(s => s.role === 'restaurant' && minutes(s.timeStart) >= meal.from && minutes(s.timeStart) <= meal.to)) continue;
    const first = minutes(daily[0].timeStart);
    const limit = input.duration === 'overnight' ? (meal.day === 1 ? 21 : 19) * 60 : first + DAY_BUDGET[input.duration];
    const used = new Set(stops.map(s => s.contentId));
    const restaurants = pool.filter(c => classifySpotRole(c) === 'restaurant' && !used.has(c.contentId) && available(c, meal.day, dates));
    type Option = { stop: CourseStop; index: number; replace: boolean; distance: number; known: boolean; coverage: number; previousContentId?: string; previousTitle?: string };
    const options: Option[] = [];
    const offer = (candidate: ScoredSpot, index: number, replace: boolean) => {
      const old = replace ? stops[index] : undefined;
      const prev = stops[index - 1], next = stops[index + (replace ? 1 : 0)];
      const dayOffset = (meal.day - 1) * 1440;
      // 삽입 지점은 선택한 일차에만 있고 일차 순서를 거꾸로 만들지 않는다.
      if ((prev && (prev.day ?? 1) > meal.day) || (next && (next.day ?? 1) < meal.day)) return;
      if ((prev && distance(prev, candidate) > MAX_LEG_KM) || (next && distance(candidate, next) > MAX_LEG_KM)) return;
      const minimum = Math.max(first, meal.from, prev ? absoluteStart(prev) + prev.durationMin + travelMinutes(prev, candidate) - dayOffset : 0);
      const maximum = Math.min(meal.to, limit - 60, next ? absoluteStart(next) - travelMinutes(candidate, next) - 60 - dayOffset : 1380);
      const visit = earliestOperatingStart(candidate.usetime, minimum, maximum, 60);
      if (!visit || visit.start < 0 || visit.start + 60 > 1440) return;
      const added = (prev ? distance(prev, candidate) : 0) + (next ? distance(candidate, next) : 0) - (prev && next ? distance(prev, next) : 0);
      const stop = cleanStop(candidate, { day: meal.day, timeStart: clock(visit.start), durationMin: 60 }, `${meal.day}일차 ${meal.label}이 빠져 관광정보의 음식점 후보로 보완했어요. 운영시간은 방문 전에 확인해주세요.`);
      options.push({ stop, index, replace, distance: added, known: visit.status === 'within', coverage: coverage(candidate, input), previousContentId: old?.contentId, previousTitle: old?.isFestival ? old.title : undefined });
    };
    if (stops.length < MAX_STOPS[input.duration]) for (let i = 0; i <= stops.length; i++) for (const candidate of restaurants) offer(candidate, i, false);
    // 추가가 불가능할 때만 관광/문화 슬롯을 대체하며 핵심 볼거리 최소 한 곳은 남긴다.
    if (!options.length && daily.filter(s => !s.isStay && !s.isFestival && ['attraction', 'culture', 'activity'].includes(s.role ?? '')).length >= 2) {
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        if ((stop.day ?? 1) !== meal.day || stop.isFestival || stop.isStay || !['attraction', 'culture', 'activity'].includes(stop.role ?? '')) continue;
        const previous = pool.find(c => c.contentId === stop.contentId);
        for (const candidate of restaurants) if (preservesCoverage(previous, candidate, input)) offer(candidate, i, true);
      }
    }
    // 자동 생성된 축제가 여러 개일 때만 식사 시간과 겹치는 하나를 대체한다.
    // 식당이 실제로 들어갈 수 없으면 삭제하지 않으며, 같은 일차 축제를 최소 하나 보존한다.
    if (!options.length && daily.filter(s => s.isFestival).length >= 2) {
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i], start = minutes(stop.timeStart);
        if ((stop.day ?? 1) !== meal.day || !stop.isFestival || start >= meal.to + 60 || start + stop.durationMin <= meal.from) continue;
        for (const candidate of restaurants) offer(candidate, i, true);
      }
    }
    options.sort((a, b) => b.coverage - a.coverage || Number(b.known) - Number(a.known) || a.distance - b.distance || a.index - b.index);
    const chosen = options[0];
    if (!chosen) continue;
    stops.splice(chosen.index, chosen.replace ? 1 : 0, chosen.stop);
    changes.push(chosen.previousTitle != null
      ? { kind: 'festival_meal', day: meal.day, contentId: chosen.stop.contentId, previousContentId: chosen.previousContentId, previousTitle: chosen.previousTitle }
      : { kind: 'meal_added', day: meal.day, contentId: chosen.stop.contentId, previousContentId: chosen.previousContentId });
  }
  return changes;
}
