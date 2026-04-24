'use client';

import { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';

interface Props {
  images: string[];
  alt: string;
  height?: string; // Tailwind height class (e.g., "h-36", "h-48")
  priority?: boolean; // 첫 이미지에 priority 적용
  sizes?: string;
}

export default function ImageGallery({
  images,
  alt,
  height = 'h-36',
  priority = false,
  sizes = '100vw',
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    setActiveIndex(index);
  }, []);

  // 빈 / 단일
  if (images.length <= 1) {
    const src = images[0];
    return (
      <div className={`relative ${height} overflow-hidden bg-surface-sunken`}>
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            className="object-cover"
            unoptimized={src.startsWith('http://')}
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff size={28} strokeWidth={1.5} className="text-ink-4" aria-hidden="true" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative ${height} overflow-hidden bg-surface-sunken`}
      role="region"
      aria-roledescription="image carousel"
      aria-label={alt}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {images.map((src, i) => (
          <div key={i} className="flex-shrink-0 w-full h-full snap-center relative">
            <Image
              src={src}
              alt={`${alt} ${i + 1} / ${images.length}`}
              fill
              sizes={sizes}
              className="object-cover"
              unoptimized={src.startsWith('http://')}
              priority={priority && i === 0}
              loading={priority && i === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>
      {/* 인디케이터 도트 */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1" aria-hidden="true">
        {images.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? 'bg-white w-3' : 'bg-white/50 w-1.5'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
