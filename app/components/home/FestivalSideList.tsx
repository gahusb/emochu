import Link from 'next/link';
import { Calendar } from 'lucide-react';
import type { FestivalCard } from '@/lib/weekend-types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

interface Props {
  festivals: FestivalCard[];
}

export default function FestivalSideList({ festivals }: Props) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-bold text-ink-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          근처 축제
        </h3>
        <Link href="/festival" className="text-xs font-semibold text-brand hover:text-brand-hover">
          전체 →
        </Link>
      </div>
      {festivals.length === 0 ? (
        <p className="text-sm text-ink-3 py-4 text-center">진행 중인 축제가 없어요</p>
      ) : (
        <ul className="space-y-3">
          {festivals.slice(0, 3).map((f) => (
            <li key={f.contentId}>
              <Link
                href={`/spot/${f.contentId}`}
                className="w-full text-left flex items-start gap-3 group"
              >
                <Calendar size={16} className="text-mocha mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-1 group-hover:text-brand transition-colors line-clamp-1">
                    {f.title}
                  </p>
                  <p className="text-xs text-ink-3 mt-0.5 line-clamp-1">{f.addr1}</p>
                </div>
                {f.dDay !== undefined && f.dDay <= 7 && (
                  <Badge variant="warning" size="sm">
                    {f.dDay === 0 ? 'D-DAY' : `D-${f.dDay}`}
                  </Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
