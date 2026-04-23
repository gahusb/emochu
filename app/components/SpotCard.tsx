'use client';

import { MapPin } from 'lucide-react';
import type { SpotCard as SpotCardType } from '@/lib/weekend-types';
import FacilityBadges from './FacilityBadges';
import Badge from './ui/Badge';

interface Props {
  spot: SpotCardType;
}

const CATEGORY_VARIANT: Record<string, 'brand' | 'mocha' | 'success' | 'warning' | 'outline'> = {
  '자연관광': 'success',
  '인문관광': 'mocha',
  '레포츠': 'brand',
  '음식': 'warning',
  '문화시설': 'mocha',
};

export default function SpotCard({ spot }: Props) {
  const variant = CATEGORY_VARIANT[spot.cat2] ?? 'outline';

  return (
    <article className="group bg-surface-elevated rounded-xl border border-line overflow-hidden hover:shadow-[var(--shadow-raised)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
      <div className="relative aspect-[4/3] bg-surface-sunken overflow-hidden">
        {spot.firstImage ? (
          <img
            src={spot.firstImage}
            alt={spot.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-4">
            <MapPin size={32} strokeWidth={1.4} />
          </div>
        )}

        <div className="absolute top-3 left-3">
          <Badge variant={variant} size="sm">{spot.cat2}</Badge>
        </div>

        {spot.distanceKm !== undefined && (
          <div className="absolute bottom-3 right-3 bg-surface-elevated/95 backdrop-blur text-ink-2 text-[11px] font-semibold px-2 py-0.5 rounded-md border border-line">
            {spot.distanceKm < 1
              ? `${Math.round(spot.distanceKm * 1000)}m`
              : `${spot.distanceKm.toFixed(1)}km`}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-ink-1 leading-snug line-clamp-1">
          {spot.title}
        </h3>
        {spot.whyNow && (
          <p className="text-xs text-brand font-semibold mt-1 line-clamp-1">
            {spot.whyNow}
          </p>
        )}
        <p className="text-sm text-ink-3 mt-1.5 line-clamp-2 leading-relaxed break-keep">
          {spot.reason}
        </p>
        {spot.facilities && (
          <div className="mt-2">
            <FacilityBadges facilities={spot.facilities} compact />
          </div>
        )}
        <p className="text-xs text-ink-4 mt-2 truncate">
          {spot.addr1}
        </p>
      </div>
    </article>
  );
}
