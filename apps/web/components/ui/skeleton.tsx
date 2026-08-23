import { cx } from "@tcg/ui";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx("animate-pulse rounded-[12px] bg-surface-elevated", className)}
      aria-hidden
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-[16px] border border-border bg-surface p-3">
      <Skeleton className="mx-auto aspect-[63/88] w-full max-w-[180px]" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <Skeleton className="mt-3 h-5 w-24" />
    </div>
  );
}

export function CollectionCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-[16px] border border-border bg-surface p-3">
      <Skeleton className="h-24 w-[68px] shrink-0" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-2 h-3 w-1/2" />
        <Skeleton className="mt-4 h-4 w-24" />
      </div>
    </div>
  );
}

export function ListingSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 sm:flex-row sm:items-center">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-8 w-28" />
    </div>
  );
}

export function OrderSkeleton() {
  return (
    <div className="rounded-[16px] border border-border bg-surface p-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-2/3" />
    </div>
  );
}

export function PricesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
    </div>
  );
}
