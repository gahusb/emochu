import { Loader2, Map as MapIcon } from 'lucide-react';
import SkeletonStopCard from './SkeletonStopCard';
import Container from '@/app/components/ui/Container';

interface Props { message: string; }

export default function CourseLoading({ message }: Props) {
  return (
    <Container>
      <div className="py-8 lg:py-12">
        <div className="text-center mb-10">
          <Loader2 size={32} strokeWidth={1.75} className="text-brand mx-auto animate-spin" aria-hidden="true" />
          <h2 className="text-2xl lg:text-3xl font-bold text-ink-1 mt-4" style={{ fontFamily: 'var(--font-display)' }}>
            코스를 설계하고 있어요
          </h2>
          <p className="text-sm text-ink-3 mt-2">평균 15~25초 소요</p>
          <p className="text-sm text-ink-2 mt-4 transition-opacity duration-500" aria-live="polite">
            {message}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-8">
          <section aria-label="코스 타임라인 로딩 중" className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <SkeletonStopCard key={i} index={i} />
            ))}
          </section>
          <aside aria-label="지도 로딩 중" className="hidden lg:block">
            <div className="sticky top-20 h-[calc(100vh-7rem)] rounded-lg bg-surface-sunken border border-line flex flex-col items-center justify-center gap-3">
              <MapIcon size={32} strokeWidth={1.5} className="text-ink-4" aria-hidden="true" />
              <p className="text-sm text-ink-3">코스가 완성되면<br />지도가 나타나요</p>
            </div>
          </aside>
        </div>
      </div>
    </Container>
  );
}
