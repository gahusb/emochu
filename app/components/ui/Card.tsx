import type { ReactNode, HTMLAttributes } from 'react';

type Variant = 'default' | 'sunken' | 'elevated';

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  default: 'bg-surface-elevated border border-line',
  sunken: 'bg-surface-sunken border border-line',
  elevated: 'bg-surface-elevated border border-line shadow-[var(--shadow-raised)]',
};

export default function Card({
  variant = 'default',
  children,
  className = '',
  ...rest
}: Props) {
  return (
    <div
      className={`rounded-xl ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
