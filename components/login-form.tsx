"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, signInWithGoogleAction } from "@/app/(auth)/login/actions";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Connexion — WIZAFI</h1>
        <p className="text-sm text-slate-500">Accès réservé au gérant de la Wifi Zone.</p>
      </div>

      <form action={formAction} className="space-y-4">
        {state?.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      {googleEnabled && (
        <form action={signInWithGoogleAction}>
          <button
            type="submit"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-medium"
          >
            Continuer avec Google
          </button>
        </form>
      )}

      <p className="text-sm text-slate-500">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
