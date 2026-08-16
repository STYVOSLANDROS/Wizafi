import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatXAF(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} XAF`;
}

export default async function DashboardHomePage() {
  const session = await auth();
  const operatorId = Number(session!.user.id);

  const operator = await prisma.operator.findUniqueOrThrow({
    where: { id: operatorId },
    select: { balance: true },
  });

  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);

  const operatorScope = { plan: { router: { site: { operator_id: operatorId } } } } as const;

  const [ticketsToday, revenueToday, revenueMonth, todaysSales] = await Promise.all([
    prisma.ticket.count({
      where: { created_at: { gte: todayStart }, router: { site: { operator_id: operatorId } } },
    }),
    prisma.transaction.aggregate({
      where: { ...operatorScope, status: "COMPLETED", confirmed_at: { gte: todayStart } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...operatorScope, status: "COMPLETED", confirmed_at: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { ...operatorScope, created_at: { gte: todayStart } },
      include: { plan: { include: { router: true } } },
      orderBy: { created_at: "desc" },
      take: 50,
    }),
  ]);

  // 7 derniers jours, pour le graphique — une agrégation par jour (volume
  // attendu faible en MVP, pas besoin de SQL brut pour ça).
  const last7Days = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const day = new Date(todayStart);
      day.setDate(day.getDate() - (6 - i));
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      return prisma.transaction
        .aggregate({
          where: { ...operatorScope, status: "COMPLETED", confirmed_at: { gte: day, lt: nextDay } },
          _sum: { amount: true },
        })
        .then((result) => ({
          label: day.toLocaleDateString("fr-FR", { weekday: "short" }),
          amount: result._sum.amount ?? 0,
        }));
    }),
  );
  const maxAmount = Math.max(1, ...last7Days.map((d) => d.amount));

  const cards = [
    { label: "Solde disponible", value: formatXAF(operator.balance) },
    { label: "Tickets vendus aujourd'hui", value: String(ticketsToday) },
    { label: "Recettes du jour", value: formatXAF(revenueToday._sum.amount ?? 0) },
    { label: "Recettes du mois", value: formatXAF(revenueMonth._sum.amount ?? 0) },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Accueil</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="mt-1 text-lg font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-700">Ventes des 7 derniers jours</h2>
        <div className="flex h-32 items-end gap-2 rounded border border-slate-200 bg-white p-4">
          {last7Days.map((day) => (
            <div key={day.label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-slate-900"
                style={{ height: `${Math.max(4, (day.amount / maxAmount) * 96)}px` }}
                title={formatXAF(day.amount)}
              />
              <span className="text-xs text-slate-500">{day.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-700">Ventes du jour</h2>
        {todaysSales.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune vente aujourd&apos;hui.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2">Heure</th>
                  <th className="px-3 py-2">Routeur</th>
                  <th className="px-3 py-2">Forfait</th>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Montant</th>
                  <th className="px-3 py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {todaysSales.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2">
                      {tx.created_at.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-3 py-2">{tx.plan.router.name}</td>
                    <td className="px-3 py-2">{tx.plan.name}</td>
                    <td className="px-3 py-2">{tx.customer_phone}</td>
                    <td className="px-3 py-2">{formatXAF(tx.amount)}</td>
                    <td className="px-3 py-2">{tx.status}</td>
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
