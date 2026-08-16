import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const session = await auth();
  const operatorId = Number(session!.user.id);
  const operator = await prisma.operator.findUniqueOrThrow({ where: { id: operatorId } });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Paramètres</h1>
      <p className="text-sm text-slate-500">
        Email : {operator.email} · Commission WIZAFI : {Math.round(operator.commission_rate * 100)}%
      </p>
      <SettingsForm
        initial={{
          name: operator.name,
          phone: operator.phone,
          country: operator.country,
          sms_enabled: operator.sms_enabled,
        }}
      />
    </div>
  );
}
