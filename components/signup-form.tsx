"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "@/app/(auth)/signup/actions";

const inputClass = "w-full rounded border border-slate-300 px-3 py-2 text-sm";
const labelClass = "text-sm font-medium";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Créer un compte — WIZAFI</h1>
        <p className="text-sm text-slate-500">
          Un compte par gérant de Wifi Zone (spec §4 : aucun rôle multiple pour l&apos;instant).
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {state?.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        <div className="space-y-1">
          <label htmlFor="name" className={labelClass}>
            Nom
          </label>
          <input id="name" name="name" required className={inputClass} />
        </div>
        <div className="space-y-1">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div className="space-y-1">
          <label htmlFor="phone" className={labelClass}>
            Téléphone
          </label>
          <input id="phone" name="phone" required className={inputClass} />
        </div>
        <div className="space-y-1">
          <label htmlFor="country" className={labelClass}>
            Pays
          </label>
          <input id="country" name="country" defaultValue="Cameroun" required className={inputClass} />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className={labelClass}>
            Mot de passe (8 caractères minimum)
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Création..." : "Créer mon compte"}
        </button>
      </form>

      <p className="text-sm text-slate-500">
        Déjà un compte ?{" "}
        <Link href="/login" className="underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
