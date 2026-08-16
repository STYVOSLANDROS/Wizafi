"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

async function requireOperatorId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return Number(session.user.id);
}

export type SiteFormState = { error?: string } | undefined;

export async function createSiteAction(
  _prevState: SiteFormState,
  formData: FormData,
): Promise<SiteFormState> {
  const operatorId = await requireOperatorId();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!name || !address) {
    return { error: "Le nom et l'adresse sont obligatoires." };
  }

  await prisma.site.create({ data: { operator_id: operatorId, name, address } });
  revalidatePath("/sites");
  redirect("/sites");
}

export async function updateSiteAction(
  siteId: number,
  _prevState: SiteFormState,
  formData: FormData,
): Promise<SiteFormState> {
  const operatorId = await requireOperatorId();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!name || !address) {
    return { error: "Le nom et l'adresse sont obligatoires." };
  }

  // updateMany plutôt que update : si le site n'appartient pas à cet
  // opérateur, la requête ne modifie rien au lieu de modifier le site d'un
  // autre opérateur (isolation stricte, spec §5).
  const result = await prisma.site.updateMany({
    where: { id: siteId, operator_id: operatorId },
    data: { name, address },
  });
  if (result.count === 0) {
    return { error: "Site introuvable." };
  }

  revalidatePath("/sites");
  redirect("/sites");
}

export async function deleteSiteAction(formData: FormData): Promise<void> {
  const operatorId = await requireOperatorId();
  const siteId = Number(formData.get("siteId"));

  try {
    await prisma.site.deleteMany({ where: { id: siteId, operator_id: operatorId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      // Contrainte de clé étrangère : des routeurs référencent encore ce site.
      throw new Error(
        "Impossible de supprimer ce site : supprime d'abord ses routeurs.",
      );
    }
    throw error;
  }

  revalidatePath("/sites");
}
