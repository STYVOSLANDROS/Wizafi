import { prisma } from "@/lib/prisma";
import { testConnection, mikrotikConfigFromRouter, MikrotikApiError } from "./client";

// Vraie requête API authentifiée, jamais un simple ping ICMP (spec §8 : un
// routeur peut répondre au ping avec une API pourtant hors service).
// Partagé entre /api/routers/[id]/verify (déclenché à la main) et le job
// pg-boss périodique (lib/queue/router-healthcheck.job.ts).
export async function checkRouterHealth(routerId: number): Promise<
  { ok: true; boardName: string; version: string } | { ok: false; error: string }
> {
  const router = await prisma.router.findUniqueOrThrow({ where: { id: routerId } });

  try {
    const resource = await testConnection(mikrotikConfigFromRouter(router));
    await prisma.router.update({
      where: { id: router.id },
      data: { status: "online", last_checked_at: new Date() },
    });
    return { ok: true, boardName: resource["board-name"], version: resource.version };
  } catch (error) {
    await prisma.router.update({
      where: { id: router.id },
      data: { status: "offline", last_checked_at: new Date() },
    });
    const message = error instanceof MikrotikApiError ? error.message : "Erreur inconnue.";
    return { ok: false, error: message };
  }
}
