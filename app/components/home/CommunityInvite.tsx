// 홈에서 커뮤니티 코스를 「보여주는」 대신 「가리키는」 자리.
//
// FestivalTabInvite 와 같은 톤 — 같은 걸 홈에서까지 보여주면 소음이 된다.
// 🔴 홈 로드에 새 API 콜을 더하지 않는다. 정확한 개수보다야 문구가 낫다
//    (FestivalTabInvite 는 useHomeData 가 이미 페치한 축제 데이터에서 개수를 공짜로
//    얻지만, 커뮤니티 개수는 별도 왕복이 필요해서 뺀다).

import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';

export default function CommunityInvite() {
  return (
    <section aria-labelledby="community-invite-heading">
      <Link
        href="/community"
        className="group flex items-center gap-4 rounded-xl border border-line bg-surface-elevated p-5 hover:border-brand transition-colors"
      >
        <span
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"
          aria-hidden="true"
        >
          <Users size={20} strokeWidth={1.9} />
        </span>

        <div className="min-w-0 flex-1">
          <h2
            id="community-invite-heading"
            className="text-base font-bold text-ink-1 break-keep"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            다른 사람이 만든 코스는 어때요?
          </h2>
          <p className="text-sm text-ink-3 mt-0.5 break-keep">
            추천을 허락받은 코스만 모아뒀어요
          </p>
        </div>

        <span className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-brand whitespace-nowrap">
          둘러보기
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
