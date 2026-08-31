'use client';

import { useRef, useEffect } from 'react';
import type { CourseStop } from '@/lib/weekend-types';
import StopCard from './StopCard';

interface Props {
  stops: CourseStop[];
  activeIndex: number | null;
  onActivate: (index: number) => void;
  /** 편집 가능 여부는 카드가 아니라 화면이 안다. 여기서 그대로 내려보낸다. */
  editable?: boolean;
  busyOrder?: number | null;
  onReplace?: (order: number) => void;
  onMove?: (order: number, direction: 'up' | 'down') => void;
}

export default function Timeline({
  stops, activeIndex, onActivate, editable = false, busyOrder = null, onReplace, onMove,
}: Props) {
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
            editable={editable}
            busy={busyOrder !== null}
            // 같은 날짜 안에서만 옮긴다 — 1일차 장소가 2일차로 넘어가면 코스가 깨진다.
            canMoveUp={i > 0}
            canMoveDown={i < stops.length - 1}
            onReplace={() => onReplace?.(stop.order)}
            onMove={(d) => onMove?.(stop.order, d)}
          />
        </div>
      ))}
    </div>
  );
}
