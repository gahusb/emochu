'use client';

import { useEffect, useState } from 'react';
import type { FestivalCard, SpotCard, WeekendWeather } from './weekend-types';

export interface HomeData {
  weather: WeekendWeather | null;
  festivals: FestivalCard[];
  spots: SpotCard[];
  loading: boolean;
}

const DEMO_WEATHER: WeekendWeather = {
  saturday: { date: '', sky: 'clear', precipitation: 'none', tempMin: 15, tempMax: 22, pop: 0, summary: '날씨 정보 준비 중' },
  sunday:   { date: '', sky: 'clear', precipitation: 'none', tempMin: 15, tempMax: 22, pop: 0, summary: '날씨 정보 준비 중' },
  recommendation: 'API 키를 설정하면 실시간 날씨를 볼 수 있어요.',
};

export function useHomeData(loc: { lat: number; lng: number } | null): HomeData {
  const [weather, setWeather] = useState<WeekendWeather | null>(DEMO_WEATHER);
  const [festivals, setFestivals] = useState<FestivalCard[]>([]);
  const [spots, setSpots] = useState<SpotCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loc) return;

    setLoading(true);
    fetch(`/api/home?lat=${loc.lat}&lng=${loc.lng}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.weather) setWeather(data.weather);
        if (data.festivals?.length > 0) setFestivals(data.festivals);
        if (data.recommended?.length > 0) setSpots(data.recommended);
      })
      .catch(() => { /* 데모 유지 */ })
      .finally(() => setLoading(false));
  }, [loc?.lat, loc?.lng]);

  return { weather, festivals, spots, loading };
}
