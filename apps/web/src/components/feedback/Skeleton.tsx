export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--color-surface-elevated)] ${className}`}
      aria-hidden
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="flex w-40 shrink-0 flex-col gap-2">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <section className="mb-10">
      <Skeleton className="mb-4 h-6 w-48" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
