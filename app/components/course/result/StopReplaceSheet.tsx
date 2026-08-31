'use client';

// 장소 교체 시트.
//
// 🔑 AI 를 다시 부르지 않는다. 서버가 그 장소 **주변에서 같은 역할**의 후보를
//    가까운 순으로 뽑아 주고, 사용자는 고르기만 한다.
// 🔑 「원래 자리에서 몇 km」를 같이 보여준다 — 코스에서 가장 중요한 건 동선이라,
//    이름만 보고 고르면 코스가 망가진다.

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, Loader2, MapPin } from 'lucide-react';

export interface AlternativeSpot {
  contentId: string;
  title: string;
  addr1: string;
  imageUrl?: string;
  detourKm: number;
}

interface Props {
  slug: string;
  editToken: string;
  /** 바꾸려는 장소의 order 와 이름. 제목에 쓴다. */
  order: number;
  currentTitle: string;
  onPick: (contentId: string) => Promise<void>;
  onClose: () => void;
}

export default function StopReplaceSheet({
  slug, editToken, order, currentTitle, onPick, onClose,
}: Props) {
  const [items, setItems] = useState<AlternativeSpot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/course/${slug}/alternatives?order=${order}`, {
          headers: { 'x-edit-token': editToken },
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error ?? '주변 장소를 불러오지 못했어요.');
        setItems(json.alternatives as AlternativeSpot[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '주변 장소를 불러오지 못했어요.');
      }
    })();
    return () => { cancelled = true; };
  }, [slug, order, editToken]);

  const handlePick = async (contentId: string) => {
    if (picking) return;
    setPicking(contentId);
    try {
      await onPick(contentId);
    } finally {
      setPicking(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${currentTitle} 대신 갈 곳 고르기`}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[80vh] flex flex-col bg-surface-elevated rounded-t-2xl sm:rounded-2xl border border-line shadow-xl"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-line">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-4">이 자리에 대신 갈 곳</p>
            <p className="text-sm font-bold text-ink-1 truncate">{currentTitle}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="h-9 w-9 flex items-center justify-center rounded-lg text-ink-3 hover:bg-surface-sunken transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {error && <p role="alert" className="p-4 text-sm text-red-500 text-center">{error}</p>}

          {!items && !error && (
            <p className="p-8 flex items-center justify-center gap-2 text-sm text-ink-3">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              주변을 찾는 중…
            </p>
          )}

          {items?.length === 0 && (
            <p className="p-8 text-sm text-ink-3 text-center break-keep">
              이 근처에 바꿀 만한 곳을 못 찾았어요. 다른 장소를 바꿔보세요.
            </p>
          )}

          <ul className="space-y-2">
            {items?.map((it) => (
              <li key={it.contentId}>
                <button
                  type="button"
                  onClick={() => handlePick(it.contentId)}
                  disabled={picking !== null}
                  className="w-full flex items-center gap-3 p-2 rounded-lg border border-line text-left hover:border-brand disabled:opacity-60 transition-colors"
                >
                  <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-surface-sunken">
                    {it.imageUrl
                      ? <Image src={it.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                      : <span className="absolute inset-0 flex items-center justify-center text-ink-4"><MapPin size={18} /></span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-1 truncate">{it.title}</p>
                    <p className="text-xs text-ink-3 truncate">{it.addr1}</p>
                    <p className="text-xs text-ink-4 mt-0.5">원래 자리에서 {it.detourKm}km</p>
                  </div>
                  {picking === it.contentId && (
                    <Loader2 size={16} className="animate-spin text-brand flex-shrink-0" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
