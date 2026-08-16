import { prisma } from "@/lib/prisma";
import { checkRouterHealth } from "@/lib/mikrotik/healthcheck";
import { getBoss, QUEUE_ROUTER_HEALTHCHECK } from "./setup";

const CRON_EVERY_5_MIN = "*/5 * * * *";

export async function scheduleRouterHealthcheck(): Promise<void> {
  const boss = await getBoss();
  await boss.schedule(QUEUE_ROUTER_HEALTHCHECK, CRON_EVERY_5_MIN);
}

export function registerRouterHealthcheckWorker(): Promise<string> {
  return getBoss().then((boss) =>
    boss.work(QUEUE_ROUTER_HEALTHCHECK, async () => {
      const routers = await prisma.router.findMany({ select: { id: true } });
      // Séquentiel, volontairement : peu de routeurs attendus en MVP, pas
      // besoin de paralléliser et de risquer de saturer le réseau local.
      for (const router of routers) {
        await checkRouterHealth(router.id);
      }
    }),
  );
}
