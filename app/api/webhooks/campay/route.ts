import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTransactionStatus } from "@/lib/payments/campay";
import { enqueueTicketCreation } from "@/lib/queue/ticket-creation.job";
import { isRateLimited, clientKeyFromRequest } from "@/lib/rate-limit";

// Règle absolue (spec §2/§6) : jamais de ticket "réussi" tant qu'un
// paiement n'est pas confirmé — et le corps de CE webhook n'est jamais
// traité comme la vérité (voir la note en tête de lib/payments/campay.ts :
// le mécanisme exact de signature CamPay n'a pas pu être confirmé depuis ce
// sandbox). Le webhook ne sert donc que de déclencheur : on rappelle
// toujours getTransactionStatus() auprès de CamPay avant d'agir, avec nos
// propres identifiants — un webhook falsifié ne peut donc rien accomplir.
export async function POST(req: Request) {
  // Spec §8 : rate limiting obligatoire sur /webhook/* dès le MVP.
  if (isRateLimited(`webhook:${clientKeyFromRequest(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as
    | { external_reference?: string; reference?: string }
    | null;
  const reference = body?.external_reference ?? body?.reference;
  if (!reference) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const transaction = await prisma.transaction.findUnique({ where: { campay_reference: reference } });
  if (!transaction) {
    // Rien à faire de notre côté, mais 200 pour éviter que CamPay ne
    // retente indéfiniment un webhook qui ne nous concerne pas.
    return NextResponse.json({ ok: true });
  }

  // Idempotence stricte (spec §6) : un webhook dupliqué sur une transaction
  // déjà finalisée ne doit rien reprocesser.
  if (["COMPLETED", "TICKET_PENDING", "TICKET_FAILED"].includes(transaction.status)) {
    return NextResponse.json({ ok: true });
  }

  let authoritative;
  try {
    authoritative = await getTransactionStatus(reference);
  } catch {
    // CamPay momentanément injoignable pour la vérification : on renvoie 500
    // pour que CamPay retente le webhook plus tard, sans toucher à l'état.
    return NextResponse.json({ error: "Vérification impossible" }, { status: 500 });
  }

  if (authoritative.status === "SUCCESSFUL") {
    // Honoré même si la transaction est déjà PAYMENT_EXPIRED côté affichage
    // (spec §5) — le client a payé, il doit recevoir son ticket.
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "PAYMENT_CONFIRMED", confirmed_at: new Date() },
    });
    await enqueueTicketCreation(transaction.id);
  } else if (authoritative.status === "FAILED") {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "PAYMENT_FAILED" },
    });
  }
  // PENDING : rien à faire, on attend le prochain webhook.

  return NextResponse.json({ ok: true });
}
