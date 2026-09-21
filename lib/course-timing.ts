import type { CourseStop, Duration } from './weekend-types';
import { haversineKm } from './weekend-ai';

export const minutes = (time: string) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const absoluteStart = (stop: CourseStop) => ((stop.day ?? 1) - 1) * 1440 + minutes(stop.timeStart);
export const travelMinutes = (a: Pick<CourseStop, 'latitude' | 'longitude'>, b: Pick<CourseStop, 'latitude' | 'longitude'>) => Math.max(10, Math.round(haversineKm(a.latitude, a.longitude, b.latitude, b.longitude) * 3));
const isNightStay = (stop: CourseStop, duration: Duration) => duration === 'overnight' && stop.isStay && (stop.day ?? 1) === 1;

/** 같은 방문일 안에서만 뒤로 이동한다. 축제는 회차를 알 수 없어 임의로 밀지 않는다. */
export function repairSchedule(stops: CourseStop[], duration: Duration): number {
  let adjusted = 0;
  for (let i = 1; i < stops.length; i++) {
    const prev = stops[i - 1], stop = stops[i];
    if (stop.isFestival) continue;
    const dayOffset = ((stop.day ?? 1) - 1) * 1440;
    const earliest = absoluteStart(prev) + prev.durationMin + travelMinutes(prev, stop);
    if (!Number.isFinite(earliest) || !Number.isFinite(absoluteStart(stop)) || earliest <= absoluteStart(stop)) continue;
    const start = earliest - dayOffset;
    // 24시를 넘겨 다른 방문일로 슬쩍 넘기거나 이미 지난 일차를 변경하지 않는다.
    if (start < 0 || start >= 1440 || (!isNightStay(stop, duration) && start + stop.durationMin > 1440)) continue;
    stop.timeStart = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
    // 시간 관련 카피를 검증 없이 유지하지 않는다. 원본 시설·휴무 정보는 보존한다.
    stop.description = '체류·이동시간 추정치를 반영해 방문 시간을 조정했어요. 운영시간과 실제 길찾기를 확인해주세요.';
    stop.tip = ''; stop.hook = undefined; stop.whyNow = undefined;
    adjusted++;
  }
  return adjusted;
}

/** 경로 엔진이 아닌 직선거리 기반 보수적 추정. 시간표를 몰래 이동시키지 않고 경고한다. */
export function scheduleWarnings(stops: CourseStop[], duration: Duration): string[] {
  const warnings = new Set<string>();
  const minStops = { half_day: 3, full_day: 5, leisurely: 4, overnight: 7 }[duration];
  if (stops.length < minStops) warnings.add('조건에 맞는 장소가 부족해 짧은 일정으로 구성했어요. 식사·휴식 장소를 확인해주세요.');
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const start = minutes(stop.timeStart);
    if (!Number.isFinite(start) || start + stop.durationMin > (isNightStay(stop, duration) ? 48 : 24) * 60) warnings.add('방문 시간이 하루 범위를 벗어나요. 시간을 조정해주세요.');
    const prev = stops[i - 1];
    if (!prev) continue;
    const distance = haversineKm(prev.latitude, prev.longitude, stop.latitude, stop.longitude);
    if (distance > 20) warnings.add('20km 넘게 떨어진 구간이 있어요. 실제 길찾기로 이동시간을 확인해주세요.');
    if (absoluteStart(prev) + prev.durationMin + travelMinutes(prev, stop) > absoluteStart(stop)) {
      warnings.add('일부 구간은 체류·이동 시간이 겹칠 수 있어요. 방문 시간을 조정해주세요.');
    }
  }
  if (duration === 'overnight') {
    if (!stops.some(s => s.day === 2)) warnings.add('2일차 후보가 부족해요. 다음 날 일정을 별도로 추가해주세요.');
    if (!stops.some(s => s.isStay)) warnings.add('숙소가 포함되지 않았어요. 숙박은 별도로 예약해주세요.');
  } else if (stops.length) {
    const span = minutes(stops.at(-1)!.timeStart) + stops.at(-1)!.durationMin - minutes(stops[0].timeStart);
    const budget = { half_day: 240, full_day: 480, leisurely: 360 }[duration];
    if (span > budget) warnings.add('선택한 시간 예산을 초과해요. 장소나 체류시간을 줄여주세요.');
  }
  return [...warnings];
}
