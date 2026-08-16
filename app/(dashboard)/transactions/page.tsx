import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { retryTicketCreationAction, manualCreateTicketAction } from "./actions";

function formatXAF(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} XAF`;
}

const STATUS_LABELS: Record<string, string> = {
  CREATED: "Créée",
  PAYMENT_PENDING: "Paiement en attente",
  PAYMENT_CONFIRMED: "Paiement confirmé",
  TICKET_PENDING: "Création du ticket...",
  COMPLETED: "Terminée",
  PAYMENT_FAILED: "Paiement échoué",
  PAYMENT_EXPIRED: "Paiement expiré",
  TICKET_FAILED: "Échec de création du ticket",
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ router_id?: string; status?: string; from?: string; to?: string; q?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const operatorId = Number(session!.user.id);

  const routers = await prisma.router.findMany({
    where: { site: { operator_id: operatorId } },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });

  const where: Prisma.TransactionWhereInput = {
    plan: {
      router: {
        site: { operator_id: operatorId },
        ...(params.router_id ? { id: Number(params.router_id) } : {}),
      },
    },
    ...(params.status ? { status: params.status as Prisma.EnumTransactionStatusFilter["equals"] } : {}),
    ...(params.from || params.to
      ? {
          created_at: {
            ...(params.from ? { gte: new Date(params.from) } : {}),
            ...(params.to ? { lte: new Date(`${params.to}T23:59:59`) } : {}),
          },
        }
      : {}),
    ...(params.q
      ? {
          OR: [
            { customer_phone: { contains: params.q } },
            { campay_reference: { contains: params.q } },
          ],
        }
      : {}),
  };

  const transactions = await prisma.transaction.findMany({
    where,
    include: { plan: { include: { router: true } } },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Ventes</h1>

      <form className="grid grid-cols-2 gap-3 rounded border border-slate-200 bg-white p-4 sm:grid-cols-5">
        <select name="router_id" defaultValue={params.router_id ?? ""} className="rounded border border-slate-300 px-2 py-1 text-sm">
          <option value="">Tous les routeurs</option>
          {routers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={params.status ?? ""} className="rounded border border-slate-300 px-2 py-1 text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={params.from ?? ""} className="rounded border border-slate-300 px-2 py-1 text-sm" />
        <input type="date" name="to" defaultValue={params.to ?? ""} className="rounded border border-slate-300 px-2 py-1 text-sm" />
        <input
          type="text"
          name="q"
          placeholder="Téléphone ou référence"
          defaultValue={params.q ?? ""}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button type="submit" className="col-span-2 rounded bg-slate-900 px-3 py-1 text-sm text-white sm:col-span-1">
          Filtrer
        </button>
      </form>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Routeur</th>
              <th className="px-3 py-2">Forfait</th>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Montant</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">{tx.created_at.toLocaleString("fr-FR")}</td>
                <td className="px-3 py-2">{tx.plan.router.name}</td>
                <td className="px-3 py-2">{tx.plan.name}</td>
                <td className="px-3 py-2">{tx.customer_phone}</td>
                <td className="px-3 py-2">{formatXAF(tx.amount)}</td>
                <td className="px-3 py-2">{STATUS_LABELS[tx.status] ?? tx.status}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col items-start gap-1">
                    {tx.status === "TICKET_FAILED" && (
                      <form action={retryTicketCreationAction}>
                        <input type="hidden" name="transactionId" value={tx.id} />
                        <button type="submit" className="text-slate-700 underline">
                          Réessayer
                        </button>
                      </form>
                    )}
                    {tx.status !== "COMPLETED" && (
                      <form action={manualCreateTicketAction}>
                        <input type="hidden" name="transactionId" value={tx.id} />
                        <button type="submit" className="text-slate-700 underline">
                          Créer un ticket manuellement
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Aucune vente ne correspond à ces filtres.</p>
        )}
      </div>
    </div>
  );
}
