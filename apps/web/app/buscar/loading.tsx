import { ProductCardSkeleton } from "../../components/ui/skeleton";

export default function SearchLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="h-8 w-48 animate-pulse rounded-[12px] bg-surface-elevated" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ProductCardSkeleton />
        <ProductCardSkeleton />
        <ProductCardSkeleton />
        <ProductCardSkeleton />
        <ProductCardSkeleton />
        <ProductCardSkeleton />
      </div>
    </main>
  );
}
