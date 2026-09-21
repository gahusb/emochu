import type { CourseAdjustment, CourseData } from '@/lib/weekend-types';
import Container from '@/app/components/ui/Container';
import { courseHoursCounts } from '@/lib/course-hours-summary';

const adjustmentLabels: Record<CourseAdjustment['kind'], string> = {
  meal_added: '식사 보완', shorter_leg: '긴 이동 구간 보완',
  festival_timing: '공연 시간 보완', festival_meal: '축제 대신 식사 보완',
  budget_trim: '시간 예산 보완',
  time_compacted: '대기 간격 보완',
};

export default function CourseEvidence({ course }: { course: CourseData }) {
  const evidence = course.verification;
  if (!evidence) return null; // 기존 저장 코스에 소급해 검증 완료 표시를 하지 않는다.
  const sourced = course.stops.filter(s => s.source === 'tourapi').length;
  const unknown = course.stops.filter(s => s.openStatus !== 'open').length;
  const hours = courseHoursCounts(course.stops);
  const adjustments = evidence.adjustments?.flatMap(change => {
    const stop = course.stops.find(s => s.contentId === change.contentId);
    return stop ? [{ ...change, title: stop.title, day: stop.day ?? 1 }] : [];
  }) ?? [];
  return (
    <Container className="pt-4">
      <section aria-label="코스 정보 확인" className="rounded-xl border border-line bg-surface-elevated p-4 sm:p-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-ink-1">여행 전, 여기까지 확인했어요</h2>
          <span className="text-xs text-brand font-semibold">{course.generationMode === 'rules' ? '규칙 기반 기본 일정' : 'AI 맞춤 일정'}</span>
        </div>
        <p className="mt-2 text-ink-2">{evidence.visitDates.join(' ~ ')} · 한국관광공사 원본 대조 {sourced}/{course.stops.length}곳</p>
        <p className="mt-1 text-xs text-ink-2 leading-relaxed">제안 시간과 원문 운영구간 일치 {hours.within}/{course.stops.length}곳 · 운영시간 미확인 {hours.unknown}곳{hours.outside > 0 ? ` · 시간 불일치 ${hours.outside}곳` : ''}</p>
        <p className="mt-1 text-xs text-ink-3 leading-relaxed">{unknown > 0 ? `${unknown}곳은 정기 휴무 정보가 미확인이에요. ` : ''}실시간 영업·예약은 보장하지 않아요. 거리·이동시간·비용은 추정치이며 실제 길찾기와 다를 수 있어요.</p>
        {adjustments.length > 0 && (
          <div className="mt-3 text-xs leading-relaxed text-ink-2">
            <h3 className="font-semibold">생성할 때 보완한 곳</h3>
            <ul className="mt-1 space-y-1 break-words">
              {adjustments.map((change, i) => <li key={`${change.contentId}-${i}`}>{change.day}일차 · {adjustmentLabels[change.kind] ?? '일정 보완'}: {change.kind === 'budget_trim' ? `${change.previousTitle ?? '마지막 선택 관광'} 제외` : change.title}{change.kind === 'festival_meal' && change.previousTitle ? ` (이전 축제: ${change.previousTitle})` : ''}</li>)}
            </ul>
          </div>
        )}
        {evidence.warnings.length > 0 && (
          <details className="mt-3 rounded-lg bg-mocha-soft px-3">
            <summary className="min-h-11 flex items-center cursor-pointer font-semibold text-ink-2">확인할 내용 {evidence.warnings.length}개 보기</summary>
            <ul className="list-disc pl-4 pb-3 space-y-2 text-xs leading-relaxed text-ink-2">
              {evidence.warnings.map(w => <li key={w}>{w}</li>)}
            </ul>
          </details>
        )}
      </section>
    </Container>
  );
}
