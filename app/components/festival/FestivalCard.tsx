import Image from 'next/image';
import Link from 'next/link';
import { PartyPopper } from 'lucide-react';
import type { FestivalCard as FestivalCardData } from '@/lib/weekend-types';

interface Props { festival: FestivalCardData; today: string; satStr: string; sunStr: string; }

function formatDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return '';
  return `${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

function daysBetween(a: string, b: string): number {
  const ad = new Date(+a.slice(0, 4), +a.slice(4, 6) - 1, +a.slice(6, 8));
  const bd = new Date(+b.slice(0, 4), +b.slice(4, 6) - 1, +b.slice(6, 8));
  return Math.round((bd.getTime() - ad.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusBadge(f: FestivalCardData, today: string, satStr: string, sunStr: string): { label: string; className: string } | null {
  const ongoing = f.eventStart <= today && f.eventEnd >= today;
  const endingSoon = ongoing && daysBetween(today, f.eventEnd) <= 3;
  const thisWeekend = !ongoing && f.eventStart <= sunStr && f.eventEnd >= satStr;
  const upcoming = f.eventStart > today;

  if (endingSoon) return { label: '마감 임박', className: 'bg-warning-soft text-warning' };
  if (ongoing) return { label: '진행 중', className: 'bg-success-soft text-success' };
  if (thisWeekend) return { label: '이번 주말', className: 'bg-brand-soft text-brand' };
  if (upcoming) {
    const d = daysBetween(today, f.eventStart);
    return { label: `D-${d}`, className: 'bg-brand-soft text-brand' };
  }
  return null;
}

export default function FestivalCard({ festival: f, today, satStr, sunStr }: Props) {
  const dateStr = `${formatDate(f.eventStart)}${f.eventEnd && f.eventEnd !== f.eventStart ? ` ~ ${formatDate(f.eventEnd)}` : ''}`;
  const status = getStatusBadge(f, today, satStr, sunStr);
  const distanceStr = f.distanceKm != null ? `${f.distanceKm.toFixed(1)}km` : '';
  const region = f.addr1 ? f.addr1.split(' ')[0] : '';

  return (
    <Link
      href={`/spot/${f.contentId}`}
      className="group block bg-surface-elevated border border-line rounded-lg overflow-hidden hover:shadow-raised transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      aria-label={`${f.title}, ${region}, ${dateStr}, ${distanceStr}`}
    >
      <div className="relative aspect-[4/3] bg-surface-sunken overflow-hidden">
        {f.firstImage ? (
          <Image
            src={f.firstImage}
            alt={f.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized={f.firstImage.startsWith('http://')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PartyPopper size={40} strokeWidth={1.5} className="text-role-festival" aria-hidden="true" />
          </div>
        )}
        {status && (
          <span className={`absolute top-3 left-3 inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md ${status.className}`}>
            {status.label}
          </span>
        )}
      </div>
      <div className="p-4 space-y-1">
        <h3 className="text-[15px] font-semibold text-ink-1 break-keep line-clamp-2">{f.title}</h3>
        <p className="text-xs text-ink-3 break-keep">
          {region} · {dateStr}
        </p>
        {distanceStr && <p className="text-[11px] text-ink-4">{distanceStr}</p>}
      </div>
    </Link>
  );
}
