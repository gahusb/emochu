import { describe, it, expect } from 'vitest';
import { interleaveResults } from '@/lib/tour-api';

interface Item { contentid: string; contenttypeid: string }

const list = (typeId: string, n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({ contentid: `${typeId}-${i}`, contenttypeid: typeId }));

const ok = <T>(value: T[]): PromiseSettledResult<T[]> => ({ status: 'fulfilled', value });
const fail = <T>(): PromiseSettledResult<T[]> => ({ status: 'rejected', reason: new Error('boom') });

const merge = (results: PromiseSettledResult<Item[]>[]) =>
  interleaveResults(results, item => item.contentid);

describe('interleaveResults', () => {
  it('타입별 결과를 라운드로빈으로 섞는다', () => {
    const merged = merge([ok(list('12', 2)), ok(list('14', 2)), ok(list('39', 2))]);
    expect(merged.map(i => i.contentid)).toEqual([
      '12-0', '14-0', '39-0',
      '12-1', '14-1', '39-1',
    ]);
  });

  it('앞 20개(enrich 대상) 안에 모든 contentTypeId가 들어온다', () => {
    // 실제 collectCandidatesNearby 형태: 타입별 20개씩 4종
    const merged = merge([
      ok(list('12', 20)), ok(list('14', 20)), ok(list('28', 20)), ok(list('39', 20)),
    ]);
    const enrichTargets = merged.slice(0, 20);
    const types = new Set(enrichTargets.map(i => i.contenttypeid));
    expect([...types].sort()).toEqual(['12', '14', '28', '39']);
    // 타입별로 고르게 5개씩
    for (const t of ['12', '14', '28', '39']) {
      expect(enrichTargets.filter(i => i.contenttypeid === t)).toHaveLength(5);
    }
  });

  it('어떤 항목도 버리지 않는다 (중복 제거 외에는 전량 보존)', () => {
    const merged = merge([ok(list('12', 20)), ok(list('14', 7)), ok(list('39', 13))]);
    expect(merged).toHaveLength(40);
  });

  it('contentId 중복은 먼저 나온 것만 남긴다', () => {
    const dup: Item = { contentid: '12-0', contenttypeid: '39' };
    const merged = merge([ok(list('12', 2)), ok([dup])]);
    expect(merged.map(i => i.contentid)).toEqual(['12-0', '12-1']);
  });

  it('길이가 다른 목록도 짧은 쪽이 끝나면 나머지를 이어서 채운다', () => {
    const merged = merge([ok(list('12', 1)), ok(list('14', 3))]);
    expect(merged.map(i => i.contentid)).toEqual(['12-0', '14-0', '14-1', '14-2']);
  });

  it('실패한 조회는 빈 목록으로 취급한다 (allSettled 내성)', () => {
    const merged = merge([fail<Item>(), ok(list('14', 2)), fail<Item>()]);
    expect(merged.map(i => i.contentid)).toEqual(['14-0', '14-1']);
  });

  it('전부 실패하면 빈 배열', () => {
    expect(merge([fail<Item>(), fail<Item>()])).toEqual([]);
  });
});
