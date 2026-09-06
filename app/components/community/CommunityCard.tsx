import Image from 'next/image';
import Link from 'next/link';
import { Compass, Eye } from 'lucide-react';
import type { CommunityCourseCard } from '@/lib/weekend-types';
import { DURATION_LABELS, COMPANION_ICONS } from '@/lib/weekend-types';

interface Props { course: CommunityCourseCard; index?: number; }

export default function CommunityCard({ course, index }: Props) {
  // "반나절 (3~4시간)" 처럼 괄호가 붙어 카드에 놓기 길다 — 앞 단어만 쓴다.
  const durationShort = DURATION_LABELS[course.duration].split(' ')[0];
  const companionIcon = COMPANION_ICONS[course.companion];

  const staggerClass = index != null ? ' stagger-item' : '';
  const staggerStyle = index != null ? { animationDelay: `${Math.min(index, 12) * 40}ms` } : undefined;

  return (
    <Link
      href={`/course/${course.slug}`}
      className={`group block bg-surface-elevated border border-line rounded-lg overflow-hidden hover:shadow-[var(--shadow-raised)] transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand${staggerClass}`}
      style={staggerStyle}
      aria-label={`${course.title}, ${durationShort}, ${course.stopCount}곳`}
    >
      <div className="relative aspect-[4/3] bg-surface-sunken overflow-hidden">
        {course.imageUrl ? (
          <Image
            src={course.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized={course.imageUrl.startsWith('http://')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Compass size={40} strokeWidth={1.5} className="text-role-spot" aria-hidden="true" />
          </div>
        )}
        <span className="absolute top-3 left-3 inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-brand-soft text-brand">
          {companionIcon} {durationShort}
        </span>
      </div>
      <div className="p-4 space-y-1">
        <h3 className="text-[15px] font-semibold text-ink-1 break-keep line-clamp-2">{course.title}</h3>
        <p className="text-xs text-ink-3 break-keep">
          {course.stopCount}곳 · {course.totalDistanceKm.toFixed(1)}km
        </p>
        <p className="inline-flex items-center gap-1 text-[11px] text-ink-4">
          <Eye size={11} aria-hidden="true" /> {course.viewCount}
        </p>
      </div>
    </Link>
  );
}
