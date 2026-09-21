import { Loader2, Map as MapIcon } from 'lucide-react';
import SkeletonStopCard from './SkeletonStopCard';
import Container from '@/app/components/ui/Container';
import { COURSE_WAIT_HINT, waitProgressRatio, waitStatusText } from '@/lib/loading-messages';

interface Props {
  message: string;
  /** 생성이 시작된 뒤 흐른 시간. 없으면 기다림에 대해 아무 숫자도 말하지 않는다. */
  elapsedSec?: number;
}

export default function CourseLoading({ message, elapsedSec = 0 }: Props) {
  const status = waitStatusText(elapsedSec);
  const percent = Math.round(waitProgressRatio(elapsedSec) * 100);
  return (
    <Container>
      <div className="py-8 lg:py-12">
        <div className="text-center mb-10">
          <Loader2 size={32} strokeWidth={1.75} className="text-brand mx-auto motion-safe:animate-spin" aria-hidden="true" />
          <h2 className="text-2xl lg:text-3xl font-bold text-ink-1 mt-4" style={{ fontFamily: 'var(--font-display)' }}>
            코스를 설계하고 있어요
          </h2>
          <p className="text-sm text-ink-3 mt-2">{COURSE_WAIT_HINT}</p>

          {/* 🔑 「예상」이라고 적는다 — 서버가 단계를 알려주지 않으므로 이건 흘러간 시간으로 만든 추정이다.
              elapsedSec 를 받지 못하면 아예 그리지 않는다 — 0%에서 멈춘 막대는 고장으로 보인다. */}
          {elapsedSec > 0 && (
          <div className="max-w-xs mx-auto mt-4">
            <div
              role="progressbar"
              aria-label="예상 대기 진행"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-1.5 rounded-full bg-surface-sunken overflow-hidden"
            >
              <div
                className="h-full rounded-full bg-brand motion-safe:transition-[width] motion-safe:duration-1000 ease-linear"
                style={{ width: `${percent}%` }}
              />
            </div>
            {status && <p className="text-xs text-ink-4 mt-2">{status}</p>}
          </div>
          )}

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
