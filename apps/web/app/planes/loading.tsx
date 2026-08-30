export default function PlansLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="h-4 w-28 animate-pulse rounded-[8px] bg-surface-elevated" />
      <div className="mt-3 h-9 w-40 animate-pulse rounded-[12px] bg-surface-elevated" />
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {["a", "b", "c", "d"].map((key) => (
          <div key={key} className="h-64 animate-pulse rounded-[16px] border border-border bg-surface" />
        ))}
      </div>
    </main>
  );
}
