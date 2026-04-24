interface Props {
  weekendLabel: string;
  locationName: string;
  radius: number;
  count: number;
}

export default function FestivalHeader({ weekendLabel, locationName, radius, count }: Props) {
  return (
    <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-8 pb-4">
      <h1
        className="text-2xl lg:text-3xl font-bold text-ink-1 break-keep"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        이번 주말 근처 축제
      </h1>
      <p className="text-sm text-ink-3 mt-2">
        {weekendLabel && `${weekendLabel} · `}{locationName} · 반경 {radius}km · <span className="font-semibold text-ink-2">{count}개</span>
      </p>
    </section>
  );
}
