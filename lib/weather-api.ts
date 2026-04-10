// ============================================================
// 기상청 단기예보 API 클라이언트
// ============================================================

import type { DayWeather, WeekendWeather } from './weekend-types';

const BASE_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';

function getServiceKey(): string {
  const key = process.env.WEATHER_API_KEY;
  if (!key) throw new Error('WEATHER_API_KEY 환경변수가 설정되지 않았습니다.');
  return key;
}

// ─── GPS → 기상청 격자 좌표 변환 ───
// 기상청 격자 좌표계 변환 공식 (Lambert Conformal Conic)

interface GridCoord {
  nx: number;
  ny: number;
}

export function gpsToGrid(lat: number, lng: number): GridCoord {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}

// ─── 단기예보 호출 ───

interface FcstItem {
  baseDate: string;
  baseTime: string;
  fcstDate: string;
  fcstTime: string;
  category: string;
  fcstValue: string;
}

async function getVilageFcst(params: {
  nx: number;
  ny: number;
  baseDate: string;
  baseTime: string;
}): Promise<FcstItem[]> {
  const url = new URL(`${BASE_URL}/getVilageFcst`);
  url.searchParams.set('serviceKey', getServiceKey());
  url.searchParams.set('dataType', 'JSON');
  url.searchParams.set('numOfRows', '1000');
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('base_date', params.baseDate);
  url.searchParams.set('base_time', params.baseTime);
  url.searchParams.set('nx', String(params.nx));
  url.searchParams.set('ny', String(params.ny));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`기상청 API 호출 실패: ${res.status}`);

  const json = await res.json();
  const items = json?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

// ─── 주말 날씨 조회 ───

function parseSky(value: string): DayWeather['sky'] {
  switch (value) {
    case '1': return 'clear';
    case '3': return 'cloudy';
    case '4': return 'overcast';
    default: return 'cloudy';
  }
}

function parsePrecipitation(value: string): DayWeather['precipitation'] {
  switch (value) {
    case '0': return 'none';
    case '1': return 'rain';
    case '2': return 'mixed';
    case '3': return 'snow';
    case '4': return 'rain'; // 소나기
    default: return 'none';
  }
}

function buildDayWeather(date: string, items: FcstItem[]): DayWeather {
  const dayItems = items.filter(i => i.fcstDate === date);

  // 하늘 상태 (12시 기준)
  const sky12 = dayItems.find(i => i.category === 'SKY' && i.fcstTime === '1200');
  const sky = parseSky(sky12?.fcstValue ?? '1');

  // 강수 형태
  const ptyItems = dayItems.filter(i => i.category === 'PTY');
  const hasRain = ptyItems.some(i => i.fcstValue !== '0');
  const ptyValue = hasRain
    ? ptyItems.find(i => i.fcstValue !== '0')?.fcstValue ?? '0'
    : '0';
  const precipitation = parsePrecipitation(ptyValue);

  // 기온 — TMN(일 최저), TMX(일 최고) 우선, 없으면 TMP(시간별) 사용
  const tmnItem = dayItems.find(i => i.category === 'TMN');
  const tmxItem = dayItems.find(i => i.category === 'TMX');
  const tmpItems = dayItems.filter(i => i.category === 'TMP').map(i => Number(i.fcstValue));

  const tempMin = tmnItem ? Number(tmnItem.fcstValue)
    : tmpItems.length > 0 ? Math.min(...tmpItems) : 0;
  const tempMax = tmxItem ? Number(tmxItem.fcstValue)
    : tmpItems.length > 0 ? Math.max(...tmpItems) : 0;

  // 강수확률
  const popItems = dayItems.filter(i => i.category === 'POP').map(i => Number(i.fcstValue));
  const pop = popItems.length > 0 ? Math.max(...popItems) : 0;

  // 요약 생성
  const skyText = sky === 'clear' ? '맑음' : sky === 'cloudy' ? '구름많음' : '흐림';
  const precText = precipitation === 'rain' ? ', 비' : precipitation === 'snow' ? ', 눈' : '';
  const summary = `${skyText}${precText}, ${tempMin}~${tempMax}°C`;

  return { date, sky, precipitation, tempMin, tempMax, pop, summary };
}

export async function getWeekendForecast(params: {
  lat: number;
  lng: number;
  saturdayDate: string;  // YYYYMMDD
  sundayDate: string;
}): Promise<WeekendWeather> {
  const grid = gpsToGrid(params.lat, params.lng);

  // 기상청 단기예보: 02시, 05시, 08시, 11시, 14시, 17시, 20시, 23시 발표
  // 최신 발표 시각 기준으로 조회 (최대 +3일 예보)
  const now = new Date();
  const hour = now.getHours();

  // 현재 시각에서 가장 최근 발표된 baseTime 결정
  const BASE_TIMES = ['2300', '2000', '1700', '1400', '1100', '0800', '0500', '0200'];

  // 오늘 사용 가능한 최신 발표 시간 (발표 후 약 1시간 마진)
  let baseTime = '0200';
  let baseDay = new Date(now);
  const availableHour = hour >= 1 ? hour - 1 : 0; // 발표 후 약 1시간 마진
  const availableHHMM = `${String(availableHour).padStart(2, '0')}00`;

  for (const bt of BASE_TIMES) {
    if (bt <= availableHHMM) {
      baseTime = bt;
      break;
    }
  }

  // 새벽 0~2시면 전일 2300 사용
  if (hour < 2) {
    baseDay.setDate(baseDay.getDate() - 1);
    baseTime = '2300';
  }

  const baseDate = `${baseDay.getFullYear()}${String(baseDay.getMonth() + 1).padStart(2, '0')}${String(baseDay.getDate()).padStart(2, '0')}`;

  let items: FcstItem[] = [];

  // 여러 baseTime 시도 (최신 → 이전)
  const tryTimes = [baseTime, ...BASE_TIMES.filter(t => t < baseTime).slice(0, 2)];

  for (const bt of tryTimes) {
    try {
      items = await getVilageFcst({
        nx: grid.nx,
        ny: grid.ny,
        baseDate,
        baseTime: bt,
      });
      if (items.length > 0) break;
    } catch {
      continue;
    }
  }

  // 데이터 없으면 전일 2300 발표 시도
  if (items.length === 0) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, '0')}${String(yesterday.getDate()).padStart(2, '0')}`;
    try {
      items = await getVilageFcst({
        nx: grid.nx,
        ny: grid.ny,
        baseDate: yesterdayStr,
        baseTime: '2300',
      });
    } catch {
      // 최종 폴백
    }
  }

  if (items.length === 0) {
    const fallback: DayWeather = {
      date: params.saturdayDate,
      sky: 'clear',
      precipitation: 'none',
      tempMin: 15,
      tempMax: 22,
      pop: 0,
      summary: '날씨 정보 확인 중',
    };
    return {
      saturday: { ...fallback, date: params.saturdayDate },
      sunday: { ...fallback, date: params.sundayDate },
      recommendation: '날씨 정보를 불러오는 중입니다.',
    };
  }

  const saturday = buildDayWeather(params.saturdayDate, items);
  const sunday = buildDayWeather(params.sundayDate, items);

  // 추천 메시지 생성
  let recommendation: string;
  if (saturday.pop <= 30 && sunday.pop > 50) {
    recommendation = '토요일이 외출 적기예요! 일요일은 비 예보.';
  } else if (saturday.pop > 50 && sunday.pop <= 30) {
    recommendation = '일요일이 나들이하기 좋아요!';
  } else if (saturday.pop <= 30 && sunday.pop <= 30) {
    recommendation = '주말 내내 나들이 날씨! 어디든 좋아요.';
  } else {
    recommendation = '주말에 비 소식이 있어요. 실내 코스를 추천드려요.';
  }

  return { saturday, sunday, recommendation };
}
