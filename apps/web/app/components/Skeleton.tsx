export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function PosterSkeleton() {
  return (
    <div className="min-w-[150px] space-y-2">
      <Skeleton className="aspect-[2/3] w-[150px]" />
      <Skeleton className="h-3 w-[120px]" />
    </div>
  );
}

export function PosterRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <PosterSkeleton key={i} />
      ))}
    </div>
  );
}
