function domainFromAppDomain(appDomain: string): string {
  return appDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export default function WalledGardenPage() {
  const appDomain = process.env.APP_DOMAIN ?? "http://localhost:3000";
  const domain = domainFromAppDomain(appDomain);

  const script = `/ip hotspot walled-garden
add dst-host=${domain} action=allow comment="WIZAFI - plateforme"
add dst-host=*.${domain} action=allow comment="WIZAFI - sous-domaines eventuels"`;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Walled Garden</h1>
      <p className="max-w-2xl text-sm text-slate-600">
        Avant authentification, le client doit pouvoir atteindre uniquement le strict nécessaire
        pour payer et recevoir son ticket (spec §7). Colle ce script dans WinBox (New Terminal)
        sur chacun de tes routeurs.
      </p>

      <div className="max-w-2xl space-y-2">
        <p className="text-sm font-medium">Domaine à whitelister</p>
        <p className="rounded border border-slate-200 bg-white px-3 py-2 font-mono text-sm">
          {domain}
        </p>
      </div>

      <div className="max-w-2xl space-y-2">
        <p className="text-sm font-medium">Script WinBox</p>
        <pre className="overflow-x-auto rounded border border-slate-200 bg-slate-900 p-4 text-xs text-slate-100">
          {script}
        </pre>
      </div>

      <p className="max-w-2xl text-xs text-slate-500">
        Le paiement CamPay (flux actuel : notification USSD directe) ne redirige pas le
        navigateur du client vers un domaine CamPay — voir docs/walled-garden-setup.md pour le
        détail et la mise à jour si ce flux change un jour.
      </p>
    </div>
  );
}
