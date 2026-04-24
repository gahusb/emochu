'use client';

import { useEffect, useState, use } from 'react';
import SpotDetail from '@/app/components/spot/SpotDetail';
import type { SpotDetailData } from '@/app/components/spot/SpotDetail';
import SpotDetailSkeleton from '@/app/components/spot/SpotDetailSkeleton';
import SpotDetailModalFrame from '@/app/components/spot/SpotDetailModalFrame';
import { AlertCircle } from 'lucide-react';

export default function InterceptedSpotModal({ params }: { params: Promise<{ contentId: string }> }) {
  const { contentId } = use(params);
  const [detail, setDetail] = useState<SpotDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    fetch(`/api/spot?contentId=${contentId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('상세 정보를 불러올 수 없어요');
        return res.json();
      })
      .then(setDetail)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [contentId]);

  return (
    <SpotDetailModalFrame>
      {loading && <SpotDetailSkeleton />}
      {error && !loading && (
        <div className="py-16 flex flex-col items-center px-6">
          <AlertCircle size={40} strokeWidth={1.5} className="text-ink-4 mb-3" aria-hidden="true" />
          <p className="text-sm text-ink-3 text-center break-keep">{error}</p>
        </div>
      )}
      {detail && !loading && <SpotDetail detail={detail} />}
    </SpotDetailModalFrame>
  );
}
