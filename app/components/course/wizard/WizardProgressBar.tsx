interface Props { current: number; total: number; }

export default function WizardProgressBar({ current, total }: Props) {
  const pct = Math.min(100, ((current + 1) / total) * 100);
  return (
    <div className="lg:hidden h-1 bg-line w-full" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total} aria-label="코스 생성 진행률">
      <div
        className="h-full bg-brand transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
