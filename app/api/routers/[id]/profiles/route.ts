import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listHotspotProfiles, mikrotikConfigFromRouter, MikrotikApiError } from "@/lib/mikrotik/client";

// Utilisé par le formulaire de création de Plan (spec §5 : mikrotik_profile_name
// doit correspondre à un profil réel, vérifié par API).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const profiles = await listHotspotProfiles(config);
    return NextResponse.json({ ok: true, profiles: profiles.map((p) => p.name) });
  } catch (error) {
    const message = error instanceof MikrotikApiError ? error.message : "Erreur inconnue.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
