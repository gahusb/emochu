import { Accessibility, Eye, Ear, Baby } from 'lucide-react';
import { ACCESSIBILITY_LABELS } from '@/lib/weekend-types';
import type { AccessibilityNeed } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

// 4그룹은 무장애 여행 정보 API가 실제로 데이터를 나누는 방식과 1:1이다.
// 데이터에 없는 구분을 여기 만들면 고를 수는 있는데 반영은 안 되는 선택지가 된다.
const NEEDS: { type: AccessibilityNeed; Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }[] = [
  { type: 'mobility', Icon: Accessibility },
  { type: 'visual', Icon: Eye },
  { type: 'hearing', Icon: Ear },
  { type: 'infant', Icon: Baby },
];

export default function StepAccessibility({ state, dispatch }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-3 break-keep">
        해당되는 항목이 있다면 골라주세요. <strong className="text-ink-2">선택하지 않고 넘어가도 됩니다.</strong>
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {NEEDS.map(({ type, Icon }) => {
          const selected = state.accessibility.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_ACCESSIBILITY', value: type })}
              aria-pressed={selected}
              className={`flex flex-col items-center gap-2 px-4 py-5 rounded-lg border transition-colors ${
                selected ? 'bg-brand-soft border-brand' : 'bg-surface-elevated border-line hover:border-ink-4'
              }`}
            >
              <Icon size={22} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
              <span className="text-sm font-semibold text-ink-1">{ACCESSIBILITY_LABELS[type]}</span>
            </button>
          );
        })}
      </div>

      {state.accessibility.length > 0 && (
        <p className="text-xs text-ink-4 break-keep leading-relaxed">
          한국관광공사 무장애 여행 정보가 확인된 곳을 앞쪽에 배치합니다. 정보가 없는 곳도 함께
          보여드리되 <strong className="text-ink-3">「미확인」으로 표시</strong>하니, 방문 전 전화로
          확인해 주세요.
        </p>
      )}
    </div>
  );
}
