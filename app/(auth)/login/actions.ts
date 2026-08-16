"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    // signIn() lève une erreur spéciale (NEXT_REDIRECT) quand la connexion
    // réussit — il ne faut la traiter comme un échec que si c'est une vraie
    // AuthError, sinon il faut la laisser remonter pour que la redirection
    // ait lieu.
    if (error instanceof AuthError) {
      return { error: "Email ou mot de passe incorrect." };
    }
    throw error;
  }
}

export async function signInWithGoogleAction() {
  await signIn("google", { redirectTo: "/" });
}
