import { CollectionCardSkeleton } from "../../../components/ui/skeleton";

export default function WishlistLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="h-8 w-40 animate-pulse rounded-[12px] bg-surface-elevated" />
      <div className="mt-8 grid gap-3">
        <CollectionCardSkeleton />
        <CollectionCardSkeleton />
      </div>
    </main>
  );
}
