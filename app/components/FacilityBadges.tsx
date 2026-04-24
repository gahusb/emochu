import { ParkingSquare, Baby, ToyBrick, Dog, Clock } from 'lucide-react';
import type { ComponentType } from 'react';
import type { FacilityInfo } from '@/lib/weekend-types';

type Size = 'sm' | 'md';

interface Props {
  facilities: FacilityInfo;
  size?: Size;
}

interface BadgeDef {
  key: keyof FacilityInfo;
  Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
}

const BADGES: BadgeDef[] = [
  { key: 'parking', Icon: ParkingSquare, label: '주차' },
  { key: 'babyCarriage', Icon: Baby, label: '유모차' },
  { key: 'kidsFacility', Icon: ToyBrick, label: '키즈' },
  { key: 'pet', Icon: Dog, label: '반려동물' },
];

const SIZE_CLASSES: Record<Size, { chip: string; icon: number }> = {
  sm: { chip: 'text-[11px] px-2 py-0.5 gap-1', icon: 12 },
  md: { chip: 'text-xs px-2.5 py-1 gap-1.5', icon: 14 },
};

export default function FacilityBadges({ facilities, size = 'sm' }: Props) {
  const activeBadges = BADGES.filter((b) => facilities[b.key] === true);
  const hasHours = Boolean(facilities.operatingHours);

  if (activeBadges.length === 0 && !hasHours) return null;

  const sz = SIZE_CLASSES[size];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {activeBadges.map(({ key, Icon, label }) => (
        <span
          key={key}
          className={`inline-flex items-center font-semibold rounded-md bg-brand-soft text-brand ${sz.chip}`}
          title={label}
        >
          <Icon size={sz.icon} strokeWidth={1.75} aria-hidden="true" />
          {size === 'md' ? (
            <span>{label}</span>
          ) : (
            <span className="sr-only">{label}</span>
          )}
        </span>
      ))}
      {hasHours && size === 'md' && (
        <span className={`inline-flex items-center font-semibold rounded-md bg-surface-sunken text-ink-2 ${sz.chip}`}>
          <Clock size={sz.icon} strokeWidth={1.75} aria-hidden="true" />
          <span>{facilities.operatingHours}</span>
        </span>
      )}
    </div>
  );
}
