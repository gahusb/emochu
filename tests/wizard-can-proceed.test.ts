import { describe, it, expect } from 'vitest';
import { canProceedAtStep, WIZARD_TOTAL_STEPS } from '@/lib/wizard-steps';

const base = {
  destinationType: 'nearby' as const,
  selectedCity: null,
  selectedMood: null,
  feeling: 'healing' as const,
  duration: 'half_day' as const,
  companion: 'solo' as const,
  preferences: ['nature' as const],
  accessibility: [],
};

describe('canProceedAtStep', () => {
  it('접근성 스텝은 아무것도 고르지 않아도 진행된다', () => {
    expect(canProceedAtStep(5, { ...base, accessibility: [] })).toBe(true);
  });

  it('접근성을 골라도 당연히 진행된다', () => {
    expect(canProceedAtStep(5, { ...base, accessibility: ['mobility'] })).toBe(true);
  });

  it('취향은 1개 이상 골라야 진행된다 (의도된 제약)', () => {
    expect(canProceedAtStep(4, { ...base, preferences: [] })).toBe(false);
    expect(canProceedAtStep(4, base)).toBe(true);
  });

  it('마지막 스텝 번호가 접근성 스텝과 일치한다', () => {
    // 하드코딩 5 와 TOTAL_STEPS 가 어긋나면 여기서 잡힌다
    expect(canProceedAtStep(WIZARD_TOTAL_STEPS - 1, { ...base, accessibility: [] })).toBe(true);
  });

  it('동반자를 안 고르면 진행되지 않는다', () => {
    expect(canProceedAtStep(3, { ...base, companion: null })).toBe(false);
  });
});
