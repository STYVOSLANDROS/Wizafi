"use client";

import { useActionState, useEffect, useState } from "react";
import type { PlanFormState } from "@/app/(dashboard)/plans/actions";

const inputClass = "w-full rounded border border-slate-300 px-3 py-2 text-sm";
const labelClass = "text-sm font-medium";

type RouterOption = { id: number; name: string };

type Initial = {
  router_id: number;
  name: string;
  duration_label: string;
  price: number;
  mikrotik_profile_name: string;
  active: boolean;
};

export function PlanForm({
  action,
  routers,
  initial,
  submitLabel,
}: {
  action: (prevState: PlanFormState, formData: FormData) => Promise<PlanFormState>;
  routers: RouterOption[];
  initial?: Initial;
  submitLabel: string;
}) {
  const initialRouterId = initial?.router_id ?? routers[0]?.id ?? "";
  const [state, formAction, pending] = useActionState(action, undefined);
  const [routerId, setRouterId] = useState<number | "">(initialRouterId);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  // Vrai dès le montage s'il y a déjà un routeur sélectionné (fetch initial à
  // venir) — évite d'appeler setState de façon synchrone dans l'effet, ce que
  // l'onChange gère pour les changements ultérieurs.
  const [profilesLoading, setProfilesLoading] = useState(Boolean(initialRouterId));

  useEffect(() => {
    if (!routerId) return;
    const controller = new AbortController();
    fetch(`/api/routers/${routerId}/profiles`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setProfiles(data.profiles);
          setProfilesError(null);
        } else {
          setProfiles([]);
          setProfilesError(data.error ?? "Impossible de charger les profils.");
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setProfiles([]);
        setProfilesError("Impossible de joindre l'API.");
      })
      .finally(() => setProfilesLoading(false));
    return () => controller.abort();
  }, [routerId]);

  function handleRouterChange(newRouterId: number) {
    setRouterId(newRouterId);
    setProfilesLoading(true);
    setProfilesError(null);
  }

  if (routers.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Crée d&apos;abord un routeur avant d&apos;ajouter un forfait.
      </p>
    );
  }

  return (
    <form action={formAction} className="max-w-md space-y-4">
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="router_id" className={labelClass}>
          Routeur
        </label>
        <select
          id="router_id"
          name="router_id"
          required
          value={routerId}
          onChange={(e) => handleRouterChange(Number(e.target.value))}
          className={inputClass}
        >
          {routers.map((router) => (
            <option key={router.id} value={router.id}>
              {router.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="name" className={labelClass}>
          Nom du forfait
        </label>
        <input id="name" name="name" required defaultValue={initial?.name} className={inputClass} />
      </div>

      <div className="space-y-1">
        <label htmlFor="duration_label" className={labelClass}>
          Durée (affichée au client, ex. &laquo;&nbsp;1 heure&nbsp;&raquo;)
        </label>
        <input
          id="duration_label"
          name="duration_label"
          required
          defaultValue={initial?.duration_label}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="price" className={labelClass}>
          Prix (XAF, entier)
        </label>
        <input
          id="price"
          name="price"
          type="number"
          step={1}
          min={1}
          required
          defaultValue={initial?.price}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="mikrotik_profile_name" className={labelClass}>
          Profil MikroTik correspondant
        </label>
        {profilesLoading && <p className="text-xs text-slate-500">Chargement des profils...</p>}
        {profilesError && (
          <p className="text-xs text-red-600">
            {profilesError} — saisis le nom du profil manuellement, il sera vérifié à
            l&apos;enregistrement.
          </p>
        )}
        {profiles.length > 0 ? (
          <select
            id="mikrotik_profile_name"
            name="mikrotik_profile_name"
            required
            defaultValue={initial?.mikrotik_profile_name}
            className={inputClass}
          >
            <option value="">-- choisir --</option>
            {profiles.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="mikrotik_profile_name"
            name="mikrotik_profile_name"
            required
            defaultValue={initial?.mikrotik_profile_name}
            className={inputClass}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          name="active"
          type="checkbox"
          defaultChecked={initial?.active ?? true}
          className="h-4 w-4"
        />
        <label htmlFor="active" className="text-sm">
          Actif (visible sur la page d&apos;achat)
        </label>
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
