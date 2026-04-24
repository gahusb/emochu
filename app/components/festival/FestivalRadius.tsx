const RADIUS_OPTIONS = [30, 50, 100, 200];

interface Props { value: number; onChange: (radius: number) => void; }

export default function FestivalRadius({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="검색 반경" className="flex gap-2 overflow-x-auto">
      {RADIUS_OPTIONS.map((r) => {
        const selected = value === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            aria-pressed={selected}
            className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
              selected
                ? 'bg-brand-soft border-brand text-brand'
                : 'bg-surface-elevated border-line text-ink-3 hover:border-ink-4'
            }`}
          >
            {r}km
          </button>
        );
      })}
    </div>
  );
}
