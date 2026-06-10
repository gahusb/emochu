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
  gradient: string;
  emoji: string;
}

const CAT2_META: Record<string, CategoryMeta> = {
  A0101: { label: '자연',       variant: 'success', gradient: 'from-green-800 via-emerald-700 to-green-500',    emoji: '🌿' },
  A0102: { label: '관광지',     variant: 'success', gradient: 'from-sky-800 via-blue-700 to-cyan-500',          emoji: '🏞️' },
  A0201: { label: '역사',       variant: 'mocha',   gradient: 'from-stone-800 via-amber-800 to-amber-600',      emoji: '🏛️' },
  A0202: { label: '체험',       variant: 'mocha',   gradient: 'from-violet-800 via-purple-700 to-indigo-500',   emoji: '🎨' },
  A0203: { label: '체험',       variant: 'mocha',   gradient: 'from-violet-800 via-purple-700 to-indigo-500',   emoji: '🎨' },
  A0204: { label: '산업',       variant: 'mocha',   gradient: 'from-slate-700 via-zinc-600 to-slate-500',       emoji: '🏭' },
  A0205: { label: '문화',       variant: 'mocha',   gradient: 'from-rose-800 via-pink-700 to-rose-500',         emoji: '🎭' },
  A0206: { label: '공연',       variant: 'mocha',   gradient: 'from-rose-800 via-pink-700 to-rose-500',         emoji: '🎶' },
  A0207: { label: '축제',       variant: 'brand',   gradient: 'from-orange-700 via-amber-600 to-yellow-500',    emoji: '🎉' },
  A0208: { label: '행사',       variant: 'brand',   gradient: 'from-orange-700 via-amber-600 to-yellow-500',    emoji: '🎪' },
  A0301: { label: '레포츠',     variant: 'brand',   gradient: 'from-teal-700 via-cyan-600 to-sky-500',          emoji: '🏄' },
  A0302: { label: '수상레포츠', variant: 'brand',   gradient: 'from-blue-700 via-sky-600 to-cyan-400',          emoji: '🚣' },
  A0303: { label: '항공레포츠', variant: 'brand',   gradient: 'from-indigo-700 via-blue-600 to-sky-400',        emoji: '🪂' },
  A0304: { label: '레포츠',     variant: 'brand',   gradient: 'from-teal-700 via-cyan-600 to-sky-500',          emoji: '⛺' },
  A0401: { label: '쇼핑',       variant: 'mocha',   gradient: 'from-pink-700 via-rose-600 to-fuchsia-500',      emoji: '🛍️' },
  A0502: { label: '맛집',       variant: 'warning', gradient: 'from-orange-700 via-amber-600 to-yellow-400',    emoji: '🍽️' },
};

const DEFAULT_META: CategoryMeta = {
  label: '관광',
  variant: 'outline',
  gradient: 'from-stone-700 via-warm-gray-600 to-stone-500',
  emoji: '📍',
};

function getCategoryMeta(cat2: string): CategoryMeta {
  return CAT2_META[cat2] ?? DEFAULT_META;
}

export default function SpotCard({ spot }: Props) {
  const meta = getCategoryMeta(spot.cat2);

  return (
    <article className="group bg-surface-elevated rounded-xl border border-line overflow-hidden hover:shadow-[var(--shadow-raised)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
      {/* ─── 이미지 영역 (3:2 비율, 오버레이 포함) ─── */}
      <div className="relative aspect-[3/2] overflow-hidden">
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
          /* 이미지 없을 때 — 카테고리 그라디언트 */
          <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
            <span className="text-4xl opacity-70 select-none" aria-hidden="true">{meta.emoji}</span>
          </div>
        )}

        {/* 하단 그라디언트 — 텍스트 가독성 + 편집 감성 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* 카테고리 뱃지 (상단 좌) */}
        <div className="absolute top-3 left-3">
          <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
        </div>

        {/* 거리 (상단 우) */}
        {spot.distanceKm !== undefined && (
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-0.5 rounded-md">
            {spot.distanceKm < 1
              ? `${Math.round(spot.distanceKm * 1000)}m`
              : `${spot.distanceKm.toFixed(1)}km`}
          </div>
        )}

        {/* "지금 가면 좋은 이유" — 이미지 위에 표시 */}
        {spot.whyNow && (
          <div className="absolute bottom-0 inset-x-0 px-3 pb-3">
            <p className="text-white text-[11px] font-semibold leading-snug line-clamp-2 drop-shadow-md">
              {spot.whyNow}
            </p>
          </div>
        )}
      </div>

      {/* ─── 텍스트 영역 ─── */}
      <div className="p-3 lg:p-4">
        <h3 className="text-sm font-bold text-ink-1 leading-snug line-clamp-1">
          {spot.title}
        </h3>
        <p className="text-xs text-ink-3 mt-1.5 line-clamp-2 leading-relaxed break-keep">
          {spot.reason}
        </p>
        {spot.facilities && (
          <div className="mt-2">
            <FacilityBadges facilities={spot.facilities} />
          </div>
        )}
        <p className="text-xs text-ink-4 mt-2 truncate">
          <MapPin size={10} className="inline mr-0.5 -mt-0.5" aria-hidden="true" />
          {spot.addr1}
        </p>
      </div>
    </article>
  );
}
