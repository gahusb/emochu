import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function CommunityEmpty() {
  return (
    <div className="col-span-full flex flex-col items-center py-16 px-4 text-center">
      <SearchX size={48} strokeWidth={1.5} className="text-ink-4 mb-4" aria-hidden="true" />
      <h2 className="text-base font-bold text-ink-1" style={{ fontFamily: 'var(--font-display)' }}>
        아직 추천된 코스가 없어요
      </h2>
      <p className="text-sm text-ink-3 mt-2 break-keep">
        직접 코스를 만들고 공개해 첫 번째로 추천해 보세요
      </p>
      <div className="mt-6">
        {/* Button 은 &lt;button&gt; 을 렌더링한다 — Link(&lt;a&gt;) 안에 중첩하면 안 되니
            같은 시각 스타일을 Link 에 직접 입힌다(secondary/md 톤). */}
        <Link
          href="/course"
          className="inline-flex items-center justify-center h-11 px-4 rounded-lg text-[15px] font-semibold text-brand border border-brand hover:bg-brand-soft transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          코스 만들기
        </Link>
      </div>
    </div>
  );
}
