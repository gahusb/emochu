'use client';

// 4단계 — 「뭐가 끌려요」 + 접근성.
//
// 접근성을 별도 스텝에서 여기로 접어 넣었다. 해당 없는 사람에게는 스텝 하나가
// 통째로 "아무것도 안 고르고 다음"이라 허무했고, 정작 필요한 사람에게는
// 마지막에 나와서 놓치기 쉬웠다.
//
// 🔴 접어두되 **숨기지는 않는다.** 여는 버튼이 항상 보이고, 이미 고른 게 있으면
//    처음부터 펼쳐진 채로 온다. 무장애 여행 정보(KorWithService2)는 이모추가
//    실제로 호출하는 데이터고, 고를 수 없으면 호출할 이유도 없어진다.

import { useState } from 'react';
import {
  TreePine, UtensilsCrossed, Landmark, Coffee, Waves, Camera,
  Accessibility, Eye, Ear, Baby, ChevronDown,
} from 'lucide-react';
import { PREFERENCE_LABELS, ACCESSIBILITY_LABELS } from '@/lib/weekend-types';
import type { Preference, AccessibilityNeed } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

type IconComp = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const PREFERENCES: { type: Preference; Icon: IconComp }[] = [
  { type: 'nature', Icon: TreePine },
  { type: 'food', Icon: UtensilsCrossed },
  { type: 'culture', Icon: Landmark },
  { type: 'cafe', Icon: Coffee },
  { type: 'activity', Icon: Waves },
  { type: 'photo', Icon: Camera },
];

// 4그룹은 무장애 여행 정보 API가 실제로 데이터를 나누는 방식과 1:1이다.
// 데이터에 없는 구분을 여기 만들면 고를 수는 있는데 반영은 안 되는 선택지가 된다.
const NEEDS: { type: AccessibilityNeed; Icon: IconComp }[] = [
  { type: 'mobility', Icon: Accessibility },
  { type: 'visual', Icon: Eye },
  { type: 'hearing', Icon: Ear },
  { type: 'infant', Icon: Baby },
];

export default function StepTaste({ state, dispatch }: Props) {
  const [openA11y, setOpenA11y] = useState(state.accessibility.length > 0);

  return (
    <div className="space-y-8">
      {/* ─── 취향 ─── */}
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
        <p className="text-xs text-ink-3 mt-3" aria-live="polite">
          {state.preferences.length > 0
            ? `${state.preferences.length}개 선택됨 — 여러 개 골라도 좋아요`
            : '하나 이상 골라주세요. 여러 개도 좋아요.'}
        </p>
      </div>

      {/* ─── 접근성 (접이식) ─── */}
      <div className="rounded-xl border border-line bg-surface-elevated overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenA11y((v) => !v)}
          aria-expanded={openA11y}
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-surface-sunken/50 transition-colors"
        >
          <Accessibility size={18} className="text-ink-3 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-1">편하게 다니려면 필요한 게 있나요?</p>
            <p className="text-xs text-ink-3 mt-0.5">
              {state.accessibility.length > 0
                ? `${state.accessibility.length}개 선택됨`
                : '해당 없으면 그냥 넘어가세요 (선택 사항)'}
            </p>
          </div>
          <ChevronDown
            size={18}
            className={`text-ink-4 flex-shrink-0 transition-transform ${openA11y ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {openA11y && (
          <div className="px-5 pb-5 space-y-4 reveal-down">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {NEEDS.map(({ type, Icon }) => {
                const selected = state.accessibility.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_ACCESSIBILITY', value: type })}
                    aria-pressed={selected}
                    className={`flex flex-col items-center gap-2 px-3 py-4 rounded-lg border transition-colors ${
                      selected ? 'bg-brand-soft border-brand' : 'bg-surface-base border-line hover:border-ink-4'
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
                    <span className="text-xs font-semibold text-ink-1 text-center break-keep">
                      {ACCESSIBILITY_LABELS[type]}
                    </span>
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
        )}
      </div>
    </div>
  );
}
