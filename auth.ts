import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Authentifie uniquement le gérant de la Wifi Zone (le client final n'a
// jamais de compte, spec §4/§9). Session en JWT — pas besoin de table
// Session en base pour ce volume d'utilisateurs.
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const operator = await prisma.operator.findUnique({ where: { email } });
        if (!operator?.password_hash) return null;

        const valid = await bcrypt.compare(password, operator.password_hash);
        if (!valid) return null;

        return { id: String(operator.id), email: operator.email, name: operator.name };
      },
    }),
    // Actif seulement si les identifiants Google sont fournis en .env — le
    // bouton "Se connecter avec Google" ne s'affiche que dans ce cas (voir
    // app/(auth)/login/page.tsx).
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google] : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        // Premier login Google = création automatique du compte opérateur.
        // Téléphone/pays restent à compléter dans Paramètres.
        await prisma.operator.upsert({
          where: { email: user.email },
          update: {},
          create: {
            email: user.email,
            name: user.name ?? user.email,
            phone: "",
            country: "",
          },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;
      if (email) {
        const operator = await prisma.operator.findUnique({ where: { email } });
        if (operator) {
          token.operatorId = operator.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.operatorId && session.user) {
        session.user.id = String(token.operatorId);
      }
      return session;
    },
  },
});
