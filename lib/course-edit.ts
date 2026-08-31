// ============================================================
// 코스 편집 — 장소 교체 · 순서 변경
// ============================================================
//
// 왜 AI 를 다시 부르지 않나:
//   코스를 통째로 다시 만들면 사용자가 마음에 들어 했던 나머지 장소까지 바뀐다.
//   「이 한 곳만 마음에 안 든다」에 대한 답으로는 과하고, 비용도 든다.
//   그래서 교체는 **후보에서 갈아끼우기**로 처리한다 — Gemini 호출 0 이다.
//
// 🔴 권한: 이 서비스에는 아직 로그인이 없다. share_slug 는 공유하라고 만든 값이라
//    그것만으로 편집을 열면 링크를 받은 누구나 남의 코스를 고칠 수 있다.
//    생성자에게만 주는 편집 토큰으로 가른다(014 마이그레이션).

import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { locationBasedList } from '@/lib/tour-api';
import { classifySpotRole, haversineKm, enrichWithFacilities } from '@/lib/weekend-ai';
import type { ScoredSpot } from '@/lib/weekend-ai';
import type { CourseStop, SpotRole } from '@/lib/weekend-types';

/** 대체 후보를 찾을 반경(m). 너무 넓히면 동선이 깨진다. */
const ALTERNATIVE_RADIUS_M = 8_000;
/** 사용자에게 보여줄 대체 후보 수. 고르는 피로를 생각해 많이 주지 않는다. */
export const ALTERNATIVE_LIMIT = 8;

/** SpotRole → TourAPI contentTypeId. 같은 역할끼리만 바꿔야 코스 구성이 안 무너진다. */
const ROLE_CONTENT_TYPES: Record<SpotRole, number[]> = {
  attraction: [12],
  restaurant: [39],
  cafe: [39],
  culture: [14],
  activity: [28],
};

export function generateEditToken(): string {
  return randomBytes(24).toString('base64url');
}

export interface EditableCourse {
  id: string;
  courseData: import('@/lib/weekend-types').CourseData;
}

/**
 * 편집 권한을 확인하고 코스를 가져온다.
 *
 * 🔴 토큰이 없거나 틀리면 **404 와 같은 얼굴**을 보여준다(null 반환).
 *    "토큰이 틀렸습니다"라고 알려주면 어떤 slug 가 편집 가능한 코스인지가 새어나간다.
 * 🔴 비교는 timingSafeEqual 로 한다. 문자열 `===` 는 앞에서부터 비교하다 다르면 즉시
 *    끝나서, 응답 시간 차이로 토큰을 한 글자씩 맞춰볼 여지를 준다.
 */
export async function authorizeEdit(slug: string, token: string | null): Promise<EditableCourse | null> {
  if (!token) return null;

  const { data } = await createAdminClient()
    .from('wk_courses')
    .select('id, course_data, edit_token')
    .eq('share_slug', slug)
    .single();

  const stored = (data as { edit_token?: string } | null)?.edit_token;
  if (!data || !stored) return null;

  const a = Buffer.from(token);
  const b = Buffer.from(stored);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return {
    id: (data as { id: string }).id,
    courseData: (data as { course_data: import('@/lib/weekend-types').CourseData }).course_data,
  };
}

export interface AlternativeSpot {
  contentId: string;
  contentTypeId: number;
  title: string;
  addr1: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  /** 원래 장소로부터의 거리(km). 동선이 얼마나 틀어지는지 보여준다. */
  detourKm: number;
}

/**
 * 특정 stop 을 대신할 수 있는 후보를 찾는다.
 *
 * 🔑 출발지가 아니라 **그 stop 의 좌표**를 중심으로 찾는다. 출발지 기준으로 찾으면
 *    코스 후반부 장소를 바꿀 때 엉뚱하게 먼 곳이 올라온다.
 */
export async function findAlternatives(
  target: CourseStop,
  existingContentIds: string[],
): Promise<AlternativeSpot[]> {
  const role: SpotRole = target.role ?? 'attraction';
  const types = ROLE_CONTENT_TYPES[role] ?? [12];

  const batches = await Promise.allSettled(
    types.map((contentTypeId) =>
      locationBasedList({
        mapX: target.longitude,
        mapY: target.latitude,
        radius: ALTERNATIVE_RADIUS_M,
        numOfRows: 40,
        contentTypeId,
      }),
    ),
  );

  const exclude = new Set(existingContentIds);
  const seen = new Set<string>();
  const out: AlternativeSpot[] = [];

  for (const b of batches) {
    if (b.status !== 'fulfilled') continue;
    for (const item of b.value) {
      const contentId = item.contentid;
      // 이미 코스에 있는 곳은 후보가 아니다 — 같은 곳이 두 번 들어가면 안 된다.
      if (exclude.has(contentId) || seen.has(contentId)) continue;

      const latitude = Number(item.mapy);
      const longitude = Number(item.mapx);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

      const spot: ScoredSpot = {
        contentId,
        contentTypeId: Number(item.contenttypeid),
        title: item.title,
        addr1: item.addr1,
        cat1: item.cat1, cat2: item.cat2, cat3: item.cat3,
        latitude, longitude,
        firstImage: item.firstimage || undefined,
        distanceKm: 0,
        score: 0,
      };

      // 🔴 음식점(39)은 cat3 로 카페/밥집이 갈린다. 역할이 다르면 후보가 아니다 —
      //    "카페를 바꾼다"고 눌렀는데 국밥집이 나오면 코스 구성이 무너진다.
      if (classifySpotRole(spot) !== role) continue;

      seen.add(contentId);
      out.push({
        contentId,
        contentTypeId: spot.contentTypeId,
        title: spot.title,
        addr1: spot.addr1,
        latitude, longitude,
        imageUrl: spot.firstImage,
        detourKm: Math.round(haversineKm(target.latitude, target.longitude, latitude, longitude) * 10) / 10,
      });
    }
  }

  // 원래 자리에서 가까운 순. 동선을 가장 덜 망가뜨리는 것부터 보여준다.
  out.sort((a, b) => a.detourKm - b.detourKm);
  return out.slice(0, ALTERNATIVE_LIMIT);
}

/**
 * 고른 후보로 stop 을 갈아끼운다.
 *
 * 🔑 시간 슬롯(timeStart·durationMin)은 그대로 둔다. 사용자가 바꾼 건 「무엇을 가는가」지
 *    「언제 가는가」가 아니다. 설명·팁·hook 은 그 장소 얘기가 아니게 되므로 지운다 —
 *    남겨두면 다른 장소의 설명이 붙은 채로 남아 거짓말이 된다.
 */
export async function applyReplacement(
  stop: CourseStop,
  picked: AlternativeSpot,
): Promise<CourseStop> {
  const spot: ScoredSpot = {
    contentId: picked.contentId,
    contentTypeId: picked.contentTypeId,
    title: picked.title,
    addr1: picked.addr1,
    cat1: '', cat2: '', cat3: '',
    latitude: picked.latitude,
    longitude: picked.longitude,
    firstImage: picked.imageUrl,
    distanceKm: 0,
    score: 0,
  };

  // 전화·운영시간·휴무를 채운다. 목록 API 에는 없고 상세에만 있다.
  // 한 곳뿐이라 호출도 한 번이다.
  try {
    await enrichWithFacilities([spot], 1);
  } catch {
    /* 보강 실패는 무시한다 — 교체 자체가 실패할 이유는 아니다 */
  }

  return {
    ...stop,
    contentId: picked.contentId,
    contentTypeId: String(picked.contentTypeId),
    title: picked.title,
    latitude: picked.latitude,
    longitude: picked.longitude,
    imageUrl: picked.imageUrl,
    tel: spot.tel,
    restdate: spot.restdate,
    // 이 장소 얘기가 아닌 문구는 지운다
    description: '직접 고른 장소예요.',
    tip: '',
    hook: undefined,
    whyNow: undefined,
    images: undefined,
    facilities: spot.facilities ? { ...spot.facilities } : undefined,
    // 방문일 영업 여부를 다시 판정하지 않았으므로 「확인 필요」로 되돌린다.
    // 이전 장소의 'open' 을 물려주면 확인되지 않은 것을 확인됐다고 말하는 셈이다.
    openStatus: stop.openStatus ? 'unknown' : undefined,
    accessibilityStatus: stop.accessibilityStatus ? 'unverified' : undefined,
  };
}

/** 코스 전체의 이동 정보·총거리를 다시 계산한다. 교체·순서 변경 뒤에 반드시 부른다. */
export function recalcRoute(stops: CourseStop[]): { stops: CourseStop[]; totalDistanceKm: number } {
  let total = 0;
  const out = stops.map((s, i) => ({ ...s, order: i + 1, transitInfo: undefined as string | undefined }));

  for (let i = 1; i < out.length; i++) {
    const dist = haversineKm(out[i - 1].latitude, out[i - 1].longitude, out[i].latitude, out[i].longitude);
    total += dist;
    const mins = Math.round(dist * 1.5 * 2);
    if (mins > 0) out[i].transitInfo = `차로 ${mins}분 (${dist.toFixed(1)}km)`;
  }

  return { stops: out, totalDistanceKm: Math.round(total * 10) / 10 };
}

/**
 * 같은 날짜 안에서 stop 을 한 칸 옮긴다.
 *
 * 🔑 시간 슬롯은 자리에 남고 **내용만 자리를 바꾼다**. 1박2일 코스에서 1일차 장소가
 *    2일차로 넘어가면 코스가 깨지므로, 날짜 경계를 넘지 않는다.
 */
export function moveStop(
  stops: CourseStop[],
  order: number,
  direction: 'up' | 'down',
): CourseStop[] | null {
  const i = stops.findIndex((s) => s.order === order);
  if (i < 0) return null;

  const j = direction === 'up' ? i - 1 : i + 1;
  if (j < 0 || j >= stops.length) return null;
  if ((stops[i].day ?? 1) !== (stops[j].day ?? 1)) return null;

  const a = { ...stops[i] }, b = { ...stops[j] };
  // 시간·순번은 자리의 속성이라 그대로 두고, 장소만 맞바꾼다.
  const swap = (x: CourseStop, y: CourseStop): CourseStop => ({
    ...x, timeStart: y.timeStart, durationMin: y.durationMin, order: y.order, day: y.day,
  });

  const out = [...stops];
  out[j] = swap(a, b);
  out[i] = swap(b, a);
  return out.sort((x, y) => x.order - y.order);
}
