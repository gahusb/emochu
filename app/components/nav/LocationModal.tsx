'use client';

import { useEffect, useState } from 'react';
import { Search, Crosshair, X } from 'lucide-react';
import { CITY_OPTIONS } from '@/lib/weekend-types';
import { useLocation, type UserLocation } from './LocationContext';

export default function LocationModal() {
  const { isModalOpen, closeModal, setLocation, recentLocations, requestGPS } = useLocation();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isModalOpen, closeModal]);

  if (!isModalOpen) return null;

  const filtered = query.trim()
    ? CITY_OPTIONS.filter((c) => c.name.includes(query.trim()))
    : CITY_OPTIONS;

  const pick = (loc: UserLocation) => {
    setLocation(loc);
    closeModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-1/40 backdrop-blur-sm flex items-end lg:items-center justify-center"
      onClick={closeModal}
    >
      <div
        className="w-full lg:max-w-md bg-surface-elevated rounded-t-2xl lg:rounded-xl border border-line shadow-[var(--shadow-raised)] max-h-[80vh] lg:max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2
            className="text-lg font-bold text-ink-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            위치 변경
          </h2>
          <button
            onClick={closeModal}
            className="text-ink-3 hover:text-ink-1 transition-colors"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-line">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="도시 이름 검색"
              className="w-full pl-10 pr-3 h-10 rounded-md border border-line bg-surface-base text-sm text-ink-1 placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* GPS */}
          <button
            onClick={() => {
              requestGPS();
              closeModal();
            }}
            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-sunken transition-colors text-left"
          >
            <Crosshair size={18} className="text-brand flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-ink-1">현재 위치 사용</p>
              <p className="text-xs text-ink-3">GPS로 자동 감지</p>
            </div>
          </button>

          {/* Recent */}
          {recentLocations.length > 0 && (
            <>
              <div className="px-5 py-2 bg-surface-sunken border-y border-line">
                <p className="text-xs font-semibold text-ink-3 uppercase tracking-wide">최근 사용</p>
              </div>
              {recentLocations.map((loc) => (
                <button
                  key={`${loc.lat}-${loc.lng}`}
                  onClick={() => pick(loc)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-sunken transition-colors text-left"
                >
                  <span className="text-sm text-ink-1">{loc.name}</span>
                </button>
              ))}
            </>
          )}

          {/* City list */}
          <div className="px-5 py-2 bg-surface-sunken border-y border-line">
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-wide">도시</p>
          </div>
          {filtered.map((c) => (
            <button
              key={c.name}
              onClick={() => pick({ lat: c.lat, lng: c.lng, name: c.name })}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-sunken transition-colors text-left"
            >
              <span className="text-sm text-ink-1">{c.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-ink-3">검색 결과 없음</p>
          )}
        </div>
      </div>
    </div>
  );
}
