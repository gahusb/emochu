'use client';

import { MapPin, ChevronDown } from 'lucide-react';
import { useLocation } from './LocationContext';

interface Props {
  variant?: 'compact' | 'full';
  className?: string;
}

export default function LocationSelector({ variant = 'full', className = '' }: Props) {
  const { location, openModal, isModalOpen } = useLocation();
  const name = location?.name ?? '위치 설정';

  return (
    <button
      type="button"
      onClick={openModal}
      aria-label={`현재 위치 ${name}, 클릭하여 변경`}
      aria-haspopup="dialog"
      aria-expanded={isModalOpen}
      className={`inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-elevated px-3 py-1.5 text-sm font-medium text-ink-2 hover:border-brand-soft hover:text-brand transition-colors ${className}`}
    >
      <MapPin size={14} className="text-brand flex-shrink-0" />
      <span className="truncate max-w-[10rem]">{name}</span>
      {variant === 'full' && <ChevronDown size={14} className="text-ink-3 flex-shrink-0" />}
    </button>
  );
}
