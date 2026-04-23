import type { ReactNode } from 'react';

type Variant = 'brand' | 'mocha' | 'success' | 'warning' | 'outline';
type Size = 'sm' | 'md';

interface Props {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  brand: 'bg-brand-soft text-brand',
  mocha: 'bg-mocha-soft text-mocha',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  outline: 'bg-transparent text-ink-2 border border-line',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-[11px] px-2 py-0.5 h-5',
  md: 'text-xs px-2.5 py-1 h-6',
};

export default function Badge({
  variant = 'brand',
  size = 'sm',
  children,
  className = '',
}: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center font-semibold rounded-md ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </span>
  );
}
