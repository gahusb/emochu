'use client';

import type { FestivalCard } from '@/lib/weekend-types';

interface Props {
  festival: FestivalCard;
}

const PLACEHOLDER_COLORS = [
  'from-pink-200 to-rose-100',
  'from-violet-200 to-purple-100',
  'from-sky-200 to-blue-100',
  'from-emerald-200 to-teal-100',
  'from-amber-200 to-yellow-100',
];

const PLACEHOLDER_EMOJIS = ['🎪', '🎭', '🎵', '🎨', '🎉'];

export default function FestivalBadge({ festival }: Props) {
  const idx = parseInt(festival.contentId, 10) % 5;
  const gradientClass = PLACEHOLDER_COLORS[idx];
  const placeholderEmoji = PLACEHOLDER_EMOJIS[idx];

  return (
    <div className="flex-shrink-0 w-44 bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md border border-orange-50 hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
      {/* 이미지 / 플레이스홀더 */}
      <div className={`relative h-28 bg-gradient-to-br ${gradientClass} overflow-hidden`}>
        {festival.firstImage ? (
          <img
            src={festival.firstImage}
            alt={festival.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-60 group-hover:scale-110 transition-transform duration-500">
              {placeholderEmoji}
            </span>
          </div>
        )}

        {/* 긴급성 태그 */}
        {festival.urgencyTag && (
          <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg shadow-red-200 badge-pulse">
            {festival.urgencyTag}
          </span>
        )}

        {/* D-day 뱃지 */}
        {festival.dDay !== undefined && festival.dDay <= 7 && !festival.urgencyTag && (
          <span className="absolute top-2.5 left-2.5 bg-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg shadow-orange-200 badge-pulse">
            {festival.dDay === 0 ? 'D-DAY' : `D-${festival.dDay}`}
          </span>
        )}
      </div>

      {/* 텍스트 */}
      <div className="p-3.5">
        <h3 className="text-sm font-bold text-slate-800 truncate leading-snug break-keep">
          {festival.title}
        </h3>
        {festival.aiSummary && (
          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed break-keep">
            {festival.aiSummary}
          </p>
        )}
        <p className="text-[10px] text-slate-400 mt-1.5 truncate flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          </svg>
          {festival.addr1}
        </p>
      </div>
    </div>
  );
}
