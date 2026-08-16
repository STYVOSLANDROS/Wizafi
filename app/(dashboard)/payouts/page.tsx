import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PayoutForm } from "@/components/payout-form";

function formatXAF(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} XAF`;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  rejected: "Rejeté",
};

export default async function PayoutsPage() {
  const session = await auth();
  const operatorId = Number(session!.user.id);

  const [operator, payouts] = await Promise.all([
    prisma.operator.findUniqueOrThrow({ where: { id: operatorId }, select: { balance: true } }),
    prisma.payout.findMany({ where: { operator_id: operatorId }, orderBy: { requested_at: "desc" } }),
  ]);

  const totals = payouts.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + p.amount;
      return acc;
    },
    { pending: 0, paid: 0, rejected: 0 } as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Retraits</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Solde disponible", operator.balance],
          ["En attente", totals.pending],
          ["Payé (total)", totals.paid],
          ["Rejeté (total)", totals.rejected],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-semibold">{formatXAF(value as number)}</p>
          </div>
        ))}
      </div>

      <div className="max-w-sm rounded border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium">Demander un retrait</h2>
        <PayoutForm balance={operator.balance} />
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">Demandé le</th>
              <th className="px-3 py-2">Montant</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Traité le</th>
              <th className="px-3 py-2">Motif de rejet</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">{p.requested_at.toLocaleString("fr-FR")}</td>
                <td className="px-3 py-2">{formatXAF(p.amount)}</td>
                <td className="px-3 py-2">{STATUS_LABELS[p.status]}</td>
                <td className="px-3 py-2">{p.processed_at?.toLocaleString("fr-FR") ?? "—"}</td>
                <td className="px-3 py-2">{p.rejection_reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {payouts.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Aucune demande de retrait pour l&apos;instant.</p>
        )}
      </div>
    </div>
  );
}
