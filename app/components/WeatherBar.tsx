'use client';

import type { WeekendWeather, DayWeather } from '@/lib/weekend-types';

interface Props {
  weather: WeekendWeather;
}

function getSkyVisual(day: DayWeather): { emoji: string; bg: string } {
  if (day.precipitation === 'rain') return { emoji: '🌧', bg: 'from-blue-100 to-blue-50' };
  if (day.precipitation === 'snow') return { emoji: '🌨', bg: 'from-indigo-100 to-indigo-50' };
  if (day.sky === 'clear') return { emoji: '☀️', bg: 'from-amber-100 to-yellow-50' };
  if (day.sky === 'cloudy') return { emoji: '⛅', bg: 'from-slate-100 to-slate-50' };
  return { emoji: '☁️', bg: 'from-slate-200 to-slate-100' };
}

function getWeatherAnimation(sky: string, precip: string): string {
  if (precip === 'rain' || precip === 'mixed' || precip === 'snow') return 'weather-rain';
  if (sky === 'clear') return 'weather-sun';
  return 'weather-cloud';
}

function DayCard({ label, day }: { label: string; day: DayWeather }) {
  const { emoji, bg } = getSkyVisual(day);
  const animClass = getWeatherAnimation(day.sky, day.precipitation);

  return (
    <div className={`flex-1 bg-gradient-to-br ${bg} rounded-2xl p-3.5 relative overflow-hidden`}>
      <span className={`text-3xl absolute -right-1 -top-1 opacity-40 rotate-12 ${animClass}`}>{emoji}</span>
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-slate-700 mt-0.5">{day.tempMax}°</p>
      <p className="text-xs text-slate-500 mt-0.5">
        {day.tempMin}° ~ {day.tempMax}°
      </p>
      {day.pop > 20 && (
        <p className="text-[10px] text-blue-500 font-bold mt-1">
          💧 {day.pop}%
        </p>
      )}
    </div>
  );
}

export default function WeatherBar({ weather }: Props) {
  return (
    <div className="space-y-2.5">
      <div className="flex gap-2.5">
        <DayCard label="토요일" day={weather.saturday} />
        <DayCard label="일요일" day={weather.sunday} />
      </div>
      <div className="bg-orange-50 rounded-xl px-4 py-2.5 border border-orange-100">
        <p className="text-xs font-semibold text-orange-600 break-keep">
          {weather.recommendation}
        </p>
      </div>
    </div>
  );
}
