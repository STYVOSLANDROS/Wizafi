// Layout volontairement séparé de app/(dashboard) : les pages de connexion
// et d'inscription n'affichent jamais la navigation du tableau de bord.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
