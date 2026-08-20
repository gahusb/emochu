// 코스 구성 검증 — 자연어 규칙을 실제로 지켜졌는지 확인하는 곳.
//
// 왜 필요한가: SYSTEM_INSTRUCTION 의 카테고리 밸런스 규칙은 424자나 되지만 지켜졌는지
// 확인하는 코드가 없어서, 위반해도 그대로 사용자에게 나갔다. 반면 contentId 유효성·
// 시간순서·이동거리는 이미 검증하고 있어서 지켜진다.
// → 지켜지는 규칙과 안 지켜지는 규칙의 차이는 표현의 강도가 아니라 검증의 유무다.
//
// 2026-08-20 실측(responseSchema 도입 후): 장소 수는 4/4 준수, 3연속도 없었지만
// **카페 슬롯은 0/4** 였다. 오후 시간대에 전부 관광지가 들어갔다.
import type { CourseStop, Duration, SpotRole } from './weekend-types';

export interface CompositionResult {
  ok: boolean;
  /** 사람이 읽는 문장. 그대로 재생성 프롬프트에 붙인다. */
  problems: string[];
}

/** "14:30" → 870 (분). 파싱 실패는 null. */
function toMinutes(hhmm: string | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? '');
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// 🔴 시간창은 넉넉해야 한다. SYSTEM_INSTRUCTION 의 "점심 11:30~13:00"은 AI 에게 주는
//    권장 가이드이지 검증 계약이 아니다. 그대로 하드 검증으로 옮겼더니 11:20 에 배치된
//    멀쩡한 점심을 위반으로 판정했고, 매번 재생성이 돌아 50초를 넘겨 폴백 코스가 됐다
//    (2026-08-20 실측). 검증의 목적은 "식사가 아예 없는 코스"를 잡는 것이지
//    10분 단위를 따지는 게 아니다.
const LUNCH = [11 * 60, 14 * 60] as const;        // 11:00~14:00
const DINNER = [17 * 60, 20 * 60] as const;       // 17:00~20:00

/** 카페를 요구하는 duration. 반나절은 3~4곳이라 슬롯이 빠듯해 강제하지 않는다. */
const NEEDS_CAFE: Duration[] = ['full_day', 'leisurely'];

function hasRoleInWindow(stops: CourseStop[], role: SpotRole, [from, to]: readonly [number, number]): boolean {
  return stops.some((s) => {
    const t = toMinutes(s.timeStart);
    return s.role === role && t !== null && t >= from && t <= to;
  });
}

/**
 * 코스 구성이 규칙을 지켰는지 본다.
 *
 * 🔴 role 이 없는 stop 은 위반으로 세지 않는다. 기존에 저장된 코스에는 role 이 없어서,
 *    그걸 위반으로 보면 옛 코스가 전부 깨진 것으로 보고된다.
 * 🔴 overnight 은 검증하지 않는다. 숙박이 끼어 슬롯 규칙이 다르고, 1차에서는 관찰만 한다.
 */
export function validateComposition(
  stops: CourseStop[],
  duration: Duration,
  /** 후보 목록에 실제로 존재하는 역할. 없는 역할은 요구하지 않는다.
   *  🔴 AI 가 넣을 수 없는 것을 요구하면 재생성이 영원히 실패하고 호출만 2배가 된다. */
  availableRoles?: Set<SpotRole>,
): CompositionResult {
  const problems: string[] = [];

  if (duration === 'overnight') return { ok: true, problems };

  const roled = stops.filter((s) => s.role !== undefined);
  if (roled.length === 0) return { ok: true, problems }; // 하위호환: role 없는 옛 코스

  const can = (role: SpotRole) => availableRoles === undefined || availableRoles.has(role);

  // 1. 카페 슬롯
  if (NEEDS_CAFE.includes(duration) && can('cafe') && !roled.some((s) => s.role === 'cafe')) {
    problems.push('카페·디저트가 한 곳도 없습니다. 오후에 카페를 넣으세요.');
  }

  // 2. 식사 시간대 — 메시지의 시간은 실제 검증 창(LUNCH/DINNER)과 일치시킨다.
  if (can('restaurant')) {
    if (!hasRoleInWindow(roled, 'restaurant', LUNCH)) {
      problems.push('점심(11:00~14:00)에 음식점이 배치되지 않았습니다.');
    }
    if (duration === 'full_day' && !hasRoleInWindow(roled, 'restaurant', DINNER)) {
      problems.push('저녁(17:00~20:00)에 음식점이 배치되지 않았습니다.');
    }
  }

  // 3. 같은 역할 3연속
  let run = 1;
  for (let i = 1; i < stops.length; i++) {
    const prev = stops[i - 1].role;
    const cur = stops[i].role;
    run = cur !== undefined && cur === prev ? run + 1 : 1;
    if (run >= 3) {
      problems.push(`같은 종류(${cur})가 3곳 연속입니다. 사이에 다른 종류를 넣으세요.`);
      break;
    }
  }

  return { ok: problems.length === 0, problems };
}
