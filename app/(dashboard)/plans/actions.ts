"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listHotspotProfiles, mikrotikConfigFromRouter, MikrotikApiError } from "@/lib/mikrotik/client";

async function requireOperatorId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return Number(session.user.id);
}

export type PlanFormState = { error?: string } | undefined;

function readPlanFields(formData: FormData) {
  const priceRaw = String(formData.get("price") ?? "");
  return {
    router_id: Number(formData.get("router_id")),
    name: String(formData.get("name") ?? "").trim(),
    duration_label: String(formData.get("duration_label") ?? "").trim(),
    price: Number(priceRaw),
    mikrotik_profile_name: String(formData.get("mikrotik_profile_name") ?? "").trim(),
    active: formData.get("active") === "on",
  };
}

// Spec §5 : mikrotik_profile_name doit correspondre à un User Profile réel,
// vérifié par API au moment de la création du Plan.
async function assertProfileExists(routerId: number, operatorId: number, profileName: string) {
  const router = await prisma.router.findFirst({
    where: { id: routerId, site: { operator_id: operatorId } },
  });
  if (!router) throw new Error("Routeur invalide.");

  try {
    const profiles = await listHotspotProfiles(mikrotikConfigFromRouter(router));
    if (!profiles.some((p) => p.name === profileName)) {
      throw new Error(
        `Le profil "${profileName}" n'existe pas sur ce routeur. Profils disponibles : ` +
          (profiles.map((p) => p.name).join(", ") || "aucun"),
      );
    }
  } catch (error) {
    if (error instanceof MikrotikApiError) {
      throw new Error(`Impossible de vérifier le profil : ${error.message}`);
    }
    throw error;
  }
}

export async function createPlanAction(
  _prevState: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const operatorId = await requireOperatorId();
  const fields = readPlanFields(formData);

  if (!fields.router_id || !fields.name || !fields.duration_label || !fields.mikrotik_profile_name) {
    return { error: "Tous les champs sont obligatoires." };
  }
  if (!Number.isInteger(fields.price) || fields.price <= 0) {
    return { error: "Le prix doit être un entier positif, en XAF (jamais de décimales)." };
  }

  try {
    await assertProfileExists(fields.router_id, operatorId, fields.mikrotik_profile_name);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur de vérification du profil." };
  }

  await prisma.plan.create({
    data: {
      router_id: fields.router_id,
      name: fields.name,
      duration_label: fields.duration_label,
      price: fields.price,
      mikrotik_profile_name: fields.mikrotik_profile_name,
      active: fields.active,
    },
  });

  revalidatePath("/plans");
  redirect("/plans");
}

export async function updatePlanAction(
  planId: number,
  _prevState: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const operatorId = await requireOperatorId();
  const fields = readPlanFields(formData);

  if (!fields.router_id || !fields.name || !fields.duration_label || !fields.mikrotik_profile_name) {
    return { error: "Tous les champs sont obligatoires." };
  }
  if (!Number.isInteger(fields.price) || fields.price <= 0) {
    return { error: "Le prix doit être un entier positif, en XAF (jamais de décimales)." };
  }

  const existing = await prisma.plan.findFirst({
    where: { id: planId, router: { site: { operator_id: operatorId } } },
  });
  if (!existing) return { error: "Forfait introuvable." };

  try {
    await assertProfileExists(fields.router_id, operatorId, fields.mikrotik_profile_name);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur de vérification du profil." };
  }

  await prisma.plan.update({
    where: { id: planId },
    data: {
      router_id: fields.router_id,
      name: fields.name,
      duration_label: fields.duration_label,
      price: fields.price,
      mikrotik_profile_name: fields.mikrotik_profile_name,
      active: fields.active,
    },
  });

  revalidatePath("/plans");
  redirect("/plans");
}

export async function deletePlanAction(formData: FormData): Promise<void> {
  const operatorId = await requireOperatorId();
  const planId = Number(formData.get("planId"));

  await prisma.plan.deleteMany({ where: { id: planId, router: { site: { operator_id: operatorId } } } });
  revalidatePath("/plans");
}
