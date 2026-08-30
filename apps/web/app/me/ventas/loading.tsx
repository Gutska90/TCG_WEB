import { OrderSkeleton } from "../../../components/ui/skeleton";

export default function SalesLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="h-8 w-36 animate-pulse rounded-[12px] bg-surface-elevated" />
      <div className="mt-8 grid gap-3">
        <OrderSkeleton />
        <OrderSkeleton />
      </div>
    </main>
  );
}
