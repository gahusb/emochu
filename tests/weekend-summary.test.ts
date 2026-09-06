import { describe, it, expect } from 'vitest';
import {
  summarizeWeekendWeather,
  summarizeWeekendElements,
  weekendDateLabel,
} from '@/lib/weekend-summary';
import type { DayWeather, WeekendWeather } from '@/lib/weekend-types';

function day(over: Partial<DayWeather> = {}): DayWeather {
  return {
    date: '2026-09-05',
    sky: 'clear',
    precipitation: 'none',
    tempMin: 18,
    tempMax: 26,
    pop: 10,
    summary: '맑음',
    ...over,
  };
}

function weekend(sat: Partial<DayWeather>, sun: Partial<DayWeather>): WeekendWeather {
  return { saturday: day(sat), sunday: day(sun), recommendation: '' };
}

describe('summarizeWeekendWeather — 한 줄로 "나가도 되나"에 답한다', () => {
  it('날씨가 없으면 숫자를 지어내지 않는다', () => {
    const r = summarizeWeekendWeather(null);
    expect(r.temp).toBeNull();
    expect(r.text).toContain('확인하고');
  });

  it('토·일 모두 맑으면 한 문장으로 합친다', () => {
    const r = summarizeWeekendWeather(weekend({}, {}));
    expect(r.text).toBe('토·일 모두 맑아요');
    expect(r.tone).toBe('clear');
  });

  it('기온은 주말 전체의 최저~최고로 묶는다', () => {
    const r = summarizeWeekendWeather(
      weekend({ tempMin: 15, tempMax: 22 }, { tempMin: 18, tempMax: 27 }),
    );
    expect(r.temp).toBe('15~27°');
  });

  it('하루만 비면 어느 날이 나은지 알려준다 — 그때가 정보가 되는 순간이다', () => {
    const sat = summarizeWeekendWeather(weekend({ precipitation: 'rain', pop: 80 }, {}));
    expect(sat.text).toBe('토요일엔 비, 일요일은 괜찮아요');
    expect(sat.tone).toBe('wet');

    const sun = summarizeWeekendWeather(weekend({}, { precipitation: 'rain', pop: 80 }));
    expect(sun.text).toBe('토요일은 괜찮고, 일요일엔 비가 와요');
  });

  it('이틀 다 비면 어느 날을 고르라 하지 않는다', () => {
    const r = summarizeWeekendWeather(
      weekend({ precipitation: 'rain', pop: 70 }, { precipitation: 'rain', pop: 90 }),
    );
    expect(r.text).toBe('주말 내내 비 소식이 있어요');
  });

  it('눈이면 "비"라고 하지 않는다', () => {
    const r = summarizeWeekendWeather(
      weekend({ precipitation: 'snow', pop: 70 }, { precipitation: 'snow', pop: 70 }),
    );
    expect(r.text).toBe('주말 내내 눈 소식이 있어요');
  });

  it('강수 형태가 없어도 확률이 절반을 넘으면 젖는 날로 본다', () => {
    const r = summarizeWeekendWeather(weekend({ pop: 60 }, {}));
    expect(r.tone).toBe('wet');
    expect(r.text).toContain('토요일엔 비');
  });

  it('맑지도 젖지도 않으면 흐리다고 말한다 — 억지로 맑다고 하지 않는다', () => {
    const r = summarizeWeekendWeather(
      weekend({ sky: 'overcast', pop: 20 }, { sky: 'cloudy', pop: 10 }),
    );
    expect(r.text).toBe('주말 내내 흐린 편이에요');
    expect(r.tone).toBe('mild');
  });
});

describe('summarizeWeekendElements — 사주도 같은 한 줄 골격', () => {
  // 실측: 2026-09-05·06 = 土·土(같음) / 2026-09-12·13 = 木·火(다름) — lib/saju.ts 주석 참조
  it('토·일 기운이 같으면 하나로 합쳐 말한다', () => {
    const r = summarizeWeekendElements(new Date('2026-09-05T03:00:00Z'));
    expect(r.split).toBe(false);
    expect(r.label).toBe('이번 주말은 土 기운');
    expect(r.hint).toBe('전통 · 마을 · 체험');
  });

  it('기운이 갈리면 두 날을 한 줄 안에서 나눈다', () => {
    const r = summarizeWeekendElements(new Date('2026-09-12T03:00:00Z'));
    expect(r.split).toBe(true);
    expect(r.label).toBe('토요일 木, 일요일 火');
    expect(r.hint).toContain('/');
  });

  it('요일(토·일) 옆에서 헷갈리지 않게 한자만 쓴다', () => {
    const r = summarizeWeekendElements(new Date('2026-09-05T03:00:00Z'));
    expect(r.label).not.toContain('(토)');
  });
});

describe('weekendDateLabel', () => {
  it('같은 달이면 일자만 이어 붙인다', () => {
    expect(weekendDateLabel(new Date('2026-09-05T03:00:00Z'))).toBe('9월 5~6일');
  });

  it('달이 바뀌면 양쪽에 달을 붙인다', () => {
    // 2026-10-31(토) ~ 11-01(일)
    expect(weekendDateLabel(new Date('2026-10-31T03:00:00Z'))).toBe('10월 31일~11월 1일');
  });

  it('일요일에는 다음 주말로 넘어가지 않는다 — 오늘 나갈 사람이 있다', () => {
    // 2026-09-06 은 일요일. 기준 주말은 9/5~9/6 이어야 한다.
    expect(weekendDateLabel(new Date('2026-09-06T03:00:00Z'))).toBe('9월 5~6일');
  });
});

describe('폴백 날씨를 예보로 읽지 않는다', () => {
  it('unavailable 이면 맑다고 단언하지 않는다', () => {
    // 폴백 DayWeather 는 sky:'clear', pop:0 이라 그냥 읽으면 "토·일 모두 맑아요"가 된다.
    // 기상청이 응답하지 않은 날에 그렇게 말하면 거짓말이다.
    const r = summarizeWeekendWeather({ ...weekend({}, {}), unavailable: true });
    expect(r.text).toBe('주말 날씨를 확인하고 있어요');
    expect(r.temp).toBeNull();
  });

  it('unavailable 이 없으면 평소대로 요약한다', () => {
    expect(summarizeWeekendWeather(weekend({}, {})).text).toBe('토·일 모두 맑아요');
  });
});
