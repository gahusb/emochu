'use client';

import { useEffect, useRef, useState } from 'react';
import type { CourseStop } from '@/lib/weekend-types';

declare global {
  interface Window {
    kakao: any;
  }
}

const STOP_MARKER_COLORS = [
  '#f97316', // orange
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
];

interface Props {
  stops: CourseStop[];
}

export default function CourseMap({ stops }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // 카카오맵 SDK 로드 대기
  useEffect(() => {
    if (!stops.length) return;

    const checkKakao = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => setMapReady(true));
      } else {
        setTimeout(checkKakao, 300);
      }
    };
    checkKakao();
  }, [stops]);

  // 지도 렌더링
  useEffect(() => {
    if (!mapReady || !mapRef.current || !stops.length) return;

    const { kakao } = window;
    const bounds = new kakao.maps.LatLngBounds();

    const map = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(stops[0].latitude, stops[0].longitude),
      level: 5,
    });

    // 마커 + 커스텀 오버레이
    stops.forEach((stop, i) => {
      const position = new kakao.maps.LatLng(stop.latitude, stop.longitude);
      bounds.extend(position);

      // 번호 마커 오버레이
      const color = STOP_MARKER_COLORS[i % STOP_MARKER_COLORS.length];
      const content = document.createElement('div');
      content.innerHTML = `
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          background: white;
          border: 2px solid ${color};
          border-radius: 24px;
          padding: 4px 10px 4px 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          font-family: 'Pretendard', system-ui;
          cursor: pointer;
          transform: translate(-50%, -100%);
          white-space: nowrap;
        ">
          <div style="
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: ${color};
            color: white;
            font-size: 12px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
          ">${stop.order}</div>
          <span style="font-size: 12px; font-weight: 700; color: #1e293b;">${stop.title.length > 8 ? stop.title.slice(0, 8) + '…' : stop.title}</span>
        </div>
        <div style="
          position: absolute;
          left: 50%;
          bottom: -8px;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${color};
        "></div>
      `;

      new kakao.maps.CustomOverlay({
        map,
        position,
        content,
        yAnchor: 1.3,
      });
    });

    // 경로선 (Polyline)
    if (stops.length > 1) {
      const linePath = stops.map(
        s => new kakao.maps.LatLng(s.latitude, s.longitude)
      );

      new kakao.maps.Polyline({
        map,
        path: linePath,
        strokeWeight: 4,
        strokeColor: '#f97316',
        strokeOpacity: 0.7,
        strokeStyle: 'shortdash',
      });
    }

    // 모든 마커가 보이도록 bounds 설정
    map.setBounds(bounds, 60);

    // 지도 컨트롤
    map.addControl(
      new kakao.maps.ZoomControl(),
      kakao.maps.ControlPosition.RIGHT,
    );
  }, [mapReady, stops, expanded]);

  if (!stops.length) return null;

  // SDK 미설정 시 정적 미리보기
  if (typeof window !== 'undefined' && !window.kakao?.maps && !mapReady) {
    return (
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-orange-50">
        <div className="relative h-48 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
          <div className="text-center">
            <span className="text-3xl">🗺️</span>
            <p className="text-xs text-slate-400 mt-2">카카오맵 SDK 로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-orange-50">
      {/* 지도 영역 */}
      <div
        ref={mapRef}
        className={`w-full transition-all duration-500 ${expanded ? 'h-80' : 'h-48'}`}
      />

      {/* 지도 확대/축소 + 전체보기 버튼 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-orange-50">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
          {expanded ? '지도 접기' : '지도 펼치기'}
        </button>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          {stops.map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: STOP_MARKER_COLORS[i % STOP_MARKER_COLORS.length], fontSize: '8px' }}
            >
              {i + 1}
            </div>
          ))}
          <span className="ml-1">경유 순서</span>
        </div>
      </div>
    </div>
  );
}
