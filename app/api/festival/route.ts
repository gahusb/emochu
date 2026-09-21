import { NextRequest, NextResponse } from 'next/server';
import { loadWeekendFestivals, nearbyFestivals, festivalCards } from '@/lib/festival-data';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const p = new URL(request.url).searchParams;
  const lat = Number(p.get('lat') ?? 37.5665), lng = Number(p.get('lng') ?? 126.978);
  const radius = Number(p.get('radius') ?? 50);
  if (![lat, lng, radius].every(Number.isFinite) || lat < 33 || lat > 43 || lng < 124 || lng > 132 || radius < 1 || radius > 200) {
    return NextResponse.json({ error: '위치와 검색 반경을 확인해주세요.' }, { status: 400 });
  }
  try {
    const { items, partial, weekendDates } = await loadWeekendFestivals();
    const nearby = nearbyFestivals(items, lat, lng, radius, Object.values(weekendDates));
    // 목록에 표시하지도 않던 제목만 기반의 AI 요약 10회를 없앤다.
    const festivals = festivalCards(nearby, lat, lng, weekendDates.saturday, weekendDates.sunday);
    return NextResponse.json({ festivals, weekendDates, dataStatus: partial ? 'partial' : 'available' }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch {
    // 조회 실패를 '근처 축제 0개'라는 성공 응답으로 숨기지 않는다.
    return NextResponse.json({ festivals: [], dataStatus: 'unavailable', error: '축제 정보를 불러오지 못했어요. 잠시 후 다시 확인해주세요.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
