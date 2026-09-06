'use client';

// 1단계 — 「어디로, 어떤 기분으로」.
//
// 🔴 2026-09-04. 예전엔 목적지와 기분이 **다른 스텝**이었다. 그래서 목적지를 고르고
//    「다음」을 누르면 화면이 통째로 갈아엎이고, 방금 고른 것과 지금 묻는 것 사이의
//    관계가 끊겼다. 둘은 사실 한 문장이다 — "제주로, 힐링하러."
//    장소를 정하면 기분 질문이 **그 아래에 이어서 나타난다.**
//
// 🎲 「랜덤」은 목적지 3번째 칸이다. 뽑은 결과를 숨기지 않고 이름으로 보여주고
//    다시 뽑을 기회를 준다 — 안 보여주면 랜덤이 아니라 정체불명 버튼이 된다.

import { MapPin, Building2, Dices, Loader2, RefreshCw, Battery, Zap, Heart, Leaf, Compass, UtensilsCrossed } from 'lucide-react';
import { CITY_OPTIONS, FEELING_OPTIONS } from '@/lib/weekend-types';
import type { CityOption, Feeling } from '@/lib/weekend-types';
import { pickRandom, pickRandomExcept } from '@/lib/random-pick';
import { hasDestination, type DestinationPick } from '@/lib/wizard-steps';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch, ComponentType } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

type IconComp = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const DESTINATION_PICKS: { pick: DestinationPick; label: string; Icon: IconComp; desc: string }[] = [
  { pick: 'nearby', label: '현 위치',   Icon: MapPin,    desc: '지금 있는 곳 근처' },
  { pick: 'city',   label: '도시 선택', Icon: Building2, desc: '가고 싶은 곳으로' },
  { pick: 'random', label: '랜덤',      Icon: Dices,     desc: '이모추가 뽑아드림' },
];

const FEELING_ICONS: Record<string, IconComp> = {
  tired: Battery,
  excited: Zap,
  romantic: Heart,
  healing: Leaf,
  adventurous: Compass,
  foodie: UtensilsCrossed,
};

/** 도시 이름이 같으면 같은 곳으로 본다 — 속초·강릉이 areaCode 를 공유한다(둘 다 32). */
const sameCity = (a: CityOption, b: CityOption) => a.name === b.name;

export default function StepWhereMood({ state, dispatch }: Props) {
  const destinationReady = hasDestination(state);

  const handlePick = (pick: DestinationPick) => {
    dispatch({ type: 'SET_DESTINATION_PICK', value: pick });
    // 랜덤은 고르는 즉시 결과가 나와야 한다. 한 번 더 누르게 하면 그건 랜덤이 아니라 2단계다.
    if (pick === 'random') {
      dispatch({ type: 'ROLL_CITY', value: pickRandom(CITY_OPTIONS) });
    }
  };

  const handleReroll = () => {
    dispatch({
      type: 'ROLL_CITY',
      value: pickRandomExcept(CITY_OPTIONS, state.selectedCity, Math.random, sameCity),
    });
  };

  const handleRandomFeeling = () => {
    const next = pickRandomExcept(FEELING_OPTIONS, FEELING_OPTIONS.find(f => f.type === state.feeling) ?? null, Math.random, (a, b) => a.type === b.type);
    dispatch({ type: 'SET_FEELING', value: next.type as Feeling, random: true });
  };

  return (
    <div className="space-y-6">
      {/* ─── 어디로 ─── */}
      <div>
        <div className="grid grid-cols-3 gap-3">
          {DESTINATION_PICKS.map(({ pick, label, Icon, desc }) => {
            const selected = state.destinationPick === pick;
            return (
              <button
                key={pick}
                type="button"
                onClick={() => handlePick(pick)}
                aria-pressed={selected}
                className={`flex flex-col items-center gap-2 px-3 py-5 rounded-xl border transition-colors ${
                  selected
                    ? 'bg-brand-soft border-brand ring-2 ring-brand/20'
                    : 'bg-surface-elevated border-line hover:border-ink-4'
                }`}
              >
                <Icon size={24} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
                <span className="text-sm font-semibold text-ink-1">{label}</span>
                <span className="text-[11px] text-ink-3 text-center leading-tight break-keep">{desc}</span>
              </button>
            );
          })}
        </div>

        {/* 현 위치 — GPS 상태를 숨기지 않는다 */}
        {state.destinationPick === 'nearby' && (
          <div className="mt-3 px-4 py-3 rounded-lg bg-surface-sunken border border-line">
            {state.gpsLoading ? (
              <p className="text-sm text-ink-3 flex items-center gap-2">
                <Loader2 size={14} className="motion-safe:animate-spin" /> 위치를 찾고 있어요...
              </p>
            ) : state.userLocation ? (
              <p className="text-sm text-ink-2 flex items-center gap-2">
                <MapPin size={14} className="text-brand" /> 현재 위치 기준으로 짜드릴게요
              </p>
            ) : (
              <p className="text-sm text-ink-3">위치를 못 찾았어요. 서울 기준으로 짤게요.</p>
            )}
          </div>
        )}

        {/* 도시 직접 고르기 */}
        {state.destinationPick === 'city' && (
          <div className="mt-4">
            <div className="grid grid-cols-4 gap-2">
              {CITY_OPTIONS.map((city) => {
                const selected = state.selectedCity?.name === city.name;
                return (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => dispatch({ type: 'SET_CITY', value: city })}
                    aria-pressed={selected}
                    className={`flex flex-col items-center gap-0.5 px-2 py-3 rounded-lg border text-xs font-semibold transition-colors ${
                      selected
                        ? 'bg-brand-soft border-brand text-brand'
                        : 'bg-surface-elevated border-line text-ink-2 hover:border-ink-4'
                    }`}
                  >
                    <span className="text-base leading-none" aria-hidden="true">{city.emoji}</span>
                    {city.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 랜덤 결과 — 뽑힌 곳을 이름으로 보여준다 */}
        {state.destinationPick === 'random' && state.selectedCity && (
          <div
            key={state.selectedCity.name}
            className="mt-3 roll-in flex items-center gap-4 px-5 py-4 rounded-xl border border-brand/40 bg-brand-soft/50"
          >
            <span className="text-3xl leading-none flex-shrink-0" aria-hidden="true">
              {state.selectedCity.emoji}
            </span>
            <div className="min-w-0" aria-live="polite">
              <p className="text-xs text-ink-3">이모추가 뽑은 곳</p>
              <p className="text-lg font-bold text-brand" style={{ fontFamily: 'var(--font-display)' }}>
                {state.selectedCity.name}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReroll}
              className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-line bg-surface-elevated text-xs font-semibold text-ink-2 hover:border-brand hover:text-brand transition-colors"
            >
              <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
              다시 뽑기
            </button>
          </div>
        )}
      </div>

      {/* ─── 그리고 기분 — 장소가 정해져야 나타난다 ─── */}
      {destinationReady && (
        <div className="reveal-down">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-line" />
            <p className="text-sm font-bold text-ink-1 break-keep" style={{ fontFamily: 'var(--font-display)' }}>
              그럼, 오늘 기분은 어때요?
            </p>
            <div className="h-px flex-1 bg-line" />
          </div>

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
                    selected ? 'bg-brand-soft border-brand ring-2 ring-brand/20' : 'bg-surface-elevated border-line hover:border-ink-4'
                  }`}
                >
                  <Icon size={22} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
                  <span className="text-sm font-semibold text-ink-1">{opt.label}</span>
                  <span className="text-xs text-ink-3 break-keep">{opt.description}</span>
                </button>
              );
            })}
          </div>

          {/* 기분도 랜덤으로 — "몰라, 아무거나" 도 정당한 대답이다 */}
          <button
            type="button"
            onClick={handleRandomFeeling}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-dashed border-brand/40 text-sm font-semibold text-brand hover:bg-brand-soft/60 transition-colors"
          >
            <Dices size={16} strokeWidth={2} aria-hidden="true" />
            모르겠어요, 아무거나 뽑아주세요
          </button>

          {state.feelingWasRandom && state.feeling && (
            <p className="mt-2 text-xs text-ink-3 text-center" aria-live="polite">
              🎲 「{FEELING_OPTIONS.find((f) => f.type === state.feeling)?.label}」가 뽑혔어요. 마음에 안 들면 위에서 바꿔도 돼요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
