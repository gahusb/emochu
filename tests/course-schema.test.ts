import { describe, it, expect } from 'vitest';
import { buildCourseSchema, STOPS_RANGE } from '@/lib/course-schema';

describe('buildCourseSchema', () => {
  it('duration 별 장소 수를 스키마로 강제한다', () => {
    // SYSTEM_INSTRUCTION 이 자연어로 부탁하던 것을 API 계약으로 옮긴다
    expect(STOPS_RANGE.half_day).toEqual([3, 4]);
    expect(STOPS_RANGE.full_day).toEqual([5, 7]);
    expect(STOPS_RANGE.leisurely).toEqual([4, 5]);
    expect(STOPS_RANGE.overnight).toEqual([7, 10]);
  });

  it('minItems/maxItems 가 duration 에 맞게 들어간다', () => {
    const half = buildCourseSchema('half_day');
    expect(half.properties?.stops).toMatchObject({ minItems: 3, maxItems: 4 });

    const full = buildCourseSchema('full_day');
    expect(full.properties?.stops).toMatchObject({ minItems: 5, maxItems: 7 });
  });

  it('코스 품질의 핵심 필드가 required 다', () => {
    // hook·whyNow·storyArc 가 빠지면 이모추의 차별점이 사라진다.
    // 2026-08-20 에 스키마 없이 프롬프트 설명만 지웠더니 실제로 전부 빈칸이 됐다.
    const s = buildCourseSchema('half_day');
    expect(s.required).toContain('storyArc');
    expect(s.required).toContain('tip');
    expect(s.required).toContain('estimatedCostWon');

    const stop = s.properties?.stops?.items;
    expect(stop?.required).toContain('hook');
    expect(stop?.required).toContain('whyNow');
    expect(stop?.required).toContain('description');
  });

  it('difficulty 는 정해진 값만 허용한다', () => {
    const s = buildCourseSchema('half_day');
    expect(s.properties?.difficulty?.enum).toEqual(['easy', 'moderate', 'active']);
  });

  it('overnight 만 day 필드를 쓴다 (당일 코스는 required 아님)', () => {
    const stop = buildCourseSchema('half_day').properties?.stops?.items;
    expect(stop?.required ?? []).not.toContain('day');
  });
});
