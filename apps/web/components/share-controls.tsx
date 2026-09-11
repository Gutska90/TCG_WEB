"use client";

import { useState } from "react";
import { buttonClassName } from "./ui/button-styles";

export function ShareControls({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;

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
