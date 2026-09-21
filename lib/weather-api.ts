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
  // 1,000행에서 마지막 날짜가 중간에 잘릴 수 있어 범위를 넉넉히 받는다.
  url.searchParams.set('numOfRows', '2000');
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('base_date', params.baseDate);
  url.searchParams.set('base_time', params.baseTime);
  url.searchParams.set('nx', String(params.nx));
  url.searchParams.set('ny', String(params.ny));

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(7_000) });
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
  // KST 달력 값을 UTC 게터로 읽는다. Vercel(UTC)과 국내 브라우저가 같은 발표를 조회한다.
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const hour = now.getUTCHours();

  // 현재 시각에서 가장 최근 발표된 baseTime 결정
  const BASE_TIMES = ['2300', '2000', '1700', '1400', '1100', '0800', '0500', '0200'];

  // 오늘 사용 가능한 최신 발표 시간 (발표 후 약 1시간 마진)
  let baseTime = '0200';
  const baseDay = new Date(now);
  const availableHour = hour >= 1 ? hour - 1 : 0; // 발표 후 약 1시간 마진
  const availableHHMM = `${String(availableHour).padStart(2, '0')}00`;

  for (const bt of BASE_TIMES) {
    if (bt <= availableHHMM) {
      baseTime = bt;
      break;
    }
  }

  // 새벽 0~2시면 전일 2300 사용
  if (hour < 3) {
    baseDay.setUTCDate(baseDay.getUTCDate() - 1);
    baseTime = '2300';
  }

  const baseDate = `${baseDay.getUTCFullYear()}${String(baseDay.getUTCMonth() + 1).padStart(2, '0')}${String(baseDay.getUTCDate()).padStart(2, '0')}`;

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
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = `${yesterday.getUTCFullYear()}${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}${String(yesterday.getUTCDate()).padStart(2, '0')}`;
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

  // 날짜가 존재하는 것만으로는 하루 예보가 아니다. 9/9 실측에서 일요일 00시
  // 한 시간만으로 맑음·최저=최고를 만들었다. 나들이 시간대 주요 필드의 범위를 확인한다.
  const hasDay = (date: string) => ['0900', '1200', '1800'].every(time =>
    ['SKY', 'POP', 'PTY', 'TMP'].every(category => items.some(i =>
      i.fcstDate === date && i.fcstTime === time && i.category === category &&
      i.fcstValue.trim() !== '' && Number.isFinite(Number(i.fcstValue)) &&
      (category !== 'SKY' || ['1', '3', '4'].includes(i.fcstValue)) &&
      (category !== 'PTY' || ['0', '1', '2', '3', '4'].includes(i.fcstValue)) &&
      (category !== 'POP' || (Number(i.fcstValue) >= 0 && Number(i.fcstValue) <= 100)))));
  const unknown = (date: string): DayWeather => ({
    date, sky: 'cloudy', precipitation: 'none', tempMin: 0, tempMax: 0, pop: 0,
    summary: '해당 날짜 예보 미확인', unavailable: true,
  });
  const saturday = hasDay(params.saturdayDate) ? buildDayWeather(params.saturdayDate, items) : unknown(params.saturdayDate);
  const sunday = hasDay(params.sundayDate) ? buildDayWeather(params.sundayDate, items) : unknown(params.sundayDate);
  if (saturday.unavailable || sunday.unavailable) {
    return {
      saturday, sunday,
      recommendation: saturday.unavailable && sunday.unavailable
        ? '주말 예보를 아직 확인할 수 없어요. 출발 전에 다시 확인해주세요.'
        : `${saturday.unavailable ? '토요일' : '일요일'} 예보는 미확인이에요. 확인된 날짜의 예보만 반영해요.`,
      unavailable: Boolean(saturday.unavailable && sunday.unavailable),
    };
  }

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
