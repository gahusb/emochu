'use client';

// ⚠️ 2026-09-03 현재 홈에서 **쓰이지 않는다.**
// 홈의 기준 축을 「이번 주말」로 옮기면서 60vh 히어로를 걷어냈다 —
// 사진은 예뻤지만 접힘 위에서 '이 서비스가 나에게 뭘 해주는가'를 말하지 못했고,
// 그 자리를 WeekendConditionBar(주말 조건)가 대신한다.
//
// 지우지 않고 남긴 이유: 「감성이 사라지고 대시보드처럼 보인다」가 이 방향의 알려진 대가라,
// 사진을 일부 되살릴 가능성이 열려 있다. 되살릴 땐 HomeView 에서 다시 부르면 된다.
// (lib/hero-copy.ts · lib/hero-image.ts 도 같은 이유로 남아 있다)

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { WeekendWeather } from '@/lib/weekend-types';
import { getHeroCopy, getWeekendLabel, HERO_DIFF_TAGLINE, HERO_VALUE_LINE } from '@/lib/hero-copy';
import { getCuratedHeroImage } from '@/lib/hero-image';
import { useLocation } from '../nav/LocationContext';

interface Props {
  weather: WeekendWeather | null;
}

export default function HomeHero({ weather }: Props) {
  const { location } = useLocation();
  const [failed, setFailed] = useState(false);
  const imgSrc = getCuratedHeroImage(weather);

  useEffect(() => {
    setFailed(false);
  }, [imgSrc]);

  const copy = getHeroCopy(weather);
  const weekendLabel = getWeekendLabel();
  const locationLabel = location?.name ?? '내 근처';

  return (
    <section className="relative w-full h-[50vh] lg:h-[60vh] min-h-[420px] overflow-hidden" aria-labelledby="hero-heading">
      {/* Always-on gradient base — visible if the curated image fails to load */}
      <div className="absolute inset-0 bg-gradient-to-br from-hero-fallback-start via-hero-fallback-mid to-hero-fallback-end" aria-hidden="true" />
      {!failed && (
        <Image
          src={imgSrc}
          alt="이번 주말의 풍경"
          fill
          sizes="100vw"
          priority
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-1/70 via-ink-1/20 to-transparent" />

      <div className="absolute inset-x-0 bottom-0">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pb-8 lg:pb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur border border-white/25 px-3 py-1 text-xs lg:text-sm font-semibold text-white mb-3">
            <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
            {HERO_DIFF_TAGLINE}
          </span>
          <p className="text-sm lg:text-base font-semibold text-white/80 mb-2">
            {weekendLabel} · {locationLabel}
          </p>
          <h1
            id="hero-heading"
            className="text-3xl lg:text-5xl font-bold text-white leading-tight break-keep max-w-2xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {copy}
          </h1>
          <p className="text-sm lg:text-lg text-white/85 mt-3 max-w-xl break-keep leading-relaxed">
            {HERO_VALUE_LINE}
          </p>
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
