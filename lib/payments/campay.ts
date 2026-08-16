// Intégration CamPay — isolée derrière une interface minimale (spec §4) pour
// pouvoir ajouter un second fournisseur plus tard sans toucher au reste.
//
// SOURCES ET LIMITE IMPORTANTE : les endpoints ci-dessous viennent des SDKs
// officiels CamPay (Python, Go, PHP — github.com/CamPay, 16 août 2026), PAS
// de la documentation de référence : documenter.getpostman.com/view/2391374/T1LV8PVA
// et blog.campay.net sont bloqués depuis ce sandbox par la politique réseau
// (403 à la connexion — refus d'accès, pas un bug à contourner). Le format
// exact de vérification de signature du webhook n'a PAS pu être confirmé.
// **À revérifier contre la doc à jour avant toute mise en production**
// (spec §4 : "ne pas figer de chiffre en dur"). En attendant, le webhook
// (app/api/webhooks/campay/route.ts) ne fait jamais confiance à son propre
// corps de requête : il ne sert que de déclencheur pour rappeler
// getTransactionStatus() ici, qui est la seule source de vérité retenue.

export class CampayApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "CampayApiError";
  }
}

function baseUrl(): string {
  // https://demo.campay.net/api pour le sandbox, https://campay.net/api en
  // production — jamais figé en dur, toujours par variable d'environnement.
  const url = process.env.CAMPAY_BASE_URL;
  if (!url) {
    throw new CampayApiError("CAMPAY_BASE_URL manquant dans .env");
  }
  return url.replace(/\/+$/, "");
}

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const username = process.env.CAMPAY_USERNAME;
  const password = process.env.CAMPAY_PASSWORD;
  if (!username || !password) {
    throw new CampayApiError("CAMPAY_USERNAME/CAMPAY_PASSWORD manquants dans .env");
  }

  const res = await fetch(`${baseUrl()}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new CampayApiError(`Authentification CamPay refusée (${res.status})`, res.status);
  }
  const data = (await res.json()) as { token: string };

  // Durée de vie du token non confirmée dans les sources disponibles — on le
  // garde 4 minutes par prudence puis on le redemande.
  tokenCache = { token: data.token, expiresAt: Date.now() + 4 * 60_000 };
  return data.token;
}

export type CampayTransactionStatus = "PENDING" | "SUCCESSFUL" | "FAILED";

export type InitiatePaymentInput = {
  /** Entier, XAF (spec §5 — jamais de décimales). */
  amount: number;
  /** Format attendu par CamPay : indicatif pays inclus, sans "+" (ex. "237670000000"). */
  phone: string;
  description: string;
  /** Notre Transaction.campay_reference — CamPay le renvoie tel quel dans le webhook. */
  externalReference: string;
};

export type InitiatePaymentResult = {
  reference: string;
  status: CampayTransactionStatus;
};

export async function initiatePayment(
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> {
  const token = await getAccessToken();

  const res = await fetch(`${baseUrl()}/collect/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
    body: JSON.stringify({
      amount: String(input.amount),
      currency: "XAF",
      from: input.phone,
      description: input.description,
      external_reference: input.externalReference,
    }),
  });

  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    const message =
      typeof data.message === "string" ? data.message : `CamPay a refusé la demande (${res.status})`;
    throw new CampayApiError(message, res.status);
  }

  return {
    reference: String(data.reference),
    status: (data.status as CampayTransactionStatus) ?? "PENDING",
  };
}

export type CampayTransaction = {
  reference: string;
  status: CampayTransactionStatus;
  amount: number;
};

/**
 * Seule source de vérité retenue pour confirmer un paiement — voir la note
 * en tête de fichier sur la vérification de signature non confirmée.
 */
export async function getTransactionStatus(reference: string): Promise<CampayTransaction> {
  const token = await getAccessToken();

  const res = await fetch(`${baseUrl()}/transaction/${encodeURIComponent(reference)}/`, {
    headers: { Authorization: `Token ${token}` },
  });
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    const message =
      typeof data.message === "string" ? data.message : `Statut CamPay introuvable (${res.status})`;
    throw new CampayApiError(message, res.status);
  }

  return {
    reference: String(data.reference),
    status: data.status as CampayTransactionStatus,
    amount: Number(data.amount),
  };
}
