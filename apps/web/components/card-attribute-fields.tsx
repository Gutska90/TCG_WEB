import type { CardAttributeFieldView } from "@tcg/types";

export function CardAttributeFields({ fields }: { fields: CardAttributeFieldView[] | undefined }) {
  if (!fields?.length) return null;
  return (
    <dl className="mt-6 grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key} className="rounded-[16px] border border-border bg-surface p-4">
          <dt className="text-xs font-medium tracking-wide text-text-muted uppercase">{field.label}</dt>
          <dd className="mt-1 text-sm">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
