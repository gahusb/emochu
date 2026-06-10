'use client';

import { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { useLocation } from './LocationContext';

const SEEN_KEY = 'emochu.loc_prompt_seen';

export default function LocationPermissionToast() {
  const { requestGPS } = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      /* ignore */
    }
    if (seen || !navigator.geolocation) return;

    let timer: ReturnType<typeof setTimeout>;
    const reveal = () => setShow(true);

    if (!navigator.permissions?.query) {
      timer = setTimeout(reveal, 1200);
      return () => clearTimeout(timer);
    }
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state === 'prompt') timer = setTimeout(reveal, 1200);
      })
      .catch(() => {
        timer = setTimeout(reveal, 1200);
      });
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  const allow = async () => {
    await requestGPS();
    dismiss();
  };

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 z-40 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] lg:bottom-6 px-4"
    >
      <div className="max-w-md mx-auto bg-surface-elevated border border-line rounded-xl shadow-lg p-4 flex items-start gap-3">
        <span className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center">
          <MapPin size={18} className="text-brand" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-1">내 주변 주말 코스를 추천받아 보세요</p>
          <p className="text-xs text-ink-3 mt-0.5">위치를 허용하면 더 정확한 코스를 만들어드려요</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={allow}
              className="h-9 px-4 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors"
            >
              위치 허용
            </button>
            <button
              onClick={dismiss}
              className="h-9 px-3 rounded-lg border border-line text-ink-3 text-sm hover:bg-surface-sunken transition-colors"
            >
              서울로 볼게요
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="닫기" className="text-ink-4 hover:text-ink-2 flex-shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
