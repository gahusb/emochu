import { formatDateYMD, getNextWeekend, searchFestival, type FestivalItem } from './tour-api';
import { festivalRunsOn, validFestivalDate } from './trip-context';
import { haversineKm } from './weekend-ai';
import type { FestivalCard } from './weekend-types';

/** 지역코드가 빈 실제 응답도 좌표로 처리한다. 무제한 수집 대신 최대 600건. */
export async function loadWeekendFestivals(now = new Date()) {
  const { saturday, sunday } = getNextWeekend(now);
  const weekendDates = { saturday: formatDateYMD(saturday), sunday: formatDateYMD(sunday) };
  const items: FestivalItem[] = [];
  let partial = false;
  for (let pageNo = 1; pageNo <= 3; pageNo++) {
    try {
      const page = await searchFestival({ eventStartDate: weekendDates.saturday, eventEndDate: weekendDates.sunday, numOfRows: 200, pageNo });
      items.push(...page);
      if (page.length < 200) break;
      if (pageNo === 3) partial = true;
    } catch (error) {
      if (pageNo === 1) throw error;
      partial = true; break;
    }
  }
  return { items, partial, weekendDates };
}

export function nearbyFestivals(items: FestivalItem[], lat: number, lng: number, radiusKm: number, dates: string[]): FestivalItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const y = Number(item.mapy), x = Number(item.mapx);
    if (!item.contentid || !item.title || seen.has(item.contentid) || !Number.isFinite(y) || !Number.isFinite(x) || y < 33 || y > 43 || x < 124 || x > 132) return false;
    if (!dates.some(date => festivalRunsOn(item.eventstartdate, item.eventenddate, validFestivalDate(date) ?? ''))) return false;
    if (haversineKm(lat, lng, y, x) > radiusKm) return false;
    seen.add(item.contentid); return true;
  }).sort((a, b) => haversineKm(lat, lng, Number(a.mapy), Number(a.mapx)) - haversineKm(lat, lng, Number(b.mapy), Number(b.mapx)));
}

export const koreaToday = (now = new Date()) => new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10).replaceAll('-', '');

export function festivalCards(items: FestivalItem[], lat: number, lng: number, saturday: string, sunday: string, now = new Date()): FestivalCard[] {
  const today = validFestivalDate(koreaToday(now))!;
  return items.map(item => {
    const start = validFestivalDate(item.eventstartdate)!, end = validFestivalDate(item.eventenddate)!;
    return {
      contentId: item.contentid, title: item.title, addr1: item.addr1, firstImage: item.firstimage || undefined,
      eventStart: start.replaceAll('-', ''), eventEnd: end.replaceAll('-', ''),
      urgencyTag: end.replaceAll('-', '') <= sunday ? '올 주말 마지막!' : start.replaceAll('-', '') >= saturday ? '이번 주 시작!' : undefined,
      distanceKm: Math.round(haversineKm(lat, lng, Number(item.mapy), Number(item.mapx)) * 10) / 10,
      dDay: Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000),
    };
  });
}
