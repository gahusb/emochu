interface Props { index: number; }

export default function SkeletonStopCard({ index }: Props) {
  return (
    <div
      className="flex gap-4 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
      style={{ animationDelay: `${index * 800}ms` }}
    >
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <div className="w-8 h-8 rounded-full skeleton" />
        <div className="flex-1 w-px bg-line my-1" />
      </div>
      <div className="flex-1 bg-surface-elevated rounded-lg border border-line overflow-hidden">
        <div className="h-36 skeleton" />
        <div className="p-4 space-y-3">
          <div className="h-4 w-16 skeleton rounded-md" />
          <div className="h-5 w-3/4 skeleton rounded-md" />
          <div className="h-3 w-1/2 skeleton rounded-md" />
          <div className="h-3 w-full skeleton rounded-md" />
          <div className="h-3 w-5/6 skeleton rounded-md" />
        </div>
      </div>
    </div>
  );
}
