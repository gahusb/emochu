interface Props { regions: string[]; value: string; onChange: (region: string) => void; }

export default function FestivalRegionFilter({ regions, value, onChange }: Props) {
  return (
    <div role="group" aria-label="지역 필터" className="flex gap-1.5 overflow-x-auto snap-x lg:flex-wrap lg:overflow-visible">
      {regions.map((r) => {
        const selected = value === r;
        const label = r === 'all' ? '전체' : r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            aria-pressed={selected}
            className={`flex-shrink-0 snap-start px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
              selected
                ? 'bg-brand text-white border-brand'
                : 'bg-surface-elevated border-line text-ink-3 hover:border-ink-4'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
