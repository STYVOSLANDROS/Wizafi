import { randomInt } from "node:crypto";

// Alphabet volontairement sans caractères ambigus (pas de 0/O, 1/I/L...) — un
// client qui recopie le code à la main sur le portail captif ne doit jamais
// hésiter sur un caractère (spec §4).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// crypto.randomInt (et non Math.random) : générateur cryptographiquement sûr,
// non-négociable pour un code qui vaut de l'argent (spec §4).
export function generateTicketCode(length = 10): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

export type TicketCodeMode = "simple" | "renforce";

export type TicketCredentials = {
  username: string;
  password: string;
};

// "simple" : username = password = code (le client ne retape qu'une chose).
// "renforce" : username et password sont deux codes différents.
export function generateTicketCredentials(
  mode: TicketCodeMode = "simple",
): TicketCredentials {
  const username = generateTicketCode();
  const password = mode === "simple" ? username : generateTicketCode();
  return { username, password };
}
