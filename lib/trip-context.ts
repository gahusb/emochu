import { calcSajuFromElements, getWeekendElements, type Element5 } from './saju';
import type { CourseSaju, Duration, VisitDay } from './weekend-types';

/** Date는 이 모듈에서 UTC 자정으로 표현한 한국의 달력 날짜다. */
export function getTripDates(duration: Duration, visitDay: VisitDay = 'sat', now = new Date()): string[] {
  const weekend = getWeekendElements(now);
  const sat = weekend.saturdayDate.toISOString().slice(0, 10);
  const sun = weekend.sundayDate.toISOString().slice(0, 10);
  return duration === 'overnight' ? [sat, sun] : [visitDay === 'sun' ? sun : sat];
}

/** 오늘의 오행을 클라이언트에서 신뢰하지 않는다. 여행 시작일의 테마로 재계산한다. */
export function getTripSaju(birth: Element5, duration: Duration, visitDay: VisitDay = 'sat', now = new Date()): CourseSaju {
  const weekend = getWeekendElements(now);
  const element = duration !== 'overnight' && visitDay === 'sun' ? weekend.sunday : weekend.saturday;
  const result = calcSajuFromElements(birth, element);
  return {
    birthElement: result.birthElement, todayElement: element, relation: result.relation,
    headline: result.headline, message: result.message.replaceAll('오늘', '여행일'),
    basisDate: getTripDates(duration, visitDay, now)[0],
  };
}

export function validFestivalDate(raw: string): string | null {
  const compact = raw.replaceAll('-', '');
  if (!/^\d{8}$/.test(compact)) return null;
  const iso = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  const time = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === iso ? iso : null;
}

/** 검색 API의 검색기간과 행사 개최기간은 다르다. 방문하는 날과 직접 대조한다. */
export function festivalRunsOn(start: string, end: string, date: string): boolean {
  const from = validFestivalDate(start);
  const to = validFestivalDate(end);
  return Boolean(from && to && from <= to && from <= date && date <= to);
}
