'use client';

interface Props {
  days: number[];
  active: number;
  onChange: (day: number) => void;
}

export default function DayTabs({ days, active, onChange }: Props) {
  if (days.length < 2) return null;
  return (
    <div role="tablist" aria-label="일차 선택" className="flex items-center gap-6 border-b border-line mb-6">
      {days.map((day) => {
        const isActive = active === day;
        return (
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(day)}
            className={`relative py-3 text-sm font-semibold transition-colors ${
              isActive ? 'text-ink-1' : 'text-ink-3 hover:text-ink-1'
            }`}
          >
            {day}일차
            {isActive && <span aria-hidden="true" className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand" />}
          </button>
        );
      })}
    </div>
  );
}
