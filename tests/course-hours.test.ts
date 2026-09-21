import { afterEach, describe, expect, it, vi } from 'vitest';
import { stopHoursStatus } from '@/lib/course-hours';
import { courseHoursCounts } from '@/lib/course-hours-summary';
import { crossValidateContentIds, type ScoredSpot } from '@/lib/weekend-ai';
import { applyReplacement, moveStop } from '@/lib/course-edit';
import type { CourseStop } from '@/lib/weekend-types';

const stop = (over: Partial<CourseStop> = {}): CourseStop => ({ contentId: 'a', title: '검증', latitude: 37.5, longitude: 127, order: 1, timeStart: '10:00', durationMin: 60, isFestival: false, description: '', tip: '', ...over });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('정기 휴무와 운영구간 대조를 분리한다', () => {
  it('정기휴무가 아니어도 운영시간 원문이 없으면 미확인', () => {
    expect(stopHoursStatus(stop({ openStatus: 'open' }))).toBe('unknown');
  });
  it.each([
    ['09:00~18:00', 'within'], ['11:00~18:00', 'outside'],
    ['09:00~18:00 준비시간 10:00~11:00', 'outside'], ['09:00~18:00 입장마감 09:30', 'outside'],
    ['평일 09:00~18:00 / 주말 별도', 'unknown'], ['', 'unknown'],
  ])('원문 %s를 제안 시각·체류와 대조한다', (raw, expected) => {
    expect(stopHoursStatus(stop({ facilities: { operatingHours: raw } }))).toBe(expected);
  });
  it('공연은 회차와 방문 날짜가 있어야 판정한다', () => {
    const s = stop({ isFestival: true, facilities: { operatingHours: '10:00 / 14:00' } });
    expect(stopHoursStatus(s)).toBe('unknown'); expect(stopHoursStatus(s, '2026-09-12')).toBe('within');
    expect(stopHoursStatus({ ...s, timeStart: '11:00' }, '2026-09-12')).toBe('outside');
  });
  it('숙박을 일반 관람 운영시간으로 판정하지 않는다', () => {
    expect(stopHoursStatus(stop({ isStay: true, facilities: { operatingHours: '09:00~18:00' } }))).toBe('unknown');
  });
  it('기존 저장 데이터의 누락 상태도 미확인 분모에 포함한다', () => {
    expect(courseHoursCounts([stop(), stop({ hoursStatus: 'unknown' }), stop({ hoursStatus: 'within' }), stop({ hoursStatus: 'outside' })])).toEqual({ within: 1, outside: 1, unknown: 2 });
  });
  it('AI가 써온 운영시간 확인 상태를 신뢰하지 않는다', () => {
    const s = stop({ hoursStatus: 'within' });
    const source: ScoredSpot = { contentId: 'a', title: '검증', latitude: 37.5, longitude: 127, addr1: '', contentTypeId: 12, cat1: '', cat2: '', cat3: '', distanceKm: 0, score: 0 };
    crossValidateContentIds([s], [source], []); expect(s.hoursStatus).toBe('unknown');
  });
  it('순서 편집으로 시각이 바뀐 두 곳의 일치 상태를 되돌린다', () => {
    const out = moveStop([stop({ hoursStatus: 'within' }), stop({ contentId: 'b', order: 2, timeStart: '12:00', hoursStatus: 'outside' }), stop({ contentId: 'c', order: 3, hoursStatus: 'within' })], 1, 'down')!;
    expect(out.map(s => s.hoursStatus)).toEqual(['unknown', 'unknown', 'within']);
  });
  it('다른 장소로 교체해도 이전 장소의 일치 상태를 물려주지 않는다', async () => {
    vi.stubEnv('TOUR_API_KEY', 'replacement-hours-fixture');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ response: { header: { resultCode: '0000' }, body: { items: '' } } })));
    const out = await applyReplacement(stop({ hoursStatus: 'within', openStatus: 'open' }), { contentId: 'replacement', title: '다른 장소', contentTypeId: 12, latitude: 37.5, longitude: 127, addr1: '', detourKm: 0 });
    expect(out).toMatchObject({ hoursStatus: 'unknown', openStatus: 'unknown' });
  });
});
