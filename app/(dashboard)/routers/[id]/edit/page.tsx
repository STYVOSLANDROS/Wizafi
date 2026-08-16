import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RouterForm } from "@/components/router-form";
import { updateRouterAction } from "../../actions";

export default async function EditRouterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const operatorId = Number(session!.user.id);

  const [router, sites] = await Promise.all([
    prisma.router.findFirst({ where: { id: Number(id), site: { operator_id: operatorId } } }),
    prisma.site.findMany({
      where: { operator_id: operatorId },
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    }),
  ]);
  if (!router) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Modifier le routeur</h1>
      <RouterForm
        action={updateRouterAction.bind(null, router.id)}
        sites={sites}
        initial={{
          site_id: router.site_id,
          name: router.name,
          connection_mode: router.connection_mode,
          ddns_or_ip: router.ddns_or_ip,
          wireguard_pubkey: router.wireguard_pubkey,
          api_username: router.api_username,
          hotspot_dns_name: router.hotspot_dns_name,
        }}
        submitLabel="Enregistrer"
        passwordOptional
      />
    </div>
  );
}
