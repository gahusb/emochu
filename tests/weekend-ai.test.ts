import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  generateFallbackCourse,
  buildKakaoNaviUrl,
  generateShareSlug,
} from '@/lib/weekend-ai';

const mkSpot = (id: string, lat: number, lng: number) => ({
  contentId: id, contentTypeId: 12, title: `장소${id}`, addr1: '서울',
  cat1: '', cat2: '', cat3: '', latitude: lat, longitude: lng,
  distanceKm: 1, score: 1,
});

const mkStop = (id: string, lat: number, lng: number) => ({
  order: 1, contentId: id, title: `T${id}`, timeStart: '10:00', durationMin: 60,
  description: '', tip: '', latitude: lat, longitude: lng, isFestival: false,
});

describe('haversineKm', () => {
  it('동일 좌표 = 0', () => {
    expect(haversineKm(37.5, 127, 37.5, 127)).toBe(0);
  });
  it('서울-부산 ≈ 325km', () => {
    const d = haversineKm(37.5665, 126.978, 35.1796, 129.0756);
    expect(d).toBeGreaterThan(315);
    expect(d).toBeLessThan(335);
  });
});

describe('generateFallbackCourse', () => {
  const candidates = [mkSpot('1', 37.5, 127.0), mkSpot('2', 37.51, 127.01), mkSpot('3', 37.52, 127.02)];

  it('후보로 유효 코스 생성', () => {
    const c = generateFallbackCourse(candidates as any, 'half_day', { lat: 37.5, lng: 127.0 });
    expect(c.stops.length).toBeGreaterThan(0);
    expect(typeof c.title).toBe('string');
    expect(typeof c.summary).toBe('string');

    const ids = new Set(candidates.map((s) => s.contentId));
    c.stops.forEach((s) => expect(ids.has(s.contentId)).toBe(true)); // 모든 stop은 후보에서
    c.stops.forEach((s, i) => expect(s.order).toBe(i + 1));          // order 순차
    c.stops.forEach((s) => expect(s.timeStart).toMatch(/^\d{2}:\d{2}$/)); // HH:MM
  });

  it('후보 0개 → 빈 stops (graceful)', () => {
    const c = generateFallbackCourse([], 'half_day', { lat: 37.5, lng: 127.0 });
    expect(c.stops.length).toBe(0);
  });
});

describe('buildKakaoNaviUrl', () => {
  it('0개 → 빈 문자열', () => {
    expect(buildKakaoNaviUrl([])).toBe('');
  });
  it('1개 → link/to', () => {
    expect(buildKakaoNaviUrl([mkStop('1', 37.5, 127)] as any)).toContain('map.kakao.com/link/to/');
  });
  it('2개+ → link/map (멀티마커)', () => {
    const url = buildKakaoNaviUrl([mkStop('1', 37.5, 127), mkStop('2', 37.6, 127.1)] as any);
    expect(url).toContain('map.kakao.com/link/map/');
  });
});

describe('generateShareSlug', () => {
  it('길이 8 + 혼동 문자 제외 charset', () => {
    const slug = generateShareSlug();
    expect(slug).toHaveLength(8);
    expect(slug).toMatch(/^[abcdefghijkmnpqrstuvwxyz23456789]{8}$/); // l, o, 0, 1 제외
  });
});
