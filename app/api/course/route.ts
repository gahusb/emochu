// ============================================================
// POST /api/course — AI 코스 생성 엔드포인트
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { COURSE_TTL_DAYS, sweepExpiredCourses } from '@/lib/course-lifecycle';
import { generateEditToken } from '@/lib/course-edit';
import { fetchSuggestionsForLimitError } from '@/lib/course-community';
import { getCurrentUserId } from '@/lib/auth';
import {
  locationBasedList,
  areaBasedList,
  searchFestival,
  searchStay,
  formatDateYMD,
  getNextWeekend,
  interleaveResults,
  type SpotItem,
  type FestivalItem,
  type StayItem,
} from '@/lib/tour-api';
import { getWeekendForecast } from '@/lib/weather-api';
import { fetchBarrierFree } from '@/lib/barrier-free-api';
import { calcSajuFromElements, type Element5 } from '@/lib/saju';
import {
  checkAndBumpUsage, clientKeyFrom, secondsUntilKstMidnight,
  PER_CLIENT_DAILY, GLOBAL_DAILY,
} from '@/lib/usage-limit';
import {
  generateCourse,
  filterByAccessibility,
  generateFallbackCourse,
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
import { replaceClosedStops, visitDayToIndex } from '@/lib/opening-hours';
import type {
  CourseRequest,
  AccessibilityNeed,
  BarrierFreeInfo,
  CourseResponse,
  CourseStop,
  Duration,
  Companion,
  Preference,
  Feeling,
  DestinationType,
  MoodType,
  CourseSaju,
  CourseData,
  VisitDay,
} from '@/lib/weekend-types';
import { MOOD_OPTIONS, CITY_OPTIONS } from '@/lib/weekend-types';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ─── 인메모리 Rate Limiter (IP 기반, 분당 3회) ───
//
// 🔴 이건 **버스트 차단기지 예산 차단기가 아니다.** 두 가지 한계가 있다:
//   1) 서버리스라 인스턴스마다 Map 이 따로 산다. 콜드스타트마다 리셋된다.
//   2) 하루 총량 개념이 없다 — 분당 3회를 하루 내내 유지하면 4,320회 ≈ 13만원이다.
// 하루 상한·전체 예산 상한은 lib/usage-limit.ts 가 Supabase 카운터로 따로 건다.

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
const VALID_VISIT_DAYS: VisitDay[] = ['sat', 'sun'];
const VALID_ELEMENTS: Element5[] = ['wood', 'fire', 'earth', 'metal', 'water'];

const VALID_ACCESSIBILITY: AccessibilityNeed[] = ['mobility', 'visual', 'hearing', 'infant'];

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

  // 접근성은 선택 사항이다. 없거나 빈 배열이면 undefined 로 정규화해서,
  // 아래 파이프라인이 "조건 없음"을 한 가지 모양으로만 보게 한다.
  let accessibility: AccessibilityNeed[] | undefined;
  const rawA11y = b.accessibility;
  if (Array.isArray(rawA11y) && rawA11y.length > 0) {
    const filtered = rawA11y.filter((a): a is AccessibilityNeed =>
      VALID_ACCESSIBILITY.includes(a as AccessibilityNeed));
    if (filtered.length !== rawA11y.length) {
      throw new Error('올바르지 않은 접근성 항목이 포함되어 있습니다.');
    }
    accessibility = filtered;
  }

  const visitDay = b.visitDay as VisitDay | undefined;
  if (visitDay && !VALID_VISIT_DAYS.includes(visitDay)) {
    throw new Error('방문 요일 선택이 올바르지 않습니다.');
  }

  let saju: CourseSaju | undefined;
  const rawSaju = b.saju as Record<string, unknown> | undefined;
  if (rawSaju !== undefined) {
    const birthElement = rawSaju.birthElement as Element5;
    const todayElement = rawSaju.todayElement as Element5;
    if (!VALID_ELEMENTS.includes(birthElement) || !VALID_ELEMENTS.includes(todayElement)) {
      throw new Error('사주 기운 정보가 올바르지 않습니다.');
    }
    const trusted = calcSajuFromElements(birthElement, todayElement);
    saju = {
      birthElement: trusted.birthElement,
      todayElement: trusted.todayElement,
      relation: trusted.relation,
      headline: trusted.headline,
      message: trusted.message,
    };
  }

  return { lat, lng, duration, companion, preferences, feeling, destinationType, cityAreaCode, mood, saju, visitDay, accessibility };
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

/**
 * 타입별 조회 결과를 라운드로빈으로 합친다 (`interleaveResults`).
 *
 * 이유: `enrichWithFacilities(candidates, 20)`는 배열 앞 20개만 detailIntro를 조회한다.
 * 타입별 결과를 이어붙이면 앞 20개가 전부 관광지(12)가 되어 문화시설(14)·음식점(39)·
 * 레포츠(28)의 `restdate`를 한 번도 못 가져온다 → 배지가 전부 "운영시간 확인 필요".
 * 교차 배치하면 **API 호출 수를 늘리지 않고** 타입별 상위 몇 개씩을 고루 보강한다.
 * 항목은 버리지 않고 순서만 바뀌며, 이후 `scoreAndRankCandidates`가 점수순으로
 * 재정렬하므로 순서 변경은 안전하다.
 */
const mergeByType = (
  results: PromiseSettledResult<SpotItem[]>[],
  lat: number,
  lng: number,
): ScoredSpot[] =>
  interleaveResults(results, item => item.contentid).map(item => spotItemToScored(item, lat, lng));

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

  return mergeByType(results, lat, lng);
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

  return mergeByType(results, centerLat, centerLng);
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

  // 여기도 교차 배치한다. 이어붙이면 상위 20개가 핵심 장소 + 음식점으로만 차서
  // 문화시설(14)·레포츠(28)의 restdate를 못 가져온다(= 배지 미표시).
  // 목록 순서가 [핵심 → 음식점 → 문화 → 레포츠 → 보강]이므로 교차 후에도 핵심 장소가
  // 각 라운드의 맨 앞에 오고, 어느 항목도 버려지지 않는다.
  const results = await Promise.allSettled([...primaryTasks, ...supportTasks, ...extraTasks]);

  return mergeByType(results, centerLat, centerLng);
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

  // 하루 상한 + 전체 예산 차단기. 외부 API 를 한 번이라도 부르기 전에 판정한다 —
  // TourAPI 를 다 부르고 나서 막으면 막은 요청에도 비용이 든다.
  const usage = await checkAndBumpUsage(clientKeyFrom(request.headers));
  if (!usage.allowed) {
    const retryAfter = secondsUntilKstMidnight();
    const message = usage.blockedBy === 'global'
      ? '오늘 만들 수 있는 코스가 모두 소진됐어요. 내일 다시 만나요!'
      : `하루에 만들 수 있는 코스는 ${PER_CLIENT_DAILY}개예요. 내일 다시 만들어드릴게요!`;
    console.warn(`[이모추API] 상한 도달(${usage.blockedBy}) client=${usage.clientCount} global=${usage.globalCount}/${GLOBAL_DAILY}`);
    // 대신 보여줄 거리 — 이미 있는 인기 코스 몇 개. AI 재호출 없이 공짜다.
    // 🔴 이 시점엔 아직 body 를 파싱하지 않아 위치 정보가 없다 — 위치 필터 없이 전체
    //    인기 코스를 준다(1차 범위, 2026-09-04).
    const suggestions = await fetchSuggestionsForLimitError();
    return NextResponse.json({ error: message, suggestions }, {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    });
  }
  if (usage.degraded) {
    console.warn('[이모추API] 🔴 사용량 카운터가 동작하지 않는다 — 예산 차단기 없이 진행 중');
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

    // 「다른 코스도 볼래요」 — 저장된 코스의 원본 조건으로 B 코스만 만든다.
    // 🔑 조건을 클라이언트에서 받지 않고 DB 에서 읽는다. 공유 링크로 들어온 사람은
    //    위저드를 거치지 않아 조건을 갖고 있지 않다.
    const rawBody = body as Record<string, unknown>;
    const alternativeFor = typeof rawBody.alternativeFor === 'string' ? rawBody.alternativeFor : null;

    let req: CourseRequest;
    if (alternativeFor) {
      const { data: row } = await createAdminClient()
        .from('wk_courses')
        .select('request_params, course_b_data')
        .eq('share_slug', alternativeFor)
        .single();

      if (!row?.request_params) {
        // 013 마이그레이션 이전에 만들어진 코스는 조건이 없다. 재생성이 불가능하다.
        return NextResponse.json(
          { error: '이 코스는 다른 버전을 만들 수 없어요. 새로 만들어보세요!' },
          { status: 404 },
        );
      }
      if (row.course_b_data) {
        // 이미 만들어 둔 게 있으면 그대로 준다 — 같은 코스에 두 번 과금하지 않는다.
        return NextResponse.json({ courseB: row.course_b_data as CourseData });
      }
      req = validateRequest(row.request_params);
    } else {
      req = validateRequest(body);
    }

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
    // 외부 API 지연이 maxDuration(60s)을 잠식하지 않도록 상한을 둔다. 초과 시 보강 없이 진행.
    // enrichWithFacilities는 내부적으로 Promise.allSettled로 전체를 기다린 뒤 일괄 반영하므로,
    // 타임아웃 시에는 보강이 하나도 반영되지 않는다(all-or-nothing). 미반영 항목은
    // closedWeekdays가 undefined로 남고 closedPenalty가 감점 0으로 처리하므로 안전하다.
    const ENRICH_TIMEOUT_MS = 8_000;
    let enrichTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        enrichWithFacilities(candidates, 20),
        new Promise<void>((resolve) => {
          enrichTimer = setTimeout(() => {
            console.warn('[이모추API] 편의시설 보강 타임아웃 → 보강 없이 진행');
            resolve();
          }, ENRICH_TIMEOUT_MS);
        }),
      ]);
    } catch (enrichErr) {
      console.warn('[이모추API] 편의시설 조회 실패 (무시):', enrichErr);
    } finally {
      clearTimeout(enrichTimer);
    }

    // 2. 사전 스코어링 + 다양성 보장
    const ranked = scoreAndRankCandidates(
      candidates,
      req.preferences,
      req.companion,
      req.duration,
      weather,
      req.feeling,
      req.visitDay,
      // 🔑 「오늘의 오행」만 넘긴다 — 매일 바뀌는 축이라야 같은 사람이 다른 날 다른 코스를 받는다.
      req.saju?.todayElement,
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

    // 접근성 조건이 있을 때만 무장애 정보를 조회한다. 없으면 fetchBarrierFree 가
    // 빈 배열을 받아 호출조차 하지 않으므로 기존 경로에 지연이 0 이다.
    // 실패(403·타임아웃·429)해도 빈 Map 이라 코스 생성은 그대로 진행된다.
    let ranked2 = ranked;
    // enrichStops 에서 stop 에 붙여야 하므로 스코프를 바깥에 둔다.
    let bfInfo = new Map<string, BarrierFreeInfo>();
    if (req.accessibility && req.accessibility.length > 0) {
      bfInfo = await fetchBarrierFree(ranked.map(c => c.contentId));
      ranked2 = filterByAccessibility(ranked, req.accessibility, bfInfo).map((spot) => ({
        ...spot,
        barrierFree: bfInfo.get(spot.contentId),
      }));
    }

    const input: CourseGenerationInput = {
      departure: { name: departureName, lat: req.lat, lng: req.lng },
      duration: req.duration,
      companion: req.companion,
      preferences: req.preferences,
      feeling: req.feeling,
      candidates: ranked2,
      festivals,
      stays,
      weather,
      saju: req.saju,
      visitDay: req.visitDay,
      accessibility: req.accessibility,
    };

    // 🔑 코스는 **한 번에 하나만** 만든다.
    //    예전에는 A/B 를 항상 병렬로 만들어 요청당 Gemini 호출이 정확히 2회였다.
    //    실측(2026-08-31)으로 B 를 본 사람보다 안 본 사람이 훨씬 많을 구조인데
    //    비용은 전원에게 2배로 나갔다. 이제 B 는 「다른 코스도 볼래요」를 누른 사람만 만든다.
    const primaryVariant: 'a' | 'b' = alternativeFor ? 'b' : 'a';

    // Gemini 가 네트워크 행으로 응답 없을 때 maxDuration(60s) 전에 폴백 코스를 반환한다.
    // 🔴 2026-09-05 실측으로 발견: Promise.race 는 진 쪽 프라미스를 취소하지 않는다.
    //    타이머 핸들을 안 잡아두면 generateCourse 가 먼저 성공해도 50초 뒤에 이 setTimeout 이
    //    그대로 발화해 "타임아웃 → 폴백 반환" 이라는 거짓 경고 로그를 남긴다(실제로는 타임아웃도,
    //    폴백 반환도 없었다). 핸들을 잡아뒀다가 race 가 끝나면 반드시 지운다.
    let fallbackTimer: ReturnType<typeof setTimeout>;
    const fallbackPromise = new Promise<ReturnType<typeof generateFallbackCourse>>((resolve) => {
      fallbackTimer = setTimeout(() => {
        console.warn(`[이모추API] 코스${primaryVariant.toUpperCase()} 50초 타임아웃 → 폴백 코스 반환`);
        resolve(generateFallbackCourse(ranked, input.duration, input.departure));
      }, 50_000);
    });
    const course = await Promise.race([generateCourse(input, primaryVariant), fallbackPromise]);
    clearTimeout(fallbackTimer!);


    // 4-0. 방문일 휴무 stop 교체 (AI가 프롬프트 지시를 어긴 경우의 최종 안전망)
    if (req.visitDay) {
      const fixedA = replaceClosedStops(course.stops, ranked, req.visitDay);
      course.stops = fixedA.stops;
      if (fixedA.replaced > 0) {
        console.warn(`[이모추API] 휴무 stop 교체: ${fixedA.replaced}건 (visitDay=${req.visitDay})`);
      }
    }

    // 4. 이미지 URL 보강 + contentTypeId fallback (A/B 모두 적용)
    const enrichStops = (stops: CourseStop[]) => {
      for (const stop of stops) {
        if (!stop.imageUrl) {
          const match = candidates.find(c => c.contentId === stop.contentId);
          if (match?.firstImage) stop.imageUrl = match.firstImage;
        }
        if (!stop.contentTypeId && stop.contentId) {
          const candidate = candidates.find(c => c.contentId === stop.contentId);
          if (candidate?.contentTypeId) stop.contentTypeId = String(candidate.contentTypeId);
        }
        // 무장애 정보. bfInfo 에 키가 없으면 붙이지 않는다 —
        // UI 가 undefined 를 "미확인"으로 표시해야 하므로 빈 객체를 만들면 안 된다.
        const bf = bfInfo.get(stop.contentId);
        if (bf) stop.facilities = { ...(stop.facilities ?? {}), barrierFree: bf };
        if (req.accessibility && req.accessibility.length > 0) {
          stop.accessibilityNeeds = req.accessibility;
          stop.accessibilityStatus = req.accessibility.every((need) => bf?.[need] === true)
            ? 'confirmed'
            : 'unverified';
        }

        const cand = candidates.find(c => c.contentId === stop.contentId);
        if (cand) {
          if (cand.tel) stop.tel = cand.tel;
          if (cand.restdate) stop.restdate = cand.restdate;
          if (req.visitDay) {
            // 판정 불가(null/undefined)거나, 교체에 실패해 휴무인 채로 남은 stop → 'unknown'
            // 방문일에 영업이 확인된 경우만 'open'
            stop.openStatus =
              cand.closedWeekdays != null && !cand.closedWeekdays.includes(visitDayToIndex(req.visitDay))
                ? 'open'
                : 'unknown';
          }
        }
      }
    };
    enrichStops(course.stops);

    // 4.5. 이동 정보 계산 (A/B 모두)
    const calcTransit = (stops: CourseStop[]) => {
      for (let i = 1; i < stops.length; i++) {
        const prev = stops[i - 1];
        const curr = stops[i];
        const dist = haversineKm(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
        const mins = Math.round(dist * 1.5 * 2);
        if (mins > 0) curr.transitInfo = `차로 ${mins}분 (${dist.toFixed(1)}km)`;
      }
    };
    calcTransit(course.stops);

    // 4.6. 나들이 운세 메시지 생성 — 사주 사용 시 사주 메시지로 개인화
    let fortuneMessage = '';
    if (alternativeFor) {
      // 「다른 코스」는 이미 만들어진 코스에 곁들이는 것이라 운세 문구를 새로 뽑지 않는다.
      fortuneMessage = '';
    } else if (req.saju) {
      fortuneMessage = req.saju.message;
      course.saju = req.saju;
    } else {
      try {
        fortuneMessage = await generateCourseFortuneMessage(
          course.title,
          req.feeling,
          undefined // weather summary if available
        );
      } catch { /* ignore */ }
    }

    // 5-a. 「다른 코스」였다면 기존 행에 붙이고 끝낸다 (새 코스를 만들지 않는다)
    if (alternativeFor) {
      try {
        await createAdminClient()
          .from('wk_courses')
          .update({ course_b_data: course })
          .eq('share_slug', alternativeFor);
      } catch (dbErr) {
        console.warn('[이모추API] B 코스 저장 실패 (코스는 반환):', dbErr);
      }
      return NextResponse.json({ courseB: course });
    }

    // 5-b. Supabase 저장 (실패해도 코스는 반환)
    const shareSlug = generateShareSlug();
    const editToken = generateEditToken();
    // 로그인 상태면 처음부터 계정에 붙인다. 비로그인이면 null 이고, 나중에
    // 로그인한 뒤 편집 토큰으로 claim 해서 가져갈 수 있다.
    const ownerId = await getCurrentUserId();
    let courseId = shareSlug;

    try {
      const supabase = createAdminClient();

      const { data: inserted } = await supabase
        .from('wk_courses')
        .insert({
          share_slug: shareSlug,
          user_id: ownerId,
          departure_lat: req.lat,
          departure_lng: req.lng,
          duration: req.duration,
          companion: req.companion,
          preferences: req.preferences,
          course_data: course,
          course_b_data: null,
          ai_model: 'gemini',
          // 만든 사람만 이 코스를 고칠 수 있게 하는 토큰. 응답으로 딱 한 번 나간다.
          edit_token: editToken,
          // 🔑 만든 코스가 전부 영구 보존되던 것을 바꿨다. 공유·저장을 누르지 않은
          //    코스는 30일 뒤 사라진다. 누르면 expires_at 이 NULL 이 되어 영구 보존된다.
          // 로그인해서 만든 코스는 「내 코스」에 남아야 하므로 만료시키지 않는다.
          expires_at: ownerId ? null : new Date(Date.now() + COURSE_TTL_DAYS * 86_400_000).toISOString(),
          is_kept: Boolean(ownerId),
          // 「다른 코스도 볼래요」를 나중에 누를 수 있게 원본 조건을 남긴다.
          // 🔴 위치는 넣지 않는다 — departure_lat/lng 컬럼에 이미 있다.
          request_params: {
            lat: req.lat, lng: req.lng,
            duration: req.duration, companion: req.companion,
            preferences: req.preferences, feeling: req.feeling,
            destinationType: req.destinationType, cityAreaCode: req.cityAreaCode,
            mood: req.mood, visitDay: req.visitDay,
            accessibility: req.accessibility, saju: req.saju,
          },
        })
        .select('id')
        .single();

      if (inserted) {
        courseId = inserted.id;
      }

      // 만료된 코스를 조금씩 치운다. 별도 스케줄러 없이 도는 게 핵심이다 —
      // 인프라를 하나 더 두면 그게 또 관리 대상이 된다.
      void sweepExpiredCourses();
    } catch (dbErr) {
      console.warn('[이모추API] DB 저장 실패 (코스는 반환):', dbErr);
    }

    // 6. 응답
    const response: CourseResponse = {
      courseId,
      shareUrl: `/course/${shareSlug}`,
      course,
      editToken,
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
