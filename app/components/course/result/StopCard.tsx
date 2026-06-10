'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lightbulb, Route } from 'lucide-react';
import type { CourseStop } from '@/lib/weekend-types';
import { getRoleInfo } from '@/lib/course-role';
import { formatTimeRange } from './formatTime';

interface Props {
  stop: CourseStop;
  isLast: boolean;
  isActive: boolean;
  onActivate: () => void;
}

export default function StopCard({ stop, isLast, isActive, onActivate }: Props) {
  const router = useRouter();
  const { colorHex, label } = getRoleInfo(stop);
  const timeRange = formatTimeRange(stop.timeStart, stop.durationMin);

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: colorHex }}
          aria-hidden="true"
        >
          {stop.order}
        </div>
        {!isLast && <div className="flex-1 w-px bg-line my-1" />}
      </div>

      <button
        type="button"
        onClick={() => { if (isActive) router.push(`/spot/${stop.contentId}`); else onActivate(); }}
        aria-label={`${stop.order}번째 코스: ${stop.title}, ${timeRange}, ${label}${isActive ? '. 다시 눌러 상세 보기' : ''}`}
        className={`flex-1 text-left bg-surface-elevated rounded-lg border overflow-hidden mb-4 transition-all hover:border-ink-4 ${
          isActive ? 'border-brand ring-2 ring-brand/20' : 'border-line'
        }`}
      >
        {stop.imageUrl && (
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={stop.imageUrl}
              alt={stop.title}
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
              unoptimized={stop.imageUrl.startsWith('http://')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            {stop.hook && (
              <span className="absolute bottom-2 left-2 text-[11px] font-bold text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
                {stop.hook}
              </span>
            )}
          </div>
        )}

        <div className="p-4 space-y-2">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-white px-2 py-0.5 rounded-md"
            style={{ backgroundColor: colorHex }}
          >
            {label}
          </span>
          <h3 className="text-base font-semibold text-ink-1">{stop.title}</h3>
          <p className="text-xs text-ink-3">{timeRange} · {stop.durationMin}분</p>
          {stop.whyNow && (
            <p className="text-xs font-semibold text-brand mb-2">{stop.whyNow}</p>
          )}
          <p className="text-sm text-ink-2 line-clamp-3">{stop.description}</p>
          {stop.transitInfo && (
            <p className="text-xs text-ink-3 flex items-center gap-1">
              <Route size={12} strokeWidth={1.75} aria-hidden="true" /> {stop.transitInfo}
            </p>
          )}
          {stop.tip && (
            <p className="text-xs text-ink-2 bg-mocha-soft px-3 py-2 rounded-md flex items-start gap-2">
              <Lightbulb size={14} strokeWidth={1.75} className="text-mocha flex-shrink-0 mt-px" aria-hidden="true" />
              <span>{stop.tip}</span>
            </p>
          )}
        </div>
      </button>
    </div>
  );
}
