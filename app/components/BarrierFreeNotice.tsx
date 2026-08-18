import { Accessibility } from 'lucide-react';
import { BARRIER_FREE_LABELS, BARRIER_FREE_DISPLAY_ORDER } from '@/lib/barrier-free-api';
import type { BarrierFreeInfo } from '@/lib/weekend-types';

interface Props {
  barrierFree?: BarrierFreeInfo;
}

/**
 * 무장애 정보를 **원문 그대로** 보여준다.
 *
 * 🔴 `✅ 휠체어 접근 가능` 같은 한 줄로 접지 않는 것이 이 컴포넌트의 요점이다.
 *    "주출입구는 경사로가 있어 휠체어 접근 가능함"과 "후문에만 경사로 있음"은
 *    전혀 다른 정보인데, boolean 으로 접으면 둘이 같아진다.
 *
 * barrierFree 가 없으면 아무것도 렌더하지 않는다. 접근성을 고르지 않았거나
 * 조회에 실패한 경우이며, 그때의 안내는 코스 상단에서 한 번만 한다
 * (장소마다 "미확인"을 반복하면 시끄럽다).
 */
export default function BarrierFreeNotice({ barrierFree }: Props) {
  if (!barrierFree) return null;

  const entries = BARRIER_FREE_DISPLAY_ORDER
    .filter((key) => barrierFree.details[key])
    .map((key) => [key, barrierFree.details[key]] as const);

  if (entries.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg bg-surface-sunken px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold text-ink-2">
        <Accessibility size={13} strokeWidth={2} aria-hidden="true" />
        무장애 정보
      </p>
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
    </div>
  );
}
