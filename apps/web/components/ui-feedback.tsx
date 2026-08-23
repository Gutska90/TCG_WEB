import Link from "next/link";
import type { ReactNode } from "react";
import { Alert } from "./ui/alert";
import { buttonClassName } from "./ui/button-styles";
import { controlClassName } from "./ui/input";
import { EmptyState as EmptyStateBlock } from "./ui/empty-state";

const fieldClass = `mt-1 ${controlClassName}`;
const buttonClass = buttonClassName("primary");
const buttonSecondaryClass = buttonClassName("secondary");

export function PageMain({
  children,
  width = "md",
}: {
  children: ReactNode;
  width?: "md" | "lg" | "xl";
}) {
  const max = width === "xl" ? "max-w-6xl" : width === "lg" ? "max-w-4xl" : "max-w-2xl";
  return <main id="contenido" className={`mx-auto ${max} px-4 py-8 sm:px-6 sm:py-10`}>{children}</main>;
}

export function LoadingBlock({ label = "Cargando…" }: { label?: string }) {
  return (
    <p className="text-text-muted" role="status">
      {label}
    </p>
  );
}

export function EmptyState({
  children,
  title,
  body,
  action,
}: {
  children?: ReactNode;
  title?: string;
  body?: string;
  action?: ReactNode;
}) {
  if (title) {
    return (
      <EmptyStateBlock title={title} body={body} action={action}>
        {children}
      </EmptyStateBlock>
    );
  }
  return <p className="mt-6 text-text-muted">{children}</p>;
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-sm text-danger" role="alert">
      {message}
    </p>
  );
}

export function SuccessNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-sm text-success" role="status">
      {message}
    </p>
  );
}

export function SandboxNotice() {
  return (
    <Alert tone="warning">
      <span className="mr-2 inline-flex rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-medium tracking-wide">
        SANDBOX / BETA
      </span>
      Pago de prueba / sandbox. Esta beta no cobra dinero real.
    </Alert>
  );
}

export { fieldClass, buttonClass, buttonSecondaryClass };

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </Link>
  );
}
