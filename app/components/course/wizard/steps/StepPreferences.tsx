import { TreePine, UtensilsCrossed, Landmark, Coffee, Waves, Camera } from 'lucide-react';
import { PREFERENCE_LABELS } from '@/lib/weekend-types';
import type { Preference } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

const PREFERENCES: { type: Preference; Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }[] = [
  { type: 'nature', Icon: TreePine },
  { type: 'food', Icon: UtensilsCrossed },
  { type: 'culture', Icon: Landmark },
  { type: 'cafe', Icon: Coffee },
  { type: 'activity', Icon: Waves },
  { type: 'photo', Icon: Camera },
];

export default function StepPreferences({ state, dispatch }: Props) {
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {PREFERENCES.map(({ type, Icon }) => {
          const selected = state.preferences.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_PREFERENCE', value: type })}
              aria-pressed={selected}
              className={`flex flex-col items-center gap-2 px-4 py-5 rounded-lg border transition-colors ${
                selected ? 'bg-brand-soft border-brand ring-2 ring-brand/20' : 'bg-surface-elevated border-line hover:border-ink-4'
              }`}
            >
              <Icon size={22} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
              <span className="text-sm font-semibold text-ink-1">{PREFERENCE_LABELS[type]}</span>
            </button>
          );
        })}
      </div>
      {state.preferences.length > 0 && (
        <p className="text-xs text-ink-3 mt-4">{state.preferences.length}개 선택됨</p>
      )}
    </div>
  );
}
