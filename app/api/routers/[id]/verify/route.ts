import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { testConnection, mikrotikConfigFromRouter, MikrotikApiError } from "@/lib/mikrotik/client";

// Le healthcheck périodique (spec §8, Phase 4) réutilisera cette même
// logique dans un job pg-boss — pour l'instant, déclenché manuellement par
// le bouton "Tester la connexion" du dashboard.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const router = await prisma.router.findFirst({
    where: { id: Number(id), site: { operator_id: Number(session.user.id) } },
  });
  if (!router) {
    return NextResponse.json({ ok: false, error: "Routeur introuvable" }, { status: 404 });
  }

  try {
    const config = mikrotikConfigFromRouter(router);
    const resource = await testConnection(config);
    await prisma.router.update({
      where: { id: router.id },
      data: { status: "online", last_checked_at: new Date() },
    });
    return NextResponse.json({
      ok: true,
      boardName: resource["board-name"],
      version: resource.version,
    });
  } catch (error) {
    await prisma.router.update({
      where: { id: router.id },
      data: { status: "offline", last_checked_at: new Date() },
    });
    const message = error instanceof MikrotikApiError ? error.message : "Erreur inconnue.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
