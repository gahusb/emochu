import { afterEach, describe, expect, it, vi } from 'vitest';
import { getWeekendForecast } from '@/lib/weather-api';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
describe('주말 예보 범위', () => {
  it('응답이 있어도 주말 날짜가 없으면 미확인이다', async () => {
    vi.stubEnv('WEATHER_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ response: { body: { items: { item: [
      { fcstDate: '20260908', fcstTime: '1200', category: 'SKY', fcstValue: '1' },
    ] } } } }), { status: 200 })));
    const result = await getWeekendForecast({ lat: 37.5, lng: 127, saturdayDate: '20260912', sundayDate: '20260913' });
    expect(result.unavailable).toBe(true);
    expect(result.recommendation).not.toContain('나들이 날씨');
  });
  it('UTC 새벽이 아니라 KST 발표시각으로 조회한다', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-11T17:30:00Z')); // 토 02:30 KST, 전일23시 발표
    vi.stubEnv('WEATHER_API_KEY', 'test-key');
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ response: { body: { items: { item: [
      { fcstDate: '20260911', fcstTime: '1200', category: 'SKY', fcstValue: '1' },
    ] } } } }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    await getWeekendForecast({ lat: 37.5, lng: 127, saturdayDate: '20260912', sundayDate: '20260913' });
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.searchParams.get('base_date')).toBe('20260911');
    expect(url.searchParams.get('base_time')).toBe('2300');
  });
});
