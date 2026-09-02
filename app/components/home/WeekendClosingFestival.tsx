'use client';

// 「이번 주말이 마지막」 — 지금 아니면 못 가는 것.
//
// 🔑 근거가 있는 것에만 급함을 붙인다. eventEnd 가 실제로 이번 주말 안에 있는 축제만
//    여기 온다. D-day 를 남발하면 신뢰가 깎이고, 그러면 진짜 마감도 안 믿게 된다.

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { FestivalCard } from '@/lib/weekend-types';

interface Props {
  festivals: FestivalCard[];
}

/** 이번 주말 안에 끝나는 축제 중 가장 임박한 것. 없으면 섹션 자체를 띄우지 않는다. */
export function pickClosing(festivals: FestivalCard[]): FestivalCard | null {
  const closing = festivals
    .filter((f) => typeof f.dDay === 'number' && f.dDay >= 0 && f.dDay <= 7)
    .sort((a, b) => (a.dDay ?? 99) - (b.dDay ?? 99));
  return closing[0] ?? null;
}

export default function WeekendClosingFestival({ festivals }: Props) {
  const festival = pickClosing(festivals);
  if (!festival) return null;

  const dDay = festival.dDay ?? 0;
  const dLabel = dDay === 0 ? '오늘 종료' : `D-${dDay}`;

  return (
    <section aria-labelledby="closing-heading">
      <h2
        id="closing-heading"
        className="text-lg lg:text-xl font-bold text-ink-1 mb-3 break-keep"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        이번 주말이 마지막
      </h2>

      <Link
        href={`/spot/${festival.contentId}`}
        className="group relative block rounded-xl overflow-hidden h-44 lg:h-52"
      >
        {festival.firstImage ? (
          <Image
            src={festival.firstImage}
            alt=""
            fill
            sizes="(min-width: 1024px) 800px, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-warning via-brand to-mocha" aria-hidden="true" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-1/85 via-ink-1/25 to-transparent" />

        <span className="absolute top-3 left-3 inline-flex items-center h-7 px-3 rounded-full bg-brand text-white text-xs font-bold">
          {dLabel} · {festival.eventEnd ? '종료 임박' : '이번 주말까지'}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-lg lg:text-xl font-bold text-white break-keep">{festival.title}</p>
          {festival.aiSummary && (
            <p className="text-sm text-white/85 mt-1 break-keep line-clamp-2">{festival.aiSummary}</p>
          )}
          <p className="inline-flex items-center gap-1 text-sm font-semibold text-white/90 mt-2">
            자세히 보기
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </p>
        </div>
      </Link>
    </section>
  );
}
