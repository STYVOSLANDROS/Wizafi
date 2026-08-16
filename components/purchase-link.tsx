"use client";

import { useState } from "react";

export function PurchaseLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<a href="${url}">Acheter un ticket</a>`;

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button type="button" onClick={copy} className="text-slate-700 underline">
      {copied ? "Copié !" : "Copier le lien d'achat"}
    </button>
  );
}
