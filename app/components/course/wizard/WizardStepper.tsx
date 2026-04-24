import { Check } from 'lucide-react';

interface Props {
  current: number;
  titles: string[];
  summaries: (string | null)[];
  onJump: (index: number) => void;
}

export default function WizardStepper({ current, titles, summaries, onJump }: Props) {
  return (
    <ol className="space-y-6" aria-label="코스 생성 진행 단계">
      {titles.map((title, i) => {
        const status = i < current ? 'completed' : i === current ? 'active' : 'upcoming';
        const isClickable = i < current;
        const iconBg =
          status === 'completed' ? 'bg-brand-soft text-brand'
          : status === 'active' ? 'bg-brand text-white'
          : 'bg-surface-elevated border border-line text-ink-4';
        const titleColor =
          status === 'active' ? 'font-bold text-ink-1'
          : status === 'completed' ? 'text-ink-2'
          : 'text-ink-4';
        const content = (
          <>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${iconBg}`} aria-hidden="true">
              {status === 'completed' ? <Check size={16} strokeWidth={3} /> : i + 1}
            </div>
            <div className="min-w-0">
              <p className={`text-sm ${titleColor}`}>{title}</p>
              {status === 'completed' && summaries[i] && (
                <p className="text-xs text-ink-3 mt-0.5 truncate">{summaries[i]}</p>
              )}
            </div>
          </>
        );
        return (
          <li key={title} className="relative">
            {i < titles.length - 1 && (
              <span aria-hidden="true" className="absolute left-4 top-8 h-6 w-px bg-line" />
            )}
            {isClickable ? (
              <button
                type="button"
                onClick={() => onJump(i)}
                className="flex items-start gap-3 w-full text-left rounded-md hover:bg-surface-sunken/50 -mx-1 px-1 py-0.5 transition-colors"
                aria-label={`${i + 1}단계 ${title}로 이동 (수정)`}
              >
                {content}
              </button>
            ) : (
              <div className="flex items-start gap-3" aria-current={status === 'active' ? 'step' : undefined}>
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
