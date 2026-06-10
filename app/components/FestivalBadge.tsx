'use client';

import Image from 'next/image';
import { CalendarDays, MapPin } from 'lucide-react';
import type { FestivalCard } from '@/lib/weekend-types';
import Badge from './ui/Badge';

interface Props {
  festival: FestivalCard;
}

export default function FestivalBadge({ festival }: Props) {
  const dDayBadge = festival.urgencyTag
    ? { variant: 'brand' as const, label: festival.urgencyTag }
    : festival.dDay !== undefined && festival.dDay <= 7
      ? {
          variant: 'warning' as const,
          label: festival.dDay === 0 ? 'D-DAY' : `D-${festival.dDay}`,
        }
      : null;

  return (
    <article className="group flex-shrink-0 w-64 lg:w-72 bg-surface-elevated rounded-xl border border-line overflow-hidden hover:shadow-[var(--shadow-raised)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
      {/* ─── 이미지 영역 ─── */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {festival.firstImage ? (
          <Image
            src={festival.firstImage}
            alt={festival.title}
            fill
            sizes="(max-width: 1024px) 256px, 288px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized={festival.firstImage.startsWith('http://')}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-700 via-amber-600 to-yellow-400 flex items-center justify-center">
            <span className="text-4xl opacity-70 select-none" aria-hidden="true">🎉</span>
          </div>
        )}

        {/* 하단 그라디언트 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

        {/* D-day 뱃지 (상단 좌) */}
        {dDayBadge && (
          <div className="absolute top-3 left-3">
            <Badge variant={dDayBadge.variant} size="md">
              {dDayBadge.label}
            </Badge>
          </div>
        )}

        {/* 축제명 + AI 요약 — 이미지 위 하단 */}
        <div className="absolute bottom-0 inset-x-0 px-3 pb-3">
          <h3 className="text-white text-sm font-bold leading-snug line-clamp-2 break-keep drop-shadow-md">
            {festival.title}
          </h3>
          {festival.aiSummary && (
            <p className="text-white/85 text-[11px] mt-0.5 line-clamp-1 leading-snug drop-shadow-sm">
              {festival.aiSummary}
            </p>
          )}
        </div>
      </div>

      {/* ─── 텍스트 영역 ─── */}
      <div className="px-3 py-2.5">
        <p className="text-xs text-ink-3 flex items-center gap-1.5">
          <CalendarDays size={12} className="flex-shrink-0 text-brand" aria-hidden="true" />
          <span className="truncate">
            {festival.eventStart}
            {festival.eventEnd && festival.eventEnd !== festival.eventStart
              ? ` ~ ${festival.eventEnd}`
              : ''}
          </span>
          {festival.distanceKm !== undefined && (
            <span className="ml-auto flex-shrink-0 text-ink-4">
              {festival.distanceKm < 1
                ? `${Math.round(festival.distanceKm * 1000)}m`
                : `${festival.distanceKm.toFixed(1)}km`}
            </span>
          )}
        </p>
        <p className="text-xs text-ink-4 mt-1 flex items-center gap-1 truncate">
          <MapPin size={10} className="flex-shrink-0" aria-hidden="true" />
          {festival.addr1}
        </p>
      </div>
    </article>
  );
}
