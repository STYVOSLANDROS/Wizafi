"use client";

import { useActionState, useState } from "react";
import { initiatePaymentAction } from "@/app/(public)/pay/[slug]/actions";

type Plan = {
  id: number;
  name: string;
  duration_label: string;
  price: number;
};

function formatXAF(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} XAF`;
}

export function PayForm({ slug, plans }: { slug: string; plans: Plan[] }) {
  const action = initiatePaymentAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [selectedPlan, setSelectedPlan] = useState(plans[0]?.id);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <div className="space-y-2">
        {plans.map((plan) => (
          <label
            key={plan.id}
            className={`flex cursor-pointer items-center justify-between rounded border p-3 text-sm ${
              selectedPlan === plan.id ? "border-slate-900 bg-white" : "border-slate-200 bg-white"
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="planId"
                value={plan.id}
                checked={selectedPlan === plan.id}
                onChange={() => setSelectedPlan(plan.id)}
                className="h-4 w-4"
              />
              <span>
                <span className="block font-medium">{plan.name}</span>
                <span className="block text-xs text-slate-500">{plan.duration_label}</span>
              </span>
            </span>
            <span className="font-semibold">{formatXAF(plan.price)}</span>
          </label>
        ))}
      </div>

      <div className="space-y-1">
        <label htmlFor="phone" className="text-sm font-medium">
          Numéro Mobile Money
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="6XXXXXXXX"
          inputMode="numeric"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending || !selectedPlan}
        className="w-full rounded bg-slate-900 px-3 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Envoi de la demande..." : "Payer"}
      </button>
    </form>
  );
}
