'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  type Duration,
  type Companion,
  type Preference,
  type Feeling,
  type DestinationType,
  type MoodType,
  type CityOption,
  DURATION_LABELS,
  COMPANION_LABELS,
  COMPANION_ICONS,
  PREFERENCE_LABELS,
  PREFERENCE_ICONS,
  CITY_OPTIONS,
  MOOD_OPTIONS,
  FEELING_OPTIONS,
} from '@/lib/weekend-types';
import WeekendHeader from './WeekendHeader';
import BottomTabBar from './BottomTabBar';
import { PREFERENCE_SUB_CATEGORIES } from '@/lib/tour-api';

const DURATIONS: Duration[] = ['half_day', 'full_day', 'leisurely', 'overnight'];
const COMPANIONS: Companion[] = ['solo', 'couple', 'family', 'friends'];
const PREFERENCES: Preference[] = ['nature', 'food', 'culture', 'cafe', 'activity', 'photo'];

const DURATION_EMOJIS: Record<Duration, string> = {
  half_day: '🕐',
  full_day: '🌅',
  leisurely: '🛋️',
  overnight: '🏨',
};

const TOTAL_STEPS = 5;

const LOADING_STEPS = [
  { emoji: '🔍', text: '주변 관광지 검색 중...' },
  { emoji: '🍽️', text: '맛집 찾는 중...' },
  { emoji: '☕', text: '카페도 빠질 수 없죠...' },
  { emoji: '🎪', text: '근처 축제 확인 중...' },
  { emoji: '🤖', text: 'AI가 최적 코스 설계 중...' },
  { emoji: '✨', text: '거의 다 됐어요!' },
];

const STEP_TITLES = [
  { q: '어디로 떠나볼까요?', sub: '목적지를 정하면 딱 맞는 코스를 찾아드릴게요' },
  { q: '오늘 기분이 어때요?', sub: '기분에 맞는 코스를 AI가 맞춰드릴게요' },
  { q: '얼마나 놀 수 있어요?', sub: '시간 여유에 맞게 코스를 짜드릴게요' },
  { q: '누구랑 가요?', sub: '함께하는 사람에 따라 추천이 달라져요' },
  { q: '뭐가 끌려요?', sub: '여러 개 골라도 좋아요!' },
];

export default function CourseWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 0: 목적지
  const [destinationType, setDestinationType] = useState<DestinationType | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);

  // Step 1: 감정
  const [feeling, setFeeling] = useState<Feeling | null>(null);

  // Step 2~4: 기존 선택
  const [duration, setDuration] = useState<Duration | null>(null);
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [subCategories, setSubCategories] = useState<{preference: string; subLabels: string[]}[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // GPS 위치 가져오기 (nearby 선택 시)
  const requestGps = () => {
    if (userLocation) return;
    setGpsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsLoading(false);
        },
        () => {
          setUserLocation({ lat: 37.5665, lng: 126.9780 });
          setGpsLoading(false);
        },
        { timeout: 5000 },
      );
    } else {
      setUserLocation({ lat: 37.5665, lng: 126.9780 });
      setGpsLoading(false);
    }
  };

  // 'nearby' 선택 시 GPS 요청
  useEffect(() => {
    if (destinationType === 'nearby') {
      requestGps();
    }
  }, [destinationType]);

  // AI 생성 중 로딩 메시지 순환
  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const interval = setInterval(() => {
      setLoadingStep(s => (s + 1) % LOADING_STEPS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  const togglePreference = (p: Preference) => {
    setPreferences((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const toggleSubCategory = (pref: string, label: string) => {
    setSubCategories(prev => {
      const existing = prev.find(s => s.preference === pref);
      if (!existing) return [...prev, { preference: pref, subLabels: [label] }];
      const has = existing.subLabels.includes(label);
      const newLabels = has
        ? existing.subLabels.filter(l => l !== label)
        : [...existing.subLabels, label];
      if (newLabels.length === 0) return prev.filter(s => s.preference !== pref);
      return prev.map(s => s.preference === pref ? { ...s, subLabels: newLabels } : s);
    });
  };

  const isSubSelected = (pref: string, label: string) =>
    subCategories.find(s => s.preference === pref)?.subLabels.includes(label) ?? false;

  // Step 0 완료 조건
  const step0Complete =
    destinationType === 'nearby' ||
    (destinationType === 'city' && selectedCity !== null) ||
    (destinationType === 'mood' && selectedMood !== null);

  const canProceed =
    (step === 0 && step0Complete) ||
    (step === 1 && feeling !== null) ||
    (step === 2 && duration !== null) ||
    (step === 3 && companion !== null) ||
    (step === 4 && preferences.length > 0);

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      handleGenerate();
    }
  };

  const getRequestLocation = (): { lat: number; lng: number } => {
    if (destinationType === 'city' && selectedCity) {
      return { lat: selectedCity.lat, lng: selectedCity.lng };
    }
    if (destinationType === 'mood' && selectedMood) {
      const mood = MOOD_OPTIONS.find(m => m.type === selectedMood);
      if (mood) {
        // 분위기별 대표 지역의 중심 좌표 사용
        const city = CITY_OPTIONS.find(c => c.areaCode === mood.areaCodes[0]);
        if (city) return { lat: city.lat, lng: city.lng };
      }
    }
    return userLocation ?? { lat: 37.5665, lng: 126.9780 };
  };

  const handleGenerate = async () => {
    if (!duration || !companion || preferences.length === 0) return;
    const loc = getRequestLocation();

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: loc.lat,
          lng: loc.lng,
          duration,
          companion,
          preferences,
          feeling: feeling ?? undefined,
          destinationType: destinationType ?? 'nearby',
          cityAreaCode: selectedCity?.areaCode,
          mood: selectedMood,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? '코스 생성에 실패했어요.');
      }

      sessionStorage.setItem('weekendCourse', JSON.stringify(data));
      router.push(`/course/${data.shareUrl.split('/').pop()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '코스 생성 중 문제가 생겼어요.');
      setLoading(false);
    }
  };

  const { q, sub } = STEP_TITLES[step];

  return (
    <>
      <WeekendHeader locationName="서울 강남" />

      <div className="max-w-lg mx-auto px-5 pt-20 pb-24">
        {/* 진행바 */}
        <div className="progress-glow flex items-center gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-orange-100">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  i <= step ? 'bg-gradient-to-r from-orange-400 to-pink-400 w-full' : 'w-0'
                }`}
              />
            </div>
          ))}
        </div>

        {!loading && (
          <>
            {/* 질문 헤더 */}
            <div key={step} className="animate-[fadeSlide_0.4s_ease-out]">
              <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">
                Step {step + 1}/{TOTAL_STEPS}
              </p>
              <h2 className="text-2xl font-black text-slate-800 mt-2 break-keep" style={{ fontFamily: "'CookieRun', sans-serif" }}>
                {q}
              </h2>
              <p className="text-sm text-slate-500 mt-1 break-keep">{sub}</p>
            </div>

            {/* Step 0: 목적지 선택 */}
            {step === 0 && (
              <div className="mt-6 animate-[fadeSlide_0.4s_ease-out_0.1s_both]">
                {/* 목적지 타입 3개 */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {([
                    { type: 'nearby' as DestinationType, label: '내 주변', emoji: '📍', desc: 'GPS 기반' },
                    { type: 'city' as DestinationType,   label: '도시 선택', emoji: '🗺️', desc: '가고 싶은 곳' },
                    { type: 'mood' as DestinationType,   label: '분위기', emoji: '✨', desc: '기분에 맞게' },
                  ]).map(({ type, label, emoji, desc }) => (
                    <button
                      key={type}
                      onClick={() => {
                        setDestinationType(type);
                        if (type !== 'city') setSelectedCity(null);
                        if (type !== 'mood') setSelectedMood(null);
                      }}
                      className={`flex flex-col items-center gap-1.5 px-3 py-4 rounded-2xl border-2 transition-all duration-300 ${
                        destinationType === type
                          ? 'bg-orange-50 border-orange-400 shadow-sm shadow-orange-100 scale-[1.02]'
                          : 'bg-white border-transparent hover:border-orange-200 shadow-sm'
                      }`}
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span className="text-sm font-bold text-slate-700">{label}</span>
                      <span className="text-[11px] text-slate-400">{desc}</span>
                    </button>
                  ))}
                </div>

                {/* nearby 선택 시: GPS 상태 표시 */}
                {destinationType === 'nearby' && (
                  <div className="px-4 py-3 rounded-2xl bg-green-50 border border-green-200 animate-[fadeSlide_0.3s_ease-out]">
                    {gpsLoading ? (
                      <p className="text-sm text-green-600 flex items-center gap-2">
                        <span className="animate-spin">📡</span> 위치를 찾고 있어요...
                      </p>
                    ) : userLocation ? (
                      <p className="text-sm text-green-700 font-medium">
                        📍 현재 위치 기준으로 주변 추천해드릴게요!
                      </p>
                    ) : (
                      <p className="text-sm text-amber-600">
                        위치를 못 찾았어요. 서울 기준으로 추천할게요.
                      </p>
                    )}
                  </div>
                )}

                {/* city 선택 시: 도시 그리드 */}
                {destinationType === 'city' && (
                  <div className="animate-[fadeSlide_0.3s_ease-out]">
                    <p className="text-xs font-bold text-slate-400 mb-3">어디로 가고 싶어요?</p>
                    <div className="grid grid-cols-4 gap-2">
                      {CITY_OPTIONS.map((city) => (
                        <button
                          key={city.name}
                          onClick={() => setSelectedCity(city)}
                          className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 transition-all duration-300 ${
                            selectedCity?.name === city.name
                              ? 'bg-orange-50 border-orange-400 shadow-sm'
                              : 'bg-white border-transparent hover:border-orange-200 shadow-sm'
                          }`}
                        >
                          <span className="text-lg">{city.emoji}</span>
                          <span className="text-xs font-bold text-slate-700">{city.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* mood 선택 시: 분위기 카드 */}
                {destinationType === 'mood' && (
                  <div className="animate-[fadeSlide_0.3s_ease-out]">
                    <p className="text-xs font-bold text-slate-400 mb-3">어떤 분위기가 끌려요?</p>
                    <div className="grid grid-cols-1 gap-2.5">
                      {MOOD_OPTIONS.map((mood) => (
                        <button
                          key={mood.type}
                          onClick={() => setSelectedMood(mood.type)}
                          className={`flex items-center gap-4 text-left px-5 py-4 rounded-2xl border-2 transition-all duration-300 ${
                            selectedMood === mood.type
                              ? 'bg-orange-50 border-orange-400 shadow-sm shadow-orange-100'
                              : 'bg-white border-transparent hover:border-orange-200 shadow-sm'
                          }`}
                        >
                          <span className="text-2xl">{mood.emoji}</span>
                          <div>
                            <span className="text-sm font-bold text-slate-700">{mood.label}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{mood.description}</p>
                          </div>
                          {selectedMood === mood.type && (
                            <svg className="w-5 h-5 text-orange-500 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: 오늘의 기분 */}
            {step === 1 && (
              <div className="grid grid-cols-1 gap-2.5 mt-6 animate-[fadeSlide_0.4s_ease-out_0.1s_both]">
                {FEELING_OPTIONS.map((f) => (
                  <button
                    key={f.type}
                    onClick={() => setFeeling(f.type)}
                    className={`flex items-center gap-4 text-left px-5 py-4 rounded-2xl border-2 transition-all duration-300 ${
                      feeling === f.type
                        ? 'bg-orange-50 border-orange-400 shadow-sm shadow-orange-100'
                        : 'bg-white border-transparent hover:border-orange-200 shadow-sm'
                    }`}
                  >
                    <span className="text-2xl">{f.emoji}</span>
                    <div className="flex-1">
                      <span className="text-sm font-bold text-slate-700">{f.label}</span>
                      <p className="text-xs text-slate-400 mt-0.5">{f.description}</p>
                    </div>
                    {feeling === f.type && (
                      <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: 시간 */}
            {step === 2 && (
              <div className="mt-6 animate-[fadeSlide_0.4s_ease-out_0.1s_both]">
                <div className="grid grid-cols-1 gap-3">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`flex items-center gap-4 text-left px-5 py-4 rounded-2xl border-2 transition-all duration-300 ${
                        duration === d
                          ? 'bg-orange-50 border-orange-400 shadow-sm shadow-orange-100'
                          : 'bg-white border-transparent hover:border-orange-200 shadow-sm'
                      }`}
                    >
                      <span className="text-2xl">{DURATION_EMOJIS[d]}</span>
                      <span className="text-sm font-bold text-slate-700">{DURATION_LABELS[d]}</span>
                      {duration === d && (
                        <svg className="w-5 h-5 text-orange-500 ml-auto" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                {duration === 'overnight' && (
                  <p className="text-xs text-orange-500 font-bold mt-3 px-2 animate-[fadeSlide_0.3s_ease-out]">
                    🏨 AI가 숙소도 함께 추천해드려요! 1박 2일 풀코스를 만들어볼게요.
                  </p>
                )}
              </div>
            )}

            {/* Step 3: 동반자 */}
            {step === 3 && (
              <div className="grid grid-cols-2 gap-3 mt-6 animate-[fadeSlide_0.4s_ease-out_0.1s_both]">
                {COMPANIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCompanion(c)}
                    className={`flex flex-col items-center gap-2 px-4 py-6 rounded-3xl border-2 transition-all duration-300 ${
                      companion === c
                        ? 'bg-orange-50 border-orange-400 shadow-sm shadow-orange-100 scale-[1.02]'
                        : 'bg-white border-transparent hover:border-orange-200 shadow-sm'
                    }`}
                  >
                    <span className="text-3xl">{COMPANION_ICONS[c]}</span>
                    <span className="text-sm font-bold text-slate-700">{COMPANION_LABELS[c]}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Step 4: 취향 */}
            {step === 4 && (
              <div className="mt-6 animate-[fadeSlide_0.4s_ease-out_0.1s_both]">
                <div className="grid grid-cols-2 gap-3">
                  {PREFERENCES.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePreference(p)}
                      className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all duration-300 ${
                        preferences.includes(p)
                          ? 'bg-orange-50 border-orange-400 shadow-sm shadow-orange-100'
                          : 'bg-white border-transparent hover:border-orange-200 shadow-sm'
                      }`}
                    >
                      <span className="text-xl">{PREFERENCE_ICONS[p]}</span>
                      <span className="text-sm font-bold text-slate-700">{PREFERENCE_LABELS[p]}</span>
                    </button>
                  ))}
                </div>
                {preferences.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {preferences.map(pref => {
                      const subs = PREFERENCE_SUB_CATEGORIES[pref];
                      if (!subs) return null;
                      return (
                        <div key={pref} className="animate-[fadeSlide_0.3s_ease-out]">
                          <p className="text-xs text-slate-400 mb-1.5">{PREFERENCE_LABELS[pref]} 세부 (선택)</p>
                          <div className="flex flex-wrap gap-2">
                            {subs.map(sub => (
                              <button
                                key={sub.label}
                                onClick={() => toggleSubCategory(pref, sub.label)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                  isSubSelected(pref, sub.label)
                                    ? 'bg-orange-400 text-white shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-orange-200'
                                }`}
                              >
                                {sub.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[50dvh]">
            <span className="text-5xl animate-bounce">{LOADING_STEPS[loadingStep].emoji}</span>
            <p className="text-slate-600 text-sm font-bold mt-4">{LOADING_STEPS[loadingStep].text}</p>
            <div className="w-48 h-1.5 bg-orange-100 rounded-full mt-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-pink-400 rounded-full transition-all duration-[2000ms] ease-linear"
                style={{ width: `${Math.min(((loadingStep + 1) / LOADING_STEPS.length) * 100, 95)}%` }}
              />
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && !loading && (
          <div className="mt-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 animate-[fadeSlide_0.3s_ease-out]">
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-red-400 underline mt-1">
              닫기
            </button>
          </div>
        )}

        {/* 네비게이션 버튼 */}
        {!loading && (
          <div className="flex items-center gap-3 mt-8">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-shrink-0 px-5 py-3.5 rounded-2xl bg-white border border-orange-100 text-slate-500 hover:text-slate-700 hover:border-orange-200 transition-all text-sm font-bold shadow-sm"
              >
                이전
              </button>
            ) : (
              <Link
                href="/"
                className="flex-shrink-0 px-5 py-3.5 rounded-2xl bg-white border border-orange-100 text-slate-500 hover:text-slate-700 hover:border-orange-200 transition-all text-sm font-bold shadow-sm"
              >
                취소
              </Link>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`flex-1 py-3.5 rounded-2xl text-sm font-black transition-all duration-300 shadow-sm ${
                canProceed
                  ? 'bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 text-white shadow-orange-200/50 hover:shadow-md'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {step === TOTAL_STEPS - 1 ? '코스 만들기 ✨' : '다음'}
            </button>
          </div>
        )}
      </div>

      <BottomTabBar />

      <style jsx global>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
