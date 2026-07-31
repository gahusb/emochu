import { Clock, Sun, Coffee, Moon } from 'lucide-react';
import { DURATION_LABELS } from '@/lib/weekend-types';
import type { Duration, VisitDay } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

const DURATIONS: { type: Duration; Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }[] = [
  { type: 'half_day', Icon: Clock },
  { type: 'full_day', Icon: Sun },
  { type: 'leisurely', Icon: Coffee },
  { type: 'overnight', Icon: Moon },
];

const VISIT_DAYS: { type: VisitDay; label: string }[] = [
  { type: 'sat', label: '토요일' },
  { type: 'sun', label: '일요일' },
];

export default function StepDuration({ state, dispatch }: Props) {
  const isOvernight = state.duration === 'overnight';

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {DURATIONS.map(({ type, Icon }) => {
          const selected = state.duration === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => dispatch({ type: 'SET_DURATION', value: type })}
              aria-pressed={selected}
              className={`flex flex-col items-center gap-2 px-4 py-5 rounded-lg border transition-colors ${
                selected ? 'bg-brand-soft border-brand' : 'bg-surface-elevated border-line hover:border-ink-4'
              }`}
            >
              <Icon size={22} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
              <span className="text-sm font-semibold text-ink-1">{DURATION_LABELS[type]}</span>
            </button>
          );
        })}
      </div>

      {!isOvernight && (
        <div>
          <p className="text-sm font-semibold text-ink-1 mb-1">언제 가세요?</p>
          <p className="text-xs text-ink-3 mb-3">선택한 날에 문 여는 곳으로 코스를 짜드려요.</p>
          <div className="flex gap-2">
            {VISIT_DAYS.map(({ type, label }) => {
              const selected = state.visitDay === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_VISIT_DAY', value: type })}
                  aria-pressed={selected}
                  className={`px-5 py-2.5 rounded-full border text-sm font-semibold transition-colors ${
                    selected
                      ? 'bg-brand text-white border-brand'
                      : 'bg-surface-elevated text-ink-2 border-line hover:border-ink-4'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isOvernight && (
        <p className="text-xs text-ink-3">1박 2일은 토요일·일요일 모두 방문해요.</p>
      )}
    </div>
  );
}
