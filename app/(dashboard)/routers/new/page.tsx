import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RouterForm } from "@/components/router-form";
import { createRouterAction } from "../actions";

export default async function NewRouterPage() {
  const session = await auth();
  const operatorId = Number(session!.user.id);
  const sites = await prisma.site.findMany({
    where: { operator_id: operatorId },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Ajouter un routeur</h1>
      <RouterForm action={createRouterAction} sites={sites} submitLabel="Créer le routeur" passwordOptional={false} />
    </div>
  );
}
