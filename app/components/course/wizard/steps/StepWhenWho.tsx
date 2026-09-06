'use client';

// 3단계 — 「언제, 누구랑」.
//
// 일정과 동반자를 한 화면에 둔 이유: 둘 다 답이 뻔한 질문이라(내 사정이니까)
// 화면을 나눌 만큼 무겁지 않다. 나눠 놓으면 스텝만 늘고 생각할 거리는 그대로다.

import { Clock, Sun, Coffee, Moon, User, Users2, Baby, PartyPopper } from 'lucide-react';
import { DURATION_LABELS, COMPANION_LABELS } from '@/lib/weekend-types';
import type { Duration, VisitDay, Companion } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

type IconComp = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const DURATIONS: { type: Duration; Icon: IconComp }[] = [
  { type: 'half_day', Icon: Clock },
  { type: 'full_day', Icon: Sun },
  { type: 'leisurely', Icon: Coffee },
  { type: 'overnight', Icon: Moon },
];

const VISIT_DAYS: { type: VisitDay; label: string }[] = [
  { type: 'sat', label: '토요일' },
  { type: 'sun', label: '일요일' },
];

const COMPANIONS: { type: Companion; Icon: IconComp }[] = [
  { type: 'solo', Icon: User },
  { type: 'couple', Icon: Users2 },
  { type: 'family', Icon: Baby },
  { type: 'friends', Icon: PartyPopper },
];

export default function StepWhenWho({ state, dispatch }: Props) {
  const isOvernight = state.duration === 'overnight';

  return (
    <div className="space-y-8">
      {/* ─── 얼마나 ─── */}
      <div>
        <p className="text-sm font-bold text-ink-1 mb-3">얼마나 놀 수 있어요?</p>
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
                  selected ? 'bg-brand-soft border-brand ring-2 ring-brand/20' : 'bg-surface-elevated border-line hover:border-ink-4'
                }`}
              >
                <Icon size={22} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
                <span className="text-sm font-semibold text-ink-1">{DURATION_LABELS[type]}</span>
              </button>
            );
          })}
        </div>

        {/* 요일은 일정이 정해진 뒤에만 묻는다 — 1박 2일이면 물을 필요가 없다 */}
        {state.duration && !isOvernight && (
          <div className="mt-4 reveal-down">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-ink-2">어느 날 가세요?</p>
              <div className="flex gap-2">
                {VISIT_DAYS.map(({ type, label }) => {
                  const selected = state.visitDay === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => dispatch({ type: 'SET_VISIT_DAY', value: type })}
                      aria-pressed={selected}
                      className={`px-5 py-2 rounded-full border text-sm font-semibold transition-colors ${
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
            <p className="text-xs text-ink-3 mt-2">그날 문 여는 곳으로만 짜드려요.</p>
          </div>
        )}

        {isOvernight && (
          <p className="text-xs text-ink-3 mt-3">1박 2일은 토요일·일요일 모두 방문해요.</p>
        )}
      </div>

      {/* ─── 누구랑 ─── */}
      <div>
        <p className="text-sm font-bold text-ink-1 mb-3">누구랑 가요?</p>
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
                  selected ? 'bg-brand-soft border-brand ring-2 ring-brand/20' : 'bg-surface-elevated border-line hover:border-ink-4'
                }`}
              >
                <Icon size={22} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
                <span className="text-sm font-semibold text-ink-1">{COMPANION_LABELS[type]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
