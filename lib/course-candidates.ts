import { locationBasedList, areaBasedList, searchStay, detailIntro, interleaveResults, type SpotItem, type FestivalItem, type StayItem } from './tour-api';
import { haversineKm, type ScoredSpot, type FestivalCandidate, type StayCandidate } from './weekend-ai';
import { getTripDates } from './trip-context';
import { MOOD_OPTIONS, type CourseRequest, type Duration, type MoodType } from './weekend-types';

import { loadWeekendFestivals, nearbyFestivals } from './festival-data';

// 실제 생성 경로와 읽기 전용 품질 실측이 같은 후보 수집 코드를 사용한다.
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
    firstImage: item.firstimage || undefined,
    tel: item.tel || undefined,
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

export async function collectCandidates(
  req: CourseRequest,
): Promise<ScoredSpot[]> {
  const { lat, lng, duration, destinationType, cityAreaCode, mood } = req;

  if (destinationType === 'city' && cityAreaCode) {
    // 강릉·속초는 areaCode가 같다. 먼저 선택한 중심 좌표 주변을 수집한다.
    const nearby = await collectCandidatesNearby(lat, lng, duration);
    if (nearby.length >= 8) return nearby;
    const area = await collectCandidatesByArea(cityAreaCode, lat, lng);
    const radius = duration === 'half_day' ? 15 : duration === 'overnight' ? 50 : 30;
    return [...nearby, ...area.filter(c => c.distanceKm <= radius && !nearby.some(n => n.contentId === c.contentId))];
  }

  if (destinationType === 'mood' && mood) {
    return collectCandidatesByMood(mood, lat, lng);
  }

  // 기본: nearby
  return collectCandidatesNearby(lat, lng, duration);
}

// ─── 축제 수집 ───

export async function collectFestivals(req: CourseRequest): Promise<FestivalCandidate[]> {
  try {
    // 9/9 실측: areaCode=1은 0건, 전국 조회에는 서울 행사가 존재한다.
    // 원본 좌표·방문일로 거르고 가까운 6건만 AI 후보로 제공한다.
    const { items } = await loadWeekendFestivals();
    const radius = { half_day: 15, full_day: 30, leisurely: 25, overnight: 50 }[req.duration];
    const candidates = nearbyFestivals(items, req.lat, req.lng, radius, getTripDates(req.duration, req.visitDay)).slice(0, 6).map(festivalItemToCandidate);
    await Promise.allSettled(candidates.map(async festival => {
      const intro = await detailIntro({ contentId: festival.contentId, contentTypeId: 15 });
      // 행사 이용요금(usetimefestival)은 시간으로 쓰지 않는다.
      festival.playtime = intro?.playtime?.replace(/<br\s*\/?>/gi, ' ').trim().slice(0, 500) || undefined;
    }));
    return candidates;
  } catch {
    console.warn('[이모추API] 축제 후보 조회 실패 — 축제 없는 일정으로 진행');
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

export async function collectStays(req: CourseRequest): Promise<StayCandidate[]> {
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
