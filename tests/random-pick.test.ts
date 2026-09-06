import { describe, it, expect } from 'vitest';
import { pickRandom, pickRandomExcept, shuffle } from '@/lib/random-pick';
import { CITY_OPTIONS } from '@/lib/weekend-types';

/** 정해진 값을 순서대로 뱉는 rng. 랜덤을 테스트하려면 랜덤을 없애야 한다. */
function seq(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('pickRandom', () => {
  it('rng 값에 비례해 인덱스를 고른다', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(pickRandom(items, seq(0))).toBe('a');
    expect(pickRandom(items, seq(0.5))).toBe('c');
    expect(pickRandom(items, seq(0.99))).toBe('d');
  });

  it('rng 가 1 을 돌려줘도 범위를 넘지 않는다', () => {
    expect(pickRandom(['a', 'b'], seq(1))).toBe('b');
  });

  it('빈 목록은 조용히 undefined 를 주지 않고 잡아낸다', () => {
    expect(() => pickRandom([], seq(0))).toThrow();
  });
});

describe('pickRandomExcept — 「다시 뽑기」', () => {
  it('지금 뽑혀 있는 것은 다시 나오지 않는다', () => {
    const items = ['a', 'b', 'c'];
    // rng 가 0 이라도 'a' 를 제외한 나머지의 첫 번째('b')가 나온다
    expect(pickRandomExcept(items, 'a', seq(0))).toBe('b');
  });

  it('아무것도 안 뽑힌 상태면 전체에서 고른다', () => {
    expect(pickRandomExcept(['a', 'b'], null, seq(0))).toBe('a');
  });

  it('후보가 하나뿐이면 어쩔 수 없이 그것을 돌려준다 (무한 재시도 금지)', () => {
    expect(pickRandomExcept(['a'], 'a', seq(0))).toBe('a');
  });

  it('도시는 이름으로 같은지 본다 — 속초·강릉이 areaCode 32 를 공유한다', () => {
    const sokcho = CITY_OPTIONS.find((c) => c.name === '속초')!;
    const gangneung = CITY_OPTIONS.find((c) => c.name === '강릉')!;
    expect(sokcho.areaCode).toBe(gangneung.areaCode);

    const next = pickRandomExcept(
      [gangneung, sokcho],
      gangneung,
      seq(0),
      (a, b) => a.name === b.name,
    );
    // areaCode 로 비교했다면 후보가 0 이 돼 강릉이 그대로 나왔을 것이다
    expect(next.name).toBe('속초');
  });
});

describe('shuffle', () => {
  it('원본을 건드리지 않는다', () => {
    const items = ['a', 'b', 'c'];
    shuffle(items, seq(0, 0, 0));
    expect(items).toEqual(['a', 'b', 'c']);
  });

  it('원소를 잃거나 늘리지 않는다', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const out = shuffle(items, seq(0.7, 0.2, 0.9, 0.1));
    expect([...out].sort()).toEqual([...items].sort());
  });
});
