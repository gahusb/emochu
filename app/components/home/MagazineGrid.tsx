import type { ReactNode } from 'react';

interface Props {
  main: ReactNode;
  side: ReactNode;
}

export default function MagazineGrid({ main, side }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
      <div className="lg:col-span-8 min-w-0">{main}</div>
      <aside className="hidden lg:block lg:col-span-4">
        <div className="lg:sticky lg:top-20 space-y-5 lg:max-h-[calc(100vh-5rem)] lg:overflow-auto lg:pb-8 lg:pr-1">
          {side}
        </div>
      </aside>
    </div>
  );
}
