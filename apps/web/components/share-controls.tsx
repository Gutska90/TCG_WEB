"use client";

import { useEffect, useState } from "react";
import { buttonClassName } from "./ui/button-styles";

/** Copy/share uses a relative path on SSR, then the absolute origin after mount (avoids hydration mismatch). */
export function ShareControls({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(path);

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
    await copy();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={buttonClassName("ghost")} onClick={() => void copy()}>
        {copied ? "Enlace copiado" : "Copiar enlace"}
      </button>
      <button type="button" className={buttonClassName("ghost")} onClick={() => void share()}>
        Compartir
      </button>
    </div>
  );
}
