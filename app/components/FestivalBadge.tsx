'use client';

import { MapPin } from 'lucide-react';
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
      <div className="relative aspect-[16/10] bg-surface-sunken overflow-hidden">
        {festival.firstImage ? (
          <img
            src={festival.firstImage}
            alt={festival.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-4">
            <MapPin size={32} strokeWidth={1.4} />
          </div>
        )}
        {dDayBadge && (
          <div className="absolute top-3 left-3">
            <Badge variant={dDayBadge.variant} size="md">
              {dDayBadge.label}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-ink-1 line-clamp-1 leading-snug break-keep">
          {festival.title}
        </h3>
        {festival.aiSummary && (
          <p className="text-sm text-ink-3 mt-1.5 line-clamp-2 leading-relaxed break-keep">
            {festival.aiSummary}
          </p>
        )}
        <p className="text-xs text-ink-4 mt-3 flex items-center gap-1 truncate">
          <MapPin size={12} className="flex-shrink-0" />
          {festival.addr1}
        </p>
      </div>
    </article>
  );
}
