'use client';

// 2단계 — 「이번 주 당신의 기운이…」
//
// 🔑 사주는 이모추의 킥이지만 **관문이 아니다.** 아무것도 안 하고 넘어가도 코스는 나온다.
//    강제하는 순간 킥이 아니라 통행세가 된다.
//
// 두 축은 분리돼 있다: 기분은 앞 단계에서 **사용자가 직접** 골랐고, 사주는 **조언**이다.
// 오늘의 오행은 서버에서 장소 점수(elementScore)에 얹힌다 — 기분을 대신 정하지 않는다.

import { useState } from 'react';
import { Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import { calcSaju, ELEMENT_META, ELEMENT_COURSE_HINT } from '@/lib/saju';
import type { SajuResult } from '@/lib/saju';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

const currentYear = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 80 }, (_, i) => currentYear - 15 - i);

export default function StepEnergy({ state, dispatch }: Props) {
  const [birthYear, setBirthYear] = useState<number>(1990);
  // 위저드 상태에서 복원한다. 스텝을 오갈 때 결과 카드가 사라지지 않게.
  const [result, setResult] = useState<SajuResult | null>(state.saju);

  const applied = state.saju !== null;
  const birthMeta = result ? ELEMENT_META[result.birthElement] : null;
  const todayMeta = result ? ELEMENT_META[result.todayElement] : null;

  const handleCalc = () => setResult(calcSaju(birthYear));

  const handleApply = () => {
    if (!result) return;
    dispatch({ type: 'SET_SAJU', value: result });
  };

  const handleReset = () => {
    dispatch({ type: 'SET_SAJU', value: null });
    setResult(null);
  };

  return (
    <div className="space-y-4">
      {/* ─── 아직 안 봤을 때 ─── */}
      {!result && (
        <div className="rounded-xl border border-brand/30 bg-brand-soft/30 p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl" aria-hidden="true">☯️</span>
            <p className="text-sm font-bold text-brand">태어난 해만 알려주세요</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label htmlFor="birth-year" className="sr-only">태어난 해</label>
              <select
                id="birth-year"
                value={birthYear}
                onChange={(e) => setBirthYear(Number(e.target.value))}
                className="w-full h-12 px-3 rounded-lg border border-line bg-surface-elevated text-sm text-ink-1 focus:outline-none focus:border-brand"
              >
                {BIRTH_YEARS.map((y) => (
                  <option key={y} value={y}>{y}년생</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleCalc}
              className="h-12 px-5 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors whitespace-nowrap"
            >
              내 기운 보기
            </button>
          </div>

          <p className="text-xs text-ink-3 mt-4 break-keep leading-relaxed">
            생년월일이 아니라 <strong className="text-ink-2 font-semibold">태어난 해</strong>만 씁니다.
            저장하지 않고, 이번 코스를 짜는 데만 써요.
          </p>
        </div>
      )}

      {/* ─── 결과 ─── */}
      {result && birthMeta && todayMeta && (
        <div className="rounded-xl border border-brand/30 bg-surface-elevated overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-br from-brand-soft/60 to-transparent border-b border-line">
            <div className="flex flex-wrap items-center gap-3">
              <div className={`text-center px-3 py-1.5 rounded-lg border text-sm font-bold ${birthMeta.color}`}>
                <span className="text-lg">{birthMeta.emoji}</span>
                <p className="text-xs mt-0.5">{birthMeta.name}</p>
              </div>
              <ArrowRight size={16} className="text-ink-4" aria-hidden="true" />
              <div className={`text-center px-3 py-1.5 rounded-lg border text-sm font-bold ${todayMeta.color}`}>
                <span className="text-lg">{todayMeta.emoji}</span>
                <p className="text-xs mt-0.5">오늘 {todayMeta.name}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-ink-4">오늘의 기운</p>
                <p className="text-sm font-bold text-ink-1">{result.headline}</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4">
            <p className="text-sm text-ink-2 leading-relaxed break-keep">{result.message}</p>

            {/* 사용자가 실제로 궁금한 건 "그래서 어디로?" 다 */}
            <div className="mt-4 flex items-center gap-3 p-4 rounded-lg bg-brand-soft/50 border border-brand/20">
              <Sparkles size={20} className="text-brand flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ink-3 break-keep">이쪽으로 가보는 건 어때요?</p>
                <p className="text-base font-bold text-brand break-keep" style={{ fontFamily: 'var(--font-display)' }}>
                  {ELEMENT_COURSE_HINT[result.todayElement]}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleApply}
                disabled={applied}
                className={`flex-1 h-12 rounded-lg text-sm font-bold transition-colors ${
                  applied
                    ? 'bg-brand-soft text-brand border border-brand/30 cursor-default'
                    : 'bg-brand text-white hover:bg-brand-hover'
                }`}
              >
                {applied ? '✓ 이 기운이 코스에 반영돼요' : '이 기운으로 코스 짜기'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-12 px-3 rounded-lg border border-line text-ink-3 hover:bg-surface-sunken transition-colors"
                aria-label="기운 다시 보기"
              >
                <RefreshCw size={16} aria-hidden="true" />
              </button>
            </div>

            <p className="text-[11px] text-ink-4 mt-3 break-keep">
              일주(日柱) 기준이라 <strong className="text-ink-3">내일 다시 보면 답이 달라져요.</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
