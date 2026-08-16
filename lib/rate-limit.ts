// Rate limiting minimal, en mémoire — suffisant pour un unique conteneur
// (spec §8 : requis dès le MVP sur /pay/* et /webhook/*). À remplacer par un
// store partagé (Postgres/Redis) si l'app tourne un jour sur plusieurs
// instances derrière un load balancer.

const hits = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  hits.set(key, timestamps);
  return timestamps.length > limit;
}

export function clientKeyFromRequest(req: Request): string {
  // x-forwarded-for : posé par le reverse proxy en production (spec §7).
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
