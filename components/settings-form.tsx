"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "@/app/(dashboard)/settings/actions";

type Initial = { name: string; phone: string; country: string; sms_enabled: boolean };

export function SettingsForm({ initial }: { initial: Initial }) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, undefined);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && <p className="text-sm text-green-700">Enregistré.</p>}

      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Nom
        </label>
        <input id="name" name="name" required defaultValue={initial.name} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label htmlFor="phone" className="text-sm font-medium">
          Téléphone
        </label>
        <input id="phone" name="phone" required defaultValue={initial.phone} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label htmlFor="country" className="text-sm font-medium">
          Pays
        </label>
        <input id="country" name="country" required defaultValue={initial.country} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex items-center gap-2">
        <input id="sms_enabled" name="sms_enabled" type="checkbox" defaultChecked={initial.sms_enabled} className="h-4 w-4" />
        <label htmlFor="sms_enabled" className="text-sm">
          Envoyer aussi le ticket par SMS
        </label>
      </div>
      <p className="text-xs text-slate-500">
        L&apos;envoi SMS n&apos;est pas encore implémenté (spec §4 : optionnel, jamais dans le
        chemin critique) — ce réglage est enregistré mais n&apos;envoie rien pour l&apos;instant.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
