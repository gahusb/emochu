'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function SpotPageBackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink-1 transition-colors py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-md"
      aria-label="뒤로가기"
    >
      <ArrowLeft size={18} strokeWidth={2} />
      <span>돌아가기</span>
    </button>
  );
}
