// ============================================================
// TourAPI 4.0 클라이언트 — 한국관광공사 OpenAPI
// ============================================================

import { getWeekendElements } from './saju';
import { createTourDetailGuard, retryAfterMs, TourDetailRateLimitError } from './tour-detail-guard';

const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';

function getServiceKey(): string {
  const key = process.env.TOUR_API_KEY;
  if (!key) throw new Error('TOUR_API_KEY 환경변수가 설정되지 않았습니다.');
  return key;
}

async function callTourApi<T>(
  endpoint: string,
  params: Record<string, string | number | undefined>,
  credential = getServiceKey(),
  signal?: AbortSignal,
): Promise<T[]> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set('serviceKey', credential);
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', '이모추');
  url.searchParams.set('_type', 'json');

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  // 단기 재사용으로 중복 요청을 줄인다. 호출 이력 수를 늘리기 위한 캐시 정책이 아니다.
  const timeout = AbortSignal.timeout(7_000);
  const res = await fetch(url.toString(), { next: { revalidate: 60 }, signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  if (res.status === 429) throw new TourDetailRateLimitError(retryAfterMs(res.headers.get('retry-after')));
  if (!res.ok) {
    throw new Error(`TourAPI ${endpoint} 호출 실패: ${res.status}`);
  }

  const json = await res.json();
  const resultCode = json?.response?.header?.resultCode;
  if (resultCode != null && !['0000', '00'].includes(String(resultCode))) {
    // 기관 오류 메시지에 URL·키가 섞여도 로그로 전파하지 않는다.
    throw new Error(`TourAPI ${endpoint} 응답 오류`);
  }
  const body = json?.response?.body;
  if (!body) throw new Error(`TourAPI ${endpoint} 응답 형식 오류`);

  const items = body.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

// ─── searchFestival: 행사/축제 검색 ───

export interface FestivalItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1: string;
  addr2: string;
  areacode: string;
  sigungucode: string;
  mapx: string;
  mapy: string;
  firstimage: string;
  firstimage2: string;
  eventstartdate: string;
  eventenddate: string;
  tel: string;
}

export async function searchFestival(params: {
  eventStartDate: string;  // YYYYMMDD
  eventEndDate: string;
  areaCode?: number;
  arrange?: string;
  numOfRows?: number;
  pageNo?: number;
}): Promise<FestivalItem[]> {
  return callTourApi<FestivalItem>('searchFestival2', {
    eventStartDate: params.eventStartDate,
    eventEndDate: params.eventEndDate,
    areaCode: params.areaCode,
    arrange: params.arrange ?? 'A',
    numOfRows: params.numOfRows ?? 100,
    pageNo: params.pageNo ?? 1,
  });
}

// ─── locationBasedList: 위치 기반 관광지 검색 ───

export interface SpotItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1: string;
  addr2: string;
  areacode: string;
  sigungucode: string;
  cat1: string;
  cat2: string;
  cat3: string;
  mapx: string;
  mapy: string;
  firstimage: string;
  firstimage2: string;
  tel: string;
  dist: string;  // 거리 (미터)
}

export async function locationBasedList(params: {
  mapX: number;
  mapY: number;
  radius: number;          // 미터 단위
  contentTypeId?: number;
  arrange?: string;
  numOfRows?: number;
  pageNo?: number;
}): Promise<SpotItem[]> {
  return callTourApi<SpotItem>('locationBasedList2', {
    mapX: params.mapX,
    mapY: params.mapY,
    radius: params.radius,
    contentTypeId: params.contentTypeId,
    arrange: params.arrange ?? 'E',  // 거리순
    numOfRows: params.numOfRows ?? 30,
    pageNo: params.pageNo ?? 1,
  });
}

// ─── areaBasedList: 지역 기반 관광지 검색 ───

export async function areaBasedList(params: {
  areaCode: number;
  sigunguCode?: number;
  contentTypeId?: number;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  arrange?: string;
  numOfRows?: number;
  pageNo?: number;
}): Promise<SpotItem[]> {
  return callTourApi<SpotItem>('areaBasedList2', {
    areaCode: params.areaCode,
    sigunguCode: params.sigunguCode,
    contentTypeId: params.contentTypeId,
    cat1: params.cat1,
    cat2: params.cat2,
    cat3: params.cat3,
    arrange: params.arrange ?? 'O',  // 제목순
    numOfRows: params.numOfRows ?? 100,
    pageNo: params.pageNo ?? 1,
  });
}

// ─── detailCommon: 공통 상세정보 ───

export interface DetailCommonItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  homepage: string;
  tel: string;
  addr1: string;
  addr2: string;
  mapx: string;
  mapy: string;
  overview: string;
  firstimage: string;
}

export async function detailCommon(params: {
  contentId: string;
  contentTypeId?: number;
}): Promise<DetailCommonItem | null> {
  // KorService2 (GW버전)에서는 defaultYN/overviewYN 등 부가 파라미터 제거됨
  // 파라미터 없이 호출하면 모든 필드가 기본 포함
  const items = await callTourApi<DetailCommonItem>('detailCommon2', {
    contentId: params.contentId,
    contentTypeId: params.contentTypeId,
  });
  return items[0] ?? null;
}

// ─── detailIntro: 소개 상세정보 ───

export interface DetailIntroItem {
  contentid: string;
  contenttypeid: string;
  [key: string]: string;   // 콘텐츠 타입별 필드가 다름
}

let detailKey = '';
let introGuard = createTourDetailGuard<DetailIntroItem | null>();

export async function detailIntro(params: {
  contentId: string;
  contentTypeId: number;
}): Promise<DetailIntroItem | null> {
  const credential = getServiceKey();
  // 인증키 변경 시 이전 계정의 응답·제한 상태를 물려주지 않는다. 키는 로그에 쓰지 않는다.
  if (detailKey !== credential) { detailKey = credential; introGuard = createTourDetailGuard<DetailIntroItem | null>(); }
  return introGuard.run(JSON.stringify([params.contentId, params.contentTypeId]), async signal => {
    const items = await callTourApi<DetailIntroItem>('detailIntro2', {
      contentId: params.contentId,
      contentTypeId: params.contentTypeId,
    }, credential, signal);
    return items[0] ?? null;
  });
}

// ─── detailImage: 이미지 목록 ───

export interface DetailImageItem {
  contentid: string;
  originimgurl: string;
  imgname: string;
  smallimageurl: string;
  serialnum: string;
}

export async function detailImage(params: {
  contentId: string;
}): Promise<DetailImageItem[]> {
  // KorService2에서는 imageYN/subImageYN 파라미터 제거됨 — 기본으로 전체 반환
  return callTourApi<DetailImageItem>('detailImage2', {
    contentId: params.contentId,
    numOfRows: 10,
  });
}

// ─── searchKeyword: 키워드 검색 ───

export async function searchKeyword(params: {
  keyword: string;
  contentTypeId?: number;
  areaCode?: number;
  numOfRows?: number;
  pageNo?: number;
}): Promise<SpotItem[]> {
  return callTourApi<SpotItem>('searchKeyword2', {
    keyword: params.keyword,
    contentTypeId: params.contentTypeId,
    areaCode: params.areaCode,
    numOfRows: params.numOfRows ?? 20,
    pageNo: params.pageNo ?? 1,
  });
}

// ─── areaCode: 지역 코드 조회 ───

export interface AreaCodeItem {
  code: string;
  name: string;
  rnum: string;
}

export async function areaCode(params?: {
  areaCode?: number;
}): Promise<AreaCodeItem[]> {
  return callTourApi<AreaCodeItem>('areaCode2', {
    areaCode: params?.areaCode,
    numOfRows: 100,
  });
}

// ─── categoryCode: 분류 코드 조회 ───

export interface CategoryItem {
  code: string;
  name: string;
  rnum: string;
}

export async function categoryCode(params?: {
  cat1?: string;
  cat2?: string;
}): Promise<CategoryItem[]> {
  return callTourApi<CategoryItem>('categoryCode2', {
    cat1: params?.cat1,
    cat2: params?.cat2,
    numOfRows: 100,
  });
}

// ─── detailInfo: 반복 정보 조회 (세부 코스, 객실 정보 등) ───

export interface DetailInfoItem {
  contentid: string;
  contenttypeid: string;
  subcontentid?: string;
  subname?: string;       // 세부 항목명 (코스명, 객실명 등)
  subdetailoverview?: string;
  subdetailimg?: string;
  subdetailalt?: string;
  [key: string]: string | undefined;
}

export async function detailInfo(params: {
  contentId: string;
  contentTypeId: number;
}): Promise<DetailInfoItem[]> {
  return callTourApi<DetailInfoItem>('detailInfo2', {
    contentId: params.contentId,
    contentTypeId: params.contentTypeId,
    numOfRows: 20,
  });
}

// ─── searchStay: 숙박 검색 ───

export interface StayItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1: string;
  addr2: string;
  areacode: string;
  sigungucode: string;
  mapx: string;
  mapy: string;
  firstimage: string;
  firstimage2: string;
  tel: string;
}

export async function searchStay(params: {
  areaCode?: number;
  sigunguCode?: number;
  arrange?: string;
  numOfRows?: number;
  pageNo?: number;
}): Promise<StayItem[]> {
  return callTourApi<StayItem>('searchStay2', {
    areaCode: params.areaCode,
    sigunguCode: params.sigunguCode,
    arrange: params.arrange ?? 'P',  // 인기순
    numOfRows: params.numOfRows ?? 10,
    pageNo: params.pageNo ?? 1,
  });
}

// ─── 유틸리티 ───

/** 취향 → TourAPI 콘텐츠 타입/카테고리 매핑 */
export const PREFERENCE_CAT_MAP: Record<string, {
  contentTypeIds: number[];
  cat1?: string[];
  cat2?: string[];
}> = {
  nature:   { contentTypeIds: [12],      cat1: ['A01'] },
  cafe:     { contentTypeIds: [39],      cat2: ['A0502'] },
  food:     { contentTypeIds: [39],      cat1: ['A05'] },
  culture:  { contentTypeIds: [14],      cat1: ['A02'] },
  activity: { contentTypeIds: [28],      cat1: ['A03'] },
  photo:    { contentTypeIds: [12, 14],  cat1: ['A01', 'A02'] },
};

/**
 * 여러 번의 목록 조회 결과(`Promise.allSettled`)를 **라운드로빈으로 교차 배치**하며 합친다.
 *
 * 타입별 결과를 그냥 이어붙이면 배열 앞부분이 첫 번째 타입으로만 채워진다.
 * 뒤 단계에서 "상위 N개만" 처리하는 로직(예: `enrichWithFacilities`의 detailIntro 보강)이
 * 있으면 나머지 타입은 통째로 누락된다. 교차 배치하면 **추가 API 호출 없이** 순서만 바꿔
 * 타입별로 고르게 앞자리를 차지하게 만든다.
 *
 * - 실패한(rejected) 조회는 빈 목록으로 취급한다 (allSettled 내성 유지).
 * - `getId` 기준 중복만 제거하며, 그 외에는 **어떤 항목도 버리지 않는다**.
 */
export function interleaveResults<T>(
  results: PromiseSettledResult<T[]>[],
  getId: (item: T) => string,
): T[] {
  const lists = results.map(r => (r.status === 'fulfilled' ? r.value : []));
  const maxLength = lists.reduce((max, list) => Math.max(max, list.length), 0);

  const merged: T[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < maxLength; i++) {
    for (const list of lists) {
      const item = list[i];
      if (!item) continue;
      const id = getId(item);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      merged.push(item);
    }
  }

  return merged;
}

/** YYYYMMDD 포맷 */
export function formatDateYMD(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** 이번 주말 (다가오는 토·일) 날짜 계산 */
export function getNextWeekend(now = new Date()): { saturday: Date; sunday: Date } {
  const weekend = getWeekendElements(now);
  return { saturday: weekend.saturdayDate, sunday: weekend.sundayDate };
}

// ─── 취향별 세부 카테고리 ───

// 🔴 2026-09-21: 라벨과 코드가 어긋나 있었다 — 박물관·미술관은 A0206(문화시설) 소분류이고,
// 「공연장」은 A0206 전체가 아니라 A02060600 하나다. 라벨이 고르는 범위와 같아지도록 좁혔다.
// 같은 착오가 홈 카드 배지에서 실제로 드러났다(lib/spot-category.ts 주석 참조).
export const PREFERENCE_SUB_CATEGORIES: Record<string, { label: string; cat2?: string; cat3?: string }[]> = {
  nature: [
    { label: '산/산책로', cat2: 'A0101' },
    { label: '해변/바다', cat2: 'A0101', cat3: 'A01011200' },
    { label: '공원/정원', cat2: 'A0102' },
    { label: '호수/계곡', cat2: 'A0101' },
  ],
  food: [
    { label: '한식', cat2: 'A0502', cat3: 'A05020100' },
    { label: '양식', cat2: 'A0502', cat3: 'A05020200' },
    { label: '일식', cat2: 'A0502', cat3: 'A05020300' },
    { label: '분식/야시장', cat2: 'A0502', cat3: 'A05020700' },
  ],
  culture: [
    { label: '박물관', cat2: 'A0206', cat3: 'A02060100' },
    { label: '미술관', cat2: 'A0206', cat3: 'A02060500' },
    { label: '공연장', cat2: 'A0206', cat3: 'A02060600' },
    { label: '역사유적', cat2: 'A0201' },
  ],
  activity: [
    { label: '수상레포츠', cat2: 'A0302' },
    { label: '등산/트레킹', cat2: 'A0301' },
    { label: '테마파크', cat2: 'A0202', cat3: 'A02020600' },
    { label: '체험활동', cat2: 'A0203' },
  ],
};

// ─── 편의시설 파싱 유틸 ───

export function parseFacilities(introData: Record<string, unknown> | null): {
  parking: boolean;
  babyCarriage: boolean;
  kidsFacility: boolean;
  pet: boolean;
  operatingHours: string;
} {
  if (!introData) {
    return { parking: false, babyCarriage: false, kidsFacility: false, pet: false, operatingHours: '' };
  }

  const hasValue = (val: unknown): boolean => {
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    return s !== '' && s !== '불가' && s !== '불가능' && s !== '없음' && s !== 'n';
  };

  const parking = hasValue(introData.parking) || hasValue(introData.parkingfood);
  const babyCarriage = hasValue(introData.chkbabycarriage) || hasValue(introData.chkbabycarriageculture);
  const kidsFacility = hasValue(introData.kidsfacility);
  const pet = hasValue(introData.chkpet) || hasValue(introData.chkpetculture);

  // 운영시간 추출
  const timeField = introData.usetime || introData.usetimeculture ||
    introData.usetimefestival || introData.opentimefood || introData.playtime || '';
  const operatingHours = String(timeField).replace(/<[^>]*>/g, '').trim().slice(0, 50);

  return { parking, babyCarriage, kidsFacility, pet, operatingHours };
}
