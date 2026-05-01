'use client';

import { useEffect, useRef } from 'react';

interface Props {
  lat: number;
  lng: number;
  title: string;
}

export default function KakaoMiniMap({ lat, lng, title }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    function init() {
      if (!mounted || !containerRef.current) return;
      const maps = (window as any).kakao?.maps;
      if (!maps?.Map) return;
      const center = new maps.LatLng(lat, lng);
      const map = new maps.Map(containerRef.current, { center, level: 4 });
      new maps.Marker({ position: center }).setMap(map);
    }

    function tryInit() {
      const kakao = (window as any).kakao;
      if (!kakao) return;
      // autoload=false → must call kakao.maps.load() to initialize
      if (typeof kakao.maps?.load === 'function') {
        kakao.maps.load(init);
      } else {
        init();
      }
    }

    tryInit();
    // lazyOnload script may not have fired yet — retry after 1 s
    const t = setTimeout(tryInit, 1000);
    return () => { mounted = false; clearTimeout(t); };
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-video rounded-lg overflow-hidden bg-surface-sunken"
      aria-label={`${title} 위치 지도`}
      role="img"
    />
  );
}
