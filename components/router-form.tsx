"use client";

import { useActionState, useState } from "react";
import type { RouterFormState } from "@/app/(dashboard)/routers/actions";

const inputClass = "w-full rounded border border-slate-300 px-3 py-2 text-sm";
const labelClass = "text-sm font-medium";

type Site = { id: number; name: string };

type Initial = {
  site_id: number;
  name: string;
  connection_mode: "direct" | "wireguard";
  ddns_or_ip: string;
  wireguard_pubkey: string | null;
  api_username: string;
  hotspot_dns_name: string;
};

export function RouterForm({
  action,
  sites,
  initial,
  submitLabel,
  passwordOptional,
}: {
  action: (prevState: RouterFormState, formData: FormData) => Promise<RouterFormState>;
  sites: Site[];
  initial?: Initial;
  submitLabel: string;
  passwordOptional: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [connectionMode, setConnectionMode] = useState<"direct" | "wireguard">(
    initial?.connection_mode ?? "direct",
  );

  if (sites.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Crée d&apos;abord un site avant d&apos;ajouter un routeur.
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
        <label htmlFor="site_id" className={labelClass}>
          Site
        </label>
        <select
          id="site_id"
          name="site_id"
          required
          defaultValue={initial?.site_id}
          className={inputClass}
        >
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="name" className={labelClass}>
          Nom du routeur
        </label>
        <input id="name" name="name" required defaultValue={initial?.name} className={inputClass} />
      </div>

      <div className="space-y-1">
        <label htmlFor="connection_mode" className={labelClass}>
          Mode de connexion
        </label>
        <select
          id="connection_mode"
          name="connection_mode"
          value={connectionMode}
          onChange={(e) => setConnectionMode(e.target.value as "direct" | "wireguard")}
          className={inputClass}
        >
          <option value="direct">Direct (réseau local ou IP publique)</option>
          <option value="wireguard">WireGuard (pas encore implémenté, Phase 7)</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="ddns_or_ip" className={labelClass}>
          Adresse (LAN, IP publique ou DDNS)
        </label>
        <input
          id="ddns_or_ip"
          name="ddns_or_ip"
          required
          placeholder="192.168.88.1"
          defaultValue={initial?.ddns_or_ip}
          className={inputClass}
        />
        <p className="text-xs text-slate-500">
          En développement local, l&apos;adresse LAN du routeur (spec §3) — pas de CGNAT à gérer.
        </p>
      </div>

      {connectionMode === "wireguard" && (
        <div className="space-y-1">
          <label htmlFor="wireguard_pubkey" className={labelClass}>
            Clé publique WireGuard
          </label>
          <input
            id="wireguard_pubkey"
            name="wireguard_pubkey"
            defaultValue={initial?.wireguard_pubkey ?? ""}
            className={inputClass}
          />
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="api_username" className={labelClass}>
          Utilisateur API MikroTik
        </label>
        <input
          id="api_username"
          name="api_username"
          required
          placeholder="wizafi-api"
          defaultValue={initial?.api_username}
          className={inputClass}
        />
        <p className="text-xs text-slate-500">Jamais le compte admin (spec §3).</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="api_password" className={labelClass}>
          Mot de passe API {passwordOptional && "(laisser vide pour ne pas le changer)"}
        </label>
        <input
          id="api_password"
          name="api_password"
          type="password"
          required={!passwordOptional}
          className={inputClass}
        />
        <p className="text-xs text-slate-500">Chiffré en base (AES-256-GCM), jamais en clair.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="hotspot_dns_name" className={labelClass}>
          Nom DNS du portail hotspot
        </label>
        <input
          id="hotspot_dns_name"
          name="hotspot_dns_name"
          required
          defaultValue={initial?.hotspot_dns_name}
          className={inputClass}
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
