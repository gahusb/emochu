// 일회성 조사 스크립트: 무장애 정보 오퍼레이션의 실제 이름·응답 필드 확인
// 실행: TOUR_API_KEY=... node scripts/probe-barrier-free.mjs [contentId]
//
// 조사 배경:
// - 최초 가설(KorService2/detailWithTour2, detailWithTour)은 HTTP 404 "API not found"로 즉시 기각됨.
// - 웹 검색 결과 "무장애 여행 정보"는 KorService2와 별도인 공공데이터포털 상품
//   "한국관광공사_무장애 여행 정보_GW"(상품ID 15101897, 서비스ID 추정 KorWithService1/2)로 확인됨.
// - 두 서비스 ID(KorWithService1 = 구버전 넘버링, KorWithService2 = GW 넘버링) 및
//   여러 오퍼레이션 후보를 모두 시도하고, 대조군(정상 키+정상 상품 / 오류 키+정상 상품 /
//   정상 키+완전 가짜 상품)과 HTTP 상태코드를 비교해 "권한 없음"과 "존재하지 않음"을 구분한다.
const BASES = [
  'https://apis.data.go.kr/B551011/KorService2',     // 기존 국문 관광정보서비스_GW (이 프로젝트가 이미 사용 중, 대조군)
  'https://apis.data.go.kr/B551011/KorWithService1',  // 무장애 여행 정보 후보 1 (구 넘버링)
  'https://apis.data.go.kr/B551011/KorWithService2',  // 무장애 여행 정보 후보 2 (GW 넘버링, KorService2와 동일 관례)
];

const KEY = process.env.TOUR_API_KEY;
const contentId = process.argv[2] ?? '126508'; // 기본값: 경복궁

if (!KEY) {
  console.error('TOUR_API_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

// 후보 오퍼레이션명 (공공데이터포털 "무장애정보" 항목 + 관찰된 넘버링 관례)
const CANDIDATES = [
  'detailWithTour2', 'detailWithTour', 'detailWithTour1',
  'areaCode1', 'areaCode2', // 실존이 확인된(=라우팅되는) 오퍼레이션과 비교용 대조군
];

function serviceLabel(base) {
  if (base.includes('KorWithService2')) return 'KorWithService2';
  if (base.includes('KorWithService1')) return 'KorWithService1';
  return 'KorService2';
}

async function probe(base, op, cid) {
  const url = new URL(`${base}/${op}`);
  url.searchParams.set('serviceKey', KEY);
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', '이모추');
  url.searchParams.set('_type', 'json');
  if (op.startsWith('areaCode')) {
    url.searchParams.set('numOfRows', '5');
  } else {
    url.searchParams.set('contentId', cid);
  }

  try {
    const res = await fetch(url.toString());
    const text = await res.text();
    console.log(`\n===== [${serviceLabel(base)}] ${op} contentId=${op.startsWith('areaCode') ? '-' : cid} (HTTP ${res.status}) =====`);
    try {
      const json = JSON.parse(text);
      const item = json?.response?.body?.items?.item;
      const first = Array.isArray(item) ? item[0] : item;
      if (first) {
        console.log('필드 목록:', Object.keys(first).join(', '));
        console.log(JSON.stringify(first, null, 2));
      } else {
        console.log('items 없음. resultCode/resultMsg:', json?.response?.header?.resultCode, json?.response?.header?.resultMsg);
      }
    } catch {
      console.log('JSON 아님:', text.slice(0, 300));
    }
  } catch (err) {
    console.log(`${op} 호출 실패:`, err.message);
  }
}

// 1) 후보 오퍼레이션 x 후보 서비스ID 전수 조사 (기본 contentId 1개)
for (const base of BASES) {
  for (const op of CANDIDATES) {
    await probe(base, op, contentId);
  }
}

// 2) 대조군: 정상 상품(KorService2) + 잘못된 키 → 401 기대
{
  const url = new URL('https://apis.data.go.kr/B551011/KorService2/areaCode2');
  url.searchParams.set('serviceKey', 'obviously-invalid-key-for-control-test');
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', '이모추');
  url.searchParams.set('_type', 'json');
  const res = await fetch(url.toString());
  console.log(`\n===== [대조군] KorService2/areaCode2 + 잘못된 키 (HTTP ${res.status}) =====`);
  console.log((await res.text()).slice(0, 200));
}

// 3) 대조군: 완전히 존재하지 않는 상품명 + 정상 키 → 라우팅 자체가 안 되는 경우의 시그니처 확인
{
  const url = new URL('https://apis.data.go.kr/B551011/TotallyBogusService9/areaCode1');
  url.searchParams.set('serviceKey', KEY);
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', '이모추');
  url.searchParams.set('_type', 'json');
  const res = await fetch(url.toString());
  console.log(`\n===== [대조군] 완전 가짜 상품명 + 정상 키 (HTTP ${res.status}) =====`);
  console.log((await res.text()).slice(0, 200));
}
