import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Chiffrement des secrets stockés en base (mot de passe API MikroTik, futures
// clés CamPay) — spec §8. AES-256-GCM : authentifié, donc toute modification
// du texte chiffré fait échouer le déchiffrement au lieu de renvoyer un
// résultat corrompu silencieusement.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // taille recommandée pour GCM
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY manquant dans .env — génère-en une avec " +
        "`openssl rand -base64 32`.",
    );
  }
  const buffer = Buffer.from(key, "base64");
  if (buffer.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY doit décoder en 32 octets (clé AES-256). " +
        "Génère-en une avec `openssl rand -base64 32`.",
    );
  }
  return buffer;
}

// Résultat encodé en base64 : iv (12 octets) + authTag (16 octets) + texte chiffré.
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decrypt(encoded: string): string {
  const key = getKey();
  const data = Buffer.from(encoded, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
