// Gemini responseSchema — 코스 출력 구조를 API 계약으로 강제한다.
//
// 왜 별도 파일인가: 이전에는 SYSTEM_INSTRUCTION 안에 JSON 예시를 1,184자(전체의 38%)
// 자연어로 적어두고 "이 구조로만 응답하세요"라고 부탁했다. 지켜지지 않으면 힌트를 붙여
// 재시도하는 경로까지 있었다. 스키마로 옮기면 모델이 어길 수 없는 계약이 된다.
//
// 🔴 2026-08-20 교훈: 프롬프트의 스키마 설명만 지우고 responseSchema 를 붙이지 않은
//    중간 상태가 있었는데, 그때 hook·whyNow·storyArc·tip·estimatedCostWon 이 전부
//    빈칸으로 나왔다. 설명과 계약 중 **하나는 반드시 있어야 한다.**
import { SchemaType, type ResponseSchema } from '@google/generative-ai';
import type { Duration } from './weekend-types';

/**
 * duration 별 장소 수. DURATION_DETAIL(weekend-ai.ts)의 자연어 규칙과 같은 값이며,
 * 여기서는 모델이 어길 수 없는 minItems/maxItems 로 들어간다.
 */
export const STOPS_RANGE: Record<Duration, [number, number]> = {
  half_day: [3, 4],
  full_day: [5, 7],
  leisurely: [4, 5],
  overnight: [7, 10],
};

export function buildCourseSchema(duration: Duration): ResponseSchema {
  const [minItems, maxItems] = STOPS_RANGE[duration];
  const isOvernight = duration === 'overnight';

  return {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING, description: '코스 제목. 지역·감정·핵심 경험이 드러나게' },
      summary: { type: SchemaType.STRING, description: '핵심 매력 한 문장' },
      storyArc: {
        type: SchemaType.STRING,
        description: '편집장이 독자에게 추천하듯 3~5문장. 왜 이 조합인지, 어떤 감정의 흐름인지',
      },
      totalDistanceKm: { type: SchemaType.NUMBER },
      estimatedCostWon: { type: SchemaType.NUMBER, description: '1인 기준 입장료+식사+카페 합계. 무료면 0' },
      difficulty: { type: SchemaType.STRING, enum: ['easy', 'moderate', 'active'], format: 'enum' },
      tip: { type: SchemaType.STRING, description: '주차·예약·웨이팅처럼 방문 전 행동할 수 있는 정보' },
      stops: {
        type: SchemaType.ARRAY,
        minItems,
        maxItems,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            order: { type: SchemaType.NUMBER },
            contentId: { type: SchemaType.STRING, description: '후보 목록의 값을 그대로' },
            title: { type: SchemaType.STRING },
            hook: { type: SchemaType.STRING, description: '15자 이내 후크 카피' },
            whyNow: {
              type: SchemaType.STRING,
              description: '지금 이 계절·날씨·시점에 가야 하는 이유 1문장. 제공된 날씨와 모순 금지',
            },
            timeStart: { type: SchemaType.STRING, description: 'HH:MM' },
            durationMin: { type: SchemaType.NUMBER },
            description: { type: SchemaType.STRING, description: '감각적이고 구체적으로 3~4문장' },
            tip: { type: SchemaType.STRING, description: '메뉴·포토존·주차·웨이팅 등 실용 팁 1문장' },
            latitude: { type: SchemaType.NUMBER },
            longitude: { type: SchemaType.NUMBER },
            isFestival: { type: SchemaType.BOOLEAN },
            isStay: { type: SchemaType.BOOLEAN },
            contentTypeId: { type: SchemaType.STRING },
            ...(isOvernight ? { day: { type: SchemaType.NUMBER, description: '1 또는 2' } } : {}),
          },
          // 🔴 hook·whyNow 를 required 에 넣는 것이 핵심이다. 이 둘이 이모추의 차별점이고,
          //    optional 로 두면 모델이 조용히 생략한다(2026-08-20 실측).
          required: [
            'order', 'contentId', 'title', 'hook', 'whyNow',
            'timeStart', 'durationMin', 'description', 'tip',
            'latitude', 'longitude', 'isFestival', 'isStay', 'contentTypeId',
            ...(isOvernight ? ['day'] : []),
          ],
        },
      },
    },
    required: [
      'title', 'summary', 'storyArc', 'totalDistanceKm',
      'estimatedCostWon', 'difficulty', 'tip', 'stops',
    ],
  };
}
