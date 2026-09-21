import { describe, it, expect } from 'vitest';
import {
  LOADING_MESSAGES,
  FINAL_LOADING_MESSAGE,
  FIRST_LOADING_MESSAGE,
  buildLoadingSequence,
  COURSE_WAIT_CEILING_SEC,
  COURSE_WAIT_HINT,
  COURSE_WAIT_TYPICAL_SEC,
  waitProgressRatio,
  waitStatusText,
} from '@/lib/loading-messages';

describe('로딩 멘트', () => {
  it('두 번 써도 안 외워질 만큼은 있다', () => {
    // 10~15개를 두라는 요구. 6초마다 넘어가니 한 번에 3~4개만 노출된다.
    expect(LOADING_MESSAGES.length).toBeGreaterThanOrEqual(10);
  });

  it('같은 문장이 두 번 들어가 있지 않다', () => {
    expect(new Set(LOADING_MESSAGES).size).toBe(LOADING_MESSAGES.length);
  });

  it('첫 인사는 고정이다 — 매번 다른 말로 시작하면 인사로 안 읽힌다', () => {
    const seqA = buildLoadingSequence(() => 0.1);
    const seqB = buildLoadingSequence(() => 0.9);
    expect(seqA[0]).toBe(FIRST_LOADING_MESSAGE);
    expect(seqB[0]).toBe(FIRST_LOADING_MESSAGE);
  });

  it('「거의 다 됐어요」는 항상 마지막이다 — 처음에 나오면 거짓말이다', () => {
    for (const rng of [() => 0, () => 0.5, () => 0.99]) {
      const seq = buildLoadingSequence(rng);
      expect(seq[seq.length - 1]).toBe(FINAL_LOADING_MESSAGE);
      expect(seq.indexOf(FINAL_LOADING_MESSAGE)).toBe(seq.length - 1);
    }
  });

  it('첫 인사는 본편에서 빠져 바로 다음에 또 나오지 않는다', () => {
    const seq = buildLoadingSequence(() => 0);
    expect(seq.filter((m) => m === FIRST_LOADING_MESSAGE)).toHaveLength(1);
  });

  it('rng 가 다르면 실제로 순서가 달라진다 (셔플이 걸려 있다)', () => {
    let i = 0;
    const varied = () => ((i++ * 7919) % 1000) / 1000;
    const a = buildLoadingSequence(varied).join('|');
    const b = buildLoadingSequence(() => 0).join('|');
    expect(a).not.toBe(b);
  });

  it('문장을 잃지 않는다 — 첫 인사 + 본편 + 마무리', () => {
    const seq = buildLoadingSequence(() => 0.3);
    const bodyCount = LOADING_MESSAGES.filter((m) => m !== FIRST_LOADING_MESSAGE).length;
    expect(seq).toHaveLength(bodyCount + 2);
  });
});


describe('대기 안내 — 아는 것만 말한다', () => {
  it('시작 직후에는 숫자를 말하지 않는다 — 0초부터 세면 초조해진다', () => {
    expect(waitStatusText(0)).toBe('');
    expect(waitStatusText(0.4)).toBe('');
  });

  it('흘러간 시간은 클라이언트가 정확히 아는 값이라 그대로 말한다', () => {
    expect(waitStatusText(12)).toBe('12초째 만드는 중');
    expect(waitStatusText(20.9)).toBe('20초째 만드는 중');
  });

  it('실측 구간(45초)을 넘기면 솔직히 말한다', () => {
    expect(waitStatusText(COURSE_WAIT_TYPICAL_SEC)).toContain('예상보다 오래');
    expect(waitStatusText(58)).toContain('예상보다 오래');
  });

  it('안내가 옛 문구(평균 15~25초)를 되풀이하지 않고 상한 안에 머문다', () => {
    expect(COURSE_WAIT_HINT).not.toContain('15~25');
    expect(COURSE_WAIT_TYPICAL_SEC).toBeLessThan(COURSE_WAIT_CEILING_SEC);
  });

  it('진행은 「예상」이라 100%로 차지 않는다', () => {
    expect(waitProgressRatio(0)).toBe(0);
    expect(waitProgressRatio(30)).toBeCloseTo(0.5, 5);
    expect(waitProgressRatio(999)).toBe(0.95);
    expect(waitProgressRatio(Number.NaN)).toBe(0);
  });

  it('시간이 지나면 되돌아가지 않는다', () => {
    const steps = [1, 5, 10, 30, 59, 120].map(waitProgressRatio);
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThanOrEqual(steps[i - 1]);
  });
});
