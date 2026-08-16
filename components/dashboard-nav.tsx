"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Structure de référence spec §10/§11.
const NAV_ITEMS = [
  { href: "/", label: "Accueil" },
  { href: "/sites", label: "Sites" },
  { href: "/routers", label: "Routeurs" },
  { href: "/plans", label: "Tarifs" },
  { href: "/transactions", label: "Ventes" },
  { href: "/payouts", label: "Retraits" },
  { href: "/health", label: "Santé" },
  { href: "/settings", label: "Paramètres" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded px-3 py-2 text-sm font-medium ${
              active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
