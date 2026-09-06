import { Loader2 } from 'lucide-react';
import type { CommunityCourseCard as CommunityCourseCardData } from '@/lib/weekend-types';
import CommunityCard from './CommunityCard';
// festival 전용 내용이 전혀 없는 순수 카드 스켈레톤이라 그대로 재사용한다.
import FestivalSkeleton from '@/app/components/festival/FestivalSkeleton';
import CommunityEmpty from './CommunityEmpty';

interface Props {
  courses: CommunityCourseCardData[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export default function CommunityGrid({ courses, loading, hasMore, loadingMore, onLoadMore }: Props) {
  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {loading
          ? Array.from({ length: 8 }, (_, i) => <FestivalSkeleton key={i} />)
          : courses.length > 0
            ? courses.map((c, i) => <CommunityCard key={c.slug} course={c} index={i} />)
            : <CommunityEmpty />
        }
      </div>

      {!loading && hasMore && (
        <div className="flex justify-center mt-8">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-lg border border-line text-sm font-semibold text-ink-2 hover:border-brand hover:text-brand transition-colors disabled:opacity-60"
          >
            {loadingMore && <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" />}
            더 보기
          </button>
        </div>
      )}
    </div>
  );
}
