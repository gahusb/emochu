import { describe, it, expect } from 'vitest';
import { extractPhone } from '@/lib/weekend-ai';

// TourAPI 「문의 및 안내」 원문은 설명·HTML 이 섞여 온다.
// 걸 수 없는 번호를 전화 버튼에 노출하면 없느니만 못하므로 형태를 검사한다.
describe('extractPhone', () => {
  it('일반 지역번호를 뽑는다', () => {
    expect(extractPhone('02-123-4567')).toBe('02-123-4567');
    expect(extractPhone('031-1234-5678')).toBe('031-1234-5678');
  });

  it('설명·태그가 섞여 있어도 번호만 건진다', () => {
    expect(extractPhone('<br>문의: 033-123-4567 (주말 휴무)')).toBe('033-123-4567');
    // 1330 은 4자리라 대표번호 형태(8자리)가 아니다 — 통과시키지 않는다
    expect(extractPhone('관광안내 1330&nbsp;')).toBeUndefined();
  });

  it('대표번호(1588 류)를 뽑는다', () => {
    expect(extractPhone('1588-1234 로 문의')).toBe('1588-1234');
  });

  it('구분자가 공백·점이어도 하이픈으로 정규화한다', () => {
    expect(extractPhone('02 123 4567')).toBe('02-123-4567');
    expect(extractPhone('02.123.4567')).toBe('02-123-4567');
  });

  it('번호가 없으면 undefined', () => {
    expect(extractPhone('')).toBeUndefined();
    expect(extractPhone(undefined)).toBeUndefined();
    expect(extractPhone('현장 문의')).toBeUndefined();
  });

  it('🔴 자릿수가 모자란 건 통과시키지 않는다 — 걸 수 없는 번호다', () => {
    expect(extractPhone('02-12-34')).toBeUndefined();
    expect(extractPhone('123-4567')).toBeUndefined();      // 지역번호 없음
    expect(extractPhone('2026년 3월 15일')).toBeUndefined(); // 날짜를 번호로 오인하지 않는다
  });

  // 🔴 실전에서 실제로 터진 회귀. 첫 구현이 0507-1400-1797 에서 07-1400-1797 을
  //    뽑아 「못 거는 번호」를 전화 버튼에 붙였다.
  it('안심번호(0507)를 잘라먹지 않는다', () => {
    expect(extractPhone('0507-1400-1797')).toBe('0507-1400-1797');
    expect(extractPhone('문의 0507-1400-1797 (안심번호)')).toBe('0507-1400-1797');
  });

  it('휴대폰·인터넷전화도 온전히 뽑는다', () => {
    expect(extractPhone('010-1234-5678')).toBe('010-1234-5678');
    expect(extractPhone('070-4567-8901')).toBe('070-4567-8901');
  });
});
