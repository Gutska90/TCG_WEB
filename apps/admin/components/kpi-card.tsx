export function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-900 px-4 py-3">
      <p className="text-xs tracking-wide text-neutral-400 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-50">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}
