// 위저드 스텝 진행 가능 여부. WizardShell 안에 인라인으로 있던 로직을 꺼낸 것이다.
//
// 왜 꺼냈나: 2026-08-19 에 "접근성 스텝에서 다음이 안 눌린다"는 보고가 있었는데,
// 컴포넌트 안에 있으면 실제로 그런지 코드로 증명할 방법이 없었다. 순수 함수로 두면
// 테스트가 사실을 확정한다.
//
// 🔴 2026-09-04, 6스텝 → 4스텝. "선택지가 너무 많아서 뭘 원하는지 모르겠다"는
//    피드백에 대한 구조적 답이다. 질문 개수를 줄인 게 아니라 **한 화면에서 끝나는
//    한 덩어리**로 묶었다:
//      0. 어디로 + 어떤 기분   (장소를 고르면 기분 질문이 이어서 나타난다)
//      1. 이번 주 내 기운      (사주 — 건너뛸 수 있다)
//      2. 언제 + 누구랑
//      3. 뭐가 끌려요 (+ 접근성은 접혀 있음)
import type {
  AccessibilityNeed,
  Companion,
  DestinationType,
  Duration,
  Feeling,
  Preference,
  CityOption,
} from './weekend-types';

export const WIZARD_TOTAL_STEPS = 4;

/** 「랜덤」은 UI 전용 선택지다. 서버에는 뽑힌 결과가 city 로 전달된다. */
export type DestinationPick = 'nearby' | 'city' | 'random';

/** canProceedAtStep 이 보는 상태만 추린 것. WizardState 전체를 요구하지 않는다. */
export interface WizardProgressState {
  destinationType: DestinationType | null;
  selectedCity: CityOption | null;
  feeling: Feeling | null;
  duration: Duration | null;
  companion: Companion | null;
  preferences: Preference[];
  accessibility: AccessibilityNeed[];
}

/** 목적지가 정해졌는가. 기분 질문을 띄울지 정하는 근거이기도 하다. */
export function hasDestination(s: Pick<WizardProgressState, 'destinationType' | 'selectedCity'>): boolean {
  if (s.destinationType === 'nearby') return true;
  // 도시(직접 고르기·랜덤 모두)는 실제로 한 곳이 정해져야 한다.
  return s.destinationType === 'city' && s.selectedCity !== null;
}

export function canProceedAtStep(step: number, s: WizardProgressState): boolean {
  switch (step) {
    // 장소와 기분은 한 덩어리다 — 둘 다 정해져야 넘어간다.
    case 0: return hasDestination(s) && s.feeling !== null;
    // 🔴 사주는 킥이지만 **강제하지 않는다.** 조건 없이 true —
    //    "기운 볼래요?"에 아니라고 답할 자유가 없으면 그건 관문이지 킥이 아니다.
    case 1: return true;
    case 2: return s.duration !== null && s.companion !== null;
    // 🔴 접근성은 선택 사항이다. 취향만 본다 —
    //    `s.accessibility.length > 0` 을 넣으면 해당 없는 사용자가 갇힌다.
    case WIZARD_TOTAL_STEPS - 1: return s.preferences.length > 0;
    default: return false;
  }
}
