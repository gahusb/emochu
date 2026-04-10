'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { FestivalCard, SpotCard as SpotCardType, WeekendWeather } from '@/lib/weekend-types';
import WeekendHeader from './WeekendHeader';
import BottomTabBar from './BottomTabBar';
import WeatherBar from './WeatherBar';
import FestivalBadge from './FestivalBadge';
import SpotCard from './SpotCard';
import SpotDetailModal from './SpotDetailModal';

// ─── 데모 데이터 (API 키 미설정 시 폴백) ───

const DEMO_WEATHER: WeekendWeather = {
  saturday: { date: '', sky: 'clear', precipitation: 'none', tempMin: 15, tempMax: 22, pop: 0, summary: '날씨 정보 준비 중' },
  sunday:   { date: '', sky: 'clear', precipitation: 'none', tempMin: 15, tempMax: 22, pop: 0, summary: '날씨 정보 준비 중' },
  recommendation: 'API 키를 설정하면 실시간 날씨를 볼 수 있어요.',
};

// ─── 메인 컴포넌트 ───

export default function WeekendHome() {
  const [locationName, setLocationName] = useState('위치 설정');
  const [festivals, setFestivals] = useState<FestivalCard[]>([]);
  const [spots, setSpots] = useState<SpotCardType[]>([]);
  const [weather, setWeather] = useState<WeekendWeather>(DEMO_WEATHER);
  const [mounted, setMounted] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  // GPS 위치 가져오기
  useEffect(() => {
    setMounted(true);
    if (!navigator.geolocation) {
      setUserLoc({ lat: 37.5665, lng: 126.9780 });
      setLocationName('서울');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationName('내 근처');
      },
      () => {
        setUserLoc({ lat: 37.5665, lng: 126.9780 });
        setLocationName('서울');
      },
      { timeout: 5000 },
    );
  }, []);

  // 위치 확보 후 홈 데이터 fetch
  useEffect(() => {
    if (!userLoc) return;

    fetch(`/api/home?lat=${userLoc.lat}&lng=${userLoc.lng}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        if (data.weather) setWeather(data.weather);
        if (data.festivals?.length > 0) setFestivals(data.festivals);
        if (data.recommended?.length > 0) setSpots(data.recommended);
      })
      .catch(() => { /* 데모 데이터 유지 */ });
  }, [userLoc]);

  // 이번 주말 날짜
  const now = new Date();
  const day = now.getDay();
  const satOffset = day === 6 ? 0 : day === 0 ? -1 : 6 - day;
  const sat = new Date(now);
  sat.setDate(now.getDate() + satOffset);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  const weekendLabel = `${sat.getMonth() + 1}월 ${sat.getDate()}~${sun.getDate()}일`;

  return (
    <>
      <WeekendHeader
        locationName={locationName}
        onLocationClick={() => {/* TODO: 위치 설정 모달 */}}
      />

      <div className="max-w-lg mx-auto px-5 pt-16 pb-24">
        {/* ─── Hero ─── */}
        <section className={`pt-5 pb-2 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-sm font-semibold text-orange-400">{weekendLabel} {locationName}</p>
          <h1 className="text-[28px] font-black text-slate-800 leading-tight mt-1 break-keep" style={{ fontFamily: "'CookieRun', sans-serif" }}>
            이번 주말,<br />뭐하지?
          </h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed break-keep">
            근처 축제부터 AI 맞춤 코스까지 한 눈에 확인하세요
          </p>
        </section>

        {/* ─── 날씨 ─── */}
        <section className={`mt-5 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <WeatherBar weather={weather} />
        </section>

        {/* ─── AI 코스 CTA ─── */}
        <section className={`mt-6 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Link
            href="/course"
            className="block relative bg-gradient-to-br from-orange-400 via-pink-400 to-violet-400 rounded-3xl p-5 hover:shadow-xl hover:shadow-orange-200/50 hover:-translate-y-0.5 transition-all duration-500 group overflow-hidden"
          >
            {/* 배경 장식 */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xl">✨</span>
                  <h2 className="text-lg font-black text-white">코스 만들어줘!</h2>
                </div>
                <p className="text-white/80 text-sm font-medium break-keep">
                  3가지만 골라봐요, AI가 10초 만에 코스 완성!
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </div>
          </Link>
        </section>

        {/* ─── 축제 ─── */}
        <section className={`mt-8 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-1.5">
              🎉 이번 주말 근처 축제
            </h2>
            <Link
              href="/festival"
              className="text-xs font-semibold text-orange-400 hover:text-orange-600 transition-colors"
            >
              더보기 →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {festivals.map((f) => (
              <div key={f.contentId} className="snap-start" onClick={() => setSelectedContentId(f.contentId)}>
                <FestivalBadge festival={f} />
              </div>
            ))}
          </div>
        </section>

        {/* ─── 추천 관광지 ─── */}
        <section className={`mt-6 transition-all duration-700 delay-[400ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-base font-black text-slate-800 mb-3 flex items-center gap-1.5">
            🌿 지금 가면 좋은 곳
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {spots.map((s) => (
              <div key={s.contentId} onClick={() => setSelectedContentId(s.contentId)}>
                <SpotCard spot={s} />
              </div>
            ))}
          </div>
        </section>

        {/* ─── 서비스 소개 ─── */}
        <section className={`mt-8 mb-4 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-white rounded-3xl p-5 text-center shadow-sm border border-orange-50">
            <p className="text-lg">🧳</p>
            <p className="text-sm text-slate-600 leading-relaxed break-keep mt-2">
              <strong className="text-orange-500">이모추!</strong>는 한국관광공사 TourAPI와
              AI를 활용해 매주 새로운 주말 나들이 코스를 추천해요.
            </p>
            <p className="text-[10px] text-slate-400 mt-3">
              2026 관광데이터 활용 공모전 출품작
            </p>
          </div>
        </section>
      </div>

      <BottomTabBar />

      <SpotDetailModal
        contentId={selectedContentId}
        onClose={() => setSelectedContentId(null)}
      />
    </>
  );
}
