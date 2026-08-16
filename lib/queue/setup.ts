import { PgBoss } from "pg-boss";

// pg-boss stocke ses files DANS PostgreSQL — pas de Redis, pas de troisième
// service à héberger (spec §4). Le worker tourne dans le même processus que
// Next.js (voir instrumentation.ts), démarré une seule fois au boot.

export const QUEUE_TICKET_CREATION = "ticket-creation";
export const QUEUE_ROUTER_HEALTHCHECK = "router-healthcheck";
export const QUEUE_TRANSACTION_EXPIRY = "transaction-expiry";

// Singleton sur `global`, même raison que lib/prisma.ts : éviter qu'un
// rechargement à chaud en dev démarre plusieurs pg-boss en parallèle.
const globalForBoss = globalThis as unknown as { boss?: PgBoss; bossStarting?: Promise<PgBoss> };

export function getBoss(): Promise<PgBoss> {
  if (globalForBoss.boss) return Promise.resolve(globalForBoss.boss);
  if (globalForBoss.bossStarting) return globalForBoss.bossStarting;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL manquant dans .env");
  }

  const boss = new PgBoss(connectionString);
  boss.on("error", (error: Error) => console.error("[pg-boss]", error));

  const starting = boss.start().then(async () => {
    // pg-boss v12 : une file doit exister (createQueue) avant work()/schedule().
    // createQueue() est idempotent — sans risque à chaque redémarrage.
    for (const name of [QUEUE_TICKET_CREATION, QUEUE_ROUTER_HEALTHCHECK, QUEUE_TRANSACTION_EXPIRY]) {
      await boss.createQueue(name);
    }
    globalForBoss.boss = boss;
    return boss;
  });
  globalForBoss.bossStarting = starting;
  return starting;
}
