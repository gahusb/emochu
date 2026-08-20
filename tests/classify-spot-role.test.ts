import { describe, it, expect } from 'vitest';
import { classifySpotRole } from '@/lib/weekend-ai';
import type { ScoredSpot } from '@/lib/weekend-ai';

const spot = (over: Partial<ScoredSpot>): ScoredSpot => ({
  contentId: '1', contentTypeId: 39, title: '가게', addr1: '서울',
  cat1: 'A05', cat2: 'A0502', cat3: 'A05020100',
  latitude: 37.5, longitude: 127, distanceKm: 1, score: 0,
  ...over,
});

// cat 값은 2026-08-20 TourAPI 실호출 관측치다(종로 3km, 음식점 15건).
//   A0502 / A05020100 → 한식 9건 (이북만두·참숯골·낙동강)
//   A0502 / A05020200 → 양식 3건
//   A0502 / A05020300 → 일식 2건
//   A0502 / A05020900 → 카페 1건 (바캉스커피)
// 즉 cat2 는 15건 전부 A0502 다 — "카페"가 아니라 "음식점" 전체 분류다.
describe('classifySpotRole — 음식점 vs 카페', () => {
  it('한식은 restaurant 다', () => {
    expect(classifySpotRole(spot({ title: '이북만두', cat3: 'A05020100' }))).toBe('restaurant');
  });

  it('양식·일식도 restaurant 다', () => {
    expect(classifySpotRole(spot({ title: '라칸티나', cat3: 'A05020200' }))).toBe('restaurant');
    expect(classifySpotRole(spot({ title: '오양회참치', cat3: 'A05020300' }))).toBe('restaurant');
  });

  it('cat3 A05020900 만 cafe 다', () => {
    expect(classifySpotRole(spot({ title: '바캉스커피', cat3: 'A05020900' }))).toBe('cafe');
  });

  it('cat2 A0502 만 보고 카페로 단정하지 않는다', () => {
    // 🔴 이 한 줄이 버그의 핵심이었다. A0502 는 음식점 전체라서, 이걸 카페 조건으로
    //    쓰면 밥집이 전부 카페가 된다 — 코스에 "밥집이 없어" 보이는 원인이었다.
    expect(classifySpotRole(spot({ title: '참숯골', cat2: 'A0502', cat3: 'A05020100' }))).toBe('restaurant');
  });

  it('제목에 카페·커피가 있으면 cat3 가 없어도 cafe 로 본다', () => {
    // '바캉스커피'는 실제 관측된 상호다. 제목 판별은 cat3 가 비어 오는 경우의 보조 수단이다.
    expect(classifySpotRole(spot({ title: '바캉스커피', cat3: '' }))).toBe('cafe');
    expect(classifySpotRole(spot({ title: '어니언 카페', cat3: '' }))).toBe('cafe');
  });

  it('제목에 키워드가 없는 카페는 cat3 로 잡는다', () => {
    // "스타벅스 광화문점"에는 '카페'도 '커피'도 없다 — 제목만으로는 못 잡는다.
    // 그래서 cat3 판별이 주(主)이고 제목은 보조여야 한다.
    expect(classifySpotRole(spot({ title: '스타벅스 광화문점', cat3: 'A05020900' }))).toBe('cafe');
  });

  it('다른 콘텐츠 타입은 그대로 분류한다', () => {
    expect(classifySpotRole(spot({ contentTypeId: 14 }))).toBe('culture');
    expect(classifySpotRole(spot({ contentTypeId: 28 }))).toBe('activity');
    expect(classifySpotRole(spot({ contentTypeId: 12 }))).toBe('attraction');
  });
});
