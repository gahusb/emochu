import type { WeekendWeather } from './weekend-types';
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
