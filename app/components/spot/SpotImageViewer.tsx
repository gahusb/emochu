'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff, X } from 'lucide-react';
import { lockBodyScroll } from '@/lib/body-scroll-lock';

interface GalleryImage { url: string; name: string; }
interface Props {
  images: GalleryImage[];
  index: number;
  title: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

function OriginalPhoto({ image, title }: { image: GalleryImage; title: string }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  return (
    <div className="relative flex-1 min-h-0 w-full" aria-busy={status === 'loading'}>
      {status === 'loading' && (
        <p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
          원본 이미지를 불러오는 중이에요…
        </p>
      )}
      {status === 'error' ? (
        <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center text-sm text-white/80">
          <ImageOff size={32} aria-hidden="true" />
          <p className="break-keep">이미지를 불러오지 못했어요.<br />다른 사진을 보거나 ‘원본 열기’를 눌러주세요.</p>
        </div>
      ) : (
        <Image
          src={image.url}
          alt={image.name || title}
          fill
          sizes="100vw"
          unoptimized
          className={`object-contain ${status === 'loading' ? 'opacity-0' : ''}`}
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
        />
      )}
    </div>
  );
}

/** Native top-layer dialog also works inside the scrollable spot-detail sheet. */
export default function SpotImageViewer({ images, index, title, onIndexChange, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const image = images[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    dialog.showModal();
    const unlockScroll = lockBodyScroll();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      unlockScroll();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  if (!image) return null;
  const move = (offset: number) => onIndexChange((index + offset + images.length) % images.length);
  const originalHref = /^(https?:\/\/|\/(?!\/))/i.test(image.url) ? image.url : undefined;
  const controlClass = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

  return (
    <dialog
      ref={dialogRef}
      aria-label={`${title} 사진 전체 보기`}
      className="fixed inset-0 m-0 h-dvh w-full max-h-none max-w-none border-0 bg-black text-white backdrop:bg-black/80 open:flex open:flex-col"
      style={{
        paddingTop: 'max(8px, env(safe-area-inset-top))',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClose={(event) => { if (!event.currentTarget.open) onClose(); }}
      onKeyDown={(event) => {
        // Do not let the underlying detail sheet close or take focus as well.
        event.stopPropagation();
        if (event.key === 'Tab') {
          const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
          return;
        }
        if (event.altKey || event.ctrlKey || event.metaKey || images.length < 2) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          move(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      <div className="flex shrink-0 items-center gap-2 pb-2">
        <div className="min-w-0 flex-1 px-1">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-white/60">사진 전체 보기</p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="사진 전체 보기 닫기" className={controlClass}>
          <X size={24} aria-hidden="true" />
        </button>
      </div>

      {/* Keep the source URL intact; do not use the thumbnail or crop posters. */}
      <OriginalPhoto key={image.url} image={image} title={title} />

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-1">
          {images.length > 1 && (
            <button type="button" aria-label="이전 사진" onClick={() => move(-1)} className={controlClass}>
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
          )}
          <p aria-live="polite" aria-atomic="true" className="min-w-12 text-center text-sm tabular-nums">
            {index + 1} / {images.length}
          </p>
          {images.length > 1 && (
            <button type="button" aria-label="다음 사진" onClick={() => move(1)} className={controlClass}>
              <ChevronRight size={24} aria-hidden="true" />
            </button>
          )}
        </div>
        {originalHref && (
          <a href={originalHref} target="_blank" rel="noopener noreferrer" className={`${controlClass} gap-2 px-3 text-xs`} aria-label="원본 이미지 새 탭에서 열기">
            원본 열기 <ExternalLink size={16} aria-hidden="true" />
          </a>
        )}
      </div>
    </dialog>
  );
}
