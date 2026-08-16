import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusPoller } from "@/components/status-poller";

export default async function PayStatusPage({
  params,
}: {
  params: Promise<{ slug: string; reference: string }>;
}) {
  const { reference } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { campay_reference: reference },
    include: { ticket: true },
  });
  if (!transaction) notFound();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-sm">
        <StatusPoller
          reference={reference}
          initialStatus={transaction.status}
          initialTicket={
            transaction.status === "COMPLETED" && transaction.ticket
              ? { username: transaction.ticket.username, password: transaction.ticket.password }
              : null
          }
        />
      </div>
    </div>
  );
}
