import type { SpotCard, WeekendWeather } from './weekend-types';
import { getSeason, type Season } from './hero-copy';

const CURATED: Record<Season | 'rain' | 'snow', string> = {
  spring: '/hero/spring-clear.png',
  summer: '/hero/summer-clear.png',
  autumn: '/hero/autumn-clear.png',
  winter: '/hero/winter-clear.png',
  rain: '/hero/rain.png',
  snow: '/hero/snow.png',
};

export function getCuratedHeroImage(
  weather: WeekendWeather | null,
  date: Date = new Date(),
): string {
  const sat = weather?.saturday;
  const sun = weather?.sunday;

  if (sat?.precipitation === 'snow' || sun?.precipitation === 'snow') return CURATED.snow;
  if (
    sat?.precipitation === 'rain' || sun?.precipitation === 'rain' ||
    sat?.precipitation === 'mixed' || sun?.precipitation === 'mixed'
  ) return CURATED.rain;

  return CURATED[getSeason(date)];
}

/**
 * SpotCard 리스트에서 hero에 쓸 만한 이미지를 찾는다.
 * - firstImage가 있는 첫 번째 spot의 firstImage 반환
 * - 후보 없으면 null 반환 → 호출자가 큐레이션 폴백 사용
 */
export function pickHeroFromSpots(spots: SpotCard[]): string | null {
  for (const s of spots.slice(0, 5)) {
    if (s.firstImage) return s.firstImage;
  }
  return null;
}
