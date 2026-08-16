import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Protège tout /(dashboard) : redirige vers /login si personne n'est
// connecté. Le client final n'a jamais de compte (spec §9) — ceci ne
// concerne que /pay/*, /api/webhooks/*, /login et /signup, qui restent
// hors de ce middleware (voir `matcher`).
export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    // Tout sauf : routes d'auth, page publique d'achat, webhooks, et les
    // fichiers statiques/assets Next.js — négatif plutôt qu'une liste des
    // pages dashboard à maintenir à la main à chaque nouvelle page.
    "/((?!login|signup|pay|api/auth|api/webhooks|_next/static|_next/image|favicon.ico).*)",
  ],
};
