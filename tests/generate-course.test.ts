import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Gemini SDK 모킹 — 네트워크 없이 5단계 검증·폴백 체인 테스트
const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@google/generative-ai', () => ({
  // 일반 function이어야 `new GoogleGenerativeAI()` 생성자로 동작 (화살표함수는 불가)
  GoogleGenerativeAI: vi.fn(function () {
    return { getGenerativeModel: () => ({ generateContent }) };
  }),
  // 🔴 SchemaType 도 함께 내보내야 한다. lib/course-schema.ts 가 모듈 로드 시점에
  //    SchemaType.OBJECT 를 읽는데, 모킹에서 빠뜨리면 undefined 접근으로 터져
  //    generateContent 가 한 번도 호출되지 않는다(2026-08-20 실측: 호출 0회).
  SchemaType: {
    STRING: 'string', NUMBER: 'number', INTEGER: 'integer',
    BOOLEAN: 'boolean', ARRAY: 'array', OBJECT: 'object',
  },
}));

import { generateCourse } from '@/lib/weekend-ai';

const baseInput = () =>
  ({
    departure: { name: '서울', lat: 37.5, lng: 127.0 },
    duration: 'half_day',
    companion: 'couple',
    preferences: ['nature'],
    candidates: [
      { contentId: '1', contentTypeId: 12, title: '장소1', addr1: '서울', cat1: '', cat2: '', cat3: '',
        latitude: 37.5, longitude: 127.0, distanceKm: 1, score: 1 },
      // 구성 검증이 점심(11:30~13:00 restaurant)을 요구하므로 음식점 후보가 필요하다.
      // 없으면 "유효 응답 → 1회 호출" 테스트가 재생성 때문에 2회가 된다.
      { contentId: '2', contentTypeId: 39, title: '식당1', addr1: '서울', cat1: '', cat2: '', cat3: '',
        latitude: 37.5, longitude: 127.0, distanceKm: 1, score: 1 },
    ],
    festivals: [],
    stays: [],
    weather: {
      saturday: { sky: 'clear', precipitation: 'none', tempMin: 10, tempMax: 20, pop: 0, summary: '맑음' },
      sunday: { sky: 'clear', precipitation: 'none', tempMin: 11, tempMax: 21, pop: 0, summary: '맑음' },
      recommendation: '토요일 추천',
    },
  }) as any;

beforeEach(() => {
  generateContent.mockReset();
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
});
afterEach(() => vi.unstubAllEnvs());

describe('generateCourse (Gemini 모킹 통합)', () => {
  it('API 키 없음 → 즉시 폴백 코스', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const c = await generateCourse(baseInput());
    expect(c.stops.length).toBeGreaterThan(0);
    expect(c.stops[0].contentId).toBe('1');
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('유효 JSON 응답 → 스키마 검증 통과 코스 반환', async () => {
    const course = {
      title: '테스트 코스', summary: '요약',
      stops: [
        { contentId: '1', title: '장소1', timeStart: '10:00', durationMin: 60, latitude: 37.5, longitude: 127.0 },
        { contentId: '2', title: '식당1', timeStart: '12:00', durationMin: 60, latitude: 37.5, longitude: 127.0 },
      ],
    };
    generateContent.mockResolvedValue({ response: { text: () => JSON.stringify(course) } });
    const c = await generateCourse(baseInput());
    expect(c.title).toBe('테스트 코스');
    expect(c.stops[0].contentId).toBe('1');
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('파싱 불가 응답 → 전 모델 실패 후 규칙기반 폴백', async () => {
    generateContent.mockResolvedValue({ response: { text: () => 'JSON 아님 더미 텍스트 '.repeat(10) } });
    const c = await generateCourse(baseInput());
    expect(c.title).toBe('반나절 코스'); // generateFallbackCourse(half_day)
    expect(c.stops[0].contentId).toBe('1');
    expect(generateContent.mock.calls.length).toBeGreaterThan(1); // 재시도 발생
  });
});
