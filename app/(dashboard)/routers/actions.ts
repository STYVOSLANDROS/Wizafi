"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto/encryption";
import { Prisma } from "@/app/generated/prisma/client";

async function requireOperatorId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return Number(session.user.id);
}

export type RouterFormState = { error?: string } | undefined;

function readRouterFields(formData: FormData) {
  return {
    site_id: Number(formData.get("site_id")),
    name: String(formData.get("name") ?? "").trim(),
    connection_mode: String(formData.get("connection_mode") ?? "direct") as "direct" | "wireguard",
    ddns_or_ip: String(formData.get("ddns_or_ip") ?? "").trim(),
    wireguard_pubkey: String(formData.get("wireguard_pubkey") ?? "").trim() || null,
    api_username: String(formData.get("api_username") ?? "").trim(),
    api_password: String(formData.get("api_password") ?? ""),
    hotspot_dns_name: String(formData.get("hotspot_dns_name") ?? "").trim(),
  };
}

async function assertSiteOwnership(siteId: number, operatorId: number) {
  const site = await prisma.site.findFirst({ where: { id: siteId, operator_id: operatorId } });
  if (!site) throw new Error("Site invalide.");
}

export async function createRouterAction(
  _prevState: RouterFormState,
  formData: FormData,
): Promise<RouterFormState> {
  const operatorId = await requireOperatorId();
  const fields = readRouterFields(formData);

  if (!fields.site_id || !fields.name || !fields.ddns_or_ip || !fields.api_username || !fields.hotspot_dns_name) {
    return { error: "Tous les champs (sauf clé WireGuard) sont obligatoires." };
  }
  if (!fields.api_password) {
    return { error: "Le mot de passe API est obligatoire à la création." };
  }

  try {
    await assertSiteOwnership(fields.site_id, operatorId);
  } catch {
    return { error: "Site invalide." };
  }

  await prisma.router.create({
    data: {
      site_id: fields.site_id,
      name: fields.name,
      connection_mode: fields.connection_mode,
      ddns_or_ip: fields.ddns_or_ip,
      wireguard_pubkey: fields.wireguard_pubkey,
      api_username: fields.api_username,
      api_password_encrypted: encrypt(fields.api_password),
      hotspot_dns_name: fields.hotspot_dns_name,
    },
  });

  revalidatePath("/routers");
  redirect("/routers");
}

export async function updateRouterAction(
  routerId: number,
  _prevState: RouterFormState,
  formData: FormData,
): Promise<RouterFormState> {
  const operatorId = await requireOperatorId();
  const fields = readRouterFields(formData);

  if (!fields.site_id || !fields.name || !fields.ddns_or_ip || !fields.api_username || !fields.hotspot_dns_name) {
    return { error: "Tous les champs (sauf clé WireGuard) sont obligatoires." };
  }

  try {
    await assertSiteOwnership(fields.site_id, operatorId);
  } catch {
    return { error: "Site invalide." };
  }

  const existing = await prisma.router.findFirst({
    where: { id: routerId, site: { operator_id: operatorId } },
  });
  if (!existing) return { error: "Routeur introuvable." };

  await prisma.router.update({
    where: { id: routerId },
    data: {
      site_id: fields.site_id,
      name: fields.name,
      connection_mode: fields.connection_mode,
      ddns_or_ip: fields.ddns_or_ip,
      wireguard_pubkey: fields.wireguard_pubkey,
      api_username: fields.api_username,
      hotspot_dns_name: fields.hotspot_dns_name,
      // Le mot de passe n'est ré-encrypté que si un nouveau a été saisi —
      // le formulaire d'édition ne pré-remplit jamais le mot de passe existant.
      ...(fields.api_password ? { api_password_encrypted: encrypt(fields.api_password) } : {}),
    },
  });

  revalidatePath("/routers");
  redirect("/routers");
}

export async function deleteRouterAction(formData: FormData): Promise<void> {
  const operatorId = await requireOperatorId();
  const routerId = Number(formData.get("routerId"));

  try {
    await prisma.router.deleteMany({ where: { id: routerId, site: { operator_id: operatorId } } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw new Error(
        "Impossible de supprimer ce routeur : supprime d'abord ses forfaits.",
      );
    }
    throw error;
  }

  revalidatePath("/routers");
}
