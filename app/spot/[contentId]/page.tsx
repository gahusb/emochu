import type { Metadata } from 'next';
import Container from '@/app/components/ui/Container';
import SpotDetail from '@/app/components/spot/SpotDetail';
import type { SpotDetailData } from '@/app/components/spot/SpotDetail';
import SpotPageBackButton from '@/app/components/spot/SpotPageBackButton';
import { AlertCircle } from 'lucide-react';

async function fetchSpot(contentId: string): Promise<SpotDetailData | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/spot?contentId=${contentId}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function normalizeImageUrl(url: string): string {
  return url.startsWith('http://') ? url.replace('http://', 'https://') : url;
}

export async function generateMetadata({ params }: { params: Promise<{ contentId: string }> }): Promise<Metadata> {
  const { contentId } = await params;
  const detail = await fetchSpot(contentId);
  if (!detail) {
    return { title: '이모추 | 장소를 찾을 수 없어요' };
  }
  const description = (detail.overview?.slice(0, 120)?.trim() || '이번 주말 나들이 장소로 어떠세요?');
  const image = normalizeImageUrl(detail.mainImage || '/hero/autumn-clear.jpg');
  return {
    title: `${detail.title} | 이모추`,
    description,
    openGraph: {
      title: detail.title,
      description,
      images: [image],
      type: 'article',
    },
  };
}

export default async function SpotPage({ params }: { params: Promise<{ contentId: string }> }) {
  const { contentId } = await params;
  const detail = await fetchSpot(contentId);

  if (!detail) {
    return (
      <Container>
        <div className="py-12 flex flex-col items-center text-center">
          <AlertCircle size={48} strokeWidth={1.5} className="text-ink-4 mb-4" aria-hidden="true" />
          <h1 className="text-lg font-bold text-ink-1" style={{ fontFamily: 'var(--font-display)' }}>
            장소를 찾을 수 없어요
          </h1>
          <p className="text-sm text-ink-3 mt-2">링크가 만료되었거나 잘못된 주소예요</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-4">
        <SpotPageBackButton />
      </div>
      <SpotDetail detail={detail} />
    </Container>
  );
}
