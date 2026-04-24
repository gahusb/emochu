'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface Props { children: ReactNode; }

export default function SpotDetailModalFrame({ children }: Props) {
  const router = useRouter();
  const mouseDownOnBackdropRef = useRef(false);

  const close = () => router.back();

  // ESC 닫기 + body scroll lock (기존 overflow 값 보존하여 중첩 모달 호환)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.back();
    };
    const prevOverflow = document.body.style.overflow;
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [router]);

  // backdrop click 닫기 — mousedown 기준 (드래그 선택 시 오닫힘 방지)
  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    mouseDownOnBackdropRef.current = e.target === e.currentTarget;
  };
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (mouseDownOnBackdropRef.current && e.target === e.currentTarget) close();
    mouseDownOnBackdropRef.current = false;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-[fadeIn_0.2s_ease-out]"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div className="absolute inset-0 bg-ink-1/50 backdrop-blur-sm" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="장소 상세"
        className="relative w-full sm:max-w-5xl max-h-[90dvh] bg-surface-elevated rounded-t-2xl sm:rounded-2xl overflow-hidden animate-[slideUp_0.3s_ease-out] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 pb-1 sm:hidden" aria-hidden="true">
          <div className="w-10 h-1 bg-line rounded-full" />
        </div>
        <button
          type="button"
          onClick={close}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-ink-1/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-ink-1/60 transition-colors"
          aria-label="닫기"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
