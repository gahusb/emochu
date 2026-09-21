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
  it('미등록 ID를 반환한 모델은 결과로 채택하지 않는다', async () => {
    generateContent.mockResolvedValue({ response: { text: () => JSON.stringify({
      title: '환각 코스', summary: '원본에 없는 장소', stops: [{ contentId: 'made-up', title: '가짜 장소', timeStart: '10:00', durationMin: 60, latitude: 37.5, longitude: 127 }],
    }) } });
    const result = await generateCourse(baseInput());
    expect(result.generationMode).toBe('rules');
    expect(result.stops.every(s => ['1', '2'].includes(s.contentId))).toBe(true);
  });

  it.each(['25:00', '9:00', '10:80'])('잘못된 HH:mm %s 응답은 채택하지 않는다', async timeStart => {
    generateContent.mockResolvedValue({ response: { text: () => JSON.stringify({
      title: '시간 오류', summary: '잘못된 시간표', stops: [{ contentId: '1', title: '장소1', timeStart, durationMin: 60, latitude: 37.5, longitude: 127 }],
    }) } });
    expect((await generateCourse(baseInput())).generationMode).toBe('rules');
  });

  it('취소된 요청은 모델을 호출하지 않는다', async () => {
    const controller = new AbortController(); controller.abort();
    const result = await generateCourse({ ...baseInput(), signal: controller.signal });
    expect(generateContent).not.toHaveBeenCalled();
    expect(result.generationMode).toBe('rules');
  });

  it('구성 개선 재시도가 실패해도 첫 유효 코스를 버리지 않는다', async () => {
    vi.stubEnv('COURSE_COMPOSITION_RETRY', 'true');
    generateContent.mockResolvedValueOnce({ response: { text: () => JSON.stringify({
      title: '첫 유효 코스', summary: '식사 슬롯은 부족한 일정', stops: [{ contentId: '1', title: '장소1', timeStart: '10:00', durationMin: 60, latitude: 37.5, longitude: 127 }],
    }) } }).mockRejectedValue(new Error('PERMISSION_DENIED'));
    const result = await generateCourse(baseInput());
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(result.title).toBe('첫 유효 코스');
    expect(result.generationMode).toBe('ai');
  });

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

// 🔴 2026-09-21 운영 실측이 만든 검사다. 그날 8회 중 5회가 폴백이었고 원인은 두 가지였다:
//    ① 503 을 3초 대기 후 같은 모델에 재시도(100% 또 503) ② 마지막 모델에도 고정 25초.
//    아래 세 검사는 그 두 가지가 되돌아오면 깨진다.
describe('모델 체인 시간 예산 (2026-09-21 실측 반영)', () => {
  const overloaded = () => Object.assign(new Error('[503 Service Unavailable] This model is currently experiencing high demand.'), { name: 'GoogleGenerativeAIFetchError' });

  it('503 은 재시도하지 않고 바로 다음 모델로 간다', async () => {
    generateContent
      .mockRejectedValueOnce(overloaded())   // 1순위
      .mockRejectedValueOnce(overloaded())   // 2순위
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify({
      title: '3순위가 살린 코스', summary: '정상 코스',
      stops: [
        { contentId: '1', title: '장소1', timeStart: '10:00', durationMin: 60, latitude: 37.5, longitude: 127 },
        { contentId: '2', title: '식당1', timeStart: '11:40', durationMin: 60, latitude: 37.5, longitude: 127 },
      ],
    }) } });

    const startedAt = Date.now();
    const result = await generateCourse(baseInput());

    // 모델당 1회씩 = 3회. 재시도가 살아 있으면 5~6회가 되고 3초 대기가 두 번 붙는다.
    expect(generateContent).toHaveBeenCalledTimes(3);
    expect(Date.now() - startedAt).toBeLessThan(2_000);
    expect(result.title).toBe('3순위가 살린 코스');
    expect(result.generationMode).toBe('ai');
  });

  it('마지막 모델에는 남은 예산을 몰아준다 — 앞 모델은 짧게', async () => {
    generateContent
      .mockRejectedValueOnce(overloaded())
      .mockRejectedValueOnce(overloaded())
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify({
      title: '마지막 모델 코스', summary: '정상 코스',
      stops: [
        { contentId: '1', title: '장소1', timeStart: '10:00', durationMin: 60, latitude: 37.5, longitude: 127 },
        { contentId: '2', title: '식당1', timeStart: '11:40', durationMin: 60, latitude: 37.5, longitude: 127 },
      ],
    }) } });

    await generateCourse({ ...baseInput(), budgetMs: 50_000 });

    const timeouts = generateContent.mock.calls.map(([, opts]) => opts?.timeout);
    expect(timeouts).toHaveLength(3);
    expect(timeouts[0]).toBeLessThanOrEqual(12_000);
    expect(timeouts[1]).toBeLessThanOrEqual(12_000);
    // 마지막은 앞 모델보다 확실히 크다(예전엔 셋 다 25초 고정이었다).
    expect(timeouts[2]).toBeGreaterThan(25_000);
  });

  it('남은 예산이 바닥이면 부르지 않고 폴백한다 — 못 끝낼 호출에 시간을 쓰지 않는다', async () => {
    const result = await generateCourse({ ...baseInput(), budgetMs: 3_000 });
    expect(generateContent).not.toHaveBeenCalled();
    expect(result.generationMode).toBe('rules');
    expect(result.stops.length).toBeGreaterThan(0);
  });

  it('예산을 주지 않으면 기본값으로 돈다 — 기존 호출부는 그대로 동작한다', async () => {
    generateContent.mockResolvedValueOnce({ response: { text: () => JSON.stringify({
      title: '기본 예산 코스', summary: '정상 코스',
      stops: [
        { contentId: '1', title: '장소1', timeStart: '10:00', durationMin: 60, latitude: 37.5, longitude: 127 },
        { contentId: '2', title: '식당1', timeStart: '11:40', durationMin: 60, latitude: 37.5, longitude: 127 },
      ],
    }) } });
    const result = await generateCourse(baseInput());
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(generateContent.mock.calls[0][1]?.timeout).toBeGreaterThan(0);
    expect(result.title).toBe('기본 예산 코스');
  });
});
