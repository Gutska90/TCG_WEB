import { OrderSkeleton } from "../../components/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="h-8 w-28 animate-pulse rounded-[12px] bg-surface-elevated" />
      <div className="mt-8">
        <OrderSkeleton />
      </div>
    </main>
  );
}
