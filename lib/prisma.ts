import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

// Prisma 7 se connecte via un "driver adapter" plutôt que de lire DATABASE_URL
// tout seul au runtime — voir https://pris.ly/d/driver-adapters.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// En développement, Next.js recharge les modules à chaud : sans ce cache sur
// `global`, chaque rechargement recréerait un PrismaClient et une nouvelle
// pool de connexions PostgreSQL, jusqu'à épuiser les connexions disponibles.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
