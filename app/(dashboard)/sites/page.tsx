import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteSiteAction } from "./actions";
import { DeleteButton } from "@/components/delete-button";

export default async function SitesPage() {
  const session = await auth();
  const operatorId = Number(session!.user.id);

  const sites = await prisma.site.findMany({
    where: { operator_id: operatorId },
    include: { _count: { select: { routers: true } } },
    orderBy: { id: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sites</h1>
        <Link
          href="/sites/new"
          className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          Ajouter un site
        </Link>
      </div>

      {sites.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucun site pour l&apos;instant. Un site regroupe les routeurs d&apos;un même lieu.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Adresse</th>
                <th className="px-3 py-2">Routeurs</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">{site.name}</td>
                  <td className="px-3 py-2">{site.address}</td>
                  <td className="px-3 py-2">{site._count.routers}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Link href={`/sites/${site.id}/edit`} className="text-slate-700 underline">
                        Modifier
                      </Link>
                      <form action={deleteSiteAction}>
                        <input type="hidden" name="siteId" value={site.id} />
                        <DeleteButton confirmLabel="Supprimer ce site ?" />
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
