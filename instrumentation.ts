// Démarre le worker pg-boss dans le même processus que Next.js au boot du
// serveur (spec §4) — pas un service à part. `register()` est l'API
// officielle Next.js pour du code qui doit tourner une fois au démarrage
// (node_modules/next/dist/docs/.../instrumentation.md).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { registerTicketCreationWorker } = await import("@/lib/queue/ticket-creation.job");
  const { registerRouterHealthcheckWorker, scheduleRouterHealthcheck } = await import(
    "@/lib/queue/router-healthcheck.job"
  );
  const { registerTransactionExpiryWorker, scheduleTransactionExpiry } = await import(
    "@/lib/queue/transaction-expiry.job"
  );

  await registerTicketCreationWorker();
  await registerRouterHealthcheckWorker();
  await registerTransactionExpiryWorker();
  await scheduleRouterHealthcheck();
  await scheduleTransactionExpiry();
}
