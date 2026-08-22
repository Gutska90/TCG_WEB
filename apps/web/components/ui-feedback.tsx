import Link from "next/link";
import type { ReactNode } from "react";

const fieldClass =
  "mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const buttonClass =
  "rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const buttonSecondaryClass =
  "rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function PageMain({
  children,
  width = "md",
}: {
  children: ReactNode;
  width?: "md" | "lg" | "xl";
}) {
  const max = width === "xl" ? "max-w-5xl" : width === "lg" ? "max-w-3xl" : "max-w-2xl";
  return <main id="contenido" className={`mx-auto ${max} px-4 py-10 sm:px-6 sm:py-12`}>{children}</main>;
}

export function LoadingBlock({ label = "Cargando…" }: { label?: string }) {
  return (
    <p className="text-neutral-600" role="status">
      {label}
    </p>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="mt-6 text-neutral-600">{children}</p>;
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-800" role="alert">
      {message}
    </p>
  );
}

export function SuccessNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-sm text-emerald-800" role="status">
      {message}
    </p>
  );
}

export function SandboxNotice() {
  return (
    <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-neutral-900">
      Pago de prueba / sandbox. Esta beta no cobra dinero real.
    </p>
  );
}

export { fieldClass, buttonClass, buttonSecondaryClass };

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {children}
    </Link>
  );
}
