'use client';

import type { FacilityInfo } from '@/lib/weekend-types';

interface Props {
  facilities: FacilityInfo;
  compact?: boolean;  // true: 아이콘만, false: 아이콘+텍스트
}

const BADGES: { key: keyof FacilityInfo; icon: string; label: string }[] = [
  { key: 'parking',       icon: '🅿️', label: '주차' },
  { key: 'babyCarriage',  icon: '👶', label: '유모차' },
  { key: 'kidsFacility',  icon: '🧒', label: '키즈' },
  { key: 'pet',           icon: '🐾', label: '반려동물' },
];

export default function FacilityBadges({ facilities, compact = false }: Props) {
  const activeBadges = BADGES.filter(b => facilities[b.key] === true);

  if (activeBadges.length === 0 && !facilities.operatingHours) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {activeBadges.map(b => (
        <span
          key={b.key}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded-full text-[10px] font-bold"
          title={b.label}
        >
          <span>{b.icon}</span>
          {!compact && <span>{b.label}</span>}
        </span>
      ))}
      {facilities.operatingHours && !compact && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
          <span>⏰</span>
          <span>{facilities.operatingHours}</span>
        </span>
      )}
    </div>
  );
}
