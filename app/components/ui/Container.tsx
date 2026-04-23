import type { ReactNode, HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export default function Container({ children, className = '', ...rest }: Props) {
  return (
    <div className={`max-w-7xl mx-auto px-5 lg:px-8 ${className}`} {...rest}>
      {children}
    </div>
  );
}
