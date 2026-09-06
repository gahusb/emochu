// 홈에서 축제를 「보여주는」 대신 「가리키는」 자리.
//
// 🔴 2026-09-04. 예전 홈은 축제를 세 군데서 보여줬다 — 마감 임박 대형 카드,
//    가로 스크롤 캐러셀, 사이드 리스트. 그런데 축제는 **탭이 따로 있다.**
//    같은 걸 네 군데서 보여주면 정보가 많은 게 아니라 어디를 눌러야 할지 모르게 된다.
//    여기서는 몇 곳이 있는지만 말하고 탭으로 보낸다.

import Link from 'next/link';
import { PartyPopper, ArrowRight } from 'lucide-react';
import type { FestivalCard } from '@/lib/weekend-types';

interface Props {
  festivals: FestivalCard[];
}

export default function FestivalTabInvite({ festivals }: Props) {
  // 데이터가 아직 없으면 숫자를 지어내지 않고 초대만 한다.
  const total = festivals.length;
  // 근거(eventEnd)가 실제로 이번 주말 안인 것만 「마감」이라 부른다.
  const closing = festivals.filter(
    (f) => typeof f.dDay === 'number' && f.dDay >= 0 && f.dDay <= 7,
  ).length;

  return (
    <section aria-labelledby="festival-invite-heading">
      <Link
        href="/festival"
        className="group flex items-center gap-4 rounded-xl border border-line bg-surface-elevated p-5 hover:border-brand transition-colors"
      >
        <span
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning"
          aria-hidden="true"
        >
          <PartyPopper size={20} strokeWidth={1.9} />
        </span>

        <div className="min-w-0 flex-1">
          <h2
            id="festival-invite-heading"
            className="text-base font-bold text-ink-1 break-keep"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {total > 0 ? `이번 주말 근처 축제 ${total}곳` : '근처 축제 둘러보기'}
          </h2>
          <p className="text-sm text-ink-3 mt-0.5 break-keep">
            {closing > 0
              ? `그중 ${closing}곳은 이번 주말이 마지막이에요`
              : '진행 중이거나 곧 시작하는 축제를 축제 탭에서 모아 봐요'}
          </p>
        </div>

        <span className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-brand whitespace-nowrap">
          축제 탭
          <ArrowRight
            size={16}
            strokeWidth={2}
            className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </Link>
    </section>
  );
}
