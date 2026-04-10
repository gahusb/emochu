// ============================================================
// TourAPI 4.0 클라이언트 — 한국관광공사 OpenAPI
// ============================================================

const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';

function getServiceKey(): string {
  const key = process.env.TOUR_API_KEY;
  if (!key) throw new Error('TOUR_API_KEY 환경변수가 설정되지 않았습니다.');
  return key;
}

interface TourApiBaseParams {
  numOfRows?: number;
  pageNo?: number;
}

async function callTourApi<T>(
  endpoint: string,
  params: Record<string, string | number | undefined>,
): Promise<T[]> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set('serviceKey', getServiceKey());
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', '이모추');
  url.searchParams.set('_type', 'json');

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`TourAPI ${endpoint} 호출 실패: ${res.status}`);
  }

  const json = await res.json();
  const body = json?.response?.body;
  if (!body) return [];

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

export async function detailIntro(params: {
  contentId: string;
  contentTypeId: number;
}): Promise<DetailIntroItem | null> {
  const items = await callTourApi<DetailIntroItem>('detailIntro2', {
    contentId: params.contentId,
    contentTypeId: params.contentTypeId,
  });
  return items[0] ?? null;
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

/** YYYYMMDD 포맷 */
export function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** 이번 주말 (다가오는 토·일) 날짜 계산 */
export function getNextWeekend(): { saturday: Date; sunday: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=일 ... 6=토
  const daysUntilSat = (6 - day + 7) % 7 || 7; // 토요일이면 다음주

  // 금요일 이전이면 이번 주말, 토/일이면 오늘~내일
  const sat = new Date(now);
  if (day === 6) {
    // 토요일 → 오늘이 토요일
    sat.setDate(now.getDate());
  } else if (day === 0) {
    // 일요일 → 어제가 토요일
    sat.setDate(now.getDate() - 1);
  } else {
    sat.setDate(now.getDate() + daysUntilSat);
  }

  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);

  return { saturday: sat, sunday: sun };
}
