"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div role="status" className="border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-sm">
      Sin conexión. Algunas acciones no van a funcionar hasta que vuelva la red.
    </div>
  );
}
