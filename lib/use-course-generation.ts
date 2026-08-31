'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { saveEditToken } from '@/lib/edit-token';
import type { CourseResponse, Duration, Companion, Preference, Feeling, DestinationType, VisitDay, AccessibilityNeed } from './weekend-types';
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

const LOADING_MESSAGES = [
  '주변 관광지를 살펴보고 있어요',
  'AI가 코스 순서를 계산하는 중이에요',
  '실시간 날씨와 동선을 반영하고 있어요',
  '마지막으로 다듬는 중이에요',
];

export function useCourseGeneration() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!loading) {
      setMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMessageIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 8000);
    return () => clearInterval(interval);
  }, [loading]);

  const generate = useCallback(async (params: GenerateParams) => {
    setLoading(true);
    setError(null);
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
      const data: CourseResponse = await res.json();
      if (!res.ok) {
        throw new Error((data as unknown as { error?: string }).error ?? '코스 생성에 실패했어요.');
      }
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
    generate,
    loadingMessage: LOADING_MESSAGES[messageIndex],
  };
}
