import { MapPin, Building2, Sparkles, Loader2 } from 'lucide-react';
import { CITY_OPTIONS, MOOD_OPTIONS } from '@/lib/weekend-types';
import type { WizardState, WizardAction } from '../WizardShell';
import type { Dispatch } from 'react';

interface Props { state: WizardState; dispatch: Dispatch<WizardAction>; }

const DESTINATION_TYPES = [
  { type: 'nearby', label: '내 주변', Icon: MapPin, desc: 'GPS 기반' },
  { type: 'city', label: '도시 선택', Icon: Building2, desc: '가고 싶은 곳' },
  { type: 'mood', label: '분위기', Icon: Sparkles, desc: '기분에 맞게' },
] as const;

export default function StepDestination({ state, dispatch }: Props) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {DESTINATION_TYPES.map(({ type, label, Icon, desc }) => {
          const selected = state.destinationType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => dispatch({ type: 'SET_DESTINATION_TYPE', value: type })}
              aria-pressed={selected}
              className={`flex flex-col items-center gap-2 px-3 py-5 rounded-lg border transition-colors ${
                selected
                  ? 'bg-brand-soft border-brand ring-2 ring-brand/20'
                  : 'bg-surface-elevated border-line hover:border-ink-4'
              }`}
            >
              <Icon size={24} strokeWidth={1.75} className={selected ? 'text-brand' : 'text-ink-3'} />
              <span className="text-sm font-semibold text-ink-1">{label}</span>
              <span className="text-[11px] text-ink-3">{desc}</span>
            </button>
          );
        })}
      </div>

      {state.destinationType === 'nearby' && (
        <div className="px-4 py-3 rounded-lg bg-surface-sunken border border-line">
          {state.gpsLoading ? (
            <p className="text-sm text-ink-3 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> 위치를 찾고 있어요...</p>
          ) : state.userLocation ? (
            <p className="text-sm text-ink-2 flex items-center gap-2"><MapPin size={14} className="text-brand" /> 현재 위치 기준으로 추천해드려요</p>
          ) : (
            <p className="text-sm text-ink-3">위치를 못 찾았어요. 서울 기준으로 추천할게요.</p>
          )}
        </div>
      )}

      {state.destinationType === 'city' && (
        <div>
          <p className="text-xs font-semibold text-ink-3 mb-3">어디로 가고 싶어요?</p>
          <div className="grid grid-cols-4 gap-2">
            {CITY_OPTIONS.map((city) => {
              const selected = state.selectedCity?.name === city.name;
              return (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_CITY', value: city })}
                  aria-pressed={selected}
                  className={`flex items-center justify-center px-2 py-3 rounded-md border text-xs font-semibold transition-colors ${
                    selected ? 'bg-brand-soft border-brand text-brand' : 'bg-surface-elevated border-line text-ink-2 hover:border-ink-4'
                  }`}
                >{city.name}</button>
              );
            })}
          </div>
        </div>
      )}

      {state.destinationType === 'mood' && (
        <div>
          <p className="text-xs font-semibold text-ink-3 mb-3">어떤 분위기가 끌려요?</p>
          <div className="grid grid-cols-1 gap-2">
            {MOOD_OPTIONS.map((mood) => {
              const selected = state.selectedMood === mood.type;
              return (
                <button
                  key={mood.type}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_MOOD', value: mood.type })}
                  aria-pressed={selected}
                  className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                    selected ? 'bg-brand-soft border-brand' : 'bg-surface-elevated border-line hover:border-ink-4'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-ink-1">{mood.label}</p>
                    {'description' in mood && mood.description && (
                      <p className="text-xs text-ink-3 mt-0.5">{String(mood.description)}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
