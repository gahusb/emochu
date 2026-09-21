import { describe, expect, it } from 'vitest';
import { DEFAULT_SPOT_CATEGORY_META, getSpotCategoryMeta } from '@/lib/spot-category';

describe('장소 배지 — 중분류를 공사 분류 이름대로 부른다', () => {
  it('A0206 은 문화시설이다. 「공연」이 아니다', () => {
    expect(getSpotCategoryMeta('A0206').label).toBe('문화시설');
  });

  it('배포본에서 「공연」으로 떴던 네 곳이 더 이상 공연이 아니다', () => {
    // 2026-09-21 홈 추천 카드: 세종문화회관(공연장) · 교보문고(서점) · 신문박물관 · 이화여고100주년기념관
    const observed = ['A02060600', 'A02061000', 'A02060100', 'A02060200'];
    for (const cat3 of observed) {
      expect(getSpotCategoryMeta('A0206', cat3).label).not.toBe('공연');
    }
    expect(getSpotCategoryMeta('A0206', 'A02061000').label).toBe('서점');
    expect(getSpotCategoryMeta('A0206', 'A02060100').label).toBe('박물관');
  });

  it('공연장은 소분류일 때만 「공연장」이다', () => {
    expect(getSpotCategoryMeta('A0206', 'A02060600').label).toBe('공연장');
  });

  it('소분류는 라벨만 바꾼다 — 색이 제각각이면 목록이 시끄러워진다', () => {
    const base = getSpotCategoryMeta('A0206');
    const museum = getSpotCategoryMeta('A0206', 'A02060100');
    expect(museum.label).toBe('박물관');
    expect(museum.gradient).toBe(base.gradient);
    expect(museum.variant).toBe(base.variant);
  });

  it('모르는 소분류는 중분류 라벨로 떨어진다 — 틀린 이름보다 낫다', () => {
    expect(getSpotCategoryMeta('A0206', 'A02069999').label).toBe('문화시설');
  });

  it('모르는 중분류는 기본 배지', () => {
    expect(getSpotCategoryMeta('Z9999')).toEqual(DEFAULT_SPOT_CATEGORY_META);
  });

  it('휴양·건축물·공연행사도 분류 이름을 따른다', () => {
    expect(getSpotCategoryMeta('A0202').label).toBe('휴양');   // 휴양관광지 — 체험(A0203) 아님
    expect(getSpotCategoryMeta('A0205').label).toBe('건축물'); // 건축/조형물
    expect(getSpotCategoryMeta('A0208').label).toBe('공연·행사');
    expect(getSpotCategoryMeta('A0203').label).toBe('체험');
  });
});
