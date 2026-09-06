import { describe, it, expect } from 'vitest';
import { canProceedAtStep, hasDestination, WIZARD_TOTAL_STEPS } from '@/lib/wizard-steps';
import { CITY_OPTIONS } from '@/lib/weekend-types';

const base = {
  destinationType: 'nearby' as const,
  selectedCity: null,
  feeling: 'healing' as const,
  duration: 'half_day' as const,
  companion: 'solo' as const,
  preferences: ['nature' as const],
  accessibility: [],
};

describe('hasDestination', () => {
  it('현 위치는 그 자체로 목적지다', () => {
    expect(hasDestination({ destinationType: 'nearby', selectedCity: null })).toBe(true);
  });

  it('도시를 골랐다고 해놓고 실제 도시가 없으면 목적지가 아니다', () => {
    expect(hasDestination({ destinationType: 'city', selectedCity: null })).toBe(false);
  });

  it('랜덤으로 뽑힌 도시도 도시다 (서버에는 city 로 나간다)', () => {
    expect(hasDestination({ destinationType: 'city', selectedCity: CITY_OPTIONS[0] })).toBe(true);
  });
});

describe('canProceedAtStep', () => {
  it('1단계는 장소와 기분이 둘 다 있어야 넘어간다 (한 덩어리로 묶은 스텝)', () => {
    expect(canProceedAtStep(0, { ...base, feeling: null })).toBe(false);
    expect(canProceedAtStep(0, { ...base, destinationType: 'city', selectedCity: null })).toBe(false);
    expect(canProceedAtStep(0, base)).toBe(true);
  });

  it('사주 스텝은 아무것도 안 해도 넘어간다 — 킥이지 관문이 아니다', () => {
    expect(canProceedAtStep(1, base)).toBe(true);
  });

  it('일정과 동반자는 둘 다 골라야 넘어간다 (한 스텝에 있다)', () => {
    expect(canProceedAtStep(2, { ...base, duration: null })).toBe(false);
    expect(canProceedAtStep(2, { ...base, companion: null })).toBe(false);
    expect(canProceedAtStep(2, base)).toBe(true);
  });

  it('취향은 1개 이상 골라야 진행된다 (의도된 제약)', () => {
    expect(canProceedAtStep(3, { ...base, preferences: [] })).toBe(false);
    expect(canProceedAtStep(3, base)).toBe(true);
  });

  it('접근성은 아무것도 안 골라도 마지막 스텝을 통과한다', () => {
    // 하드코딩 3 과 TOTAL_STEPS 가 어긋나면 여기서 잡힌다
    expect(canProceedAtStep(WIZARD_TOTAL_STEPS - 1, { ...base, accessibility: [] })).toBe(true);
    expect(canProceedAtStep(WIZARD_TOTAL_STEPS - 1, { ...base, accessibility: ['mobility'] })).toBe(true);
  });

  it('없는 스텝은 진행되지 않는다', () => {
    expect(canProceedAtStep(WIZARD_TOTAL_STEPS, base)).toBe(false);
    expect(canProceedAtStep(-1, base)).toBe(false);
  });
});
