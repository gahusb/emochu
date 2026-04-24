'use client';

import Image from 'next/image';
import { MapPin } from 'lucide-react';
import type { SpotCard as SpotCardType } from '@/lib/weekend-types';
import FacilityBadges from './FacilityBadges';
import Badge from './ui/Badge';

interface Props {
  spot: SpotCardType;
}

type BadgeVariant = 'brand' | 'mocha' | 'success' | 'warning' | 'outline';

interface CategoryMeta {
  label: string;
  variant: BadgeVariant;
}

// TourAPI cat2 코드를 한글 라벨 + 토큰 variant로 매핑
const CAT2_META: Record<string, CategoryMeta> = {
  // 자연 (A01)
  A0101: { label: '자연', variant: 'success' },
  A0102: { label: '관광지', variant: 'success' },
  // 인문 (A02)
  A0201: { label: '역사', variant: 'mocha' },
  A0202: { label: '체험', variant: 'mocha' },
  A0203: { label: '체험', variant: 'mocha' },
  A0204: { label: '산업', variant: 'mocha' },
  A0205: { label: '문화', variant: 'mocha' },
  A0206: { label: '공연', variant: 'mocha' },
  A0207: { label: '축제', variant: 'brand' },
  A0208: { label: '행사', variant: 'brand' },
  // 레포츠 (A03)
  A0301: { label: '육상레포츠', variant: 'brand' },
  A0302: { label: '수상레포츠', variant: 'brand' },
  A0303: { label: '항공레포츠', variant: 'brand' },
  A0304: { label: '복합레포츠', variant: 'brand' },
  // 쇼핑 (A04)
  A0401: { label: '쇼핑', variant: 'mocha' },
  // 음식 (A05)
  A0502: { label: '맛집', variant: 'warning' },
};

function getCategoryMeta(cat2: string): CategoryMeta {
  return CAT2_META[cat2] ?? { label: '관광', variant: 'outline' };
}

export default function SpotCard({ spot }: Props) {
  const meta = getCategoryMeta(spot.cat2);

  return (
    <article className="group bg-surface-elevated rounded-xl border border-line overflow-hidden hover:shadow-[var(--shadow-raised)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
      <div className="relative aspect-[4/3] bg-surface-sunken overflow-hidden">
        {spot.firstImage ? (
          <Image
            src={spot.firstImage}
            alt={spot.title}
            fill
            sizes="(max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized={spot.firstImage.startsWith('http://')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-4">
            <MapPin size={32} strokeWidth={1.4} />
          </div>
        )}

        <div className="absolute top-3 left-3">
          <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
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
            <FacilityBadges facilities={spot.facilities} />
          </div>
        )}
        <p className="text-xs text-ink-4 mt-2 truncate">
          {spot.addr1}
        </p>
      </div>
    </article>
  );
}
