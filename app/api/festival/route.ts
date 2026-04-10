// ============================================================
// GET /api/weekend/festival — 축제 전체 목록 (위치 기반)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  searchFestival,
  formatDateYMD,
  getNextWeekend,
} from '@/lib/tour-api';
import { haversineKm } from '@/lib/weekend-ai';
import type { FestivalCard } from '@/lib/weekend-types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat') || 37.5665);
  const lng = Number(searchParams.get('lng') || 126.9780);
  const radius = Number(searchParams.get('radius') || 50); // km

  const { saturday, sunday } = getNextWeekend();

  // 2달 전부터 검색 (진행 중 축제 포착)
  const searchStart = new Date(saturday);
  searchStart.setDate(searchStart.getDate() - 60);

  const items = await searchFestival({
    eventStartDate: formatDateYMD(searchStart),
    eventEndDate: formatDateYMD(sunday),
    numOfRows: 100,
  });

  const sunStr = formatDateYMD(sunday);
  const satStr = formatDateYMD(saturday);

  const festivals: FestivalCard[] = items
    .filter(item => {
      if (!item.mapy || !item.mapx) return false;
      const dist = haversineKm(lat, lng, Number(item.mapy), Number(item.mapx));
      return dist <= radius;
    })
    .map(item => {
      let urgencyTag: string | undefined;
      if (item.eventenddate <= sunStr) {
        urgencyTag = '올 주말 마지막!';
      } else if (item.eventstartdate >= satStr) {
        urgencyTag = '이번 주 시작!';
      }

      const dist = haversineKm(lat, lng, Number(item.mapy), Number(item.mapx));

      return {
        contentId: item.contentid,
        title: item.title,
        addr1: item.addr1,
        firstImage: item.firstimage || undefined,
        eventStart: item.eventstartdate,
        eventEnd: item.eventenddate,
        urgencyTag,
        distanceKm: Math.round(dist * 10) / 10,
      };
    })
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

  return NextResponse.json(
    { festivals, weekendDates: { saturday: satStr, sunday: sunStr } },
    { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } },
  );
}
