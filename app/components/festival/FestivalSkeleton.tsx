export default function FestivalSkeleton() {
  return (
    <div className="bg-surface-elevated border border-line rounded-lg overflow-hidden">
      <div className="aspect-[4/3] w-full skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-3/4 skeleton rounded-md" />
        <div className="h-3 w-1/2 skeleton rounded-md" />
        <div className="h-3 w-1/4 skeleton rounded-md" />
      </div>
    </div>
  );
}
