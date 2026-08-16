"use client";

import { useState } from "react";

type Result =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; boardName: string; version: string }
  | { state: "error"; message: string };

export function RouterTestButton({ routerId }: { routerId: number }) {
  const [result, setResult] = useState<Result>({ state: "idle" });

  async function handleClick() {
    setResult({ state: "loading" });
    try {
      const res = await fetch(`/api/routers/${routerId}/verify`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setResult({ state: "ok", boardName: data.boardName, version: data.version });
      } else {
        setResult({ state: "error", message: data.error ?? "Échec inconnu." });
      }
    } catch {
      setResult({ state: "error", message: "Impossible de joindre l'API." });
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={result.state === "loading"}
        className="text-slate-700 underline disabled:opacity-50"
      >
        {result.state === "loading" ? "Test en cours..." : "Tester la connexion"}
      </button>
      {result.state === "ok" && (
        <span className="text-xs text-green-700">
          OK — {result.boardName} (RouterOS {result.version})
        </span>
      )}
      {result.state === "error" && (
        <span className="text-xs text-red-600">{result.message}</span>
      )}
    </div>
  );
}
