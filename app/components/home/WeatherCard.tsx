'use client';

import { Sun, Cloud, CloudRain, CloudSnow, Droplets } from 'lucide-react';
import type { DayWeather, WeekendWeather } from '@/lib/weekend-types';
import Card from '../ui/Card';

function dayIcon(day: DayWeather) {
  if (day.precipitation === 'snow') return CloudSnow;
  if (day.precipitation === 'rain' || day.precipitation === 'mixed') return CloudRain;
  if (day.sky === 'clear') return Sun;
  return Cloud;
}

interface Props {
  weather: WeekendWeather | null;
}

export default function WeatherCard({ weather }: Props) {
  if (!weather) return null;
  const sat = weather.saturday;
  const sun = weather.sunday;
  const SatIcon = dayIcon(sat);
  const SunIcon = dayIcon(sun);

  return (
    <Card className="p-5">
      <h3
        className="text-sm font-bold text-ink-1 mb-4"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        주말 날씨
      </h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-ink-3 mb-2">토요일</p>
          <div className="flex items-center gap-2">
            <SatIcon size={28} className="text-info" strokeWidth={1.6} />
            <p className="text-2xl font-bold text-ink-1">{sat.tempMax}°</p>
          </div>
          <p className="text-xs text-ink-3 mt-1">
            {sat.tempMin}°/{sat.tempMax}°
          </p>
          {sat.pop > 20 && (
            <p className="inline-flex items-center gap-1 text-[11px] text-info font-semibold mt-1">
              <Droplets size={11} /> {sat.pop}%
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-ink-3 mb-2">일요일</p>
          <div className="flex items-center gap-2">
            <SunIcon size={28} className="text-info" strokeWidth={1.6} />
            <p className="text-2xl font-bold text-ink-1">{sun.tempMax}°</p>
          </div>
          <p className="text-xs text-ink-3 mt-1">
            {sun.tempMin}°/{sun.tempMax}°
          </p>
          {sun.pop > 20 && (
            <p className="inline-flex items-center gap-1 text-[11px] text-info font-semibold mt-1">
              <Droplets size={11} /> {sun.pop}%
            </p>
          )}
        </div>
      </div>
      {weather.recommendation && (
        <p className="text-xs text-ink-2 leading-relaxed bg-surface-sunken rounded-md px-3 py-2 break-keep">
          {weather.recommendation}
        </p>
      )}
    </Card>
  );
}
