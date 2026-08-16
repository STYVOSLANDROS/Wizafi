import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteRouterAction } from "./actions";
import { DeleteButton } from "@/components/delete-button";
import { RouterTestButton } from "@/components/router-test-button";
import { PurchaseLink } from "@/components/purchase-link";

export default async function RoutersPage() {
  const session = await auth();
  const operatorId = Number(session!.user.id);

  const routers = await prisma.router.findMany({
    where: { site: { operator_id: operatorId } },
    include: { site: true },
    orderBy: { id: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Routeurs</h1>
        <div className="flex items-center gap-3">
          <Link href="/routers/walled-garden" className="text-sm text-slate-700 underline">
            Configuration Walled Garden
          </Link>
          <Link
            href="/routers/new"
            className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            Ajouter un routeur
          </Link>
        </div>
      </div>

      {routers.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun routeur pour l&apos;instant.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Site</th>
                <th className="px-3 py-2">DNS hotspot</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {routers.map((router) => (
                <tr key={router.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">{router.name}</td>
                  <td className="px-3 py-2">{router.site.name}</td>
                  <td className="px-3 py-2">{router.hotspot_dns_name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        router.status === "online" ? "text-green-700" : "text-slate-500"
                      }
                    >
                      {router.status === "online" ? "En ligne" : "Hors ligne"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-start gap-3">
                      <Link href={`/routers/${router.id}/edit`} className="text-slate-700 underline">
                        Modifier
                      </Link>
                      <form action={deleteRouterAction}>
                        <input type="hidden" name="routerId" value={router.id} />
                        <DeleteButton confirmLabel="Supprimer ce routeur ?" />
                      </form>
                      <RouterTestButton routerId={router.id} />
                      <PurchaseLink
                        url={`${(process.env.APP_DOMAIN ?? "http://localhost:3000").replace(/\/+$/, "")}/pay/${router.public_slug}`}
                      />
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
