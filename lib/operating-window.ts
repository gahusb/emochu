// 확실하게 읽을 수 있는 단일 영업시간 + 준비시간 + 마지막 주문만 판정한다.
// 요일/계절/복수 시설/익일 영업 등 조건이 섞이면 부분 추측하지 않는다.
interface Window { from: number; to: number }
interface Hours { open: Window; pause?: Window; lastEntry?: number }
const CLOCK = '(?:[01]?\\d|2[0-4]):[0-5]\\d';
const RANGE = `(${CLOCK})\\s*[~～–—-]\\s*(${CLOCK})`;
const minute = (time: string) => {
  const [hour, min] = time.split(':').map(Number);
  return hour === 24 && min !== 0 ? NaN : hour * 60 + min;
};

export function parseOperatingWindow(raw?: string): Hours | null {
  if (!raw?.trim()) return null;
  let text = raw.replace(/<br\s*\/?>/gi, ' ').replace(/&nbsp;/g, ' ').trim();
  if (/^(24시간(?:\s*운영)?|상시\s*개방|연중무휴\s*24시간)$/.test(text)) return { open: { from: 0, to: 1440 } };
  text = text.replace(/^(영업|운영|이용)시간\s*:?\s*/, '');
  const main = new RegExp(`^${RANGE}`).exec(text);
  if (!main) return null;
  const open = { from: minute(main[1]), to: minute(main[2]) };
  if (!Number.isFinite(open.from + open.to) || open.from >= open.to) return null;
  text = text.slice(main[0].length);
  let pause: Window | undefined, lastEntry: number | undefined;
  const breakMatch = new RegExp(`(?:브레이크\\s*타임|준비\\s*시간|휴게\\s*시간)\\s*:?\\s*${RANGE}`).exec(text);
  if (breakMatch) {
    pause = { from: minute(breakMatch[1]), to: minute(breakMatch[2]) };
    if (!Number.isFinite(pause.from + pause.to) || pause.from < open.from || pause.to > open.to || pause.from >= pause.to) return null;
    text = text.replace(breakMatch[0], '');
  }
  const last = new RegExp(`(?:마지막\\s*주문|라스트\\s*오더|마지막\\s*입장|입장\\s*마감)\\s*:?\\s*(${CLOCK})`).exec(text);
  if (last) {
    lastEntry = minute(last[1]);
    if (!Number.isFinite(lastEntry) || lastEntry < open.from || lastEntry > open.to) return null;
    text = text.replace(last[0], '');
  }
  if (text.replace(/[\s(),/·]/g, '')) return null;
  return { open, pause, lastEntry };
}

/** 알려진 영업 구간 안에서 체류 전체가 들어가는 가장 이른 시각. unknown은 보장이 아니다. */
export function earliestOperatingStart(raw: string | undefined, earliest: number, latest: number, duration: number): { start: number; status: 'within' | 'unknown' } | null {
  if (!Number.isFinite(earliest + latest + duration) || duration <= 0 || earliest > latest) return null;
  const hours = parseOperatingWindow(raw);
  if (!hours) return { start: Math.ceil(earliest), status: 'unknown' };
  let start = Math.max(Math.ceil(earliest), hours.open.from);
  if (hours.pause && start < hours.pause.to && start + duration > hours.pause.from) start = hours.pause.to;
  if (start > latest || start + duration > hours.open.to || start > (hours.lastEntry ?? Infinity)) return null;
  return { start, status: 'within' };
}

export function operatingWindowStatus(raw: string | undefined, start: number, duration: number): 'within' | 'outside' | 'unknown' {
  return earliestOperatingStart(raw, start, start, duration)?.status ?? 'outside';
}
