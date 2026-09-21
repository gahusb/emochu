import type { DayWeather, Duration, VisitDay, WeekendWeather } from './weekend-types';

/** 예전 전체 실패 플래그와 새로운 날짜별 실패 플래그를 함께 지원한다. */
export function hasForecast(weather: WeekendWeather, day: DayWeather): boolean {
  return !weather.unavailable && !day.unavailable;
}

export function selectedForecasts(weather: WeekendWeather, duration: Duration, visitDay?: VisitDay): DayWeather[] {
  return duration === 'overnight' ? [weather.saturday, weather.sunday]
    : [visitDay === 'sun' ? weather.sunday : weather.saturday];
}
