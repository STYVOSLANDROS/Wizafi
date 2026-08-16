import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PlanForm } from "@/components/plan-form";
import { createPlanAction } from "../actions";

export default async function NewPlanPage() {
  const session = await auth();
  const operatorId = Number(session!.user.id);
  const routers = await prisma.router.findMany({
    where: { site: { operator_id: operatorId } },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Ajouter un forfait</h1>
      <PlanForm action={createPlanAction} routers={routers} submitLabel="Créer le forfait" />
    </div>
  );
}
