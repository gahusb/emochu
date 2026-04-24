import { User, Users2, Baby, PartyPopper } from 'lucide-react';
import { COMPANION_LABELS } from '@/lib/weekend-types';
import type { Companion } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

const COMPANIONS: { type: Companion; Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }[] = [
  { type: 'solo', Icon: User },
  { type: 'couple', Icon: Users2 },
  { type: 'family', Icon: Baby },
  { type: 'friends', Icon: PartyPopper },
];

export default function StepCompanion({ state, dispatch }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {COMPANIONS.map(({ type, Icon }) => {
        const selected = state.companion === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => dispatch({ type: 'SET_COMPANION', value: type })}
            aria-pressed={selected}
            className={`flex flex-col items-center gap-2 px-4 py-5 rounded-lg border transition-colors ${
              selected ? 'bg-brand-soft border-brand' : 'bg-surface-elevated border-line hover:border-ink-4'
            }`}
          >
            <Icon size={22} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
            <span className="text-sm font-semibold text-ink-1">{COMPANION_LABELS[type]}</span>
          </button>
        );
      })}
    </div>
  );
}
