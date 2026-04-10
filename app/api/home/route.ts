// ============================================================
// GET /api/weekend/home — 홈 화면 데이터 (날씨 + 축제 + 추천 관광지)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  locationBasedList,
  searchFestival,
  detailCommon,
  detailIntro,
  parseFacilities,
  formatDateYMD,
  getNextWeekend,
} from '@/lib/tour-api';
import { getWeekendForecast } from '@/lib/weather-api';
import { haversineKm, generateFestivalSummary, generateSpotWhyNow } from '@/lib/weekend-ai';
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
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}

// ─── 축제 수집 ───

async function collectFestivalsForHome(
  lat: number,
  lng: number,
  saturday: Date,
  sunday: Date,
): Promise<FestivalCard[]> {
  // 한 달 전부터 검색 (진행 중 축제 포착)
  const searchStart = new Date(saturday);
  searchStart.setDate(searchStart.getDate() - 30);

  const items = await searchFestival({
    eventStartDate: formatDateYMD(searchStart),
    eventEndDate: formatDateYMD(sunday),
    numOfRows: 50,
  });

  const satStr = formatDateYMD(saturday);
  const sunStr = formatDateYMD(sunday);
  const today = new Date();

  const nearbyItems = items
    .filter(item => {
      const dist = haversineKm(lat, lng, Number(item.mapy), Number(item.mapx));
      return dist <= 30;
    })
    .slice(0, 6);

  const festivalCards: FestivalCard[] = nearbyItems.map(item => {
    // 긴급성 태그 계산
    let urgencyTag: string | undefined;
    if (item.eventenddate <= sunStr) {
      urgencyTag = '올 주말 마지막!';
    } else if (item.eventstartdate >= satStr) {
      urgencyTag = '이번 주 시작!';
    }

    // D-day 계산 (축제 종료일까지)
    let dDay: number | undefined;
    if (item.eventenddate) {
      const endDate = new Date(
        Number(item.eventenddate.slice(0, 4)),
        Number(item.eventenddate.slice(4, 6)) - 1,
        Number(item.eventenddate.slice(6, 8))
      );
      dDay = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      contentId: item.contentid,
      title: item.title,
      addr1: item.addr1,
      firstImage: item.firstimage || undefined,
      eventStart: item.eventstartdate,
      eventEnd: item.eventenddate,
      urgencyTag,
      dDay,
    };
  });

  // AI 요약 병렬 추가 (실패해도 계속 진행)
  await Promise.allSettled(
    festivalCards.map(async (card, idx) => {
      try {
        const raw = nearbyItems[idx];
        const common = await detailCommon({ contentId: raw.contentid });
        const overview = common?.overview;
        const summary = await generateFestivalSummary(card.title, overview);
        if (summary) card.aiSummary = summary;
      } catch {
        // AI 요약 실패는 무시
      }
    })
  );

  return festivalCards;
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

  // 이미지 있는 항목 우선, 전체를 랜덤 셔플 후 4개 선택
  const withImage = unique.filter(item => item.firstimage);
  const withoutImage = unique.filter(item => !item.firstimage);
  const shuffled = [...shuffleArray(withImage), ...shuffleArray(withoutImage)];

  const top4Raw = shuffled.slice(0, 4);

  const spotCards: SpotCard[] = top4Raw.map(item => ({
    contentId: item.contentid,
    title: item.title,
    addr1: item.addr1,
    firstImage: item.firstimage || undefined,
    cat2: item.cat2 || '관광지',
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
