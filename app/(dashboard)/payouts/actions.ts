"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type PayoutFormState = { error?: string } | undefined;

const MINIMUM_PAYOUT = Number(process.env.PAYOUT_MINIMUM_AMOUNT ?? "1000");

// Demande créée par l'opérateur → PENDING → traitement manuel par
// l'administrateur de la plateforme (spec §1BIS) — hors de ce dashboard,
// qui est celui de l'opérateur, pas celui de WIZAFI.
export async function requestPayoutAction(
  _prevState: PayoutFormState,
  formData: FormData,
): Promise<PayoutFormState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  const operatorId = Number(session.user.id);

  const amount = Number(formData.get("amount"));
  if (!Number.isInteger(amount) || amount <= 0) {
    return { error: "Le montant doit être un entier positif, en XAF." };
  }
  if (amount < MINIMUM_PAYOUT) {
    return { error: `Le montant minimum de retrait est ${MINIMUM_PAYOUT.toLocaleString("fr-FR")} XAF.` };
  }

  const operator = await prisma.operator.findUniqueOrThrow({ where: { id: operatorId } });
  if (amount > operator.balance) {
    return { error: "Le montant dépasse ton solde disponible." };
  }

  // Le montant est réservé immédiatement (retiré du solde disponible) pour
  // qu'il ne puisse pas être redemandé par une deuxième requête pendant que
  // celle-ci est en attente. S'il est rejeté, il est recrédité (voir note
  // dans le module — le rejet est traité manuellement par l'administrateur,
  // hors de ce dashboard, donc pas de code de recrédit ici pour l'instant).
  await prisma.$transaction([
    prisma.payout.create({ data: { operator_id: operatorId, amount, status: "pending" } }),
    prisma.operator.update({ where: { id: operatorId }, data: { balance: { decrement: amount } } }),
  ]);

  revalidatePath("/payouts");
}
