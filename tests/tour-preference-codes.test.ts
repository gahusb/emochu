import { describe, expect, it } from 'vitest';
import { getSpotCategoryMeta } from '@/lib/spot-category';
import { PREFERENCE_SUB_CATEGORIES } from '@/lib/tour-api';

// 배지 표(lib/spot-category.ts)와 짝이 되는 검사다 — 라벨은 화면에서, 코드는 조회에서 쓰이는데
// 둘이 어긋나 있었다(2026-09-21: 「공연장」이 A0206 전체를 고르고 있었다).
describe('취향 세부 카테고리 — 라벨과 코드가 같은 범위를 가리킨다', () => {
  it('문화 3종은 A0206 소분류까지 좁혀져 있다', () => {
    const fine = PREFERENCE_SUB_CATEGORIES.culture.filter((c) => c.cat2 === 'A0206');
    expect(fine).toHaveLength(3);
    expect(fine.every((c) => c.cat3?.startsWith('A0206'))).toBe(true);
  });

  it('소분류를 지정한 항목은 배지 라벨과 이름이 일치한다', () => {
    for (const { label, cat2, cat3 } of PREFERENCE_SUB_CATEGORIES.culture) {
      if (!cat3) continue;
      expect(getSpotCategoryMeta(cat2 ?? '', cat3).label).toBe(label);
    }
  });
});
