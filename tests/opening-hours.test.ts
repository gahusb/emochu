import { describe, it, expect } from 'vitest';
import { parseRestDate, visitDayToIndex } from '@/lib/opening-hours';
import { scoreAndRankCandidates } from '@/lib/weekend-ai';
import type { ScoredSpot } from '@/lib/weekend-ai';
import type { WeekendWeather } from '@/lib/weekend-types';

describe('parseRestDate', () => {
  it('연중무휴 계열은 빈 배열 (휴무 없음)', () => {
    expect(parseRestDate('연중무휴')).toEqual([]);
    expect(parseRestDate('없음')).toEqual([]);
    expect(parseRestDate('연중개방')).toEqual([]);
  });

  it('단일 요일 휴무를 인덱스로', () => {
    expect(parseRestDate('매주 월요일')).toEqual([1]);
    expect(parseRestDate('월요일 휴관')).toEqual([1]);
    expect(parseRestDate('매주 일요일 휴무')).toEqual([0]);
    expect(parseRestDate('토요일 휴무')).toEqual([6]);
  });

  it('복수 요일 휴무', () => {
    expect(parseRestDate('매주 월요일, 화요일 휴무')).toEqual([1, 2]);
  });

  it('괄호 부연이 있어도 요일을 추출', () => {
    expect(parseRestDate('매주 월요일(공휴일인 경우 익일 휴무)')).toEqual([1]);
  });

  it('요일 정보가 없으면 null (판정 불가)', () => {
    expect(parseRestDate('1월 1일, 설날 당일')).toBeNull();
    expect(parseRestDate('기상악화 시 휴장')).toBeNull();
    expect(parseRestDate('')).toBeNull();
    expect(parseRestDate(undefined)).toBeNull();
  });

  it('중복 요일은 한 번만', () => {
    expect(parseRestDate('월요일 휴무, 매주 월요일 정기휴무')).toEqual([1]);
  });

  it('[회귀] 무휴 표현이 섞여 있어도 명확한 요일 정보를 추출', () => {
    expect(parseRestDate('매주 월요일 휴무(공휴일 무휴)')).toEqual([1]);
    expect(parseRestDate('매주 월요일 휴무, 공휴일 무휴')).toEqual([1]);
  });

  it('[회귀] 쉼표로 묶인 복수 요일 축약형을 처리', () => {
    expect(parseRestDate('매주 월,화요일 휴무')).toEqual([1, 2]);
  });
});

describe('visitDayToIndex', () => {
  it('토=6, 일=0', () => {
    expect(visitDayToIndex('sat')).toBe(6);
    expect(visitDayToIndex('sun')).toBe(0);
  });
});

const CLEAR: WeekendWeather = {
  saturday: { date: '2026-08-01', sky: 'clear', precipitation: 'none', tempMin: 18, tempMax: 24, pop: 10, summary: '맑음' },
  sunday:   { date: '2026-08-02', sky: 'clear', precipitation: 'none', tempMin: 18, tempMax: 24, pop: 10, summary: '맑음' },
  recommendation: '둘 다 좋아요',
};

function spot(id: string, closedWeekdays: number[] | null | undefined): ScoredSpot {
  return {
    contentId: id, contentTypeId: 12, title: `장소${id}`, addr1: '서울',
    cat1: 'A01', cat2: 'A0101', cat3: '', latitude: 37.5, longitude: 127.0,
    distanceKm: 5, score: 0, closedWeekdays,
  };
}

describe('휴무일 페널티', () => {
  it('일요일 휴무 spot은 일요일 방문 시 점수가 크게 깎인다', () => {
    const closedSun = spot('1', [0]);
    const open = spot('2', []);
    const ranked = scoreAndRankCandidates([closedSun, open], ['nature'], 'solo', 'half_day', CLEAR, undefined, 'sun');
    const a = ranked.find(r => r.contentId === '1')!;
    const b = ranked.find(r => r.contentId === '2')!;
    expect(a.score).toBeLessThan(0);
    expect(b.score).toBeGreaterThan(a.score);
  });

  it('일요일 휴무 spot도 토요일 방문이면 감점 없다', () => {
    const ranked = scoreAndRankCandidates([spot('1', [0])], ['nature'], 'solo', 'half_day', CLEAR, undefined, 'sat');
    expect(ranked[0].score).toBeGreaterThan(0);
  });

  it('판정 불가(null)는 감점하지 않는다', () => {
    const unknown = scoreAndRankCandidates([spot('1', null)], ['nature'], 'solo', 'half_day', CLEAR, undefined, 'sun');
    const known = scoreAndRankCandidates([spot('2', [])], ['nature'], 'solo', 'half_day', CLEAR, undefined, 'sun');
    expect(unknown[0].score).toBe(known[0].score);
  });

  it('휴무 spot도 후보 목록에서 제거되지는 않는다', () => {
    const ranked = scoreAndRankCandidates([spot('1', [0])], ['nature'], 'solo', 'half_day', CLEAR, undefined, 'sun');
    expect(ranked).toHaveLength(1);
  });
});
