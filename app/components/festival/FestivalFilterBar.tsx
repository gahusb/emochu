import { ChevronDown } from 'lucide-react';

type StatusFilter = 'all' | 'ongoing' | 'thisWeekend' | 'upcoming';
type SortKey = 'distance' | 'endingSoon' | 'newest';

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: '전체', ongoing: '진행 중', thisWeekend: '이번 주말', upcoming: '곧 시작',
};
const SORT_LABELS: Record<SortKey, string> = {
  distance: '가까운순', endingSoon: '종료임박순', newest: '최신순',
};

interface Props {
  status: StatusFilter;
  sort: SortKey;
  onStatusChange: (s: StatusFilter) => void;
  onSortChange: (s: SortKey) => void;
}

export default function FestivalFilterBar({ status, sort, onStatusChange, onSortChange }: Props) {
  return (
    <div className="sticky top-14 lg:top-16 z-20 bg-surface-base/95 backdrop-blur border-b border-line">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between gap-4 py-3">
        <div role="tablist" aria-label="축제 상태 필터" className="flex items-center gap-4 overflow-x-auto">
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((key) => {
            const active = status === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onStatusChange(key)}
                className={`relative py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active ? 'text-ink-1' : 'text-ink-3 hover:text-ink-1'
                }`}
              >
                {STATUS_LABELS[key]}
                {active && <span aria-hidden="true" className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand" />}
              </button>
            );
          })}
        </div>
        <label className="relative flex-shrink-0">
          <span className="sr-only">정렬</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold rounded-md bg-surface-elevated border border-line text-ink-2 hover:border-ink-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>{SORT_LABELS[k]}</option>
            ))}
          </select>
          <ChevronDown size={14} strokeWidth={2} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" aria-hidden="true" />
        </label>
      </div>
    </div>
  );
}
