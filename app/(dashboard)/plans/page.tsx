import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deletePlanAction } from "./actions";
import { DeleteButton } from "@/components/delete-button";

function formatXAF(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} XAF`;
}

export default async function PlansPage() {
  const session = await auth();
  const operatorId = Number(session!.user.id);

  const plans = await prisma.plan.findMany({
    where: { router: { site: { operator_id: operatorId } } },
    include: { router: true },
    orderBy: { id: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tarifs</h1>
        <Link
          href="/plans/new"
          className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          Ajouter un forfait
        </Link>
      </div>

      {plans.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun forfait pour l&apos;instant.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">Forfait</th>
                <th className="px-3 py-2">Routeur</th>
                <th className="px-3 py-2">Durée</th>
                <th className="px-3 py-2">Prix</th>
                <th className="px-3 py-2">Profil MikroTik</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">{plan.name}</td>
                  <td className="px-3 py-2">{plan.router.name}</td>
                  <td className="px-3 py-2">{plan.duration_label}</td>
                  <td className="px-3 py-2">{formatXAF(plan.price)}</td>
                  <td className="px-3 py-2">{plan.mikrotik_profile_name}</td>
                  <td className="px-3 py-2">{plan.active ? "Actif" : "Inactif"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Link href={`/plans/${plan.id}/edit`} className="text-slate-700 underline">
                        Modifier
                      </Link>
                      <form action={deletePlanAction}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <DeleteButton confirmLabel="Supprimer ce forfait ?" />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
