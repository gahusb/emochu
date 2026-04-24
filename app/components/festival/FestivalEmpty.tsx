import { SearchX } from 'lucide-react';
import Button from '@/app/components/ui/Button';

interface Props { onExpandRadius: () => void; }

export default function FestivalEmpty({ onExpandRadius }: Props) {
  return (
    <div className="col-span-full flex flex-col items-center py-16 px-4 text-center">
      <SearchX size={48} strokeWidth={1.5} className="text-ink-4 mb-4" aria-hidden="true" />
      <h2 className="text-base font-bold text-ink-1" style={{ fontFamily: 'var(--font-display)' }}>
        조건에 맞는 축제가 없어요
      </h2>
      <p className="text-sm text-ink-3 mt-2">반경을 넓혀 보세요</p>
      <div className="mt-6">
        <Button variant="secondary" size="md" onClick={onExpandRadius}>
          반경 200km로 보기
        </Button>
      </div>
    </div>
  );
}
