'use client';

import { useState } from 'react';
import { Battery, Zap, Heart, Leaf, Compass, UtensilsCrossed, Sparkles, RefreshCw } from 'lucide-react';
import { FEELING_OPTIONS } from '@/lib/weekend-types';
import type { Feeling } from '@/lib/weekend-types';
import { calcSaju, ELEMENT_META } from '@/lib/saju';
import type { SajuResult } from '@/lib/saju';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

const FEELING_ICONS: Record<string, ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  tired: Battery,
  excited: Zap,
  romantic: Heart,
  healing: Leaf,
  adventurous: Compass,
  foodie: UtensilsCrossed,
};

const FEELING_LABELS: Record<Feeling, string> = {
  tired: '쉬고 싶어요',
  excited: '에너지 넘쳐요!',
  romantic: '로맨틱한 기분',
  healing: '힐링이 필요해요',
  adventurous: '새로운 경험!',
  foodie: '맛집 탐방',
};

const currentYear = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 80 }, (_, i) => currentYear - 15 - i);

export default function StepFeeling({ state, dispatch }: Props) {
  const [showSaju, setShowSaju] = useState(false);
  const [birthYear, setBirthYear] = useState<number>(1990);
  const [sajuResult, setSajuResult] = useState<SajuResult | null>(null);

  const handleCalcSaju = () => {
    const result = calcSaju(birthYear);
    setSajuResult(result);
  };

  const handleApplySaju = () => {
    if (!sajuResult) return;
    dispatch({ type: 'SET_FEELING', value: sajuResult.feeling });
    setShowSaju(false);
  };

  const handleResetSaju = () => {
    setSajuResult(null);
    setShowSaju(false);
  };

  const birthMeta = sajuResult ? ELEMENT_META[sajuResult.birthElement] : null;
  const todayMeta = sajuResult ? ELEMENT_META[sajuResult.todayElement] : null;
  const recommendedLabel = sajuResult ? FEELING_LABELS[sajuResult.feeling] : '';
  const RecommendedIcon = sajuResult ? (FEELING_ICONS[sajuResult.feeling] ?? Heart) : Heart;

  return (
    <div className="space-y-4">
      {/* ─── 일반 기분 선택 ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {FEELING_OPTIONS.map((opt) => {
          const selected = state.feeling === opt.type;
          const Icon = FEELING_ICONS[opt.type] ?? Heart;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => {
                dispatch({ type: 'SET_FEELING', value: opt.type as Feeling });
                setSajuResult(null);
                setShowSaju(false);
              }}
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

      {/* ─── 사주 구분선 ─── */}
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-line" />
        <span className="text-xs text-ink-4 font-medium">또는</span>
        <div className="flex-1 h-px bg-line" />
      </div>

      {/* ─── 사주 영역 ─── */}
      {!showSaju && !sajuResult && (
        <button
          type="button"
          onClick={() => setShowSaju(true)}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-xl border border-dashed border-brand/40 bg-brand-soft/40 hover:bg-brand-soft transition-colors text-left"
        >
          <span className="text-2xl" aria-hidden="true">☯️</span>
          <div>
            <p className="text-sm font-bold text-brand">사주로 오늘의 기운 받기</p>
            <p className="text-xs text-ink-3 mt-0.5">출생연도로 오늘 나에게 맞는 코스를 추천받아요</p>
          </div>
          <Sparkles size={16} className="text-brand ml-auto flex-shrink-0" />
        </button>
      )}

      {/* ─── 출생연도 입력 ─── */}
      {showSaju && !sajuResult && (
        <div className="rounded-xl border border-brand/30 bg-brand-soft/30 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">☯️</span>
            <p className="text-sm font-bold text-brand">오늘의 기운 확인하기</p>
          </div>
          <div>
            <label htmlFor="birth-year" className="text-xs font-semibold text-ink-3 mb-2 block">
              태어난 해
            </label>
            <select
              id="birth-year"
              value={birthYear}
              onChange={(e) => setBirthYear(Number(e.target.value))}
              className="w-full h-11 px-3 rounded-lg border border-line bg-surface-elevated text-sm text-ink-1 focus:outline-none focus:border-brand"
            >
              {BIRTH_YEARS.map((y) => (
                <option key={y} value={y}>{y}년생</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCalcSaju}
              className="flex-1 h-11 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors"
            >
              기운 확인하기
            </button>
            <button
              type="button"
              onClick={() => setShowSaju(false)}
              className="h-11 px-4 rounded-lg border border-line text-sm text-ink-3 hover:bg-surface-sunken transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ─── 사주 결과 ─── */}
      {sajuResult && birthMeta && todayMeta && (
        <div className="rounded-xl border border-brand/30 bg-surface-elevated overflow-hidden">
          {/* 헤더: 기운 시각화 */}
          <div className="px-5 py-4 bg-gradient-to-br from-brand-soft/60 to-transparent border-b border-line">
            <div className="flex items-center gap-3">
              <div className={`text-center px-3 py-1.5 rounded-lg border text-sm font-bold ${birthMeta.color}`}>
                <span className="text-lg">{birthMeta.emoji}</span>
                <p className="text-xs mt-0.5">{birthMeta.name}</p>
              </div>
              <div className="text-ink-4 text-lg">↔</div>
              <div className={`text-center px-3 py-1.5 rounded-lg border text-sm font-bold ${todayMeta.color}`}>
                <span className="text-lg">{todayMeta.emoji}</span>
                <p className="text-xs mt-0.5">오늘 {todayMeta.name}</p>
              </div>
              <div className="ml-auto">
                <p className="text-xs text-ink-4">오늘의 기운</p>
                <p className="text-sm font-bold text-ink-1">{sajuResult.headline}</p>
              </div>
            </div>
          </div>

          {/* 메시지 */}
          <div className="px-5 py-4">
            <p className="text-sm text-ink-2 leading-relaxed break-keep">{sajuResult.message}</p>

            {/* 추천 기분 */}
            <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-brand-soft/50 border border-brand/20">
              <RecommendedIcon size={18} className="text-brand flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-ink-4">추천 코스 기운</p>
                <p className="text-sm font-bold text-brand">{recommendedLabel}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleApplySaju}
                className="flex-1 h-11 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors"
              >
                이 기운으로 코스 만들기
              </button>
              <button
                type="button"
                onClick={handleResetSaju}
                className="h-11 px-3 rounded-lg border border-line text-ink-3 hover:bg-surface-sunken transition-colors"
                aria-label="다시 선택"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
