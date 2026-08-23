import { cx } from "@tcg/ui";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  body,
  action,
  children,
  className,
}: {
  title?: string;
  body?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  if (!title && children) {
    return <p className={cx("mt-6 text-text-muted", className)}>{children}</p>;
  }
  return (
    <div className={cx("rounded-[16px] border border-border bg-surface px-6 py-10 text-center", className)}>
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated text-text-muted">
        ○
      </div>
      {title ? <h2 className="text-lg font-medium text-text">{title}</h2> : null}
      {body ? <p className="mt-2 text-sm text-text-muted">{body}</p> : null}
      {children ? <div className="mt-2 text-sm text-text-muted">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
