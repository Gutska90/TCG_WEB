import { ProductCardSkeleton } from "../components/ui/skeleton";

export default function HomeLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="h-10 w-80 max-w-full animate-pulse rounded-[12px] bg-surface-elevated" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProductCardSkeleton />
        <ProductCardSkeleton />
        <ProductCardSkeleton />
        <ProductCardSkeleton />
      </div>
    </main>
  );
}
