"use client";

import { useActionState } from "react";
import type { SiteFormState } from "@/app/(dashboard)/sites/actions";

export function SiteForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prevState: SiteFormState, formData: FormData) => Promise<SiteFormState>;
  initial?: { name: string; address: string };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Nom du site
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initial?.name}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="address" className="text-sm font-medium">
          Adresse
        </label>
        <input
          id="address"
          name="address"
          required
          defaultValue={initial?.address}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Enregistrement..." : submitLabel}
      </button>
    </form>
  );
}
