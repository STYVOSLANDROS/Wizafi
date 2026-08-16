import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRouterHealth } from "@/lib/mikrotik/healthcheck";

// Déclenché manuellement par le bouton "Tester la connexion" du dashboard.
// Le job pg-boss périodique (lib/queue/router-healthcheck.job.ts) réutilise
// la même logique partagée (lib/mikrotik/healthcheck.ts).
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

  const result = await checkRouterHealth(router.id);
  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}
