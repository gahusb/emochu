import { describe, it, expect } from 'vitest';
import { moveStop, recalcRoute } from '@/lib/course-edit';
import type { CourseStop } from '@/lib/weekend-types';

function stop(order: number, over: Partial<CourseStop> = {}): CourseStop {
  return {
    order,
    contentId: `c${order}`,
    title: `장소${order}`,
    timeStart: `${9 + order}:00`,
    durationMin: 60,
    description: '',
    tip: '',
    latitude: 37.5 + order * 0.01,
    longitude: 127.0,
    isFestival: false,
    ...over,
  };
}

describe('moveStop — 시간 슬롯은 자리에 남고 장소만 자리를 바꾼다', () => {
  it('앞으로 옮기면 두 장소의 순번이 맞바뀐다', () => {
    const out = moveStop([stop(1), stop(2), stop(3)], 2, 'up')!;
    expect(out.map((s) => s.title)).toEqual(['장소2', '장소1', '장소3']);
    expect(out.map((s) => s.order)).toEqual([1, 2, 3]);
  });

  // 🔑 이게 핵심이다. 사용자가 바꾼 건 「무엇을 가는가」지 「언제 가는가」가 아니다.
  //    시간까지 따라 움직이면 10시 시작 코스가 11시 시작이 되는 식으로 어긋난다.
  it('시간은 자리에 남는다 — 장소만 옮겨간다', () => {
    const before = [stop(1), stop(2), stop(3)];
    const out = moveStop(before, 2, 'up')!;
    expect(out[0].timeStart).toBe(before[0].timeStart); // 첫 자리 시간 그대로
    expect(out[1].timeStart).toBe(before[1].timeStart);
    expect(out[0].title).toBe('장소2');                 // 내용만 바뀜
  });

  it('뒤로 옮기기도 대칭으로 동작한다', () => {
    const out = moveStop([stop(1), stop(2), stop(3)], 2, 'down')!;
    expect(out.map((s) => s.title)).toEqual(['장소1', '장소3', '장소2']);
  });

  it('맨 앞에서 더 앞으로, 맨 뒤에서 더 뒤로는 못 옮긴다', () => {
    expect(moveStop([stop(1), stop(2)], 1, 'up')).toBeNull();
    expect(moveStop([stop(1), stop(2)], 2, 'down')).toBeNull();
  });

  // 🔴 1박2일 코스에서 1일차 장소가 2일차로 넘어가면 코스가 깨진다.
  it('날짜 경계는 넘지 않는다', () => {
    const stops = [stop(1, { day: 1 }), stop(2, { day: 1 }), stop(3, { day: 2 })];
    expect(moveStop(stops, 2, 'down')).toBeNull();  // 1일차 → 2일차 이동 거부
    expect(moveStop(stops, 3, 'up')).toBeNull();    // 2일차 → 1일차 이동 거부
    expect(moveStop(stops, 2, 'up')).not.toBeNull(); // 같은 날 안에서는 된다
  });

  it('없는 order 는 null', () => {
    expect(moveStop([stop(1)], 99, 'up')).toBeNull();
  });
});

describe('recalcRoute — 교체·순서 변경 뒤 거리와 이동정보를 다시 만든다', () => {
  it('order 를 1부터 다시 매긴다', () => {
    const out = recalcRoute([stop(5), stop(9), stop(2)]);
    expect(out.stops.map((s) => s.order)).toEqual([1, 2, 3]);
  });

  it('첫 장소에는 이동정보가 없다', () => {
    const out = recalcRoute([stop(1), stop(2)]);
    expect(out.stops[0].transitInfo).toBeUndefined();
    expect(out.stops[1].transitInfo).toMatch(/차로 \d+분/);
  });

  // 🔴 이전 이동정보가 남으면 「차로 15분」이라 적힌 채 실제로는 40분인 코스가 된다.
  it('순서가 바뀌면 옛 이동정보를 물려받지 않는다', () => {
    const stale = [
      stop(1, { transitInfo: '차로 99분 (99.0km)' }),
      stop(2, { transitInfo: '차로 99분 (99.0km)' }),
    ];
    const out = recalcRoute(stale);
    expect(out.stops[0].transitInfo).toBeUndefined();
    expect(out.stops[1].transitInfo).not.toContain('99');
  });

  it('총거리는 구간 합이고 소수 첫째 자리로 반올림된다', () => {
    const out = recalcRoute([stop(1), stop(2), stop(3)]);
    expect(out.totalDistanceKm).toBeGreaterThan(0);
    expect(Number(out.totalDistanceKm.toFixed(1))).toBe(out.totalDistanceKm);
  });

  it('장소가 하나면 총거리는 0이다', () => {
    expect(recalcRoute([stop(1)]).totalDistanceKm).toBe(0);
  });
});
