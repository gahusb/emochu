import type { WeekendWeather } from './weekend-types';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export function getSeason(date: Date = new Date()): Season {
  const m = date.getMonth() + 1; // 1~12
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

export function getHeroCopy(weather: WeekendWeather | null, date: Date = new Date()): string {
  const season = getSeason(date);
  const sat = weather?.saturday;
  const sun = weather?.sunday;

  const hasRain = sat?.precipitation === 'rain' || sun?.precipitation === 'rain' ||
                  sat?.precipitation === 'mixed' || sun?.precipitation === 'mixed';
  const hasSnow = sat?.precipitation === 'snow' || sun?.precipitation === 'snow';
  const allClear = sat?.sky === 'clear' && sun?.sky === 'clear';

  if (hasSnow) return '이번 주말, 눈 내리는 풍경 보러 갈까요?';
  if (hasRain) return '이번 주말, 비 와도 좋은 곳 찾아드릴게요';
  if (allClear) {
    if (season === 'summer') return '이번 주말, 시원한 곳으로 떠나볼까요?';
    if (season === 'winter') return '이번 주말, 따뜻한 풍경 보러 갈까요?';
    return '이번 주말, 햇살 따라 어디로 떠나볼까요?';
  }
  return '이번 주말, 어디로 떠나볼까요?';
}

export function getWeekendLabel(date: Date = new Date()): string {
  const day = date.getDay();
  const satOffset = day === 6 ? 0 : day === 0 ? -1 : 6 - day;
  const sat = new Date(date);
  sat.setDate(date.getDate() + satOffset);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return `${sat.getMonth() + 1}월 ${sat.getDate()}~${sun.getDate()}일`;
}
