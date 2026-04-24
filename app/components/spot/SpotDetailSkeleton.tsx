export default function SpotDetailSkeleton() {
  return (
    <div className="p-8 space-y-4">
      <div className="h-8 w-3/4 skeleton rounded-md" />
      <div className="aspect-[4/3] w-full skeleton rounded-lg" />
      <div className="h-4 w-full skeleton rounded-md" />
      <div className="h-4 w-5/6 skeleton rounded-md" />
    </div>
  );
}
