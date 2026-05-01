'use client';

import { useReducer, useEffect, useRef, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import type {
  Duration, Companion, Preference, Feeling,
  DestinationType, MoodType, CityOption,
} from '@/lib/weekend-types';
import { useCourseGeneration } from '@/lib/use-course-generation';
import { CITY_OPTIONS, MOOD_OPTIONS, FEELING_OPTIONS, DURATION_LABELS, COMPANION_LABELS } from '@/lib/weekend-types';
import Container from '@/app/components/ui/Container';
import CourseLoading from '../loading/CourseLoading';
import WizardStepper from './WizardStepper';
import WizardProgressBar from './WizardProgressBar';
import WizardNav from './WizardNav';
import StepDestination from './steps/StepDestination';
import StepFeeling from './steps/StepFeeling';
import StepDuration from './steps/StepDuration';
import StepCompanion from './steps/StepCompanion';
import StepPreferences from './steps/StepPreferences';

export interface WizardState {
  step: number;
  destinationType: DestinationType | null;
  selectedCity: CityOption | null;
  selectedMood: MoodType | null;
  feeling: Feeling | null;
  duration: Duration | null;
  companion: Companion | null;
  preferences: Preference[];
  userLocation: { lat: number; lng: number } | null;
  gpsLoading: boolean;
}

export type WizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_DESTINATION_TYPE'; value: DestinationType | null }
  | { type: 'SET_CITY'; value: CityOption | null }
  | { type: 'SET_MOOD'; value: MoodType | null }
  | { type: 'SET_FEELING'; value: Feeling | null }
  | { type: 'SET_DURATION'; value: Duration | null }
  | { type: 'SET_COMPANION'; value: Companion | null }
  | { type: 'TOGGLE_PREFERENCE'; value: Preference }
  | { type: 'SET_USER_LOCATION'; value: { lat: number; lng: number } | null }
  | { type: 'SET_GPS_LOADING'; value: boolean }
  | { type: 'RESTORE_DRAFT'; value: Partial<WizardState> };

const INITIAL: WizardState = {
  step: 0,
  destinationType: null,
  selectedCity: null,
  selectedMood: null,
  feeling: null,
  duration: null,
  companion: null,
  preferences: [],
  userLocation: null,
  gpsLoading: false,
};

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP': return { ...state, step: action.step };
    case 'SET_DESTINATION_TYPE': {
      const next: WizardState = { ...state, destinationType: action.value };
      if (action.value !== 'city') next.selectedCity = null;
      if (action.value !== 'mood') next.selectedMood = null;
      return next;
    }
    case 'SET_CITY': return { ...state, selectedCity: action.value };
    case 'SET_MOOD': return { ...state, selectedMood: action.value };
    case 'SET_FEELING': return { ...state, feeling: action.value };
    case 'SET_DURATION': return { ...state, duration: action.value };
    case 'SET_COMPANION': return { ...state, companion: action.value };
    case 'TOGGLE_PREFERENCE': {
      const exists = state.preferences.includes(action.value);
      return { ...state, preferences: exists ? state.preferences.filter(p => p !== action.value) : [...state.preferences, action.value] };
    }
    case 'SET_USER_LOCATION': return { ...state, userLocation: action.value };
    case 'SET_GPS_LOADING': return { ...state, gpsLoading: action.value };
    case 'RESTORE_DRAFT': return { ...state, ...action.value, userLocation: null, gpsLoading: false };
    default: return state;
  }
}

const TOTAL_STEPS = 5;
const DRAFT_KEY = 'emochu.wizard_draft';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

interface DraftPayload {
  state: Partial<WizardState>;
  savedAt: number;
}

const STEP_META = [
  { title: '목적지', question: '어디로 떠나볼까요?', sub: '가고 싶은 스타일을 골라주세요.' },
  { title: '기분', question: '오늘 기분이 어때요?', sub: '기분에 맞는 코스를 AI가 맞춰드릴게요.' },
  { title: '시간', question: '얼마나 놀 수 있어요?', sub: '시간 여유에 맞게 코스를 짜드릴게요.' },
  { title: '동반자', question: '누구랑 가요?', sub: '함께하는 사람에 따라 추천이 달라져요.' },
  { title: '취향', question: '뭐가 끌려요?', sub: '여러 개 골라도 좋아요.' },
];

export default function WizardShell() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const { loading, error, generate, loadingMessage } = useCourseGeneration();
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const isMounted = useRef(false);

  // 마운트 시 draft 복구 확인
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const { state: saved, savedAt } = JSON.parse(raw) as DraftPayload;
      if (Date.now() - savedAt < DRAFT_TTL_MS && (saved.step ?? 0) > 0) {
        setShowResumeBanner(true);
      }
    } catch { /* ignore */ }
    isMounted.current = true;
  }, []);

  // state 변경 시 draft 자동저장 (마운트 직후 초기 상태 저장 방지)
  useEffect(() => {
    if (!isMounted.current) return;
    if (state.step === 0 && !state.destinationType) return;
    try {
      const payload: DraftPayload = {
        state: {
          step: state.step,
          destinationType: state.destinationType,
          selectedCity: state.selectedCity,
          selectedMood: state.selectedMood,
          feeling: state.feeling,
          duration: state.duration,
          companion: state.companion,
          preferences: state.preferences,
        },
        savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch { /* ignore */ }
  }, [state]);

  const handleResume = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const { state: saved } = JSON.parse(raw) as DraftPayload;
      dispatch({ type: 'RESTORE_DRAFT', value: saved });
    } catch { /* ignore */ }
    setShowResumeBanner(false);
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (state.destinationType !== 'nearby' || state.userLocation) return;
    dispatch({ type: 'SET_GPS_LOADING', value: true });
    if (!navigator.geolocation) {
      dispatch({ type: 'SET_USER_LOCATION', value: { lat: 37.5665, lng: 126.9780 } });
      dispatch({ type: 'SET_GPS_LOADING', value: false });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        dispatch({ type: 'SET_USER_LOCATION', value: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
        dispatch({ type: 'SET_GPS_LOADING', value: false });
      },
      () => {
        dispatch({ type: 'SET_USER_LOCATION', value: { lat: 37.5665, lng: 126.9780 } });
        dispatch({ type: 'SET_GPS_LOADING', value: false });
      },
      { timeout: 5000 },
    );
  }, [state.destinationType, state.userLocation]);

  const step0Complete =
    state.destinationType === 'nearby' ||
    (state.destinationType === 'city' && state.selectedCity !== null) ||
    (state.destinationType === 'mood' && state.selectedMood !== null);

  const canProceed =
    (state.step === 0 && step0Complete) ||
    (state.step === 1 && state.feeling !== null) ||
    (state.step === 2 && state.duration !== null) ||
    (state.step === 3 && state.companion !== null) ||
    (state.step === 4 && state.preferences.length > 0);

  const getRequestLocation = () => {
    if (state.destinationType === 'city' && state.selectedCity) {
      return { lat: state.selectedCity.lat, lng: state.selectedCity.lng };
    }
    if (state.destinationType === 'mood' && state.selectedMood) {
      const mood = MOOD_OPTIONS.find(m => m.type === state.selectedMood);
      if (mood) {
        const city = CITY_OPTIONS.find(c => c.areaCode === mood.areaCodes[0]);
        if (city) return { lat: city.lat, lng: city.lng };
      }
    }
    return state.userLocation ?? { lat: 37.5665, lng: 126.9780 };
  };

  const handleNext = () => {
    if (state.step < TOTAL_STEPS - 1) {
      dispatch({ type: 'SET_STEP', step: state.step + 1 });
    } else if (state.duration && state.companion && state.preferences.length > 0) {
      clearDraft();
      const loc = getRequestLocation();
      generate({
        ...loc,
        duration: state.duration,
        companion: state.companion,
        preferences: state.preferences,
        feeling: state.feeling ?? undefined,
        destinationType: state.destinationType ?? 'nearby',
        cityAreaCode: state.selectedCity?.areaCode != null ? String(state.selectedCity.areaCode) : undefined,
        mood: state.selectedMood,
      });
    }
  };

  const handlePrev = () => {
    if (state.step > 0) dispatch({ type: 'SET_STEP', step: state.step - 1 });
  };

  if (loading) {
    return <CourseLoading message={loadingMessage} />;
  }

  const feelingLabel = state.feeling ? FEELING_OPTIONS.find(o => o.type === state.feeling)?.label ?? null : null;
  const durationLabel = state.duration ? DURATION_LABELS[state.duration] : null;
  const companionLabel = state.companion ? COMPANION_LABELS[state.companion] : null;

  const stepSummaries: (string | null)[] = [
    state.destinationType === 'nearby' ? '내 주변'
      : state.destinationType === 'city' ? state.selectedCity?.name ?? null
      : state.destinationType === 'mood' ? MOOD_OPTIONS.find(m => m.type === state.selectedMood)?.label ?? null
      : null,
    feelingLabel,
    durationLabel,
    companionLabel,
    state.preferences.length > 0 ? `${state.preferences.length}개 선택` : null,
  ];

  const meta = STEP_META[state.step];
  const CurrentStep = [StepDestination, StepFeeling, StepDuration, StepCompanion, StepPreferences][state.step];

  return (
    <>
      <WizardProgressBar current={state.step} total={TOTAL_STEPS} />

      {/* Draft 복구 배너 */}
      {showResumeBanner && (
        <div className="bg-brand-soft border-b border-brand/20">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-3 flex items-center gap-3">
            <RotateCcw size={16} className="text-brand flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-ink-2 flex-1 break-keep">
              이전에 입력하던 코스가 있어요.
            </p>
            <button
              type="button"
              onClick={handleResume}
              className="text-xs font-semibold text-brand whitespace-nowrap hover:underline"
            >
              이어서 하기
            </button>
            <button
              type="button"
              onClick={() => { clearDraft(); setShowResumeBanner(false); }}
              className="text-ink-4 hover:text-ink-2 flex-shrink-0"
              aria-label="닫기"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      <Container>
        <div className="py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-10">
          <aside className="hidden lg:block">
            <WizardStepper
              current={state.step}
              titles={STEP_META.map(s => s.title)}
              summaries={stepSummaries}
              onJump={(i) => i <= state.step && dispatch({ type: 'SET_STEP', step: i })}
            />
          </aside>
          <section className="min-w-0">
            <h2 className="text-2xl lg:text-3xl font-bold text-ink-1 break-keep" style={{ fontFamily: 'var(--font-display)' }}>
              {meta.question}
            </h2>
            <p className="text-sm text-ink-3 mt-2">{meta.sub}</p>
            <div className="mt-6">
              <CurrentStep state={state} dispatch={dispatch} />
            </div>
            {error && (
              <p role="alert" className="mt-4 text-sm text-brand">{error}</p>
            )}
            <div className="mt-10">
              <WizardNav
                canGoBack={state.step > 0}
                canProceed={canProceed}
                isLast={state.step === TOTAL_STEPS - 1}
                onPrev={handlePrev}
                onNext={handleNext}
              />
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}
