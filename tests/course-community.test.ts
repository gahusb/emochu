import { describe, it, expect } from 'vitest';
import { freshnessCutoffISO, toCommunityCard } from '@/lib/course-community';
import type { CommunityCourseRow } from '@/lib/course-community';

function row(over: Partial<CommunityCourseRow> = {}): CommunityCourseRow {
  return {
    share_slug: 'abcd1234',
    course_data: {
      title: '코스', summary: '요약', totalDistanceKm: 3.2, tip: '', stops: [],
    },
    duration: 'half_day',
    companion: 'solo',
    view_count: 7,
    created_at: '2026-09-01T00:00:00.000Z',
    ...over,
  };
}

describe('freshnessCutoffISO — 신선도 기준 시각', () => {
  it('now 에서 freshDays 를 뺀 시각을 ISO 로 준다', () => {
    const now = new Date('2026-09-10T00:00:00.000Z');
    expect(freshnessCutoffISO(now, 10)).toBe('2026-08-31T00:00:00.000Z');
  });

  it('freshDays=0 이면 now 그 자체다 — 경계값', () => {
    const now = new Date('2026-09-10T00:00:00.000Z');
    expect(freshnessCutoffISO(now, 0)).toBe(now.toISOString());
  });
});

describe('toCommunityCard — DB 행을 카드 셰이프로', () => {
  it('stops 가 비어 있으면 stopCount 0, imageUrl 없음', () => {
    const card = toCommunityCard(row());
    expect(card.stopCount).toBe(0);
    expect(card.imageUrl).toBeUndefined();
  });

  it('이미지가 섞인 stops 중 첫 이미지를 채택한다', () => {
    const card = toCommunityCard(row({
      course_data: {
        title: '코스', summary: '', totalDistanceKm: 0, tip: '',
        stops: [
          { order: 1, contentId: '1', title: 'A', timeStart: '10:00', durationMin: 60,
            description: '', tip: '', latitude: 37.5, longitude: 127, isFestival: false },
          { order: 2, contentId: '2', title: 'B', timeStart: '11:00', durationMin: 60,
            description: '', tip: '', latitude: 37.5, longitude: 127, isFestival: false,
            imageUrl: 'https://x/b.jpg' },
          { order: 3, contentId: '3', title: 'C', timeStart: '12:00', durationMin: 60,
            description: '', tip: '', latitude: 37.5, longitude: 127, isFestival: false,
            imageUrl: 'https://x/c.jpg' },
        ],
      },
    }));
    expect(card.imageUrl).toBe('https://x/b.jpg');
    expect(card.stopCount).toBe(3);
  });

  it('title/summary 가 nullish 면 각각 「코스」/빈 문자열로 방어한다', () => {
    // ?? 는 빈 문자열에는 폴백하지 않는다 — null/undefined 일 때만.
    // my/courses/route.ts 의 동일 로직과 짝을 맞춘다.
    const card = toCommunityCard(row({
      course_data: { title: undefined, summary: undefined, totalDistanceKm: 0, tip: '', stops: [] } as never,
    }));
    expect(card.title).toBe('코스');
    expect(card.summary).toBe('');
  });

  it('view_count·created_at·slug 는 그대로 옮겨진다', () => {
    const card = toCommunityCard(row({ view_count: 42, share_slug: 'zzzz9999' }));
    expect(card.viewCount).toBe(42);
    expect(card.slug).toBe('zzzz9999');
  });
});
