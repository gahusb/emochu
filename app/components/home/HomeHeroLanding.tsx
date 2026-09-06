'use client';

// 홈의 첫 화면 — 「코스를 짜드립니다」.
//
// 🔴 2026-09-04 피드백(사용자 테스트): "선택지가 너무 많아서 복잡하고, 뭘 원하는지
//    모르겠다." 앞선 버전은 첫 화면이 **조건 대시보드**였다 — 토·일 날씨 타일 두 칸,
//    기운 타일, 마감 임박 타일, 3축 카드 세 장, 축제 카드, 사이드 카드 네 장.
//    전부 사실이었지만 어느 것도 "그래서 뭘 하면 되는데?"에 답하지 않았다.
//
// 이 화면의 주장은 하나다: **이 서비스는 주말 코스를 짜준다.**
//  · 조건(날씨·기운)은 카드가 아니라 **한 줄씩** 놓는다. 판단은 이미 끝난 채로 준다.
//  · 나머지 전부보다 CTA 하나가 크다.
//  · 축제는 여기 없다 — 탭이 따로 있다.

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, ArrowRight, Sun, CloudRain, Cloud } from 'lucide-react';
import type { WeekendWeather } from '@/lib/weekend-types';
import { getCuratedHeroImage } from '@/lib/hero-image';
import {
  summarizeWeekendWeather,
  summarizeWeekendElements,
  weekendDateLabel,
} from '@/lib/weekend-summary';
import { useLocation } from '../nav/LocationContext';

interface Props {
  weather: WeekendWeather | null;
}

const TONE_ICON = { clear: Sun, mild: Cloud, wet: CloudRain } as const;

export default function HomeHeroLanding({ weather }: Props) {
  const { location } = useLocation();
  const imgSrc = getCuratedHeroImage(weather);
  // 실패를 boolean 이 아니라 **어떤 주소가 실패했는지**로 들고 있는다.
  // 날씨가 바뀌어 사진이 갈리면 저절로 다시 시도한다 — 리셋용 useEffect 가 필요 없다.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === imgSrc;

  const w = summarizeWeekendWeather(weather);
  const el = summarizeWeekendElements();
  const WeatherIcon = TONE_ICON[w.tone];

  return (
    <section
      className="relative w-full min-h-[34rem] lg:min-h-[38rem] flex items-end overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* 사진이 못 오면 그라데이션이 대신 선다 — 첫 화면이 비어 보이는 일은 없어야 한다 */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-hero-fallback-start via-hero-fallback-mid to-hero-fallback-end"
        aria-hidden="true"
      />
      {!failed && (
        <Image
          src={imgSrc}
          alt=""
          fill
          sizes="100vw"
          priority
          className="object-cover"
          onError={() => setFailedSrc(imgSrc)}
        />
      )}
      {/* 아래쪽을 무겁게 — 글자가 앉는 자리라 대비를 확보한다 */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-ink-1 via-ink-1/75 to-ink-1/20"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-7xl mx-auto px-5 lg:px-8 pt-24 pb-10 lg:pt-28 lg:pb-14">
        <p className="text-sm lg:text-base font-semibold text-white/75">
          {weekendDateLabel()} 주말 · {location?.name ?? '내 근처'}
        </p>

        <h1
          id="hero-heading"
          className="mt-2 text-[2rem] leading-[1.2] lg:text-5xl lg:leading-[1.15] font-bold text-white break-keep max-w-2xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          이번 주말 어디 갈지,<br />
          <span className="text-brand-soft">코스로 짜드릴게요</span>
        </h1>

        {/* ─── 조건 두 줄. 카드가 아니라 문장이다 ─── */}
        <dl className="mt-6 max-w-xl divide-y divide-white/15 border-y border-white/15">
          <div className="flex items-center gap-3 py-3">
            <WeatherIcon size={18} strokeWidth={1.9} className="text-white/70 flex-shrink-0" aria-hidden="true" />
            <dt className="sr-only">주말 날씨</dt>
            <dd className="text-[15px] lg:text-base text-white font-semibold break-keep">
              {w.text}
              {w.temp && <span className="text-white/60 font-medium"> · {w.temp}</span>}
            </dd>
          </div>
          <div className="flex items-center gap-3 py-3">
            <span className="text-lg leading-none flex-shrink-0 w-[18px] text-center" aria-hidden="true">{el.emoji}</span>
            <dt className="sr-only">주말의 기운</dt>
            <dd className="text-[15px] lg:text-base text-white font-semibold break-keep">
              {el.label}
              <span className="text-white/60 font-medium"> · {el.hint}</span>
            </dd>
          </div>
        </dl>

        {/* ─── 이 화면에서 제일 큰 것 ─── */}
        <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
          <Link
            href="/course"
            className="group inline-flex items-center justify-center gap-2.5 h-14 px-7 rounded-xl bg-brand text-white text-base lg:text-lg font-bold shadow-[0_8px_24px_rgba(0,0,0,0.28)] hover:bg-brand-hover transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <Sparkles size={20} strokeWidth={2} aria-hidden="true" />
            내 주말 코스 만들기
            <ArrowRight
              size={20}
              strokeWidth={2}
              className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
          <p className="text-sm text-white/70 break-keep">
            네 가지만 고르면 끝 · 무료
          </p>
        </div>

        {/* 일반 여행 앱과 뭐가 다른지 한 줄. 카드 세 장으로 벌려 놓을 이야기가 아니다 */}
        <p className="mt-6 text-xs lg:text-sm text-white/55 break-keep">
          기분 · 동반자 · 오늘의 사주 기운까지 반영해 AI가 동선을 설계해요
        </p>
      </div>
    </section>
  );
}
