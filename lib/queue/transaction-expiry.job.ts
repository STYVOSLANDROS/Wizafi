import { prisma } from "@/lib/prisma";
import { getBoss, QUEUE_TRANSACTION_EXPIRY } from "./setup";

const CRON_EVERY_MINUTE = "* * * * *";

export async function scheduleTransactionExpiry(): Promise<void> {
  const boss = await getBoss();
  await boss.schedule(QUEUE_TRANSACTION_EXPIRY, CRON_EVERY_MINUTE);
}

export function registerTransactionExpiryWorker(): Promise<string> {
  return getBoss().then((boss) =>
    boss.work(QUEUE_TRANSACTION_EXPIRY, async () => {
      // Nettoyage d'affichage, pas un refus de vente (spec §5) : un webhook
      // arrivant après coup sur une transaction expirée est quand même
      // honoré par le webhook (voir app/api/webhooks/campay/route.ts), qui
      // la fait repartir en PAYMENT_CONFIRMED.
      await prisma.transaction.updateMany({
        where: { status: { in: ["CREATED", "PAYMENT_PENDING"] }, expires_at: { lt: new Date() } },
        data: { status: "PAYMENT_EXPIRED" },
      });
    }),
  );
}
