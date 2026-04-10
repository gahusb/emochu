'use client';

import { useRef, useState, useCallback } from 'react';

interface Props {
  images: string[];
  alt: string;
  height?: string;  // Tailwind height class (e.g., "h-36", "h-48")
}

export default function ImageGallery({ images, alt, height = 'h-36' }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    setActiveIndex(index);
  }, []);

  // 이미지 1장이면 일반 렌더링
  if (images.length <= 1) {
    return (
      <div className={`relative ${height} overflow-hidden`}>
        {images[0] ? (
          <img src={images[0]} alt={alt} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className={`${height} bg-gradient-to-br from-orange-200 to-pink-200 opacity-40`} />
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${height} overflow-hidden`}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {images.map((src, i) => (
          <div key={i} className="flex-shrink-0 w-full h-full snap-center">
            <img src={src} alt={`${alt} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
      {/* 인디케이터 도트 */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {images.map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? 'bg-white w-3' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
