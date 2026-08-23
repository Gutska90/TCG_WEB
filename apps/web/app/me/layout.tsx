import type { ReactNode } from "react";
import { AccountNav } from "../../components/account-nav";

export default function MeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="account-shell mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8 lg:py-8">
      <AccountNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
