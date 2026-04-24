import { Clock, Sun, Coffee, Moon } from 'lucide-react';
import { DURATION_LABELS } from '@/lib/weekend-types';
import type { Duration } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

const DURATIONS: { type: Duration; Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }[] = [
  { type: 'half_day', Icon: Clock },
  { type: 'full_day', Icon: Sun },
  { type: 'leisurely', Icon: Coffee },
  { type: 'overnight', Icon: Moon },
];

export default function StepDuration({ state, dispatch }: Props) {
  return (
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
  );
}
