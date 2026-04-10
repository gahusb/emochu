'use client';

import type { SpotCard as SpotCardType } from '@/lib/weekend-types';

interface Props {
  spot: SpotCardType;
}

const CATEGORY_COLORS: Record<string, string> = {
  '자연관광': 'bg-emerald-100 text-emerald-600',
  '인문관광': 'bg-violet-100 text-violet-600',
  '레포츠': 'bg-sky-100 text-sky-600',
  '음식': 'bg-orange-100 text-orange-600',
  '문화시설': 'bg-pink-100 text-pink-600',
};

const PLACEHOLDER_GRADIENTS = [
  'from-emerald-200 via-teal-100 to-cyan-100',
  'from-violet-200 via-purple-100 to-pink-100',
  'from-amber-200 via-yellow-100 to-orange-100',
  'from-sky-200 via-blue-100 to-indigo-100',
];

const PLACEHOLDER_ICONS = ['🌳', '🏛', '⛰️', '🌊'];

export default function SpotCard({ spot }: Props) {
  const idx = parseInt(spot.contentId, 10) % 4;
  const catStyle = CATEGORY_COLORS[spot.cat2] ?? 'bg-slate-100 text-slate-600';

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md border border-orange-50/80 hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
      {/* 이미지 */}
      <div className={`relative h-32 bg-gradient-to-br ${PLACEHOLDER_GRADIENTS[idx]} overflow-hidden`}>
        {spot.firstImage ? (
          <img
            src={spot.firstImage}
            alt={spot.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-50 group-hover:scale-110 transition-transform duration-500">
              {PLACEHOLDER_ICONS[idx]}
            </span>
          </div>
        )}

        {/* 카테고리 뱃지 */}
        <span className={`absolute top-2.5 left-2.5 ${catStyle} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
          {spot.cat2}
        </span>

        {/* 거리 */}
        {spot.distanceKm !== undefined && (
          <span className="absolute bottom-2 right-2 bg-white/90 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            {spot.distanceKm < 1
              ? `${Math.round(spot.distanceKm * 1000)}m`
              : `${spot.distanceKm.toFixed(1)}km`}
          </span>
        )}
      </div>

      {/* 텍스트 */}
      <div className="p-3">
        <h3 className="text-sm font-bold text-slate-800 leading-snug truncate">
          {spot.title}
        </h3>
        <p className="text-[11px] text-orange-500 font-medium mt-1 line-clamp-2 leading-relaxed break-keep">
          {spot.reason}
        </p>
        <p className="text-[10px] text-slate-400 mt-1 truncate">
          {spot.addr1}
        </p>
      </div>
    </div>
  );
}
