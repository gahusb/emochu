export default function SpotDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-0 lg:gap-8 max-w-5xl mx-auto lg:p-6">
      <div className="lg:order-1">
        <div className="aspect-[4/3] w-full skeleton lg:rounded-lg" />
      </div>
      <div className="lg:order-2 px-5 py-5 lg:p-0 space-y-3">
        <div className="h-6 w-2/3 skeleton rounded-md" />
        <div className="h-4 w-1/2 skeleton rounded-md" />
        <div className="flex gap-2 mt-4">
          <div className="h-11 w-28 skeleton rounded-lg" />
          <div className="h-11 w-20 skeleton rounded-lg" />
        </div>
        <div className="h-4 w-full skeleton rounded-md mt-6" />
        <div className="h-4 w-5/6 skeleton rounded-md" />
        <div className="h-4 w-4/6 skeleton rounded-md" />
      </div>
    </div>
  );
}
