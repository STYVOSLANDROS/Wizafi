"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type SettingsFormState = { error?: string; success?: boolean } | undefined;

export async function updateSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  const operatorId = Number(session.user.id);

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const sms_enabled = formData.get("sms_enabled") === "on";

  if (!name || !phone || !country) {
    return { error: "Tous les champs sont obligatoires." };
  }

  await prisma.operator.update({
    where: { id: operatorId },
    data: { name, phone, country, sms_enabled },
  });

  revalidatePath("/settings");
  return { success: true };
}
