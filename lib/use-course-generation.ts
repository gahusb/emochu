'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { saveEditToken } from '@/lib/edit-token';
import { buildLoadingSequence, FIRST_LOADING_MESSAGE } from './loading-messages';
import type { CourseResponse, Duration, Companion, Preference, Feeling, DestinationType, VisitDay, AccessibilityNeed, CommunityCourseCard } from './weekend-types';
import type { SajuResult } from './saju';

export interface GenerateParams {
  lat: number;
  lng: number;
  duration: Duration;
  companion: Companion;
  preferences: Preference[];
  feeling?: Feeling;
  destinationType?: DestinationType;
  cityAreaCode?: string;
  mood?: string | null;
  saju?: SajuResult;
  visitDay?: VisitDay;
  /** 미지정 = 접근성 조건 없음 */
  accessibility?: AccessibilityNeed[];
}

// 멘트 목록과 셔플은 lib/loading-messages.ts 가 갖는다 —
// 훅 안에 있으면 "매번 다른 조합이 나오는가"를 테스트로 확정할 수 없다.
const MESSAGE_INTERVAL_MS = 6000;

export function useCourseGeneration() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 하루 한도(429)에 곁들여 오는 「대신 이런 코스는 어때요?」 제안. 그 외 실패에서는 항상 null.
  const [errorSuggestions, setErrorSuggestions] = useState<CommunityCourseCard[] | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  // 🔴 렌더 중에 셔플하지 않는다. 서버 렌더와 하이드레이션이 서로 다른 문장을 그린다.
  //    생성이 시작되는 순간(=클라이언트 이벤트) 한 번만 뽑는다.
  const [messages, setMessages] = useState<string[]>(() => [FIRST_LOADING_MESSAGE]);

  useEffect(() => {
    if (!loading) {
      setMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMessageIndex((i) => i + 1);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loading]);

  const generate = useCallback(async (params: GenerateParams) => {
    setMessages(buildLoadingSequence());
    setMessageIndex(0);
    setLoading(true);
    setError(null);
    setErrorSuggestions(null);
    try {
      const res = await fetch('/api/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: params.lat,
          lng: params.lng,
          duration: params.duration,
          companion: params.companion,
          preferences: params.preferences,
          feeling: params.feeling,
          destinationType: params.destinationType ?? 'nearby',
          cityAreaCode: params.cityAreaCode,
          mood: params.mood,
          accessibility: params.accessibility,
          saju: params.saju,
          visitDay: params.visitDay,
        }),
      });
      const body: unknown = await res.json();
      if (!res.ok) {
        const failure = body as { error?: string; suggestions?: CommunityCourseCard[] };
        // suggestions 는 하루 한도(429)에만 실린다. 그 외 실패엔 없다 — 필드가
        // 없으면 undefined 라 아래에서 null 로 정규화된다.
        setErrorSuggestions(failure.suggestions ?? null);
        throw new Error(failure.error ?? '코스 생성에 실패했어요.');
      }
      const data = body as CourseResponse;
      sessionStorage.setItem('weekendCourse', JSON.stringify(data));
      const slug = data.shareUrl.split('/').pop();
      if (!slug) {
        throw new Error('코스 공유 URL이 올바르지 않아요.');
      }
      // 편집 토큰은 **생성 응답에만** 들어 있다. 여기서 안 챙기면 다시 받을 방법이 없다.
      if (data.editToken) saveEditToken(slug, data.editToken);
      // localStorage에 최근 코스 기록 저장 (최대 5개)
      try {
        const raw = localStorage.getItem('emochu.course_history');
        const history: Array<{ slug: string; title: string; createdAt: number }> =
          raw ? JSON.parse(raw) : [];
        const entry = { slug, title: data.course.title, createdAt: Date.now() };
        const updated = [entry, ...history.filter((h) => h.slug !== slug)].slice(0, 5);
        localStorage.setItem('emochu.course_history', JSON.stringify(updated));
      } catch { /* ignore */ }
      router.replace(`/course/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '코스 생성 중 문제가 생겼어요.');
      setLoading(false);
    }
  }, [router]);

  return {
    loading,
    error,
    errorSuggestions,
    generate,
    // 마지막 문장에서 멈춘다 — 목록을 다 쓰면 「거의 다 됐어요」가 계속 남는다.
    loadingMessage: messages[Math.min(messageIndex, messages.length - 1)],
  };
}
