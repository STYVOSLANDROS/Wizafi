import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PlanForm } from "@/components/plan-form";
import { updatePlanAction } from "../../actions";

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const operatorId = Number(session!.user.id);

  const [plan, routers] = await Promise.all([
    prisma.plan.findFirst({ where: { id: Number(id), router: { site: { operator_id: operatorId } } } }),
    prisma.router.findMany({
      where: { site: { operator_id: operatorId } },
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    }),
  ]);
  if (!plan) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Modifier le forfait</h1>
      <PlanForm
        action={updatePlanAction.bind(null, plan.id)}
        routers={routers}
        initial={{
          router_id: plan.router_id,
          name: plan.name,
          duration_label: plan.duration_label,
          price: plan.price,
          mikrotik_profile_name: plan.mikrotik_profile_name,
          active: plan.active,
        }}
        submitLabel="Enregistrer"
      />
    </div>
  );
}
