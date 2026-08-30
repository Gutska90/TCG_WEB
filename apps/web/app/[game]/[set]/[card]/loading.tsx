import { PricesSkeleton, ProductCardSkeleton } from "../../../../components/ui/skeleton";

export default function CardLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="h-4 w-40 animate-pulse rounded-[12px] bg-surface-elevated" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,280px)_1fr]">
        <ProductCardSkeleton />
        <div>
          <div className="h-8 w-2/3 animate-pulse rounded-[12px] bg-surface-elevated" />
          <div className="mt-6">
            <PricesSkeleton />
          </div>
        </div>
      </div>
    </main>
  );
}
