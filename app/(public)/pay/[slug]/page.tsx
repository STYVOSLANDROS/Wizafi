import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PayForm } from "@/components/pay-form";

export default async function PayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const router = await prisma.router.findUnique({
    where: { public_slug: slug },
    include: {
      plans: { where: { active: true }, orderBy: { price: "asc" } },
      site: true,
    },
  });
  if (!router) notFound();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-lg font-semibold">{router.site.name}</h1>
          <p className="text-sm text-slate-500">Achète un accès Wifi</p>
        </div>

        {router.plans.length === 0 ? (
          <p className="text-center text-sm text-slate-500">
            Aucun forfait disponible pour le moment.
          </p>
        ) : (
          <PayForm slug={slug} plans={router.plans} />
        )}
      </div>
    </div>
  );
}
