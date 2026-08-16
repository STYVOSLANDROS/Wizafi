"use client";

import { useEffect, useState } from "react";

type Ticket = { username: string; password: string };

const LABELS: Record<string, string> = {
  CREATED: "Préparation du paiement...",
  PAYMENT_PENDING: "En attente de confirmation sur ton téléphone...",
  PAYMENT_CONFIRMED: "Paiement confirmé, création de ton ticket...",
  TICKET_PENDING: "Paiement confirmé, création de ton ticket...",
  COMPLETED: "Ton ticket est prêt !",
  PAYMENT_FAILED: "Le paiement a échoué.",
  PAYMENT_EXPIRED: "Le délai de paiement est dépassé.",
  TICKET_FAILED: "Le paiement a été reçu, mais la création du ticket a échoué. Contacte l'opérateur.",
};

const TERMINAL = new Set(["COMPLETED", "PAYMENT_FAILED", "PAYMENT_EXPIRED", "TICKET_FAILED"]);

export function StatusPoller({
  reference,
  initialStatus,
  initialTicket,
}: {
  reference: string;
  initialStatus: string;
  initialTicket: Ticket | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [ticket, setTicket] = useState<Ticket | null>(initialTicket);

  useEffect(() => {
    if (TERMINAL.has(status)) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/transactions/${reference}/status`);
        const data = await res.json();
        if (data.status) setStatus(data.status);
        if (data.ticket) setTicket(data.ticket);
      } catch {
        // Prochain intervalle réessaiera — pas besoin d'afficher une erreur
        // pour un simple raté de polling réseau.
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status, reference]);

  return (
    <div className="space-y-4 text-center">
      {!TERMINAL.has(status) && (
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      )}
      <p className="text-sm">{LABELS[status] ?? status}</p>

      {ticket && (
        <div className="rounded border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-slate-500">Identifiants Wifi</p>
          <p className="text-lg font-mono font-semibold">{ticket.username}</p>
          {ticket.password !== ticket.username && (
            <p className="text-sm font-mono">Mot de passe : {ticket.password}</p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Retourne sur le portail Wifi et saisis ce code pour te connecter.
          </p>
        </div>
      )}
    </div>
  );
}
