"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export type SignupState = { error?: string } | undefined;

export async function signupAction(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();

  if (!email || !password || !name || !phone || !country) {
    return { error: "Tous les champs sont obligatoires." };
  }
  if (password.length < 8) {
    return { error: "Le mot de passe doit faire au moins 8 caractères." };
  }

  const password_hash = await bcrypt.hash(password, 12);

  try {
    await prisma.operator.create({
      data: { email, password_hash, name, phone, country },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Un compte existe déjà avec cet email." };
    }
    throw error;
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Compte créé, mais la connexion automatique a échoué. Connecte-toi manuellement." };
    }
    throw error;
  }
}
