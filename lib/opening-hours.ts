import type { VisitDay } from './weekend-types';

/** 요일 문자 → JS getDay() 인덱스 (0=일 … 6=토) */
const WEEKDAY_INDEX: Record<string, number> = {
  일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6,
};

/** 휴무가 없음을 뜻하는 표현 */
const NO_REST_PATTERN = /연중무휴|무휴|연중개방|상시개방|^없음$/;

/**
 * TourAPI `restdate`(쉬는날) 자유 텍스트에서 정기 휴무 요일을 추출한다.
 *
 * @returns 요일 인덱스 배열. `[]` = 휴무 없음(연중무휴), `null` = 판정 불가.
 *          **`null`과 `[]`는 반드시 구분해서 다뤄야 한다. 정보 없음 ≠ 휴무 없음이 아니라,
 *          정보 없음은 "모른다"이므로 감점 대상이 아니다.**
 */
export function parseRestDate(raw: string | undefined): number[] | null {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  if (NO_REST_PATTERN.test(text)) return [];

  // "X요일" 형태만 신뢰한다. "토,일"처럼 요일 글자가 단독으로 쓰인 경우는
  // 날짜·기타 표현과 구분이 어려워 판정 불가로 둔다(안전 측).
  const matches = text.matchAll(/([월화수목금토일])요일/g);
  const days = new Set<number>();
  for (const m of matches) {
    days.add(WEEKDAY_INDEX[m[1]]);
  }

  if (days.size === 0) return null;
  return [...days].sort((a, b) => a - b);
}

/** 방문일 → JS getDay() 인덱스 */
export function visitDayToIndex(visitDay: VisitDay): number {
  return visitDay === 'sun' ? 0 : 6;
}
