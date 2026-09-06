// 홈 첫 화면에 들어갈 「한 줄」들.
//
// 🔴 2026-09-04 피드백: "날씨 정보 표기가 너무 많다. 주말에 맑은지 어떤지만."
//    예전 홈은 토·일 각각 최고/최저·강수확률·요약을 카드 두 장과 타일 네 칸에 흩어놨다.
//    숫자가 많다고 정보가 많은 게 아니다 — 읽는 사람이 "그래서 나가도 되나?"를
//    스스로 계산해야 했다. 여기서는 그 계산을 끝내고 **문장 하나**로 준다.
//
// 순수 함수로 둔 이유: 화면 안에 있으면 "비 오는 주말에 뭐라고 쓰나"를
// 테스트로 확정할 수 없다. tests/weekend-summary.test.ts 가 사실을 붙잡는다.

import type { DayWeather, WeekendWeather } from './weekend-types';
import { getWeekendElements, ELEMENT_META, ELEMENT_COURSE_HINT } from './saju';

export type WeatherTone = 'clear' | 'mild' | 'wet';

export interface WeekendWeatherLine {
  /** 한 줄 문장. 이 문장만 읽어도 나갈지 말지 정할 수 있어야 한다. */
  text: string;
  /** "15~26°" — 근거로 덧붙이는 최소한의 숫자. 정보가 없으면 null. */
  temp: string | null;
  tone: WeatherTone;
}

/** 우산이 필요한 날인가. 강수 형태가 있거나 확률이 절반을 넘으면 그렇다. */
function isWet(day: DayWeather): boolean {
  return day.precipitation !== 'none' || day.pop >= 50;
}

/** 눈인가 비인가. 문장에서 "비"와 "눈"을 바꿔 끼우는 데만 쓴다. */
function wetWord(a: DayWeather, b: DayWeather): '눈' | '비' {
  return a.precipitation === 'snow' || b.precipitation === 'snow' ? '눈' : '비';
}

/**
 * 주말 날씨를 한 문장으로. 토·일을 따로 나열하지 않고 **주말 전체의 성격**을 말한다.
 * 두 날이 다를 때만 어느 날이 나은지 알려준다 — 그때가 정보가 되는 유일한 순간이다.
 */
export function summarizeWeekendWeather(weather: WeekendWeather | null): WeekendWeatherLine {
  // 🔴 폴백 값을 예보처럼 읽지 않는다. 폴백 DayWeather 는 sky:'clear', pop:0 이라
  //    그대로 요약하면 기상청 응답이 없는 날에도 "토·일 모두 맑아요"라고 단언하게 된다.
  if (!weather || weather.unavailable) {
    return { text: '주말 날씨를 확인하고 있어요', temp: null, tone: 'mild' };
  }

  const sat = weather.saturday;
  const sun = weather.sunday;

  const lo = Math.min(sat.tempMin, sun.tempMin);
  const hi = Math.max(sat.tempMax, sun.tempMax);
  const temp = `${lo}~${hi}°`;

  const satWet = isWet(sat);
  const sunWet = isWet(sun);
  const word = wetWord(sat, sun);

  if (satWet && sunWet) {
    return { text: `주말 내내 ${word} 소식이 있어요`, temp, tone: 'wet' };
  }
  if (satWet) {
    return { text: `토요일엔 ${word}, 일요일은 괜찮아요`, temp, tone: 'wet' };
  }
  if (sunWet) {
    return { text: `토요일은 괜찮고, 일요일엔 ${word}가 와요`, temp, tone: 'wet' };
  }

  const satClear = sat.sky === 'clear';
  const sunClear = sun.sky === 'clear';

  if (satClear && sunClear) {
    return { text: '토·일 모두 맑아요', temp, tone: 'clear' };
  }
  if (satClear) {
    return { text: '토요일이 더 맑아요', temp, tone: 'clear' };
  }
  if (sunClear) {
    return { text: '일요일이 더 맑아요', temp, tone: 'clear' };
  }
  return { text: '주말 내내 흐린 편이에요', temp, tone: 'mild' };
}

export interface WeekendElementLine {
  /** 대표 이모지. 두 날이 다르면 토요일 것을 쓴다. */
  emoji: string;
  /** "이번 주말은 土 기운" 처럼 주어가 되는 부분 */
  label: string;
  /** "전통 · 마을 · 체험" — 그래서 어디로 가라는 건지 */
  hint: string;
  /** 토·일 기운이 갈리는 주말인가. 화면이 한 줄로 접을지 정하는 근거다. */
  split: boolean;
}

/**
 * 이번 주말의 오행을 한 줄로. 날씨와 나란히 놓이므로 **같은 문장 골격**을 쓴다.
 *
 * 🔑 ELEMENT_META.name 은 "土 (토)" 라, 요일(토·일) 옆에 오면 "(토)" 가 토요일로 읽힌다.
 *    이 화면에서는 한자만 쓴다.
 */
export function summarizeWeekendElements(now: Date = new Date()): WeekendElementLine {
  const { saturday, sunday, same } = getWeekendElements(now);
  const satMeta = ELEMENT_META[saturday];
  const sunMeta = ELEMENT_META[sunday];
  const satHanja = satMeta.name.split(' ')[0];
  const sunHanja = sunMeta.name.split(' ')[0];

  if (same) {
    return {
      emoji: satMeta.emoji,
      label: `이번 주말은 ${satHanja} 기운`,
      hint: ELEMENT_COURSE_HINT[saturday],
      split: false,
    };
  }

  return {
    emoji: satMeta.emoji,
    label: `토요일 ${satHanja}, 일요일 ${sunHanja}`,
    hint: `${ELEMENT_COURSE_HINT[saturday]} / ${ELEMENT_COURSE_HINT[sunday]}`,
    split: true,
  };
}

/** "9월 5~6일" — 주말 날짜 라벨. KST 자정을 UTC 로 담은 값이라 UTC 게터로 읽는다. */
export function weekendDateLabel(now: Date = new Date()): string {
  const { saturdayDate, sundayDate } = getWeekendElements(now);
  const satM = saturdayDate.getUTCMonth() + 1;
  const sunM = sundayDate.getUTCMonth() + 1;
  return satM === sunM
    ? `${satM}월 ${saturdayDate.getUTCDate()}~${sundayDate.getUTCDate()}일`
    : `${satM}월 ${saturdayDate.getUTCDate()}일~${sunM}월 ${sundayDate.getUTCDate()}일`;
}
