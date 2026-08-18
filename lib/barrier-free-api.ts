// 한국관광공사 무장애 여행 정보 API (상품ID 15101897) 클라이언트.
//
// 🔴 이 파일은 KorService2(lib/tour-api.ts)와 **다른 API 상품**을 다룬다.
//    별도 활용신청이 필요하고 서비스ID·오퍼레이션이 다르므로 파일을 나눴다.
//    섞으면 lib/tour-api.ts 의 callTourApi 가 가진 "BASE_URL 은 하나" 전제가 깨진다.
//
// 원시 응답 필드명을 아는 것은 이 파일뿐이다. 나머지 코드는 BarrierFreeInfo 만 본다.
// 근거 문서: docs/tour-api-barrier-free-discovery.md 「2026-08-18 갱신」
import type { AccessibilityNeed, BarrierFreeInfo } from './weekend-types';

const BASE_URL = 'https://apis.data.go.kr/B551011/KorWithService2';
const OPERATION = 'detailWithTour2';
const TIMEOUT_MS = 8_000; // lib/weekend-ai.ts 의 enrich 가드와 같은 값

// 🔴 wheelchair 가 여기 없는 것은 실수가 아니다.
//    경복궁 실측값이 "대여가능" — 휠체어를 빌려준다는 뜻이지 휠체어로 갈 수 있다는
//    뜻이 아니다. 실제 접근성은 exit("주출입구는 경사로가 있어...")·route 에 있다.
//    커버리지 실측에서도 wheelchair 는 관광지 10곳 중 1곳뿐인 반면
//    route·exit 은 모든 타입에서 상위였다.
const GROUP_FIELDS: Record<AccessibilityNeed, readonly string[]> = {
  mobility: ['route', 'exit', 'elevator', 'restroom', 'parking', 'room', 'auditorium', 'handicapetc'],
  visual: ['braileblock', 'audioguide', 'bigprint', 'brailepromotion', 'guidesystem', 'guidehuman', 'blindhandicapetc'],
  hearing: ['signguide', 'videoguide', 'hearingroom', 'hearinghandicapetc'],
  infant: ['stroller', 'lactationroom', 'babysparechair', 'infantsfamilyetc'],
};

/** details 에는 담지만 그룹 판정에는 넣지 않는 필드. 표시할 가치는 있으나 접근 가능의 근거가 아니다. */
const DISPLAY_ONLY_FIELDS = ['wheelchair', 'publictransport', 'ticketoffice', 'promotion'] as const;

const ALL_FIELDS: readonly string[] = [
  ...Object.values(GROUP_FIELDS).flat(),
  ...DISPLAY_ONLY_FIELDS,
];

/** 값이 있는지 본다. API 는 "정보 없음"을 빈 문자열로 준다. */
function filled(raw: Record<string, unknown>, key: string): string | null {
  const v = raw[key];
  if (typeof v !== 'string' || v.trim() === '') return null;
  return v.trim();
}

export function normalizeBarrierFree(raw: Record<string, unknown>): BarrierFreeInfo {
  const details: Record<string, string> = {};
  for (const key of ALL_FIELDS) {
    const v = filled(raw, key);
    if (v !== null) details[key] = v;
  }

  const out: BarrierFreeInfo = { details };
  for (const group of Object.keys(GROUP_FIELDS) as AccessibilityNeed[]) {
    // 그룹 안에 하나라도 값이 있으면 true. 없으면 undefined(미확인) — false 는 만들지 않는다.
    if (GROUP_FIELDS[group].some((f) => filled(raw, f) !== null)) out[group] = true;
  }
  return out;
}

/**
 * 키가 없으면 null 을 준다. 던지지 않는다.
 *
 * lib/tour-api.ts 는 키가 없으면 던지는데, 거기서는 키가 없으면 서비스의 본체가
 * 동작하지 않으므로 그게 맞다. 여기는 다르다 — 무장애 정보는 부가 데이터이므로
 * 키 설정 누락이 코스 생성 전체를 죽이면 안 된다. 다른 실패(403·타임아웃)와
 * 똑같이 "미확인"으로 degrade 한다.
 */
function getServiceKey(): string | null {
  const key = process.env.TOUR_API_KEY;
  // 빈 문자열도 "없음"이다. `?? null` 로는 부족하다 — nullish 연산자는 '' 를 통과시켜서
  // `.env.local` 에 `TOUR_API_KEY=` 로 비워둔 경우 빈 키로 API 를 호출하게 된다.
  return key && key.trim() !== '' ? key : null;
}

/**
 * contentId 들의 무장애 정보를 한꺼번에 조회한다.
 *
 * 반환 Map 에 **키가 없다는 것**은 "조회 실패 또는 정보 없음"(= 미확인)을 뜻한다.
 * 빈 객체(`{details:{}}`)와 부재를 구분하지 않고 둘 다 미확인으로 다루면 되지만,
 * 호출자가 "몇 건이 실제로 확인됐는지" 세려면 부재로 남기는 편이 정직하다.
 *
 * 🔴 실패해도 던지지 않는다. 무장애 정보는 부가 데이터이지 코스 생성의 전제가 아니다.
 *    403(활용신청 미승인)·429(일 1,000건 초과)·타임아웃 전부 빈 Map 으로 degrade 한다.
 */
export async function fetchBarrierFree(
  contentIds: string[],
): Promise<Map<string, BarrierFreeInfo>> {
  const out = new Map<string, BarrierFreeInfo>();
  if (contentIds.length === 0) return out; // 호출조차 하지 않는다

  const serviceKey = getServiceKey();
  if (serviceKey === null) return out; // 설정 누락도 "미확인"으로 degrade

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const settled = await Promise.allSettled(
      contentIds.map(async (id) => {
        const url = new URL(`${BASE_URL}/${OPERATION}`);
        url.searchParams.set('serviceKey', serviceKey);
        url.searchParams.set('contentId', id);
        url.searchParams.set('MobileOS', 'ETC');
        url.searchParams.set('MobileApp', 'emochu');
        url.searchParams.set('_type', 'json');

        const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
        if (res.status !== 200) return null; // 403/429 등 — 던지지 않는다

        const json = await res.json();
        // 무장애 정보가 없는 콘텐츠는 items 자체가 없다(200 + resultCode 0000).
        // 음식점 1947036 실측. 이건 폐기 신호가 아니라 정상적인 "데이터 없음"이다.
        const item = json?.response?.body?.items?.item;
        const raw = Array.isArray(item) ? item[0] : item;
        if (!raw || typeof raw !== 'object') return null;
        return [id, normalizeBarrierFree(raw as Record<string, unknown>)] as const;
      }),
    );
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value) out.set(s.value[0], s.value[1]);
    }
  } catch {
    // 전체 실패도 빈 Map
  } finally {
    clearTimeout(timer);
  }
  return out;
}
