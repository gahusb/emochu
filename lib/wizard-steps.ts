// 위저드 스텝 진행 가능 여부. WizardShell 안에 인라인으로 있던 로직을 꺼낸 것이다.
//
// 왜 꺼냈나: 2026-08-19 에 "접근성 스텝에서 다음이 안 눌린다"는 보고가 있었는데,
// 컴포넌트 안에 있으면 실제로 그런지 코드로 증명할 방법이 없었다. 순수 함수로 두면
// 테스트가 사실을 확정한다.
import type {
  AccessibilityNeed,
  Companion,
  DestinationType,
  Duration,
  Feeling,
  MoodType,
  Preference,
  CityOption,
} from './weekend-types';

export const WIZARD_TOTAL_STEPS = 6;

/** canProceedAtStep 이 보는 상태만 추린 것. WizardState 전체를 요구하지 않는다. */
export interface WizardProgressState {
  destinationType: DestinationType | null;
  selectedCity: CityOption | null;
  selectedMood: MoodType | null;
  feeling: Feeling | null;
  duration: Duration | null;
  companion: Companion | null;
  preferences: Preference[];
  accessibility: AccessibilityNeed[];
}

export function canProceedAtStep(step: number, s: WizardProgressState): boolean {
  switch (step) {
    case 0:
      return (
        s.destinationType === 'nearby' ||
        (s.destinationType === 'city' && s.selectedCity !== null) ||
        (s.destinationType === 'mood' && s.selectedMood !== null)
      );
    case 1: return s.feeling !== null;
    case 2: return s.duration !== null;
    case 3: return s.companion !== null;
    case 4: return s.preferences.length > 0;
    // 🔴 접근성은 선택 사항이다. 조건 없이 true —
    //    `s.accessibility.length > 0` 을 넣으면 해당 없는 사용자가 갇힌다.
    case WIZARD_TOTAL_STEPS - 1: return true;
    default: return false;
  }
}
