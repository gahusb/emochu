'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { FestivalCard } from '@/lib/weekend-types';
import WeekendHeader from './WeekendHeader';
import BottomTabBar from './BottomTabBar';
import SpotDetailModal from './SpotDetailModal';

const RADIUS_OPTIONS = [30, 50, 100, 200];

const PLACEHOLDER_COLORS = [
  'from-pink-200 to-rose-100',
  'from-violet-200 to-purple-100',
  'from-sky-200 to-blue-100',
  'from-emerald-200 to-teal-100',
  'from-amber-200 to-yellow-100',
];
const PLACEHOLDER_EMOJIS = ['🎪', '🎭', '🎵', '🎨', '🎉'];

type StatusFilter = 'all' | 'ongoing' | 'thisWeekend' | 'upcoming';
type SortKey = 'distance' | 'endingSoon' | 'newest';

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: '전체',
  ongoing: '진행 중',
  thisWeekend: '이번 주말',
  upcoming: '곧 시작',
};

const SORT_LABELS: Record<SortKey, string> = {
  distance: '가까운순',
  endingSoon: '종료임박순',
  newest: '최신순',
};

function formatDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return '';
  return `${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${dd}`;
}

// 주소에서 시/도 추출
function extractRegion(addr: string): string {
  if (!addr) return '기타';
  const match = addr.match(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/);
  return match ? match[1] : '기타';
}

export default function FestivalList() {
  const [festivals, setFestivals] = useState<FestivalCard[]>([]);
  const [weekendLabel, setWeekendLabel] = useState('');
  const [weekendDates, setWeekendDates] = useState<{ saturday: string; sunday: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(50);
  const [locationName, setLocationName] = useState('위치 설정');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('distance');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // GPS 위치
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

  // 데이터 fetch
  useEffect(() => {
    if (!userLoc) return;
    setLoading(true);

    fetch(`/api/festival?lat=${userLoc.lat}&lng=${userLoc.lng}&radius=${radius}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        setFestivals(data.festivals || []);
        if (data.weekendDates) {
          setWeekendDates(data.weekendDates);
          const sat = data.weekendDates.saturday;
          const sun = data.weekendDates.sunday;
          setWeekendLabel(`${sat.slice(4, 6)}/${sat.slice(6, 8)}~${sun.slice(6, 8)}`);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userLoc, radius]);

  // 지역 목록 (현재 데이터 기반 동적 생성)
  const availableRegions = useMemo(() => {
    const regions = new Set(festivals.map(f => extractRegion(f.addr1)));
    return ['all', ...Array.from(regions).sort()];
  }, [festivals]);

  // 필터 + 정렬 적용
  const filteredFestivals = useMemo(() => {
    const today = getTodayStr();
    const satStr = weekendDates?.saturday ?? '';
    const sunStr = weekendDates?.sunday ?? '';

    let list = [...festivals];

    // 검색어
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(f =>
        f.title.toLowerCase().includes(q) || f.addr1.toLowerCase().includes(q),
      );
    }

    // 상태 필터
    if (statusFilter === 'ongoing') {
      list = list.filter(f => f.eventStart <= today && f.eventEnd >= today);
    } else if (statusFilter === 'thisWeekend') {
      list = list.filter(f => f.eventStart <= sunStr && f.eventEnd >= satStr);
    } else if (statusFilter === 'upcoming') {
      list = list.filter(f => f.eventStart > today);
    }

    // 지역 필터
    if (regionFilter !== 'all') {
      list = list.filter(f => extractRegion(f.addr1) === regionFilter);
    }

    // 정렬
    if (sortKey === 'distance') {
      list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    } else if (sortKey === 'endingSoon') {
      list.sort((a, b) => a.eventEnd.localeCompare(b.eventEnd));
    } else if (sortKey === 'newest') {
      list.sort((a, b) => b.eventStart.localeCompare(a.eventStart));
    }

    return list;
  }, [festivals, searchQuery, statusFilter, regionFilter, sortKey, weekendDates]);

  // IntersectionObserver for fade-in animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [filteredFestivals]);

  const activeFilterCount = [
    statusFilter !== 'all',
    regionFilter !== 'all',
    sortKey !== 'distance',
  ].filter(Boolean).length;

  return (
    <>
      <WeekendHeader locationName={locationName} />

      <div className="max-w-lg mx-auto px-5 pt-16 pb-24">
        {/* 헤더 */}
        <section className={`pt-5 pb-2 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-sm font-semibold text-orange-400">{weekendLabel} {locationName}</p>
          <h1 className="text-2xl font-black text-slate-800 mt-1 break-keep">
            🎉 이번 주말 축제
          </h1>
        </section>

        {/* 검색 */}
        <section className={`mt-4 transition-all duration-700 delay-75 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="축제명 또는 지역 검색"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-300"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </section>

        {/* 필터 영역 */}
        <section className={`mt-3 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* 반경 + 필터 토글 */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 flex-1 overflow-x-auto scrollbar-hide">
              {RADIUS_OPTIONS.map(r => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex-shrink-0 ${
                    radius === r
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-orange-300 hover:text-orange-500'
                  }`}
                >
                  {r}km
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex-shrink-0 ${
                showFilters || activeFilterCount > 0
                  ? 'bg-orange-50 text-orange-600 border border-orange-200'
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              필터
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] flex items-center justify-center font-black">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* 확장 필터 패널 */}
          {showFilters && (
            <div className="mt-3 bg-white rounded-2xl border border-orange-100 p-4 animate-[fadeSlide_0.25s_ease-out]">
              {/* 상태 필터 */}
              <div className="mb-4">
                <p className="text-[11px] font-bold text-slate-400 mb-2">상태</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(STATUS_LABELS) as [StatusFilter, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        statusFilter === key
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-50 text-slate-500 hover:bg-orange-50 hover:text-orange-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 지역 필터 */}
              <div className="mb-4">
                <p className="text-[11px] font-bold text-slate-400 mb-2">지역</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableRegions.map(r => (
                    <button
                      key={r}
                      onClick={() => setRegionFilter(r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        regionFilter === r
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-50 text-slate-500 hover:bg-orange-50 hover:text-orange-500'
                      }`}
                    >
                      {r === 'all' ? '전체' : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* 정렬 */}
              <div className="mb-2">
                <p className="text-[11px] font-bold text-slate-400 mb-2">정렬</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setSortKey(key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        sortKey === key
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-50 text-slate-500 hover:bg-orange-50 hover:text-orange-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 초기화 */}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setStatusFilter('all'); setRegionFilter('all'); setSortKey('distance'); }}
                  className="mt-3 w-full py-2 rounded-xl text-xs font-bold text-orange-500 bg-orange-50 hover:bg-orange-100 transition-all"
                >
                  필터 초기화
                </button>
              )}
            </div>
          )}
        </section>

        {/* 로딩 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-400 mt-3">축제를 찾고 있어요...</p>
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && filteredFestivals.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎪</p>
            {festivals.length === 0 ? (
              <>
                <p className="text-sm text-slate-500 break-keep">
                  {radius}km 이내에 이번 주말 진행 중인 축제가 없어요.
                </p>
                <p className="text-xs text-slate-400 mt-1">반경을 넓혀 다시 찾아보세요!</p>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500 break-keep">
                  조건에 맞는 축제가 없어요.
                </p>
                <button
                  onClick={() => { setStatusFilter('all'); setRegionFilter('all'); setSearchQuery(''); }}
                  className="mt-3 text-xs text-orange-500 font-bold underline"
                >
                  필터 초기화
                </button>
              </>
            )}
          </div>
        )}

        {/* 축제 목록 */}
        {!loading && filteredFestivals.length > 0 && (
          <section className={`mt-4 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-xs text-slate-400 mb-3">
              {festivals.length !== filteredFestivals.length
                ? <>총 {festivals.length}개 중 <span className="font-bold text-orange-500">{filteredFestivals.length}</span>개</>
                : <>총 <span className="font-bold text-orange-500">{filteredFestivals.length}</span>개 축제</>
              }
            </p>
            <div className="grid grid-cols-1 gap-3">
              {filteredFestivals.map((f, i) => (
                <div
                  key={f.contentId}
                  onClick={() => setSelectedSpotId(f.contentId)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 fade-in-up cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98]"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="relative h-40 overflow-hidden">
                    {f.firstImage ? (
                      <img src={f.firstImage} alt={f.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className={`h-full bg-gradient-to-br ${PLACEHOLDER_COLORS[parseInt(f.contentId, 10) % 5]} flex items-center justify-center`}>
                        <span className="text-5xl opacity-40">{PLACEHOLDER_EMOJIS[parseInt(f.contentId, 10) % 5]}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                    {f.dDay !== undefined && f.dDay <= 7 && (
                      <span className={`absolute top-2 right-2 px-2 py-0.5 text-white text-[10px] font-black rounded-full ${
                        f.dDay <= 0 ? 'bg-red-500 badge-pulse' : f.dDay <= 3 ? 'bg-red-500' : 'bg-orange-500'
                      }`}>
                        {f.dDay <= 0 ? '오늘 마감!' : `D-${f.dDay}`}
                      </span>
                    )}

                    {f.urgencyTag && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full">
                        {f.urgencyTag}
                      </span>
                    )}

                    <div className="absolute bottom-2 left-3 right-3">
                      <h3 className="text-base font-black text-white drop-shadow-md break-keep line-clamp-1">{f.title}</h3>
                    </div>
                  </div>

                  <div className="p-3.5">
                    {f.aiSummary && (
                      <p className="text-[12px] text-orange-600 font-bold mb-1.5 line-clamp-1">✨ {f.aiSummary}</p>
                    )}
                    <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      </svg>
                      {f.addr1}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-slate-400">
                        {formatDate(f.eventStart)} ~ {formatDate(f.eventEnd)}
                      </span>
                      {f.distanceKm !== undefined && (
                        <span className="text-[10px] text-orange-400 font-bold">
                          {f.distanceKm.toFixed(1)}km
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 안내 */}
        <section className={`mt-8 mb-4 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-white rounded-2xl p-4 text-center border border-orange-50">
            <p className="text-[11px] text-slate-400 leading-relaxed break-keep">
              한국관광공사 TourAPI 데이터 기반 · 매 30분 갱신
            </p>
          </div>
        </section>
      </div>

      <BottomTabBar />

      {/* 장소 상세 모달 */}
      <SpotDetailModal
        contentId={selectedSpotId}
        onClose={() => setSelectedSpotId(null)}
      />

      <style jsx global>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
