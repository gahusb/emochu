import { describe, it, expect } from 'vitest';
import { getYearElement, getTodayElement, getRelation, calcSaju } from '@/lib/saju';

describe('getYearElement (천간 5행)', () => {
  it('검증 케이스 (CONNECTIVITY 1992=壬=water)', () => {
    expect(getYearElement(1992)).toBe('water'); // 壬
    expect(getYearElement(1990)).toBe('metal'); // 庚
    expect(getYearElement(1984)).toBe('wood');  // 甲
    expect(getYearElement(1986)).toBe('fire');  // 丙
  });
});

describe('getTodayElement (일주 결정성)', () => {
  it('기준일(2000-01-01 UTC=甲)부터 일 인덱스', () => {
    expect(getTodayElement(new Date(2000, 0, 1))).toBe('wood'); // 甲 idx0
    expect(getTodayElement(new Date(2000, 0, 3))).toBe('fire'); // 丙 idx2
  });
});

describe('getRelation (상생·상극)', () => {
  it('5행 관계', () => {
    expect(getRelation('wood', 'wood')).toBe('same');
    expect(getRelation('wood', 'fire')).toBe('generates');   // 木生火
    expect(getRelation('fire', 'wood')).toBe('generated');   // 木生火 → fire는 생을 받음
    expect(getRelation('wood', 'earth')).toBe('controls');   // 木克土
    expect(getRelation('earth', 'wood')).toBe('controlled'); // 木克土 → earth는 극을 받음
  });
});

describe('calcSaju', () => {
  it('동일 입력 → 동일 출력 (결정성)', () => {
    const d = new Date(2000, 0, 1);
    expect(calcSaju(1992, d)).toEqual(calcSaju(1992, d));
  });

  it('1992 + 2000-01-01 → 알려진 결과', () => {
    const r = calcSaju(1992, new Date(2000, 0, 1));
    expect(r.birthElement).toBe('water');
    expect(r.todayElement).toBe('wood');
    expect(r.relation).toBe('generates'); // 水生木
    expect(r.feeling).toBe('romantic');   // FEELING_MAP.water.generates
    expect(r.headline).toContain('木');
    expect(typeof r.message).toBe('string');
    expect(r.message.length).toBeGreaterThan(0);
  });
});
