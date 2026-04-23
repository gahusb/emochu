'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { SpotCard, WeekendWeather } from '@/lib/weekend-types';
import { getHeroCopy, getWeekendLabel } from '@/lib/hero-copy';
import { getCuratedHeroImage, pickHeroFromSpots } from '@/lib/hero-image';
import { useLocation } from '../nav/LocationContext';

interface Props {
  weather: WeekendWeather | null;
  spots: SpotCard[];
}

export default function HomeHero({ weather, spots }: Props) {
  const { location } = useLocation();
  const [imgSrc, setImgSrc] = useState<string>(() => getCuratedHeroImage(weather));
  const [tried, setTried] = useState<Set<string>>(new Set());

  useEffect(() => {
    const candidate = pickHeroFromSpots(spots);
    if (candidate && !tried.has(candidate)) {
      setImgSrc(candidate);
    } else {
      setImgSrc(getCuratedHeroImage(weather));
    }
  }, [spots, weather, tried]);

  const handleError = () => {
    setTried((prev) => new Set(prev).add(imgSrc));
    setImgSrc(getCuratedHeroImage(weather));
  };

  const copy = getHeroCopy(weather);
  const weekendLabel = getWeekendLabel();
  const locationLabel = location?.name ?? '내 근처';

  return (
    <section className="relative w-full h-[50vh] lg:h-[60vh] min-h-[420px] overflow-hidden">
      <Image
        src={imgSrc}
        alt="이번 주말의 풍경"
        fill
        priority
        sizes="100vw"
        className="object-cover"
        onError={handleError}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-1/70 via-ink-1/20 to-transparent" />

      <div className="absolute inset-x-0 bottom-0">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pb-8 lg:pb-12">
          <p className="text-sm lg:text-base font-semibold text-white/80 mb-2">
            {weekendLabel} · {locationLabel}
          </p>
          <h1
            className="text-3xl lg:text-5xl font-bold text-white leading-tight break-keep max-w-2xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {copy}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link
              href="/course"
              className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-brand text-white font-semibold hover:bg-brand-hover transition-colors"
            >
              <Sparkles size={18} strokeWidth={2} />
              <span>AI 코스 만들기</span>
            </Link>
            <a
              href="#recommended"
              className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-white/15 backdrop-blur text-white font-semibold border border-white/30 hover:bg-white/25 transition-colors"
            >
              <span>추천 둘러보기</span>
              <ArrowRight size={18} strokeWidth={2} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
