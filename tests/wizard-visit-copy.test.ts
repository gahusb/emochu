import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StepWhenWho from '@/app/components/course/wizard/steps/StepWhenWho';
import type { WizardState } from '@/app/components/course/wizard/WizardShell';
import type { Duration } from '@/lib/weekend-types';
import { VISIT_INFO_COPY } from '@/lib/wizard-copy';

const state = (duration: Duration | null): WizardState => ({
  step: 2, destinationPick: 'city', destinationType: 'city', selectedCity: null,
  cityWasRandom: false, feeling: 'healing', feelingWasRandom: false,
  duration, companion: 'family', preferences: [], userLocation: null,
  gpsLoading: false, saju: null, visitDay: 'sat', accessibility: [],
});
const render = (duration: Duration | null) => renderToStaticMarkup(
  createElement(StepWhenWho, { state: state(duration), dispatch: vi.fn() }),
);

describe('방문일 안내는 운영을 보장하지 않는다', () => {
  it('단계 요약은 정보 참고로 설명한다', () => {
    expect(VISIT_INFO_COPY.summary).toBe('방문일의 휴무·운영시간 정보를 참고해요.');
    expect(Object.values(VISIT_INFO_COPY).join(' ')).not.toMatch(/문 여는 곳.*만|영업을 보장/);
  });

  it.each<Duration>(['half_day', 'full_day', 'leisurely', 'overnight'])('%s에도 미확인·방문 전 확인 안내를 렌더링한다', duration => {
    const html = render(duration);
    expect(html).toContain('미확인 정보는 결과에서 알려드려요.');
    expect(html).toContain('출발 전 실제 운영·예약을 확인해주세요.');
    expect(html).not.toContain('문 여는 곳으로만');
  });

  it('일정 미선택 상태에서는 추가 안내를 먼저 펼치지 않는다', () => {
    expect(render(null)).not.toContain(VISIT_INFO_COPY.notice);
  });

  it('1박2일의 토·일 안내와 요일 선택 생략을 유지한다', () => {
    const html = render('overnight');
    expect(html).toContain('1박 2일은 토요일·일요일 모두 방문해요.');
    expect(html).not.toContain('어느 날 가세요?');
  });
});
