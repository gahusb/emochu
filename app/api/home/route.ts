// ============================================================
// GET /api/weekend/home — 홈 화면 데이터 (날씨 + 축제 + 추천 관광지)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  locationBasedList,
  detailCommon,
  detailIntro,
  parseFacilities,
  formatDateYMD,
  getNextWeekend,
} from '@/lib/tour-api';
import { getWeekendForecast } from '@/lib/weather-api';
import { haversineKm, generateSpotWhyNow, matchesElement } from '@/lib/weekend-ai';
import { loadWeekendFestivals, nearbyFestivals, festivalCards } from '@/lib/festival-data';
import { getWeekendElements } from '@/lib/saju';
import type {
  HomeData,
  FestivalCard,
  SpotCard,
  WeekendWeather,
} from '@/lib/weekend-types';

export const runtime = 'nodejs';

// ─── 기본값 (API 키 미설정 or 실패 시) ───

const FALLBACK_WEATHER: WeekendWeather = {
  saturday: { date: '', sky: 'clear', precipitation: 'none', tempMin: 15, tempMax: 22, pop: 0, summary: '날씨 정보 준비 중' },
  sunday:   { date: '', sky: 'clear', precipitation: 'none', tempMin: 15, tempMax: 22, pop: 0, summary: '날씨 정보 준비 중' },
  recommendation: '날씨 정보를 불러오는 중이에요.',
  unavailable: true,
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat') || 37.5665);
  const lng = Number(searchParams.get('lng') || 126.9780);

  const { saturday, sunday } = getNextWeekend();
  const satStr = formatDateYMD(saturday);
  const sunStr = formatDateYMD(sunday);

  // 병렬 조회 (실패해도 기본값으로 진행)
  const [weatherResult, festivalResult, spotsResult] = await Promise.allSettled([
    getWeekendForecast({ lat, lng, saturdayDate: satStr, sundayDate: sunStr }),
    collectFestivalsForHome(lat, lng, saturday, sunday),
    collectSpotsForHome(lat, lng),
  ]);

  const weather: WeekendWeather = weatherResult.status === 'fulfilled'
    ? weatherResult.value
    : FALLBACK_WEATHER;

  const festivals: FestivalCard[] = festivalResult.status === 'fulfilled'
    ? festivalResult.value
    : [];

  const recommended: SpotCard[] = spotsResult.status === 'fulfilled'
    ? spotsResult.value
    : [];

  const data: HomeData = {
    festivals,
    recommended,
    weather,
    weekendDates: {
      saturday: satStr,
      sunday: sunStr,
    },
  };

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}

// ─── 축제 수집 ───

async function collectFestivalsForHome(lat: number, lng: number, saturday: Date, sunday: Date): Promise<FestivalCard[]> {
  const { items } = await loadWeekendFestivals();
  const sat = formatDateYMD(saturday), sun = formatDateYMD(sunday);
  return festivalCards(nearbyFestivals(items, lat, lng, 30, [sat, sun]).slice(0, 6), lat, lng, sat, sun);
}

// ─── 추천 관광지 수집 (랜덤 셔플) ───

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function collectSpotsForHome(lat: number, lng: number): Promise<SpotCard[]> {
  // 관광지(12) + 문화시설(14) + 음식점(39) + 레포츠(28) 폭넓게 수집
  const [spots, cultural, food, activity] = await Promise.allSettled([
    locationBasedList({ mapX: lng, mapY: lat, radius: 20000, contentTypeId: 12, numOfRows: 15, arrange: 'E' }),
    locationBasedList({ mapX: lng, mapY: lat, radius: 20000, contentTypeId: 14, numOfRows: 10, arrange: 'E' }),
    locationBasedList({ mapX: lng, mapY: lat, radius: 15000, contentTypeId: 39, numOfRows: 10, arrange: 'E' }),
    locationBasedList({ mapX: lng, mapY: lat, radius: 20000, contentTypeId: 28, numOfRows: 10, arrange: 'E' }),
  ]);

  const all = [
    ...(spots.status === 'fulfilled' ? spots.value : []),
    ...(cultural.status === 'fulfilled' ? cultural.value : []),
    ...(food.status === 'fulfilled' ? food.value : []),
    ...(activity.status === 'fulfilled' ? activity.value : []),
  ];

  // 중복 제거
  const seen = new Set<string>();
  const unique = all.filter(item => {
    if (seen.has(item.contentid)) return false;
    seen.add(item.contentid);
    return true;
  });

  // 🔑 이번 주말의 기운과 맞는 곳을 앞으로 올린다. 홈이 「이번 주말 土 기운과 맞는 곳」이라고
  //    말하려면 실제로 그렇게 골라야 한다 — 제목만 바꾸면 거짓말이 된다.
  //    다만 오행만 보면 사진 없는 곳이 앞에 서므로, 사진도 같이 점수에 넣는다.
  //    같은 점수 안에서는 셔플해 매번 다른 얼굴을 유지한다.
  const weekend = getWeekendElements();

  const matchOf = (item: (typeof unique)[number]): SpotCard['weekendMatch'] => {
    const target = { cat3: item.cat3 ?? '', title: item.title ?? '' };
    const sat = matchesElement(target, weekend.saturday);
    const sun = weekend.same ? sat : matchesElement(target, weekend.sunday);
    if (sat && sun) return 'both';
    if (sat) return 'sat';
    if (sun) return 'sun';
    return undefined;
  };

  const scored = unique.map(item => ({
    item,
    match: matchOf(item),
    // 오행 2점 + 사진 1점. 오행이 사진보다 무겁되, 사진 없는 곳만 줄세우지는 않는다.
    score: (matchOf(item) ? 2 : 0) + (item.firstimage ? 1 : 0),
  }));

  const buckets = new Map<number, typeof scored>();
  for (const s of scored) {
    const b = buckets.get(s.score) ?? [];
    b.push(s);
    buckets.set(s.score, b);
  }
  const ordered = [...buckets.keys()]
    .sort((a, b) => b - a)
    .flatMap(k => shuffleArray(buckets.get(k)!));

  const top4 = ordered.slice(0, 4);
  const top4Raw = top4.map(s => s.item);

  const spotCards: SpotCard[] = top4.map(({ item, match }) => ({
    contentId: item.contentid,
    title: item.title,
    addr1: item.addr1,
    firstImage: item.firstimage || undefined,
    cat2: item.cat2 || '관광지',
    cat3: item.cat3 || undefined,
    weekendMatch: match,
    reason: '',
    distanceKm: Math.round(haversineKm(lat, lng, Number(item.mapy), Number(item.mapx)) * 10) / 10,
  }));

  // whyNow + 편의시설 병렬 조회 (실패해도 계속 진행)
  const month = new Date().getMonth() + 1;
  await Promise.allSettled(
    spotCards.map(async (card, idx) => {
      try {
        const raw = top4Raw[idx];
        const contentTypeId = Number(raw.contenttypeid);
        const [common, introData] = await Promise.all([
          detailCommon({ contentId: raw.contentid, contentTypeId }),
          detailIntro({ contentId: raw.contentid, contentTypeId }),
        ]);
        const overview = common?.overview;
        const whyNow = await generateSpotWhyNow(card.title, card.cat2, overview, undefined, month);
        if (whyNow) card.whyNow = whyNow;
        if (introData) {
          card.facilities = parseFacilities(introData as Record<string, unknown>);
        }
      } catch {
        // 개별 실패는 무시
      }
    })
  );

  return spotCards;
}
