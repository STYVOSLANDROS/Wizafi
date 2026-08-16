import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public (le client final n'a pas de compte, spec §9) — d'où l'usage de
// campay_reference (aléatoire) plutôt que l'id séquentiel pour retrouver la
// transaction, même logique que Router.public_slug (spec §8).
export async function GET(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { campay_reference: reference },
    include: { ticket: true },
  });
  if (!transaction) {
    return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    status: transaction.status,
    ticket:
      transaction.status === "COMPLETED" && transaction.ticket
        ? { username: transaction.ticket.username, password: transaction.ticket.password }
        : null,
  });
}
