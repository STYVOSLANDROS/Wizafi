"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { enqueueTicketCreation, processTicketCreation } from "@/lib/queue/ticket-creation.job";

async function requireOwnedTransaction(transactionId: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  const operatorId = Number(session.user.id);

  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, plan: { router: { site: { operator_id: operatorId } } } },
  });
  if (!transaction) throw new Error("Transaction introuvable.");
  return transaction;
}

// "Réessayer" (spec §6) : relance la création de ticket via la file
// normale, pour une transaction dont la création a définitivement échoué.
export async function retryTicketCreationAction(formData: FormData): Promise<void> {
  const transactionId = Number(formData.get("transactionId"));
  const transaction = await requireOwnedTransaction(transactionId);

  if (transaction.status !== "TICKET_FAILED") {
    throw new Error("Seule une transaction en échec de création de ticket peut être réessayée.");
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { status: "PAYMENT_CONFIRMED" },
  });
  await enqueueTicketCreation(transaction.id);
  revalidatePath("/transactions");
}

// "Créer un ticket manuellement" (spec §6) : filet de secours si CamPay ou
// le MikroTik était indisponible — l'opérateur atteste que le client a bien
// payé et déclenche la création tout de suite, sans attendre la file.
export async function manualCreateTicketAction(formData: FormData): Promise<void> {
  const transactionId = Number(formData.get("transactionId"));
  const transaction = await requireOwnedTransaction(transactionId);

  if (transaction.status === "COMPLETED") {
    throw new Error("Cette transaction a déjà un ticket.");
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { status: "PAYMENT_CONFIRMED" },
  });
  await processTicketCreation(transaction.id);
  revalidatePath("/transactions");
}
