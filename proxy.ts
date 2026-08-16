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
    "/sites/:path*",
    "/routers/:path*",
    "/plans/:path*",
    "/transactions/:path*",
    "/payouts/:path*",
    "/health/:path*",
    "/settings/:path*",
  ],
};
