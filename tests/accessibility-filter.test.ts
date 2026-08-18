import { describe, it, expect } from 'vitest';
import { filterByAccessibility, buildAccessibilityPrompt } from '@/lib/weekend-ai';
import type { BarrierFreeInfo } from '@/lib/weekend-types';

const spots = [
  { contentId: '1', title: '확인됨' },
  { contentId: '2', title: '정보없음' },
  { contentId: '3', title: '조회실패' },
];
const info = new Map<string, BarrierFreeInfo>([
  ['1', { details: { exit: '경사로 있음' }, mobility: true }],
  ['2', { details: {} }], // 조회는 됐으나 정보가 하나도 없음
]);
// '3' 은 Map 에 아예 없다 = 조회 실패 = 미확인

describe('filterByAccessibility', () => {
  it('needs 가 비면 입력을 그대로 돌려준다 (기존 사용자 무영향)', () => {
    expect(filterByAccessibility(spots, [], info)).toEqual(spots);
    expect(filterByAccessibility(spots, undefined, info)).toEqual(spots);
  });

  it('확인된 곳이 맨 앞에 온다', () => {
    const out = filterByAccessibility(spots, ['mobility'], info);
    expect(out[0].contentId).toBe('1');
  });

  it('미확인을 제외하지 않는다 (제외하면 결과 0 인 지역이 생긴다)', () => {
    // 커버리지 실측이 평균 48%였다. 하드 제외하면 후보 절반이 사라진다.
    const out = filterByAccessibility(spots, ['mobility'], info);
    const ids = out.map((s) => s.contentId);
    expect(ids).toContain('2');
    expect(ids).toContain('3');
    expect(out).toHaveLength(3);
  });

  it('여러 그룹을 고르면 전부 충족한 곳만 앞으로 온다', () => {
    const multi = new Map<string, BarrierFreeInfo>([
      ['1', { details: {}, mobility: true }],                // mobility 만
      ['2', { details: {}, mobility: true, visual: true }],  // 둘 다
    ]);
    const out = filterByAccessibility(
      [{ contentId: '1' }, { contentId: '2' }],
      ['mobility', 'visual'],
      multi,
    );
    expect(out[0].contentId).toBe('2');
  });
});

describe('buildAccessibilityPrompt', () => {
  it('미선택이면 빈 문자열이다 (프롬프트가 기존과 완전히 동일해야 한다)', () => {
    expect(buildAccessibilityPrompt(undefined)).toBe('');
    expect(buildAccessibilityPrompt([])).toBe('');
  });

  it('선택한 그룹의 한글 라벨이 들어간다', () => {
    const out = buildAccessibilityPrompt(['mobility']);
    expect(out).toContain('휠체어·보행 불편');
  });

  it('미확인 장소를 지어내지 말라는 지시가 들어간다', () => {
    // LLM 은 정보가 없을 때 그럴듯하게 지어낸다. 접근성에서 그건 사용자를 헛걸음시킨다.
    const out = buildAccessibilityPrompt(['mobility']);
    expect(out).toContain('단정하지 마세요');
  });
});
