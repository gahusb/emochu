import { describe, it, expect } from 'vitest';
import { parseRestDate, visitDayToIndex } from '@/lib/opening-hours';

describe('parseRestDate', () => {
  it('연중무휴 계열은 빈 배열 (휴무 없음)', () => {
    expect(parseRestDate('연중무휴')).toEqual([]);
    expect(parseRestDate('없음')).toEqual([]);
    expect(parseRestDate('연중개방')).toEqual([]);
  });

  it('단일 요일 휴무를 인덱스로', () => {
    expect(parseRestDate('매주 월요일')).toEqual([1]);
    expect(parseRestDate('월요일 휴관')).toEqual([1]);
    expect(parseRestDate('매주 일요일 휴무')).toEqual([0]);
    expect(parseRestDate('토요일 휴무')).toEqual([6]);
  });

  it('복수 요일 휴무', () => {
    expect(parseRestDate('매주 월요일, 화요일 휴무')).toEqual([1, 2]);
  });

  it('괄호 부연이 있어도 요일을 추출', () => {
    expect(parseRestDate('매주 월요일(공휴일인 경우 익일 휴무)')).toEqual([1]);
  });

  it('요일 정보가 없으면 null (판정 불가)', () => {
    expect(parseRestDate('1월 1일, 설날 당일')).toBeNull();
    expect(parseRestDate('기상악화 시 휴장')).toBeNull();
    expect(parseRestDate('')).toBeNull();
    expect(parseRestDate(undefined)).toBeNull();
  });

  it('중복 요일은 한 번만', () => {
    expect(parseRestDate('월요일 휴무, 매주 월요일 정기휴무')).toEqual([1]);
  });

  it('[회귀] 무휴 표현이 섞여 있어도 명확한 요일 정보를 추출', () => {
    expect(parseRestDate('매주 월요일 휴무(공휴일 무휴)')).toEqual([1]);
    expect(parseRestDate('매주 월요일 휴무, 공휴일 무휴')).toEqual([1]);
  });

  it('[회귀] 쉼표로 묶인 복수 요일 축약형을 처리', () => {
    expect(parseRestDate('매주 월,화요일 휴무')).toEqual([1, 2]);
  });
});

describe('visitDayToIndex', () => {
  it('토=6, 일=0', () => {
    expect(visitDayToIndex('sat')).toBe(6);
    expect(visitDayToIndex('sun')).toBe(0);
  });
});
