import { Battery, Zap, Heart, Leaf, Compass, UtensilsCrossed } from 'lucide-react';
import { FEELING_OPTIONS } from '@/lib/weekend-types';
import type { Feeling } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

// Keys match actual Feeling enum: tired | excited | romantic | healing | adventurous | foodie
const FEELING_ICONS: Record<string, ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  tired: Battery,
  excited: Zap,
  romantic: Heart,
  healing: Leaf,
  adventurous: Compass,
  foodie: UtensilsCrossed,
};

export default function StepFeeling({ state, dispatch }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {FEELING_OPTIONS.map((opt) => {
        const selected = state.feeling === opt.type;
        const Icon = FEELING_ICONS[opt.type] ?? Heart;
        return (
          <button
            key={opt.type}
            type="button"
            onClick={() => dispatch({ type: 'SET_FEELING', value: opt.type as Feeling })}
            aria-pressed={selected}
            className={`flex flex-col items-start gap-2 px-4 py-4 rounded-lg border text-left transition-colors ${
              selected ? 'bg-brand-soft border-brand' : 'bg-surface-elevated border-line hover:border-ink-4'
            }`}
          >
            <Icon size={22} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
            <span className="text-sm font-semibold text-ink-1">{opt.label}</span>
            {'description' in opt && opt.description && (
              <span className="text-xs text-ink-3">{String(opt.description)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
