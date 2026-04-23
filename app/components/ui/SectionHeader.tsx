import type { ReactNode } from 'react';
import Link from 'next/link';

interface Props {
  title: string;
  description?: string;
  moreHref?: string;
  moreLabel?: string;
  rightSlot?: ReactNode;
  className?: string;
}

export default function SectionHeader({
  title,
  description,
  moreHref,
  moreLabel = '더보기',
  rightSlot,
  className = '',
}: Props) {
  return (
    <div className={`flex items-end justify-between gap-4 mb-5 ${className}`}>
      <div className="min-w-0 flex-1">
        <h2
          className="text-xl lg:text-2xl font-bold text-ink-1 leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h2>
        {description && (
          <p className="text-sm text-ink-3 mt-1.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {moreHref ? (
        <Link
          href={moreHref}
          className="text-sm font-semibold text-brand hover:text-brand-hover whitespace-nowrap transition-colors"
        >
          {moreLabel} →
        </Link>
      ) : (
        rightSlot
      )}
    </div>
  );
}
