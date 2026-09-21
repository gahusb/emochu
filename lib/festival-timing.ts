// 행사 원문 전체가 아래 문법에 맞을 때만 해석한다. 계절·날짜 예외·복수 시설은 추측하지 않는다.
export interface FestivalTiming {
  window?: { from: number; to: number };
  starts?: number[];
  durationMin?: number;
  onlyWeekday?: number;
  closedWeekday?: number;
}
const CLOCK = '(?:[01]?\\d|2[0-3]):[0-5]\\d';
const minute = (clock: string) => { const [h, m] = clock.split(':').map(Number); return h * 60 + m; };
const weekday = (day: string) => '일월화수목금토'.indexOf(day);

export function parseFestivalTiming(raw?: string): FestivalTiming | null {
  if (!raw?.trim()) return null;
  let text = raw.replace(/<br\s*\/?>/gi, ' ').replace(/&nbsp;/g, ' ').trim();
  const timing: FestivalTiming = {};
  const weekly = /^매주\s*([일월화수목금토])요일\s*/.exec(text);
  if (weekly) { timing.onlyWeekday = weekday(weekly[1]); text = text.slice(weekly[0].length); }
  const closed = /\s*※\s*매주\s*([일월화수목금토])요일\s*휴무\s*$/.exec(text);
  if (closed) { timing.closedWeekday = weekday(closed[1]); text = text.slice(0, closed.index).trim(); }
  const duration = /\s*\(\s*회차당\s*(\d{1,3})\s*분\s*\)\s*$/.exec(text);
  if (duration) {
    timing.durationMin = Number(duration[1]);
    if (timing.durationMin < 10 || timing.durationMin > 720) return null;
    text = text.slice(0, duration.index).trim();
  }
  const range = new RegExp(`^(${CLOCK})\\s*[~～–—-]\\s*(${CLOCK})$`).exec(text);
  if (range) {
    timing.window = { from: minute(range[1]), to: minute(range[2]) };
    if (timing.window.from >= timing.window.to || (timing.durationMin ?? 0) > timing.window.to - timing.window.from) return null;
    // 운영 구간의 양 끝은 회차 목록이 아니다. 회차당 소요시간이 있어도 시작 시각을 만들지 않는다.
  } else if (new RegExp(`^${CLOCK}(?:\\s*[/,]\\s*${CLOCK})*$`).test(text)) {
    timing.starts = [...new Set(text.split(/[/,]/).map(s => minute(s.trim())))].sort((a, b) => a - b);
  } else return null;
  if (timing.onlyWeekday != null && timing.onlyWeekday === timing.closedWeekday) return null;
  return timing;
}

export function festivalClosedOn(timing: FestivalTiming | null, date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return Boolean(timing && Number.isFinite(day) && ((timing.onlyWeekday != null && timing.onlyWeekday !== day) || timing.closedWeekday === day));
}

/** within도 원문 시간 조건과의 일치일 뿐, 실제 개최·예약 가능의 확인이 아니다. */
export function festivalTimingStatus(raw: string | undefined, date: string, start: number, duration: number): 'within' | 'outside' | 'unknown' {
  const timing = parseFestivalTiming(raw);
  if (!timing) return 'unknown';
  if (!Number.isFinite(start + duration) || duration <= 0 || festivalClosedOn(timing, date) || duration < (timing.durationMin ?? 0)) return 'outside';
  if (timing.starts && !timing.starts.includes(start)) return 'outside';
  if (timing.window && (start < timing.window.from || start + duration > timing.window.to)) return 'outside';
  return 'within';
}
