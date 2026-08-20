import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateComposition, isCompositionRetryEnabled } from '@/lib/course-composition';
import type { CourseStop } from '@/lib/weekend-types';

const stop = (over: Partial<CourseStop>): CourseStop => ({
  order: 1, contentId: '1', title: '장소', timeStart: '10:00', durationMin: 60,
  description: '', tip: '', latitude: 37.5, longitude: 127, isFestival: false,
  ...over,
});

describe('validateComposition', () => {
  it('하루 코스에 카페가 없으면 잡는다', () => {
    // 2026-08-20 실측: 오후 시간대에 카페 대신 관광지가 들어가는 일이 4/4 로 발생했다
    const stops = [
      stop({ order: 1, role: 'attraction', timeStart: '10:00' }),
      stop({ order: 2, role: 'restaurant', timeStart: '12:00' }),
      stop({ order: 3, role: 'attraction', timeStart: '14:30' }),
      stop({ order: 4, role: 'attraction', timeStart: '16:00' }),
      stop({ order: 5, role: 'restaurant', timeStart: '18:00' }),
    ];
    const v = validateComposition(stops, 'full_day');
    expect(v.ok).toBe(false);
    expect(v.problems.join(' ')).toContain('카페');
  });

  it('카페가 있으면 통과한다', () => {
    const stops = [
      stop({ order: 1, role: 'attraction', timeStart: '10:00' }),
      stop({ order: 2, role: 'restaurant', timeStart: '12:00' }),
      stop({ order: 3, role: 'cafe', timeStart: '14:30' }),
      stop({ order: 4, role: 'attraction', timeStart: '16:00' }),
      stop({ order: 5, role: 'restaurant', timeStart: '18:00' }),
    ];
    expect(validateComposition(stops, 'full_day').ok).toBe(true);
  });

  it('점심 시간대에 식사가 없으면 잡는다', () => {
    const stops = [
      stop({ order: 1, role: 'attraction', timeStart: '10:00' }),
      stop({ order: 2, role: 'attraction', timeStart: '12:00' }), // 점심인데 관광지
      stop({ order: 3, role: 'cafe', timeStart: '14:30' }),
      stop({ order: 4, role: 'restaurant', timeStart: '18:00' }),
      stop({ order: 5, role: 'attraction', timeStart: '19:30' }),
    ];
    const v = validateComposition(stops, 'full_day');
    expect(v.ok).toBe(false);
    expect(v.problems.join(' ')).toContain('점심');
  });

  it('11:20 점심을 위반으로 보지 않는다', () => {
    // 🔴 2026-08-20 실측: AI 가 11:20 에 이북만두를 넣었는데 검증이 위반으로 판정해
    //    매번 재생성 → 50초 초과 → 폴백 코스가 됐다. 시간창이 좁으면 멀쩡한 코스를 깬다.
    const stops = [
      stop({ order: 1, role: 'attraction', timeStart: '09:00' }),
      stop({ order: 2, role: 'culture', timeStart: '10:10' }),
      stop({ order: 3, role: 'restaurant', timeStart: '11:20' }),
      stop({ order: 4, role: 'cafe', timeStart: '14:00' }),
      stop({ order: 5, role: 'restaurant', timeStart: '18:00' }),
    ];
    expect(validateComposition(stops, 'full_day').ok).toBe(true);
  });

  it('13:30 점심·20:00 저녁도 정상으로 본다', () => {
    const stops = [
      stop({ order: 1, role: 'attraction', timeStart: '10:00' }),
      stop({ order: 2, role: 'restaurant', timeStart: '13:30' }),
      stop({ order: 3, role: 'cafe', timeStart: '15:30' }),
      stop({ order: 4, role: 'attraction', timeStart: '17:00' }),
      stop({ order: 5, role: 'restaurant', timeStart: '19:40' }),
    ];
    expect(validateComposition(stops, 'full_day').ok).toBe(true);
  });

  it('같은 역할 3연속을 잡는다', () => {
    const stops = [
      stop({ order: 1, role: 'attraction', timeStart: '10:00' }),
      stop({ order: 2, role: 'attraction', timeStart: '11:00' }),
      stop({ order: 3, role: 'attraction', timeStart: '12:00' }),
      stop({ order: 4, role: 'restaurant', timeStart: '12:30' }),
    ];
    const v = validateComposition(stops, 'half_day');
    expect(v.ok).toBe(false);
    expect(v.problems.join(' ')).toContain('연속');
  });

  it('반나절은 카페를 요구하지 않는다 (3~4곳이라 슬롯이 빠듯하다)', () => {
    const stops = [
      stop({ order: 1, role: 'attraction', timeStart: '10:00' }),
      stop({ order: 2, role: 'restaurant', timeStart: '12:00' }),
      stop({ order: 3, role: 'culture', timeStart: '14:00' }),
    ];
    expect(validateComposition(stops, 'half_day').ok).toBe(true);
  });

  it('overnight 은 검증하지 않는다 (숙박이 끼어 규칙이 다르다)', () => {
    const stops = [stop({ order: 1, role: 'attraction', timeStart: '10:00' })];
    expect(validateComposition(stops, 'overnight').ok).toBe(true);
  });

  it('role 이 없는 stop 은 위반으로 세지 않는다 (하위호환)', () => {
    // 기존에 저장된 코스에는 role 이 없다. 그걸 위반으로 보면 옛 코스가 전부 깨진다.
    const stops = [
      stop({ order: 1, timeStart: '10:00' }),
      stop({ order: 2, timeStart: '12:00' }),
      stop({ order: 3, timeStart: '14:00' }),
      stop({ order: 4, timeStart: '16:00' }),
      stop({ order: 5, timeStart: '18:00' }),
    ];
    expect(validateComposition(stops, 'full_day').ok).toBe(true);
  });

  it('문제를 모아서 돌려준다', () => {
    const stops = [
      stop({ order: 1, role: 'attraction', timeStart: '10:00' }),
      stop({ order: 2, role: 'attraction', timeStart: '11:00' }),
      stop({ order: 3, role: 'attraction', timeStart: '12:00' }),
      stop({ order: 4, role: 'attraction', timeStart: '15:00' }),
      stop({ order: 5, role: 'attraction', timeStart: '18:00' }),
    ];
    const v = validateComposition(stops, 'full_day');
    expect(v.problems.length).toBeGreaterThanOrEqual(2); // 카페 없음 + 점심 없음 + 3연속
  });
});

describe('validateComposition — 후보에 없는 역할은 요구하지 않는다', () => {
  it('후보에 음식점이 없으면 점심을 요구하지 않는다', () => {
    // 🔴 2026-08-20 실측: preferences=[nature,culture] 로 뽑은 후보에 restaurant 가
    //    한 곳도 없었는데 검증이 점심을 요구해 매번 재생성이 돌았다. AI 가 넣을 수 없는
    //    것을 요구하면 재생성은 영원히 실패하고 호출만 2배가 된다(429 악화).
    const stops = [
      stop({ order: 1, role: 'attraction', timeStart: '10:00' }),
      stop({ order: 2, role: 'culture', timeStart: '12:00' }),
      stop({ order: 3, role: 'cafe', timeStart: '14:00' }),
      stop({ order: 4, role: 'culture', timeStart: '16:00' }),
      stop({ order: 5, role: 'attraction', timeStart: '18:00' }),
    ];
    const available = new Set<'attraction' | 'restaurant' | 'cafe' | 'activity' | 'culture'>(
      ['attraction', 'culture', 'cafe'],
    );
    expect(validateComposition(stops, 'full_day', available).ok).toBe(true);
  });

  it('후보에 음식점이 있으면 점심을 요구한다', () => {
    const stops = [
      stop({ order: 1, role: 'attraction', timeStart: '10:00' }),
      stop({ order: 2, role: 'culture', timeStart: '12:00' }),
      stop({ order: 3, role: 'cafe', timeStart: '14:00' }),
      stop({ order: 4, role: 'culture', timeStart: '16:00' }),
      stop({ order: 5, role: 'attraction', timeStart: '18:00' }),
    ];
    const available = new Set<'attraction' | 'restaurant' | 'cafe' | 'activity' | 'culture'>(
      ['attraction', 'culture', 'cafe', 'restaurant'],
    );
    const v = validateComposition(stops, 'full_day', available);
    expect(v.ok).toBe(false);
    expect(v.problems.join(' ')).toContain('점심');
  });

  it('후보 정보를 안 주면 기존처럼 전부 검증한다', () => {
    const stops = [
      stop({ order: 1, role: 'attraction', timeStart: '10:00' }),
      stop({ order: 2, role: 'culture', timeStart: '12:00' }),
      stop({ order: 3, role: 'cafe', timeStart: '14:00' }),
      stop({ order: 4, role: 'culture', timeStart: '16:00' }),
      stop({ order: 5, role: 'attraction', timeStart: '18:00' }),
    ];
    expect(validateComposition(stops, 'full_day').ok).toBe(false);
  });
});

describe('isCompositionRetryEnabled', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('기본은 꺼져 있다 (재생성이 429·타임아웃을 유발한 전례가 있다)', () => {
    vi.stubEnv('COURSE_COMPOSITION_RETRY', '');
    expect(isCompositionRetryEnabled()).toBe(false);
  });

  it("'1' 이면 켜진다", () => {
    vi.stubEnv('COURSE_COMPOSITION_RETRY', '1');
    expect(isCompositionRetryEnabled()).toBe(true);
  });

  it("'true' 도 켜진다", () => {
    vi.stubEnv('COURSE_COMPOSITION_RETRY', 'true');
    expect(isCompositionRetryEnabled()).toBe(true);
  });

  it('아무 값이나 켜지지는 않는다', () => {
    vi.stubEnv('COURSE_COMPOSITION_RETRY', 'yes');
    expect(isCompositionRetryEnabled()).toBe(false);
  });
});
