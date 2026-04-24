export interface SpotDetailData {
  contentId: string;
  contentTypeId: string;
  title: string;
  addr: string;
  tel: string;
  homepage: string;
  overview: string;
  mainImage: string;
  images: { url: string; thumbnail: string; name: string }[];
  lat: number;
  lng: number;
  introFields: { label: string; value: string }[];
  subInfo: { name: string; overview: string; image?: string }[];
}

interface Props {
  detail: SpotDetailData;
}

export default function SpotDetail({ detail }: Props) {
  // Task 2에서 완성
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-ink-1" style={{ fontFamily: 'var(--font-display)' }}>
        {detail.title}
      </h1>
      <p className="text-sm text-ink-3 mt-2">Task 2에서 완성됩니다.</p>
    </div>
  );
}
