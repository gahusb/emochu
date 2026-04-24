'use client';

import { useEffect, useRef } from 'react';
import type { CourseStop } from '@/lib/weekend-types';
import { getRoleInfo } from '@/lib/course-role';

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

export default function CourseMapPane({ stops, activeIndex, onMarkerClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Array<{ element: HTMLElement; position: any }>>([]);
  const readyRef = useRef(false);

  // SDK wait + initial render
  useEffect(() => {
    if (!stops.length) return;

    const checkKakao = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => {
          readyRef.current = true;
          renderMap();
        });
      } else {
        setTimeout(checkKakao, 300);
      }
    };
    checkKakao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

  function renderMap() {
    if (!mapRef.current || !stops.length) return;
    const { kakao } = window;

    // Reset markers
    markersRef.current = [];

    const bounds = new kakao.maps.LatLngBounds();
    const map = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(stops[0].latitude, stops[0].longitude),
      level: 5,
    });
    mapInstanceRef.current = map;

    // Polyline path
    if (stops.length > 1) {
      const linePath = stops.map(
        (s) => new kakao.maps.LatLng(s.latitude, s.longitude)
      );
      new kakao.maps.Polyline({
        map,
        path: linePath,
        strokeWeight: 3,
        strokeColor: '#C5532D',
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
      markersRef.current[i] = { element: el, position: pos };
    });

    map.setBounds(bounds, 60);

    map.addControl(
      new kakao.maps.ZoomControl(),
      kakao.maps.ControlPosition.RIGHT,
    );
  }

  // Active highlight
  useEffect(() => {
    if (!readyRef.current) return;
    const map = mapInstanceRef.current;
    markersRef.current.forEach((m, i) => {
      if (!m) return;
      if (i === activeIndex) {
        m.element.style.boxShadow = '0 0 0 4px rgba(197, 83, 45, 0.3)';
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
