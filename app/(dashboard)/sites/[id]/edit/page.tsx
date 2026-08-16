import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SiteForm } from "@/components/site-form";
import { updateSiteAction } from "../../actions";

export default async function EditSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const operatorId = Number(session!.user.id);

  const site = await prisma.site.findFirst({
    where: { id: Number(id), operator_id: operatorId },
  });
  if (!site) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Modifier le site</h1>
      <SiteForm
        action={updateSiteAction.bind(null, site.id)}
        initial={{ name: site.name, address: site.address }}
        submitLabel="Enregistrer"
      />
    </div>
  );
}
