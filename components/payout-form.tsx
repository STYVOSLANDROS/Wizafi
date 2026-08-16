"use client";

import { useActionState } from "react";
import { requestPayoutAction } from "@/app/(dashboard)/payouts/actions";

export function PayoutForm({ balance }: { balance: number }) {
  const [state, formAction, pending] = useActionState(requestPayoutAction, undefined);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <div className="space-y-1">
        <label htmlFor="amount" className="text-sm font-medium">
          Montant (XAF)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          step={1}
          min={1}
          max={balance}
          required
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending || balance <= 0}
        className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Envoi..." : "Demander le retrait"}
      </button>
    </form>
  );
}
