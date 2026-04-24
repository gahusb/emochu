'use client';

import { useEffect, useRef } from 'react';
import type { CourseStop } from '@/lib/weekend-types';
import { getRoleInfo, BRAND_HEX } from '@/lib/course-role';

declare global {
  interface Window {
    kakao: any;
  }
}

interface Props {
  stops: CourseStop[];
  activeIndex: number | null;
  onMarkerClick: (index: number) => void;
}

const ACTIVE_RING_SHADOW = '0 0 0 4px rgba(197, 83, 45, 0.3)';

export default function CourseMapPane({ stops, activeIndex, onMarkerClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const markersRef = useRef<Array<{ element: HTMLElement; position: any }>>([]);
  const readyRef = useRef(false);

  // SDK wait + initial render (C2: cancelled flag + clearTimeout cleanup)
  useEffect(() => {
    if (!stops.length) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const checkKakao = () => {
      if (cancelled) return;
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => {
          if (!cancelled) { readyRef.current = true; renderMap(); }
        });
      } else {
        timer = setTimeout(checkKakao, 300);
      }
    };
    checkKakao();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

  // C1: cleanup on unmount
  useEffect(() => {
    return () => {
      overlaysRef.current.forEach(o => o.setMap?.(null));
      if (polylineRef.current) polylineRef.current.setMap?.(null);
    };
  }, []);

  function renderMap() {
    if (!mapRef.current || !stops.length) return;
    const { kakao } = window;

    // C1: teardown previous overlays and polyline before re-render
    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }

    // Reset markers
    markersRef.current = [];

    const bounds = new kakao.maps.LatLngBounds();

    // C1: reuse existing map instance; only create on first render
    let map: any;
    if (mapInstanceRef.current) {
      map = mapInstanceRef.current;
    } else {
      map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(stops[0].latitude, stops[0].longitude),
        level: 5,
      });
      mapInstanceRef.current = map;
      map.addControl(
        new kakao.maps.ZoomControl(),
        kakao.maps.ControlPosition.RIGHT,
      );
    }

    // Polyline path
    if (stops.length > 1) {
      const linePath = stops.map(
        (s) => new kakao.maps.LatLng(s.latitude, s.longitude)
      );
      polylineRef.current = new kakao.maps.Polyline({
        map,
        path: linePath,
        strokeWeight: 3,
        strokeColor: BRAND_HEX,
        strokeOpacity: 0.6,
        strokeStyle: 'shortdash',
      });
    }

    stops.forEach((stop, i) => {
      const pos = new kakao.maps.LatLng(stop.latitude, stop.longitude);
      bounds.extend(pos);
      const { colorHex } = getRoleInfo(stop);

      const el = document.createElement('div');
      el.style.cssText = [
        'width: 32px',
        'height: 32px',
        'border-radius: 50%',
        `background: ${colorHex}`,
        'border: 2px solid white',
        'display: flex',
        'align-items: center',
        'justify-content: center',
        'color: white',
        'font-size: 12px',
        'font-weight: bold',
        'cursor: pointer',
        'box-shadow: 0 2px 4px rgba(0,0,0,0.2)',
        'transition: transform 0.2s, box-shadow 0.2s',
      ].join('; ');
      el.textContent = String(stop.order);
      el.addEventListener('click', () => onMarkerClick(i));

      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: el,
        yAnchor: 0.5,
        xAnchor: 0.5,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
      markersRef.current[i] = { element: el, position: pos };
    });

    map.setBounds(bounds, 60);
  }

  // Active highlight
  useEffect(() => {
    if (!readyRef.current) return;
    const map = mapInstanceRef.current;
    markersRef.current.forEach((m, i) => {
      if (!m) return;
      if (i === activeIndex) {
        m.element.style.boxShadow = ACTIVE_RING_SHADOW;
        m.element.style.transform = 'scale(1.15)';
        if (map) map.panTo(m.position);
      } else {
        m.element.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        m.element.style.transform = '';
      }
    });
  }, [activeIndex]);

  if (!stops.length) return null;

  return (
    <div className="relative w-full h-full rounded-lg bg-surface-sunken border border-line overflow-hidden">
      <div
        ref={mapRef}
        className="w-full h-full min-h-[320px]"
        aria-label="코스 지도"
      />
    </div>
  );
}
