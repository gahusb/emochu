import type { FestivalCard as FestivalCardData } from '@/lib/weekend-types';
import FestivalCard from './FestivalCard';
import FestivalSkeleton from './FestivalSkeleton';
import FestivalEmpty from './FestivalEmpty';

interface Props {
  festivals: FestivalCardData[];
  loading: boolean;
  today: string;
  satStr: string;
  sunStr: string;
  onExpandRadius: () => void;
}

export default function FestivalGrid({ festivals, loading, today, satStr, sunStr, onExpandRadius }: Props) {
  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {loading
          ? Array.from({ length: 8 }, (_, i) => <FestivalSkeleton key={i} />)
          : festivals.length > 0
            ? festivals.map((f) => (
                <FestivalCard key={f.contentId} festival={f} today={today} satStr={satStr} sunStr={sunStr} />
              ))
            : <FestivalEmpty onExpandRadius={onExpandRadius} />
        }
      </div>
    </div>
  );
}
