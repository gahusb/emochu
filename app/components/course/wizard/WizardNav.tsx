import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import Button from '@/app/components/ui/Button';

interface Props {
  canGoBack: boolean;
  canProceed: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function WizardNav({ canGoBack, canProceed, isLast, onPrev, onNext }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 lg:static sticky bottom-0 lg:bg-transparent bg-surface-base/95 backdrop-blur-sm lg:backdrop-blur-0 py-3 lg:py-0 -mx-5 px-5 lg:mx-0 lg:px-0 lg:border-0 border-t border-line" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      {canGoBack ? (
        <Button variant="secondary" size="md" iconLeft={<ArrowLeft size={18} />} onClick={onPrev}>이전</Button>
      ) : <span />}
      <Button
        variant="primary"
        size="md"
        iconRight={isLast ? <Sparkles size={18} /> : <ArrowRight size={18} />}
        onClick={onNext}
        disabled={!canProceed}
      >
        {isLast ? '코스 만들기' : '다음'}
      </Button>
    </div>
  );
}
