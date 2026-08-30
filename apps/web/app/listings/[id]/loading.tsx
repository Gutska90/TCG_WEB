import { ListingSkeleton } from "../../../components/ui/skeleton";

export default function ListingLoading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="h-4 w-48 animate-pulse rounded-[12px] bg-surface-elevated" />
      <div className="mt-8">
        <ListingSkeleton />
      </div>
    </main>
  );
}
