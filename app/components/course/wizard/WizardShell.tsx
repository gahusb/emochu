'use client';

import { useReducer, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RotateCcw, X, History } from 'lucide-react';
import type {
  Duration, Companion, Preference, Feeling,
  DestinationType, CityOption, VisitDay,
} from '@/lib/weekend-types';
import type { SajuResult } from '@/lib/saju';
import { useCourseGeneration } from '@/lib/use-course-generation';
import { FEELING_OPTIONS, DURATION_LABELS, COMPANION_LABELS } from '@/lib/weekend-types';
import Container from '@/app/components/ui/Container';
import CourseLoading from '../loading/CourseLoading';
import WizardStepper from './WizardStepper';
import WizardProgressBar from './WizardProgressBar';
import WizardNav from './WizardNav';
import StepWhereMood from './steps/StepWhereMood';
import StepEnergy from './steps/StepEnergy';
import StepWhenWho from './steps/StepWhenWho';
import StepTaste from './steps/StepTaste';
import type { AccessibilityNeed } from '@/lib/weekend-types';
import { canProceedAtStep, WIZARD_TOTAL_STEPS, type DestinationPick } from '@/lib/wizard-steps';

export interface WizardState {
  step: number;
  /** 사용자가 실제로 누른 칸. 「랜덤」은 여기에만 있고 서버로는 city 로 나간다. */
  destinationPick: DestinationPick | null;
  destinationType: DestinationType | null;
  selectedCity: CityOption | null;
  /** 도시가 주사위로 정해졌는가. 화면이 "뽑힌 곳"이라고 말할 근거다. */
  cityWasRandom: boolean;
  feeling: Feeling | null;
  /** 기분이 주사위로 정해졌는가. */
  feelingWasRandom: boolean;
  duration: Duration | null;
  companion: Companion | null;
  preferences: Preference[];
  userLocation: { lat: number; lng: number } | null;
  gpsLoading: boolean;
  saju: SajuResult | null;
  visitDay: VisitDay | null;
  /** 선택 사항. 비어 있으면 무장애 API를 호출조차 하지 않는다. */
  accessibility: AccessibilityNeed[];
}

export type WizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_DESTINATION_PICK'; value: DestinationPick }
  | { type: 'SET_CITY'; value: CityOption | null }
  | { type: 'ROLL_CITY'; value: CityOption }
  | { type: 'SET_FEELING'; value: Feeling | null; random?: boolean }
  | { type: 'SET_SAJU'; value: SajuResult | null }
  | { type: 'SET_DURATION'; value: Duration | null }
  | { type: 'SET_COMPANION'; value: Companion | null }
  | { type: 'TOGGLE_PREFERENCE'; value: Preference }
  | { type: 'SET_USER_LOCATION'; value: { lat: number; lng: number } | null }
  | { type: 'SET_GPS_LOADING'; value: boolean }
  | { type: 'SET_VISIT_DAY'; value: VisitDay }
  | { type: 'TOGGLE_ACCESSIBILITY'; value: AccessibilityNeed }
  | { type: 'RESTORE_DRAFT'; value: Partial<WizardState> };

const INITIAL: WizardState = {
  step: 0,
  destinationPick: null,
  destinationType: null,
  selectedCity: null,
  cityWasRandom: false,
  feeling: null,
  feelingWasRandom: false,
  duration: null,
  companion: null,
  preferences: [],
  userLocation: null,
  gpsLoading: false,
  saju: null,
  visitDay: 'sat',
  accessibility: [],
};

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP': return { ...state, step: action.step };
    case 'SET_DESTINATION_PICK': {
      // 「랜덤」도 결국 도시 한 곳이다 — 서버 계약(nearby|city|mood)을 흔들지 않는다.
      // 실제로 뽑힌 도시는 곧바로 이어지는 ROLL_CITY 가 채운다.
      const destinationType: DestinationType = action.value === 'nearby' ? 'nearby' : 'city';
      return {
        ...state,
        destinationPick: action.value,
        destinationType,
        selectedCity: null,
        cityWasRandom: action.value === 'random',
      };
    }
    case 'SET_CITY': return { ...state, selectedCity: action.value, cityWasRandom: false };
    case 'ROLL_CITY': return { ...state, selectedCity: action.value, cityWasRandom: true };
    case 'SET_FEELING':
      return { ...state, feeling: action.value, feelingWasRandom: action.random ?? false };
    case 'SET_SAJU': return { ...state, saju: action.value };
    case 'SET_DURATION': {
      // 1박2일은 토·일 모두 방문하므로 요일 선택을 무의미하게 만든다 → 토요일로 고정
      if (action.value === 'overnight') return { ...state, duration: action.value, visitDay: 'sat' };
      return { ...state, duration: action.value };
    }
    case 'SET_VISIT_DAY': return { ...state, visitDay: action.value };
    case 'TOGGLE_ACCESSIBILITY': {
      const has = state.accessibility.includes(action.value);
      return {
        ...state,
        accessibility: has
          ? state.accessibility.filter((a) => a !== action.value)
          : [...state.accessibility, action.value],
      };
    }
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

const TOTAL_STEPS = WIZARD_TOTAL_STEPS;
// 🔴 v2. 6스텝 시절 draft 에는 `step: 5` 가 들어 있어서 4스텝 위저드에 복구하면
//    존재하지 않는 스텝에 갇힌다. 키를 바꿔 옛 draft 를 아예 보지 않는다.
const DRAFT_KEY = 'emochu.wizard_draft.v2';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

interface DraftPayload {
  state: Partial<WizardState>;
  savedAt: number;
}

const STEP_META = [
  {
    title: '어디로',
    question: '어디로 떠나볼까요?',
    sub: '고르고 나면 기분도 이어서 물어볼게요.',
  },
  {
    title: '내 기운',
    question: '이번 주 당신의 기운이…',
    sub: '이쪽으로 가보는 건 어때요? 안 봐도 코스는 나와요.',
  },
  {
    title: '언제·누구랑',
    question: '언제, 누구랑 가요?',
    sub: '방문하는 날에 맞춰 문 여는 곳만 골라드려요.',
  },
  {
    title: '취향',
    question: '뭐가 끌려요?',
    sub: '여러 개 골라도 좋아요.',
  },
];

const STEP_COMPONENTS = [StepWhereMood, StepEnergy, StepWhenWho, StepTaste];

export default function WizardShell() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const { loading, error, errorSuggestions, generate, loadingMessage } = useCourseGeneration();
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [courseHistory, setCourseHistory] = useState<Array<{ slug: string; title: string; createdAt: number }>>([]);
  const isMounted = useRef(false);

  // 마운트 시 draft 복구 확인 + 코스 히스토리 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const { state: saved, savedAt } = JSON.parse(raw) as DraftPayload;
        if (Date.now() - savedAt < DRAFT_TTL_MS && (saved.step ?? 0) > 0) {
          setShowResumeBanner(true);
        }
      }
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem('emochu.course_history');
      if (raw) setCourseHistory(JSON.parse(raw));
    } catch { /* ignore */ }
    isMounted.current = true;
  }, []);

  // state 변경 시 draft 자동저장 (마운트 직후 초기 상태 저장 방지)
  useEffect(() => {
    if (!isMounted.current) return;
    if (state.step === 0 && !state.destinationPick) return;
    try {
      const payload: DraftPayload = {
        state: {
          step: state.step,
          destinationPick: state.destinationPick,
          destinationType: state.destinationType,
          selectedCity: state.selectedCity,
          cityWasRandom: state.cityWasRandom,
          feeling: state.feeling,
          feelingWasRandom: state.feelingWasRandom,
          duration: state.duration,
          companion: state.companion,
          preferences: state.preferences,
          visitDay: state.visitDay,
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
      // 저장된 step 이 범위를 벗어나면 첫 스텝으로. 갇히는 것보다 낫다.
      const step = Math.min(Math.max(saved.step ?? 0, 0), TOTAL_STEPS - 1);
      dispatch({ type: 'RESTORE_DRAFT', value: { ...saved, step } });
    } catch { /* ignore */ }
    setShowResumeBanner(false);
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (state.destinationPick !== 'nearby' || state.userLocation) return;
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
  }, [state.destinationPick, state.userLocation]);

  // 진행 조건은 lib/wizard-steps.ts 의 순수 함수가 결정한다 —
  // 컴포넌트 안에 두면 "실제로 진행되는가"를 테스트로 증명할 수 없다.
  const canProceed = canProceedAtStep(state.step, state);

  const getRequestLocation = () => {
    if (state.destinationType === 'city' && state.selectedCity) {
      return { lat: state.selectedCity.lat, lng: state.selectedCity.lng };
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
        saju: state.saju ?? undefined,
        visitDay: state.duration === 'overnight' ? undefined : state.visitDay ?? undefined,
        // 빈 배열이 아니라 undefined 로 보낸다 — 서버가 "조건 없음"을 확실히 알아야
        // 무장애 API 를 호출조차 하지 않는다.
        accessibility: state.accessibility.length > 0 ? state.accessibility : undefined,
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

  const placeLabel =
    state.destinationPick === 'nearby' ? '현 위치'
    : state.selectedCity ? `${state.selectedCity.name}${state.cityWasRandom ? ' 🎲' : ''}`
    : null;

  const stepSummaries: (string | null)[] = [
    placeLabel && feelingLabel ? `${placeLabel} · ${feelingLabel}` : placeLabel,
    state.saju ? state.saju.headline : '건너뜀',
    durationLabel && state.duration !== 'overnight' && state.visitDay
      ? `${state.visitDay === 'sat' ? '토' : '일'} · ${durationLabel}${companionLabel ? ` · ${companionLabel}` : ''}`
      : durationLabel
        ? `${durationLabel}${companionLabel ? ` · ${companionLabel}` : ''}`
        : null,
    state.preferences.length > 0 ? `${state.preferences.length}개 선택` : null,
  ];

  const meta = STEP_META[state.step];
  const CurrentStep = STEP_COMPONENTS[state.step];
  // 사주 스텝에서 아직 아무것도 안 봤다면 「다음」이 아니라 「건너뛰기」다 —
  // 버튼이 사실을 말해야 사용자가 안심하고 넘어간다.
  const nextLabel = state.step === 1 && !state.saju ? '건너뛰기' : undefined;

  return (
    <>
      <WizardProgressBar current={state.step} total={TOTAL_STEPS} />

      {/* 직접 만들지 않아도 되는 길 — 1단계에서만 보인다. 2단계부터는 마법사
          흐름 한가운데라 방해가 된다. */}
      {state.step === 0 && (
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-3">
          <Link
            href="/community"
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-3 hover:text-brand transition-colors"
          >
            직접 만들지 않아도 돼요 — 다른 사람이 만든 코스 보기
          </Link>
        </div>
      )}

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

      {/* 최근 코스 히스토리 */}
      {courseHistory.length > 0 && (
        <div className="border-b border-line bg-surface-base">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-3 flex items-center gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <History size={14} className="text-ink-4 flex-shrink-0" aria-hidden="true" />
            <span className="text-xs text-ink-4 flex-shrink-0">최근 코스</span>
            <div className="flex gap-2">
              {courseHistory.map((h) => (
                <Link
                  key={h.slug}
                  href={`/course/${h.slug}`}
                  className="flex-shrink-0 text-xs font-medium text-ink-2 bg-surface-sunken hover:bg-surface-elevated border border-line rounded-full px-3 py-1.5 transition-colors whitespace-nowrap"
                >
                  {h.title}
                </Link>
              ))}
            </div>
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
            <p className="text-sm text-ink-3 mt-2 break-keep">{meta.sub}</p>
            <div className="mt-6">
              <CurrentStep state={state} dispatch={dispatch} />
            </div>
            {error && (
              <div className="mt-4">
                <p role="alert" className="text-sm text-brand">{error}</p>
                {errorSuggestions && errorSuggestions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-ink-3 mb-2">대신 이런 코스는 어때요?</p>
                    <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                      {errorSuggestions.map((s) => (
                        <Link
                          key={s.slug}
                          href={`/course/${s.slug}`}
                          className="flex-shrink-0 text-xs font-medium text-ink-2 bg-surface-sunken hover:bg-surface-elevated border border-line rounded-full px-3 py-1.5 transition-colors whitespace-nowrap"
                        >
                          {s.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="mt-10">
              <WizardNav
                canGoBack={state.step > 0}
                canProceed={canProceed}
                isLast={state.step === TOTAL_STEPS - 1}
                nextLabel={nextLabel}
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
