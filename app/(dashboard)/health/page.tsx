import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RouterTestButton } from "@/components/router-test-button";
import { retryTicketCreationAction } from "../transactions/actions";

export default async function HealthPage() {
  const session = await auth();
  const operatorId = Number(session!.user.id);

  const [routers, failedTickets] = await Promise.all([
    prisma.router.findMany({
      where: { site: { operator_id: operatorId } },
      orderBy: { id: "asc" },
    }),
    prisma.ticket.findMany({
      where: {
        mikrotik_creation_status: "failed",
        router: { site: { operator_id: operatorId } },
      },
      include: { transaction: true, router: true },
      orderBy: { created_at: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Santé du système</h1>

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-700">Routeurs</h2>
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">Routeur</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Dernière vérification</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {routers.map((router) => (
                <tr key={router.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">{router.name}</td>
                  <td className="px-3 py-2">
                    <span className={router.status === "online" ? "text-green-700" : "text-slate-500"}>
                      {router.status === "online" ? "En ligne" : "Hors ligne"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {router.last_checked_at
                      ? router.last_checked_at.toLocaleString("fr-FR")
                      : "Jamais vérifié"}
                  </td>
                  <td className="px-3 py-2">
                    <RouterTestButton routerId={router.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {routers.length === 0 && <p className="p-4 text-sm text-slate-500">Aucun routeur.</p>}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Vérification automatique toutes les 5 minutes (requête API authentifiée, pas un simple
          ping — spec §8) en plus des tests manuels ci-dessus.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-700">Échecs de création de ticket</h2>
        {failedTickets.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun échec.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Routeur</th>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Tentatives</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {failedTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2">{ticket.created_at.toLocaleString("fr-FR")}</td>
                    <td className="px-3 py-2">{ticket.router.name}</td>
                    <td className="px-3 py-2">{ticket.transaction.customer_phone}</td>
                    <td className="px-3 py-2">{ticket.mikrotik_creation_attempts}</td>
                    <td className="px-3 py-2">
                      <form action={retryTicketCreationAction}>
                        <input type="hidden" name="transactionId" value={ticket.transaction_id} />
                        <button type="submit" className="text-slate-700 underline">
                          Réessayer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
