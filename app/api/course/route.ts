// ============================================================
// POST /api/weekend/course — AI 코스 생성 엔드포인트
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  locationBasedList,
  areaBasedList,
  searchFestival,
  searchStay,
  formatDateYMD,
  getNextWeekend,
  type SpotItem,
  type FestivalItem,
  type StayItem,
} from '@/lib/tour-api';
import { getWeekendForecast } from '@/lib/weather-api';
import {
  generateCourse,
  scoreAndRankCandidates,
  enrichWithFacilities,
  generateShareSlug,
  buildKakaoNaviUrl,
  haversineKm,
  generateCourseFortuneMessage,
  type ScoredSpot,
  type FestivalCandidate,
  type StayCandidate,
  type CourseGenerationInput,
} from '@/lib/weekend-ai';
import type {
  CourseRequest,
  CourseResponse,
  Duration,
  Companion,
  Preference,
  Feeling,
  DestinationType,
  MoodType,
} from '@/lib/weekend-types';
import { MOOD_OPTIONS, CITY_OPTIONS, FEELING_OPTIONS } from '@/lib/weekend-types';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ─── 인메모리 Rate Limiter (IP 기반, 분당 3회) ───

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

const ipHits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count++;
  return true;
}

// 오래된 엔트리 정리 (메모리 누수 방지, 5분마다)
if (typeof globalThis !== 'undefined') {
  const CLEANUP_INTERVAL = 5 * 60_000;
  const key = '__weekend_rate_limit_cleanup';
  if (!(globalThis as Record<string, unknown>)[key]) {
    (globalThis as Record<string, unknown>)[key] = true;
    setInterval(() => {
      const now = Date.now();
      for (const [ip, entry] of ipHits) {
        if (now > entry.resetAt) ipHits.delete(ip);
      }
    }, CLEANUP_INTERVAL);
  }
}

// ─── 유효성 검증 ───

const VALID_DURATIONS: Duration[] = ['half_day', 'full_day', 'leisurely', 'overnight'];
const VALID_COMPANIONS: Companion[] = ['solo', 'couple', 'family', 'friends'];
const VALID_PREFERENCES: Preference[] = ['nature', 'food', 'culture', 'cafe', 'activity', 'photo'];
const VALID_DESTINATION_TYPES: DestinationType[] = ['nearby', 'city', 'mood'];
const VALID_MOODS: MoodType[] = ['mountain', 'sea', 'valley', 'urban', 'countryside'];
const VALID_FEELINGS: Feeling[] = ['tired', 'excited', 'romantic', 'healing', 'adventurous', 'foodie'];

function validateRequest(body: unknown): CourseRequest {
  const b = body as Record<string, unknown>;

  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (isNaN(lat) || isNaN(lng) || lat < 33 || lat > 43 || lng < 124 || lng > 132) {
    throw new Error('위치 정보가 올바르지 않습니다. 한국 내 좌표를 입력해주세요.');
  }

  const duration = b.duration as Duration;
  if (!VALID_DURATIONS.includes(duration)) {
    throw new Error('시간 선택이 올바르지 않습니다.');
  }

  const companion = b.companion as Companion;
  if (!VALID_COMPANIONS.includes(companion)) {
    throw new Error('동반자 선택이 올바르지 않습니다.');
  }

  const preferences = b.preferences as Preference[];
  if (!Array.isArray(preferences) || preferences.length === 0 || preferences.length > 3) {
    throw new Error('취향을 1~3개 선택해주세요.');
  }
  if (!preferences.every(p => VALID_PREFERENCES.includes(p))) {
    throw new Error('올바르지 않은 취향이 포함되어 있습니다.');
  }

  const destinationType = (b.destinationType as DestinationType) || 'nearby';
  if (!VALID_DESTINATION_TYPES.includes(destinationType)) {
    throw new Error('목적지 유형이 올바르지 않습니다.');
  }

  const cityAreaCode = b.cityAreaCode ? Number(b.cityAreaCode) : undefined;
  const mood = b.mood as MoodType | undefined;
  if (mood && !VALID_MOODS.includes(mood)) {
    throw new Error('분위기 선택이 올바르지 않습니다.');
  }

  const feeling = b.feeling as Feeling | undefined;
  if (feeling && !VALID_FEELINGS.includes(feeling)) {
    throw new Error('기분 선택이 올바르지 않습니다.');
  }

  return { lat, lng, duration, companion, preferences, feeling, destinationType, cityAreaCode, mood };
}

// ─── TourAPI → ScoredSpot 변환 ───

function spotItemToScored(item: SpotItem, departureLat: number, departureLng: number): ScoredSpot {
  const latitude = Number(item.mapy);
  const longitude = Number(item.mapx);
  return {
    contentId: item.contentid,
    contentTypeId: Number(item.contenttypeid),
    title: item.title,
    addr1: item.addr1,
    cat1: item.cat1,
    cat2: item.cat2,
    cat3: item.cat3,
    latitude,
    longitude,
    firstImage: item.firstimage || undefined,
    distanceKm: haversineKm(departureLat, departureLng, latitude, longitude),
    score: 0,
  };
}

function festivalItemToCandidate(item: FestivalItem): FestivalCandidate {
  return {
    contentId: item.contentid,
    title: item.title,
    addr1: item.addr1,
    latitude: Number(item.mapy),
    longitude: Number(item.mapx),
    eventStartDate: item.eventstartdate,
    eventEndDate: item.eventenddate,
  };
}

// ─── 후보 수집 ───

async function collectCandidatesNearby(
  lat: number,
  lng: number,
  duration: Duration,
): Promise<ScoredSpot[]> {
  const radiusMap: Record<Duration, number> = {
    half_day: 15000,
    full_day: 30000,
    leisurely: 25000,
    overnight: 50000,
  };
  const radius = radiusMap[duration];
  const contentTypeIds = [12, 14, 28, 39];

  const results = await Promise.allSettled(
    contentTypeIds.map(ctId =>
      locationBasedList({
        mapX: lng,
        mapY: lat,
        radius,
        contentTypeId: ctId,
        numOfRows: 20,
        arrange: 'E',
      })
    )
  );

  const spots: ScoredSpot[] = [];
  const seenIds = new Set<string>();

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const item of result.value) {
        if (!seenIds.has(item.contentid)) {
          seenIds.add(item.contentid);
          spots.push(spotItemToScored(item, lat, lng));
        }
      }
    }
  }

  return spots;
}

async function collectCandidatesByArea(
  areaCode: number,
  centerLat: number,
  centerLng: number,
): Promise<ScoredSpot[]> {
  const contentTypeIds = [12, 14, 28, 39];

  const results = await Promise.allSettled(
    contentTypeIds.map(ctId =>
      areaBasedList({
        areaCode,
        contentTypeId: ctId,
        numOfRows: 30,
        arrange: 'P', // 인기순
      })
    )
  );

  const spots: ScoredSpot[] = [];
  const seenIds = new Set<string>();

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const item of result.value) {
        if (!seenIds.has(item.contentid)) {
          seenIds.add(item.contentid);
          spots.push(spotItemToScored(item, centerLat, centerLng));
        }
      }
    }
  }

  return spots;
}

async function collectCandidatesByMood(
  mood: MoodType,
  centerLat: number,
  centerLng: number,
): Promise<ScoredSpot[]> {
  const moodOption = MOOD_OPTIONS.find(m => m.type === mood);
  if (!moodOption) return [];

  // 1단계: 핵심 장소 수집 (분위기에 맞는 관광지)
  const primaryAreaCode = moodOption.areaCodes[0];
  const primaryCtIds = mood === 'urban' ? [14] : [12]; // 관광지 or 문화시설

  const primaryTasks = primaryCtIds.map(ctId =>
    areaBasedList({
      areaCode: primaryAreaCode,
      contentTypeId: ctId,
      cat1: moodOption.cat1Codes[0],
      numOfRows: 10,
      arrange: 'P',
    })
  );

  // 2단계: 주변 음식점 + 카페 + 문화시설/레포츠 함께 수집
  const supportTasks = [
    areaBasedList({ areaCode: primaryAreaCode, contentTypeId: 39, numOfRows: 15, arrange: 'P' }), // 음식점
    areaBasedList({ areaCode: primaryAreaCode, contentTypeId: 14, numOfRows: 10, arrange: 'P' }), // 문화시설
    areaBasedList({ areaCode: primaryAreaCode, contentTypeId: 28, numOfRows: 10, arrange: 'P' }), // 레포츠
  ];

  // 추가 지역에서도 핵심 장소 보강
  const extraTasks = moodOption.areaCodes.slice(1, 2).map(ac =>
    areaBasedList({
      areaCode: ac,
      contentTypeId: mood === 'urban' ? 14 : 12,
      cat1: moodOption.cat1Codes[0],
      numOfRows: 5,
      arrange: 'P',
    })
  );

  const results = await Promise.allSettled([...primaryTasks, ...supportTasks, ...extraTasks]);
  const spots: ScoredSpot[] = [];
  const seenIds = new Set<string>();

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const item of result.value) {
        if (!seenIds.has(item.contentid)) {
          seenIds.add(item.contentid);
          spots.push(spotItemToScored(item, centerLat, centerLng));
        }
      }
    }
  }

  return spots;
}

async function collectCandidates(
  req: CourseRequest,
): Promise<ScoredSpot[]> {
  const { lat, lng, duration, destinationType, cityAreaCode, mood } = req;

  if (destinationType === 'city' && cityAreaCode) {
    return collectCandidatesByArea(cityAreaCode, lat, lng);
  }

  if (destinationType === 'mood' && mood) {
    return collectCandidatesByMood(mood, lat, lng);
  }

  // 기본: nearby
  return collectCandidatesNearby(lat, lng, duration);
}

// ─── 축제 수집 ───

async function collectFestivals(req: CourseRequest): Promise<FestivalCandidate[]> {
  const { lat, lng, destinationType, cityAreaCode, mood } = req;
  const { saturday, sunday } = getNextWeekend();

  const searchStart = new Date(saturday);
  searchStart.setDate(searchStart.getDate() - 30);

  try {
    // 도시 선택이면 해당 지역의 축제만, 분위기면 관련 지역 축제
    const areaCode = destinationType === 'city' && cityAreaCode
      ? cityAreaCode
      : undefined;

    const items = await searchFestival({
      eventStartDate: formatDateYMD(searchStart),
      eventEndDate: formatDateYMD(sunday),
      areaCode,
      numOfRows: 50,
    });

    // nearby: 30km 필터, city/mood: 해당 지역 코드 필터 또는 거리 완화
    const maxDistKm = destinationType === 'nearby' ? 30 : 80;

    let candidates = items.map(festivalItemToCandidate);

    if (destinationType === 'mood' && mood) {
      const moodOption = MOOD_OPTIONS.find(m => m.type === mood);
      if (moodOption) {
        // 분위기 관련 지역 코드에 있는 축제만
        const moodAreaSet = new Set(moodOption.areaCodes.map(String));
        const festivalItems = items.filter(i => moodAreaSet.has(i.areacode));
        candidates = festivalItems.map(festivalItemToCandidate);
      }
    }

    return candidates.filter(f => haversineKm(lat, lng, f.latitude, f.longitude) <= maxDistKm);
  } catch (err) {
    console.warn('[이모추API] 축제 조회 실패:', err);
    return [];
  }
}

// ─── 숙박 수집 (overnight일 때만) ───

function stayItemToCandidate(item: StayItem): StayCandidate {
  return {
    contentId: item.contentid,
    title: item.title,
    addr1: item.addr1,
    latitude: Number(item.mapy),
    longitude: Number(item.mapx),
    firstImage: item.firstimage || undefined,
    tel: item.tel || undefined,
  };
}

async function collectStays(req: CourseRequest): Promise<StayCandidate[]> {
  if (req.duration !== 'overnight') return [];

  const { lat, lng, destinationType, cityAreaCode, mood } = req;

  try {
    // 1차: 위치 기반 숙박 검색 (근처 50km 이내)
    const locationStays = await locationBasedList({
      mapX: lng,
      mapY: lat,
      radius: 50000,
      contentTypeId: 32, // 숙박
      numOfRows: 10,
      arrange: 'E', // 거리순
    });

    const locationCandidates: StayCandidate[] = locationStays.map(item => ({
      contentId: item.contentid,
      title: item.title,
      addr1: item.addr1,
      latitude: Number(item.mapy),
      longitude: Number(item.mapx),
      firstImage: item.firstimage || undefined,
      tel: item.tel || undefined,
    }));

    // 2차: 지역 기반 인기 숙박 검색 (보완)
    let areaCode: number | undefined;
    if (destinationType === 'city' && cityAreaCode) {
      areaCode = cityAreaCode;
    } else if (destinationType === 'mood' && mood) {
      const moodOption = MOOD_OPTIONS.find(m => m.type === mood);
      areaCode = moodOption?.areaCodes[0];
    }

    if (areaCode) {
      const areaStays = await searchStay({
        areaCode,
        numOfRows: 5,
        arrange: 'P',
      });

      const areaIds = new Set(locationCandidates.map(c => c.contentId));
      for (const item of areaStays) {
        if (!areaIds.has(item.contentid)) {
          locationCandidates.push(stayItemToCandidate(item));
        }
      }
    }

    return locationCandidates.slice(0, 10);
  } catch (err) {
    console.warn('[이모추API] 숙박 조회 실패:', err);
    return [];
  }
}

// ─── 메인 핸들러 ───

export async function POST(request: NextRequest) {
  // Rate Limit 체크
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429 },
    );
  }

  try {
    // JSON 파싱 (별도 try-catch로 400 반환)
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: '요청 형식이 올바르지 않습니다.' },
        { status: 400 },
      );
    }

    const req = validateRequest(body);

    // 1. 후보 수집 + 날씨 + 축제 병렬 조회
    const { saturday, sunday } = getNextWeekend();

    const [candidates, weather, festivals, stays] = await Promise.all([
      collectCandidates(req),
      getWeekendForecast({
        lat: req.lat,
        lng: req.lng,
        saturdayDate: formatDateYMD(saturday),
        sundayDate: formatDateYMD(sunday),
      }),
      collectFestivals(req),
      collectStays(req),
    ]);

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: '근처에 추천할 관광지를 찾지 못했어요. 위치를 확인해주세요.' },
        { status: 404 },
      );
    }

    // 1.5. 편의시설 정보 보강 (detailIntro 병렬 조회, 상위 20개)
    // family 동행자는 유모차/키즈시설 정보가 핵심, 그 외에도 주차 정보 유용
    try {
      await enrichWithFacilities(candidates, 20);
    } catch (enrichErr) {
      console.warn('[이모추API] 편의시설 조회 실패 (무시):', enrichErr);
    }

    // 2. 사전 스코어링 + 다양성 보장
    const ranked = scoreAndRankCandidates(
      candidates,
      req.preferences,
      req.companion,
      req.duration,
      weather,
      req.feeling,
    );

    // 3. AI 코스 생성
    // 출발지/목적지 이름 결정
    let departureName = '현재 위치';
    if (req.destinationType === 'city' && req.cityAreaCode) {
      const city = CITY_OPTIONS.find(c => c.areaCode === req.cityAreaCode);
      departureName = city ? `${city.name} 중심` : '선택 도시';
    } else if (req.destinationType === 'mood' && req.mood) {
      const moodOpt = MOOD_OPTIONS.find(m => m.type === req.mood);
      departureName = moodOpt ? `${moodOpt.label} 추천 지역` : '추천 지역';
    }

    const input: CourseGenerationInput = {
      departure: { name: departureName, lat: req.lat, lng: req.lng },
      duration: req.duration,
      companion: req.companion,
      preferences: req.preferences,
      feeling: req.feeling,
      candidates: ranked,
      festivals,
      stays,
      weather,
    };

    const course = await generateCourse(input);

    // 4. 이미지 URL 보강 (AI가 빈 값 반환 시 후보에서 매칭)
    for (const stop of course.stops) {
      if (!stop.imageUrl) {
        const match = candidates.find(c => c.contentId === stop.contentId);
        if (match?.firstImage) {
          stop.imageUrl = match.firstImage;
        }
      }
    }

    // 4.5. 이동 정보 계산 (stops 사이 거리/시간)
    for (let i = 1; i < course.stops.length; i++) {
      const prev = course.stops[i - 1];
      const curr = course.stops[i];
      const R = 6371;
      const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
      const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(prev.latitude*Math.PI/180) * Math.cos(curr.latitude*Math.PI/180) * Math.sin(dLon/2)**2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const mins = Math.round(dist * 1.5 * 2);
      if (mins > 0) {
        curr.transitInfo = `차로 ${mins}분 (${dist.toFixed(1)}km)`;
      }
    }

    // 4.6. 나들이 운세 메시지 생성
    let fortuneMessage = '';
    try {
      fortuneMessage = await generateCourseFortuneMessage(
        course.title,
        req.feeling,
        undefined // weather summary if available
      );
    } catch { /* ignore */ }

    // 5. Supabase 저장 (실패해도 코스는 반환)
    const shareSlug = generateShareSlug();
    let courseId = shareSlug;

    try {
      const supabase = await createClient();
      const { data: userData } = await supabase.auth.getUser();

      const { data: inserted } = await supabase
        .from('wk_courses')
        .insert({
          share_slug: shareSlug,
          user_id: userData.user?.id ?? null,
          departure_lat: req.lat,
          departure_lng: req.lng,
          duration: req.duration,
          companion: req.companion,
          preferences: req.preferences,
          course_data: course,
          ai_model: 'gemini',
        })
        .select('id')
        .single();

      if (inserted) {
        courseId = inserted.id;
      }
    } catch (dbErr) {
      console.warn('[이모추API] DB 저장 실패 (코스는 반환):', dbErr);
    }

    // 6. 응답
    const response: CourseResponse = {
      courseId,
      shareUrl: `/weekend/course/${shareSlug}`,
      course,
      kakaoNaviUrl: buildKakaoNaviUrl(course.stops),
      fortuneMessage,
    };

    return NextResponse.json(response);

  } catch (err) {
    const message = err instanceof Error ? err.message : '코스 생성 중 오류가 발생했습니다.';
    console.error('[이모추API] 코스 생성 실패:', err);

    // 유효성 에러는 400, 나머지는 500
    const isValidation = message.includes('올바르지') || message.includes('선택해');
    return NextResponse.json(
      { error: message },
      { status: isValidation ? 400 : 500 },
    );
  }
}
