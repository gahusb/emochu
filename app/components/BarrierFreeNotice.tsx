import { Accessibility, TriangleAlert } from 'lucide-react';
import { BARRIER_FREE_LABELS, BARRIER_FREE_DISPLAY_ORDER } from '@/lib/barrier-free-api';
import { ACCESSIBILITY_LABELS, type AccessibilityNeed, type BarrierFreeInfo } from '@/lib/weekend-types';

interface Props {
  barrierFree?: BarrierFreeInfo;
  status?: 'confirmed' | 'unverified';
  needs?: AccessibilityNeed[];
}

/**
 * 무장애 정보를 **원문 그대로** 보여준다.
 *
 * 🔴 `✅ 휠체어 접근 가능` 같은 한 줄로 접지 않는 것이 이 컴포넌트의 요점이다.
 *    "주출입구는 경사로가 있어 휠체어 접근 가능함"과 "후문에만 경사로 있음"은
 *    전혀 다른 정보인데, boolean 으로 접으면 둘이 같아진다.
 *
 * 접근성 조건을 골랐는데 원본 정보가 없으면 반드시 "미확인"을 표시한다.
 * 생성형 문장이 아니라 서버 판정으로 경고해야 사용자가 그럴듯한 설명을
 * 사실로 오해하지 않는다.
 */
export default function BarrierFreeNotice({ barrierFree, status, needs }: Props) {
  if (!barrierFree && !status) return null;

  // barrierFree 없이 status 만 온 경우(미확인)에도 렌더해야 하므로 빈 목록으로 떨어뜨린다.
  const entries = barrierFree
    ? BARRIER_FREE_DISPLAY_ORDER
        .filter((key) => barrierFree.details[key])
        .map((key) => [key, barrierFree.details[key]] as const)
    : [];

  const requested = needs?.map((need) => ACCESSIBILITY_LABELS[need]).join(', ');
  const unverified = status === 'unverified';

  return (
    <div className={`mt-2 rounded-lg px-3 py-2.5 ${unverified ? 'bg-warning-soft' : 'bg-surface-sunken'}`}>
      <p className={`flex items-center gap-1.5 text-[11px] font-bold ${unverified ? 'text-warning' : 'text-ink-2'}`}>
        {unverified
          ? <TriangleAlert size={13} strokeWidth={2} aria-hidden="true" />
          : <Accessibility size={13} strokeWidth={2} aria-hidden="true" />}
        {unverified ? '접근성 정보 미확인' : '한국관광공사 무장애 정보'}
      </p>
      {unverified && (
        <p className="mt-1 text-[11px] leading-relaxed text-ink-2 break-keep">
          {requested ? `${requested} 조건의 정보가 충분히 확인되지 않았습니다. ` : ''}
          방문 전 해당 장소에 전화로 확인해 주세요.
        </p>
      )}
      {entries.length > 0 && (
        <dl className="mt-1.5 space-y-1">
          {entries.map(([key, value]) => (
            <div key={key} className="flex gap-2 text-[11px] leading-relaxed">
              <dt className="shrink-0 font-semibold text-ink-3">
                {BARRIER_FREE_LABELS[key] ?? key}
              </dt>
              <dd className="text-ink-2 break-keep">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
