import type { CommunitySort } from '@/lib/weekend-types';

const SORT_LABELS: Record<CommunitySort, string> = {
  popular: '인기순',
  newest: '최신순',
};

interface Props {
  sort: CommunitySort;
  onChange: (s: CommunitySort) => void;
}

export default function CommunitySortTabs({ sort, onChange }: Props) {
  return (
    <div className="sticky top-14 lg:top-16 z-20 bg-surface-base/95 backdrop-blur border-b border-line">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-3">
        <div role="tablist" aria-label="정렬" className="flex items-center gap-4">
          {(Object.keys(SORT_LABELS) as CommunitySort[]).map((key) => {
            const active = sort === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange(key)}
                className={`relative py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active ? 'text-ink-1' : 'text-ink-3 hover:text-ink-1'
                }`}
              >
                {SORT_LABELS[key]}
                {active && <span aria-hidden="true" className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
