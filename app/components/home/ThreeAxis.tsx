import { Smile, Users, Sparkles, type LucideIcon } from 'lucide-react';

interface Axis {
  Icon: LucideIcon;
  label: string;
  desc: string;
  color: string; // 아이콘 컬러 (CSS 변수)
  soft: string;  // 아이콘 배경 (CSS 변수)
  highlight?: boolean;
}

// 일반 여행 앱(거리·평점)과 다른 이모추의 3축 추천 기준
const AXES: Axis[] = [
  { Icon: Smile, label: '감정', desc: '오늘 기분 6가지에 맞춰', color: 'var(--color-brand)', soft: 'var(--color-brand-soft)' },
  { Icon: Users, label: '동반자', desc: '혼자·커플·가족·친구 반영', color: 'var(--color-mocha)', soft: 'var(--color-mocha-soft)' },
  { Icon: Sparkles, label: '사주', desc: '오늘의 사주 기운까지', color: 'var(--color-warning)', soft: 'var(--color-warning-soft)', highlight: true },
];

export default function ThreeAxis() {
  return (
    <section aria-labelledby="three-axis-heading">
      <h2
        id="three-axis-heading"
        className="text-lg lg:text-xl font-bold text-ink-1 break-keep"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        거리·평점 말고, 이 3가지로 골라요
      </h2>
      <p className="text-sm text-ink-3 mt-1 mb-5 break-keep">일반 여행 앱과 다른 이모추의 추천 기준</p>

      <div className="grid grid-cols-3 gap-2.5 lg:gap-4">
        {AXES.map(({ Icon, label, desc, color, soft, highlight }) => (
          <div
            key={label}
            className={`relative rounded-xl border p-3 lg:p-5 text-center bg-surface-elevated ${highlight ? '' : 'border-line'}`}
            style={highlight ? { borderColor: 'var(--color-warning)', boxShadow: 'var(--shadow-raised)' } : undefined}
          >
            {highlight && (
              <span
                className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: 'var(--color-warning)' }}
              >
                이모추 단독
              </span>
            )}
            <span
              className="mx-auto mb-2.5 flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: soft, color }}
            >
              <Icon size={20} strokeWidth={2} aria-hidden="true" />
            </span>
            <p className="text-sm lg:text-base font-bold text-ink-1" style={{ fontFamily: 'var(--font-display)' }}>
              {label}
            </p>
            <p className="mt-1 text-[11px] lg:text-sm text-ink-3 leading-tight break-keep">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
