import { describe, it, expect } from 'vitest';
import { scoreAndRankCandidates } from '@/lib/weekend-ai';
import type { ScoredSpot } from '@/lib/weekend-ai';
import type { WeekendWeather } from '@/lib/weekend-types';

// 토요일 비(pop 80), 일요일 맑음(pop 10)
const WEATHER: WeekendWeather = {
  saturday: { sky: '흐림', precipitation: '비', tempMin: 18, tempMax: 22, pop: 80, summary: '비' },
  sunday:   { sky: '맑음', precipitation: '없음', tempMin: 19, tempMax: 26, pop: 10, summary: '맑음' },
  recommendation: '일요일을 추천해요',
};

function makeSpot(overrides: Partial<ScoredSpot> = {}): ScoredSpot {
  return {
    contentId: '1', contentTypeId: 12, title: '야외 공원', addr1: '서울',
    cat1: 'A01', cat2: 'A0101', cat3: '', latitude: 37.5, longitude: 127.0,
    distanceKm: 5, score: 0, ...overrides,
  };
}

describe('visitDay별 weatherScore 분기', () => {
  it('야외 spot은 비 오는 토요일보다 맑은 일요일에 점수가 높다', () => {
    const outdoor = makeSpot();
    const sat = scoreAndRankCandidates([outdoor], ['nature'], 'solo', 'half_day', WEATHER, undefined, 'sat');
    const sun = scoreAndRankCandidates([outdoor], ['nature'], 'solo', 'half_day', WEATHER, undefined, 'sun');
    expect(sun[0].score).toBeGreaterThan(sat[0].score);
  });

  it('visitDay 미지정은 토요일 기준과 동일하다 (하위호환)', () => {
    const outdoor = makeSpot();
    const omitted = scoreAndRankCandidates([outdoor], ['nature'], 'solo', 'half_day', WEATHER);
    const sat = scoreAndRankCandidates([outdoor], ['nature'], 'solo', 'half_day', WEATHER, undefined, 'sat');
    expect(omitted[0].score).toBe(sat[0].score);
  });
});
