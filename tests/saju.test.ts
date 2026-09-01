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

// 🔴 2026-09-01 회귀 방지. 홈에 「오늘의 기운」을 올리면서 드러난 결함이다.
//    예전 구현은 실행 환경의 **로컬** 날짜를 읽었다. Vercel 서버는 UTC 라서
//    KST 00:00~08:59 구간에 서버와 브라우저가 다른 날짜를 보고,
//    같은 화면이 서버 렌더와 하이드레이션에서 다른 오행을 그렸다.
describe('getTodayElement — 실행 환경 시간대와 무관하게 KST 기준', () => {
  it('KST 자정 직후는 그날로 친다 (UTC 로는 아직 전날)', () => {
    // 2000-01-02 00:30 KST = 2000-01-01 15:30 UTC
    const justAfterKstMidnight = new Date(Date.UTC(2000, 0, 1, 15, 30));
    // 2000-01-02 12:00 KST = 2000-01-02 03:00 UTC — 같은 KST 날짜
    const sameKstDayNoon = new Date(Date.UTC(2000, 0, 2, 3, 0));
    expect(getTodayElement(justAfterKstMidnight)).toBe(getTodayElement(sameKstDayNoon));
  });

  // ⚠️ 경계를 아무 날이나 잡으면 안 된다. 천간 10개가 오행 5개에 2:1 로 대응해
  //    甲(01-01)→乙(01-02) 은 **둘 다 wood** 라 값이 안 바뀐다.
  //    실제로 오행이 바뀌는 경계(乙→丙)를 골라야 자정 처리를 검증한다.
  it('KST 자정을 넘으면 오행이 바뀐다 (乙→丙 경계)', () => {
    const before = new Date(Date.UTC(2000, 0, 2, 14, 59)); // 2000-01-02 23:59 KST → 乙
    const after = new Date(Date.UTC(2000, 0, 2, 15, 1));   // 2000-01-03 00:01 KST → 丙
    expect(getTodayElement(before)).toBe('wood');
    expect(getTodayElement(after)).toBe('fire');
  });

  it('기준일 2000-01-01 KST 는 甲(wood)', () => {
    expect(getTodayElement(new Date(Date.UTC(1999, 11, 31, 15, 0)))).toBe('wood'); // 01-01 00:00 KST
    expect(getTodayElement(new Date(Date.UTC(2000, 0, 1, 14, 0)))).toBe('wood');   // 01-01 23:00 KST
  });

  // 🔑 이게 핵심이다. 같은 순간을 서버(UTC)와 브라우저(KST)가 봐도 답이 같아야 한다.
  it('같은 순간이면 어느 시간대에서 계산해도 같은 오행', () => {
    const instant = new Date(Date.UTC(2026, 8, 1, 20, 0)); // KST 로는 09-02 05:00
    expect(getTodayElement(instant)).toBe(getTodayElement(new Date(instant.getTime())));
  });
});
