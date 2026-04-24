'use client';

import { useRef, useEffect } from 'react';
import type { CourseStop } from '@/lib/weekend-types';
import StopCard from './StopCard';

interface Props {
  stops: CourseStop[];
  activeIndex: number | null;
  onActivate: (index: number) => void;
}

export default function Timeline({ stops, activeIndex, onActivate }: Props) {
  const refs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (activeIndex === null) return;
    const el = refs.current[activeIndex];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex]);

  return (
    <div className="space-y-0">
      {stops.map((stop, i) => (
        <div key={stop.contentId ?? i} ref={(el) => { refs.current[i] = el; }}>
          <StopCard
            stop={stop}
            isLast={i === stops.length - 1}
            isActive={activeIndex === i}
            onActivate={() => onActivate(i)}
          />
        </div>
      ))}
    </div>
  );
}
