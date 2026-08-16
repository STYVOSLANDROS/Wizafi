"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { initiatePayment, CampayApiError } from "@/lib/payments/campay";
import { isRateLimited } from "@/lib/rate-limit";

export type PayFormState = { error?: string } | undefined;

// Cameroun : 9 chiffres locaux (ex. 6XXXXXXXX) ou déjà préfixés 237.
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("237")) return digits;
  if (digits.length === 9) return `237${digits}`;
  return null;
}

export async function initiatePaymentAction(
  slug: string,
  _prevState: PayFormState,
  formData: FormData,
): Promise<PayFormState> {
  // Spec §8 : rate limiting obligatoire sur /pay/* dès le MVP.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`pay:${ip}`, 10, 60_000)) {
    return { error: "Trop de tentatives, réessaie dans une minute." };
  }

  const planId = Number(formData.get("planId"));
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) {
    return { error: "Numéro de téléphone invalide (format attendu : 6XXXXXXXX)." };
  }

  const plan = await prisma.plan.findFirst({
    where: { id: planId, active: true, router: { public_slug: slug } },
  });
  if (!plan) {
    return { error: "Forfait invalide." };
  }

  const expiryMinutes = Number(process.env.TRANSACTION_EXPIRY_MINUTES ?? "15");
  // Généré par nous, pas par CamPay : on le passe comme external_reference et
  // c'est lui qui sert de clé d'idempotence (voir lib/payments/campay.ts —
  // le nom du champ DB vient de la spec, mais la valeur est la nôtre pour ne
  // pas dépendre d'un aller-retour CamPay avant de pouvoir créer la ligne).
  const reference = randomUUID();

  const transaction = await prisma.transaction.create({
    data: {
      plan_id: plan.id,
      customer_phone: phone,
      amount: plan.price,
      campay_reference: reference,
      status: "CREATED",
      expires_at: new Date(Date.now() + expiryMinutes * 60_000),
    },
  });

  try {
    await initiatePayment({
      amount: plan.price,
      phone,
      description: `WIZAFI - ${plan.name}`,
      externalReference: reference,
    });
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "PAYMENT_PENDING" },
    });
  } catch (error) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "PAYMENT_FAILED" },
    });
    const message = error instanceof CampayApiError ? error.message : "Erreur inconnue.";
    return { error: `Le paiement n'a pas pu être initié : ${message}` };
  }

  // On utilise campay_reference (aléatoire) plutôt que l'id séquentiel de la
  // transaction dans l'URL publique de suivi — même principe que le
  // public_slug des routeurs (spec §8 : jamais d'ID séquentiel exposé).
  redirect(`/pay/${slug}/status/${reference}`);
}
