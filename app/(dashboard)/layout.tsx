import { auth } from "@/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { signOutAction } from "./actions";

// proxy.ts protège déjà ces routes, mais on revérifie ici (défense en
// profondeur — voir la note de node_modules/next/dist/docs sur le Proxy :
// un changement de matcher ne doit jamais être la seule protection).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4 flex flex-col">
        <div className="mb-6">
          <p className="font-semibold">WIZAFI</p>
          {session?.user?.name && (
            <p className="truncate text-xs text-slate-500">{session.user.name}</p>
          )}
        </div>
        <DashboardNav />
        <form action={signOutAction} className="mt-auto pt-4">
          <button type="submit" className="text-sm text-slate-500 hover:text-slate-900">
            Se déconnecter
          </button>
        </form>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
