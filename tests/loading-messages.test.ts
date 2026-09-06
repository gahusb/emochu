import { describe, it, expect } from 'vitest';
import {
  LOADING_MESSAGES,
  FINAL_LOADING_MESSAGE,
  FIRST_LOADING_MESSAGE,
  buildLoadingSequence,
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
