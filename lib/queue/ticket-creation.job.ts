import type { Job } from "pg-boss";
import { prisma } from "@/lib/prisma";
import { mikrotikConfigFromRouter, createHotspotUser, MikrotikApiError } from "@/lib/mikrotik/client";
import { generateTicketCredentials } from "@/lib/mikrotik/ticket-generator";
import { getBoss, QUEUE_TICKET_CREATION } from "./setup";

export type TicketCreationJobData = { transactionId: number };

export async function enqueueTicketCreation(transactionId: number): Promise<void> {
  const boss = await getBoss();
  await boss.send(QUEUE_TICKET_CREATION, { transactionId } satisfies TicketCreationJobData, {
    // Backoff approximatif de la spec §6 (5s/15s/1min/5min) — pg-boss ne
    // permet pas une suite de délais arbitraire nativement, retryBackoff
    // fait doubler retryDelay à chaque tentative (5s, 10s, 20s, 40s).
    retryLimit: 4,
    retryDelay: 5,
    retryBackoff: true,
  });
}

export function registerTicketCreationWorker(): Promise<string> {
  return getBoss().then((boss) =>
    boss.work<TicketCreationJobData>(QUEUE_TICKET_CREATION, async (jobs: Job<TicketCreationJobData>[]) => {
      await processTicketCreation(jobs[0].data.transactionId);
    }),
  );
}

// Exporté : réutilisé par le bouton "Créer un ticket manuellement" du
// dashboard (spec §6, filet de secours opérateur), en plus du worker pg-boss.
export async function processTicketCreation(transactionId: number): Promise<void> {
  const transaction = await prisma.transaction.findUniqueOrThrow({
    where: { id: transactionId },
    include: { plan: { include: { router: { include: { site: true } } } }, ticket: true },
  });

  // Idempotence : un webhook dupliqué ou un job relancé après COMPLETED ne
  // doit rien refaire (spec §6).
  if (transaction.status === "COMPLETED") return;

  if (transaction.status !== "PAYMENT_CONFIRMED" && transaction.status !== "TICKET_PENDING") {
    return;
  }

  if (transaction.status === "PAYMENT_CONFIRMED") {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "TICKET_PENDING" },
    });
  }

  // Le ticket est créé (credentials générés) une seule fois — les tentatives
  // suivantes réutilisent le même username/password plutôt que d'en générer
  // de nouveaux à chaque retry.
  const ticket =
    transaction.ticket ??
    (await prisma.ticket.create({
      data: {
        transaction_id: transaction.id,
        router_id: transaction.plan.router_id,
        plan_id: transaction.plan_id,
        ...generateTicketCredentials("simple"),
        mikrotik_creation_status: "pending",
      },
    }));

  try {
    await createHotspotUser(
      { username: ticket.username, password: ticket.password, profile: transaction.plan.mikrotik_profile_name },
      mikrotikConfigFromRouter(transaction.plan.router),
    );
  } catch (error) {
    const attempts = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { mikrotik_creation_attempts: { increment: 1 } },
      select: { mikrotik_creation_attempts: true },
    });

    // Distinction erreur temporaire / définitive (spec §6) : une erreur
    // d'authentification (401) n'a aucune chance de réussir à la prochaine
    // tentative — inutile de retenter aveuglément.
    const isAuthError = error instanceof MikrotikApiError && error.status === 401;
    if (isAuthError || attempts.mikrotik_creation_attempts >= 4) {
      await prisma.$transaction([
        prisma.ticket.update({ where: { id: ticket.id }, data: { mikrotik_creation_status: "failed" } }),
        prisma.transaction.update({ where: { id: transaction.id }, data: { status: "TICKET_FAILED" } }),
      ]);
      return; // erreur définitive : ne pas relancer pg-boss dessus.
    }

    throw error; // erreur temporaire : pg-boss retentera avec son backoff.
  }

  // Crédit du solde opérateur UNIQUEMENT ici, dans la même transaction DB que
  // le passage à COMPLETED (spec §6) — jamais avant, jamais séparément.
  const operator = await prisma.operator.findUniqueOrThrow({
    where: { id: transaction.plan.router.site.operator_id },
  });
  const commissionAmount = Math.floor(operator.commission_rate * transaction.amount);
  const credited = transaction.amount - commissionAmount;

  await prisma.$transaction([
    // Ticket.status reste CREATED : ACTIVATED suppose une preuve d'usage
    // réel côté MikroTik (connexion effective du client), qu'on ne détecte
    // pas encore à ce stade du projet — seul mikrotik_creation_status
    // documente que la création a réussi.
    prisma.ticket.update({
      where: { id: ticket.id },
      data: { mikrotik_creation_status: "success" },
    }),
    prisma.transaction.update({ where: { id: transaction.id }, data: { status: "COMPLETED" } }),
    prisma.operator.update({
      where: { id: operator.id },
      data: { balance: { increment: credited } },
    }),
  ]);
}
