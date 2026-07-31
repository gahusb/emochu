import { describe, it, expect } from 'vitest';
import { parseRestDate, visitDayToIndex, replaceClosedStops } from '@/lib/opening-hours';
import { scoreAndRankCandidates } from '@/lib/weekend-ai';
import type { ScoredSpot } from '@/lib/weekend-ai';
import type { WeekendWeather } from '@/lib/weekend-types';
import type { CourseStop } from '@/lib/weekend-types';

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

  it('[회귀] 쉼표+공백/가운뎃점/슬래시로 묶인 축약 선행 요일을 놓치지 않는다', () => {
    expect(parseRestDate('토, 일요일 휴무')).toEqual([0, 6]);
    expect(parseRestDate('토·일요일 휴무')).toEqual([0, 6]);
    expect(parseRestDate('토/일요일 휴무')).toEqual([0, 6]);
  });

  it('[회귀] 요일 범위 표기는 사이 요일까지 확장한다', () => {
    expect(parseRestDate('금~일요일 휴무')).toEqual([0, 5, 6]);
    expect(parseRestDate('금요일 ~ 일요일 휴무')).toEqual([0, 5, 6]);
    expect(parseRestDate('매주 수요일-목요일 휴관')).toEqual([3, 4]);
    expect(parseRestDate('토~일요일 휴무')).toEqual([0, 6]);
  });

  it('요일 접미사가 전혀 없으면 여전히 null (보수적 판정)', () => {
    expect(parseRestDate('토,일 휴무')).toBeNull();
    expect(parseRestDate('토·일 휴무')).toBeNull();
    expect(parseRestDate('토 휴무')).toBeNull();
  });

  it('다른 단어의 일부인 요일 문자가 섞이면 전체를 판정 불가로 (거짓 휴무 방지)', () => {
    // "공휴일"의 '일'이 구분자로 이어져 일요일로 오독되면 안 된다
    expect(parseRestDate('공휴일, 월요일 휴무')).toBeNull();
    // 단독으로 등장하는 '일'(공휴일)은 무시하고 명확한 요일만 추출
    expect(parseRestDate('매주 월요일 휴무, 공휴일 정상운영')).toEqual([1]);
  });

  it('7일 전체가 휴무로 나오면 판정 불가 (운영일 표기 오독 방지)', () => {
    expect(parseRestDate('월~일요일')).toBeNull();
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

function spot(id: string, closedWeekdays: number[] | null | undefined, overview?: string): ScoredSpot {
  return {
    contentId: id, contentTypeId: 12, title: `장소${id}`, addr1: '서울',
    cat1: 'A01', cat2: 'A0101', cat3: '', latitude: 37.5, longitude: 127.0,
    distanceKm: 5, score: 0, closedWeekdays, overview,
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

function stop(contentId: string, order: number): CourseStop {
  return {
    order, contentId, title: `장소${contentId}`, timeStart: '10:00', durationMin: 60,
    description: '설명', tip: '', latitude: 37.5, longitude: 127.0, isFestival: false,
    contentTypeId: '12',
  };
}

describe('replaceClosedStops', () => {
  it('일요일 휴무 stop을 같은 역할의 영업 후보로 교체한다', () => {
    const stops = [stop('1', 1)];
    const ranked = [spot('1', [0]), spot('9', [])];
    const result = replaceClosedStops(stops, ranked, 'sun');
    expect(result.replaced).toBe(1);
    expect(result.stops[0].contentId).toBe('9');
    expect(result.stops[0].order).toBe(1);   // order는 유지
  });

  it('대체 후보가 없으면 원본을 유지한다 (코스 붕괴 방지)', () => {
    const stops = [stop('1', 1)];
    const ranked = [spot('1', [0])];
    const result = replaceClosedStops(stops, ranked, 'sun');
    expect(result.replaced).toBe(0);
    expect(result.stops[0].contentId).toBe('1');
  });

  it('visitDay 미지정이면 아무것도 하지 않는다', () => {
    const stops = [stop('1', 1)];
    const ranked = [spot('1', [0]), spot('9', [])];
    const result = replaceClosedStops(stops, ranked, undefined);
    expect(result.replaced).toBe(0);
  });

  it('이미 코스에 있는 장소로는 교체하지 않는다', () => {
    const stops = [stop('1', 1), stop('9', 2)];
    const ranked = [spot('1', [0]), spot('9', [])];
    const result = replaceClosedStops(stops, ranked, 'sun');
    expect(result.replaced).toBe(0);
  });

  it('[회귀] 교체된 stop은 옛 장소의 설명·후크·이유·팁을 물려받지 않는다', () => {
    const old: CourseStop = {
      ...stop('1', 1),
      description: '옛 장소의 근사한 설명',
      hook: '옛 후크',
      whyNow: '지금 옛 장소에 가야 하는 이유',
      tip: '옛 장소 주차 팁',
      facilities: { parking: true },
      images: ['https://example.com/old.jpg'],
    };
    const ranked = [spot('1', [0]), spot('9', [])];
    const result = replaceClosedStops([old], ranked, 'sun');

    expect(result.replaced).toBe(1);
    const next = result.stops[0];
    expect(next.contentId).toBe('9');
    expect(next.description).not.toBe('옛 장소의 근사한 설명');
    expect(next.description).toBe('장소9');   // overview 없으면 새 장소 이름으로
    expect(next.hook).toBeUndefined();
    expect(next.whyNow).toBeUndefined();
    expect(next.tip).toBe('');
    expect(next.facilities).toBeUndefined();
    expect(next.images).toBeUndefined();
    expect(next.order).toBe(1);               // 시간표 골격은 유지
    expect(next.timeStart).toBe('10:00');
  });

  it('[회귀] 교체 후보에 overview가 있으면 새 장소의 설명을 쓴다', () => {
    const old: CourseStop = { ...stop('1', 1), description: '옛 장소의 설명' };
    const ranked = [spot('1', [0]), spot('9', [], '새 장소의 소개 문구')];
    const result = replaceClosedStops([old], ranked, 'sun');
    expect(result.stops[0].description).toBe('새 장소의 소개 문구');
  });

  it('교체되지 않은 stop의 카피는 그대로 유지된다', () => {
    const kept: CourseStop = { ...stop('1', 1), hook: '유지되는 후크', whyNow: '유지되는 이유' };
    const ranked = [spot('1', [])];
    const result = replaceClosedStops([kept], ranked, 'sun');
    expect(result.replaced).toBe(0);
    expect(result.stops[0].hook).toBe('유지되는 후크');
    expect(result.stops[0].whyNow).toBe('유지되는 이유');
  });
});
