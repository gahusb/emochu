import type { VisitDay, CourseStop } from './weekend-types';

/** 요일 문자 → JS getDay() 인덱스 (0=일 … 6=토) */
const WEEKDAY_INDEX: Record<string, number> = {
  일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6,
};

/** 범위 표기("금~일요일") 확장을 위한 주간 순서 */
const WEEKDAY_ORDER = ['월', '화', '수', '목', '금', '토', '일'];

/** 휴무가 없음을 뜻하는 표현 */
const NO_REST_PATTERN = /연중무휴|무휴|연중개방|상시개방|^없음$/;

/** 요일 범위 구분자: 물결 · 하이픈 · 엔대시 · 엠대시 (그 외 `,` `·` `/`는 나열) */
const RANGE_SEPARATOR = /[~–—-]/;
/** 요일 문자 뒤/앞에 붙으면 "다른 단어의 일부"로 볼 문자 (공휴일, 익일, 1월…) */
const WORD_CHAR = /[가-힣0-9]/;

/** 구분자 하나 + 주변 공백 */
const SEPARATOR_AT_START = /^\s*([,·/~–—-])\s*/;

interface DayToken {
  /** JS getDay() 인덱스 */
  day: number;
  /** 월→일 순서 인덱스 (범위 확장용) */
  order: number;
  /** "요일" 접미사가 붙어 있는가 */
  suffixed: boolean;
  /** 다른 단어의 일부가 아니라고 볼 수 있는가 */
  trusted: boolean;
  /** 토큰이 끝나는 위치 */
  end: number;
}

/** text[i]에서 시작하는 요일 토큰을 읽는다. 요일 문자가 아니면 null. */
function readDayToken(text: string, i: number): DayToken | null {
  const char = text[i];
  if (!(char in WEEKDAY_INDEX)) return null;

  const suffixed = text.startsWith('요일', i + 1);
  const end = i + (suffixed ? 3 : 1);
  const prev = i > 0 ? text[i - 1] : '';
  const next = end < text.length ? text[end] : '';
  // "요일"이 붙어 있으면 그 자체로 신뢰. 축약형("토, 일요일"의 '토')은
  // 앞뒤가 한글·숫자가 아닐 때만 신뢰한다 → "공휴일"의 '일'을 걸러낸다.
  const trusted = suffixed || (!WORD_CHAR.test(prev) && !WORD_CHAR.test(next));

  return { day: WEEKDAY_INDEX[char], order: WEEKDAY_ORDER.indexOf(char), suffixed, trusted, end };
}

/**
 * TourAPI `restdate`(쉬는날) 자유 텍스트에서 정기 휴무 요일을 추출한다.
 *
 * 판정 규칙 (보수적 — **부분 파싱이 무지보다 위험**하다):
 * 1. 구분자(`,` `·` `/` `~` `-`)로 이어진 요일 나열을 하나의 묶음으로 읽는다.
 * 2. 묶음 안에 "요일" 접미사가 하나도 없으면 판정하지 않는다 ("토,일 휴무" → null).
 * 3. 묶음 안에 다른 단어의 일부로 보이는 요일 문자가 섞이면 **문자열 전체를 판정 불가**로
 *    돌린다 ("공휴일, 월요일" → null). 일부만 살리면 남은 요일이 거짓 "영업 확인"을 만든다.
 * 4. 범위 표기는 월→일 순서로 사이 요일까지 확장한다 ("금~일요일" → 금·토·일).
 * 5. 7일 전체가 휴무로 나오면 운영일 표기를 오독했을 가능성이 크므로 판정 불가.
 *
 * @returns 요일 인덱스 배열. `[]` = 휴무 없음(연중무휴), `null` = 판정 불가.
 *          **`null`과 `[]`는 반드시 구분해서 다뤄야 한다. 정보 없음 ≠ 휴무 없음이 아니라,
 *          정보 없음은 "모른다"이므로 감점 대상이 아니다.**
 */
export function parseRestDate(raw: string | undefined): number[] | null {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const days = new Set<number>();
  let i = 0;

  while (i < text.length) {
    const first = readDayToken(text, i);
    if (!first) {
      i++;
      continue;
    }

    // 구분자로 이어진 요일 묶음을 모은다 ("토, 일요일" / "금~일요일" / "월,화요일")
    const tokens: DayToken[] = [first];
    const separators: ('list' | 'range')[] = [];
    let cursor = first.end;
    for (;;) {
      const sep = SEPARATOR_AT_START.exec(text.slice(cursor));
      if (!sep) break;
      const nextToken = readDayToken(text, cursor + sep[0].length);
      if (!nextToken) break;
      separators.push(RANGE_SEPARATOR.test(sep[1]) ? 'range' : 'list');
      tokens.push(nextToken);
      cursor = nextToken.end;
    }
    i = cursor;

    // 규칙 2: "요일" 접미사가 하나도 없으면 판정 불가 (묶음 무시)
    if (!tokens.some(t => t.suffixed)) continue;
    // 규칙 3: 단어 조각이 섞이면 전체를 판정 불가로
    if (tokens.some(t => !t.trusted)) return null;

    days.add(first.day);
    for (let t = 1; t < tokens.length; t++) {
      if (separators[t - 1] === 'range') {
        // 규칙 4: 월→일 순서로 순회하며 끝 요일까지 채운다 (필요하면 주를 넘어 순환)
        const from = tokens[t - 1].order;
        for (let step = 0; step < WEEKDAY_ORDER.length; step++) {
          const pos = (from + step) % WEEKDAY_ORDER.length;
          days.add(WEEKDAY_INDEX[WEEKDAY_ORDER[pos]]);
          if (pos === tokens[t].order) break;
        }
      } else {
        days.add(tokens[t].day);
      }
    }
  }

  if (days.size > 0) {
    // 규칙 5: 매일 휴무는 현실적으로 "운영 요일" 표기를 오독한 결과다
    if (days.size === WEEKDAY_ORDER.length) return null;
    return [...days].sort((a, b) => a - b);
  }

  // 요일 정보가 없으면 "연중무휴" 등의 표현 확인
  if (NO_REST_PATTERN.test(text)) return [];

  return null;
}

/** 방문일 → JS getDay() 인덱스 */
export function visitDayToIndex(visitDay: VisitDay): number {
  return visitDay === 'sun' ? 0 : 6;
}

/** 교체 후보 판정에 필요한 최소 형태 (ScoredSpot 구조적 부분집합) */
interface ReplacementCandidate {
  contentId: string;
  contentTypeId: number;
  title: string;
  latitude: number;
  longitude: number;
  firstImage?: string;
  overview?: string;
  closedWeekdays?: number[] | null;
}

/**
 * 방문일에 휴무인 stop을 같은 contentTypeId의 영업 후보로 교체한다.
 * 대체 후보가 없으면 원본을 유지한다 — 코스에서 제거하면 시간표가 붕괴하기 때문.
 */
export function replaceClosedStops<T extends ReplacementCandidate>(
  stops: CourseStop[],
  ranked: T[],
  visitDay: VisitDay | undefined,
): { stops: CourseStop[]; replaced: number } {
  if (!visitDay) return { stops, replaced: 0 };

  const dayIndex = visitDayToIndex(visitDay);
  const isClosed = (closed: number[] | null | undefined) =>
    closed != null && closed.includes(dayIndex);

  const used = new Set(stops.map(s => s.contentId));
  let replaced = 0;

  const next = stops.map(stop => {
    const current = ranked.find(c => c.contentId === stop.contentId);
    if (!current || !isClosed(current.closedWeekdays)) return stop;

    const alt = ranked.find(c =>
      c.contentId !== stop.contentId &&
      !used.has(c.contentId) &&
      c.contentTypeId === current.contentTypeId &&
      !isClosed(c.closedWeekdays)
    );
    if (!alt) return stop;

    used.add(alt.contentId);
    replaced++;
    // 장소가 바뀌었으므로 옛 장소를 설명하던 카피는 전부 버린다.
    // (남기면 새 장소 사진 위에 옛 장소의 후크·이유가 얹혀 거짓 정보가 된다)
    return {
      ...stop,
      contentId: alt.contentId,
      title: alt.title,
      latitude: alt.latitude,
      longitude: alt.longitude,
      imageUrl: alt.firstImage,
      description: alt.overview?.slice(0, 100) ?? alt.title,
      hook: undefined,
      whyNow: undefined,
      tip: '',
      facilities: undefined,
      images: undefined,
      restdate: undefined,
      openStatus: undefined,
    };
  });

  return { stops: next, replaced };
}
