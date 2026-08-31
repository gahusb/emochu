import { describe, it, expect } from 'vitest';
import { scoreAndRankCandidates, matchesElement } from '@/lib/weekend-ai';
import type { ScoredSpot } from '@/lib/weekend-ai';
import { ELEMENT_COURSE_HINT } from '@/lib/saju';
import type { Element5 } from '@/lib/saju';
import type { WeekendWeather } from '@/lib/weekend-types';

const CLEAR: WeekendWeather = {
  saturday: { sky: '맑음', precipitation: '없음', tempMin: 18, tempMax: 24, pop: 10, summary: '맑음' },
  sunday:   { sky: '맑음', precipitation: '없음', tempMin: 18, tempMax: 24, pop: 10, summary: '맑음' },
  recommendation: '둘 다 좋아요',
};

function makeSpot(overrides: Partial<ScoredSpot> = {}): ScoredSpot {
  return {
    contentId: '1', contentTypeId: 12, title: '어딘가', addr1: '서울',
    cat1: 'A01', cat2: 'A0101', cat3: '', latitude: 37.5, longitude: 127.0,
    distanceKm: 5, score: 0, ...overrides,
  };
}

/** 오행만 다르게 넣고 같은 후보의 점수를 잰다. */
function scoreWith(spot: ScoredSpot, element?: Element5): number {
  return scoreAndRankCandidates([spot], ['nature'], 'solo', 'half_day', CLEAR, undefined, undefined, element)[0].score;
}

const ELEMENTS: Element5[] = ['wood', 'fire', 'earth', 'metal', 'water'];

describe('elementScore — 오늘의 오행이 장소 점수에 닿는다', () => {
  it('오행을 넘기지 않으면 점수가 그대로다 (하위호환)', () => {
    const spot = makeSpot({ title: '수목원 산책길' });
    expect(scoreWith(spot, undefined)).toBe(scoreWith(spot));
  });

  it('木 날에는 숲·수목원 후보가 가점을 받는다', () => {
    const forest = makeSpot({ title: '국립 수목원' });
    expect(scoreWith(forest, 'wood')).toBeGreaterThan(scoreWith(forest, undefined));
  });

  it('오행이 다르면 같은 후보의 점수가 달라진다 — 날마다 코스가 바뀌는 근거', () => {
    const forest = makeSpot({ title: '국립 수목원' });
    // 木 키워드에는 걸리고 金(미술관·전시) 키워드에는 안 걸린다
    expect(scoreWith(forest, 'wood')).toBeGreaterThan(scoreWith(forest, 'metal'));
  });

  it('오행과 무관한 후보는 어떤 날에도 가점이 0이다', () => {
    const neutral = makeSpot({ title: '무명 쉼터', contentTypeId: 39, cat2: 'A0502' });
    for (const el of ELEMENTS) {
      expect(scoreWith(neutral, el)).toBe(scoreWith(neutral, undefined));
    }
  });

  // 🔴 이게 이 파일에서 가장 중요한 테스트다.
  // 오행 가중이 커지면 사용자가 직접 고른 취향(35)·기분(최대 13)을 사주가 덮어쓴다.
  // 사주는 「비슷한 후보 사이의 순서를 가르는」 역할이어야지 후보를 갈아치우면 안 된다.
  it('오행 가중은 어떤 경우에도 5점을 넘지 않는다', () => {
    const spots = [
      makeSpot({ title: '국립 수목원 둘레길 정원', contentTypeId: 12 }),
      makeSpot({ title: '남산 전망대 야경 축제', contentTypeId: 15 }),
      makeSpot({ title: '한옥마을 도자기 체험 농장', contentTypeId: 14 }),
      makeSpot({ title: '시립 미술관 공예 전시', contentTypeId: 14 }),
      makeSpot({ title: '해변 온천 계곡 폭포', contentTypeId: 12 }),
    ];
    for (const spot of spots) {
      const base = scoreWith(spot, undefined);
      for (const el of ELEMENTS) {
        const delta = scoreWith(spot, el) - base;
        expect(delta).toBeGreaterThanOrEqual(0);
        expect(delta).toBeLessThanOrEqual(5);
      }
    }
  });
});

describe('matchesElement — 매칭률 측정에 쓰는 판정', () => {
  it('키워드나 콘텐츠타입이 걸리면 true', () => {
    expect(matchesElement(makeSpot({ title: '해운대 해변' }), 'water')).toBe(true);
    expect(matchesElement(makeSpot({ title: '시립 미술관', contentTypeId: 14 }), 'metal')).toBe(true);
  });

  it('아무것도 안 걸리면 false', () => {
    expect(matchesElement(makeSpot({ title: '무명 쉼터', contentTypeId: 39 }), 'wood')).toBe(false);
  });
});

describe('화면 문구와 점수 맵의 정합', () => {
  it('ELEMENT_COURSE_HINT 가 오행 5종을 모두 덮는다', () => {
    for (const el of ELEMENTS) {
      expect(ELEMENT_COURSE_HINT[el]).toBeTruthy();
    }
  });

  // 화면에 적힌 단어가 실제 가중 키워드에 없으면, 사용자는 "숲을 준다더니 안 준다"를 겪는다.
  it('힌트에 적힌 단어가 실제로 가점을 만든다', () => {
    for (const el of ELEMENTS) {
      const words = ELEMENT_COURSE_HINT[el].split('·').map(w => w.trim());
      for (const word of words) {
        expect(matchesElement(makeSpot({ title: word, contentTypeId: 39, cat2: '' }), el)).toBe(true);
      }
    }
  });
});
