import { Agent, fetch, type Dispatcher } from "undici";

// Wrapper minimal de l'API REST RouterOS 7. Trois fonctions seulement pour
// cette étape (Phase 1, Prompt n°3 du guide de démarrage) : tester la
// connexion, lister les profils hotspot, créer un utilisateur hotspot.
// Les retries différenciés (§6 de la spec) arriveront avec la file pg-boss,
// en Phase 5 — pas ici.

export type MikrotikConfig = {
  /** Ex. "https://192.168.88.1/rest" — sans slash final. */
  baseUrl: string;
  username: string;
  password: string;
  /**
   * Désactive la vérification du certificat TLS. Ne doit JAMAIS être activé
   * par défaut — uniquement via MIKROTIK_INSECURE_TLS=true en développement
   * local, où le certificat du MikroTik est auto-signé (spec §3).
   */
  insecureTls?: boolean;
};

export class MikrotikApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "MikrotikApiError";
  }
}

export function loadMikrotikConfigFromEnv(): MikrotikConfig {
  const baseUrl = process.env.MIKROTIK_BASE_URL;
  const username = process.env.MIKROTIK_API_USERNAME;
  const password = process.env.MIKROTIK_API_PASSWORD;

  if (!baseUrl || !username || !password) {
    throw new MikrotikApiError(
      "Configuration MikroTik incomplète : vérifie MIKROTIK_BASE_URL, " +
        "MIKROTIK_API_USERNAME et MIKROTIK_API_PASSWORD dans .env",
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    username,
    password,
    insecureTls: process.env.MIKROTIK_INSECURE_TLS === "true",
  };
}

// Un agent par configuration, jamais un réglage global : désactiver la
// vérification TLS ne doit affecter que les appels vers ce MikroTik précis,
// jamais les autres appels HTTPS de l'application (CamPay, etc.).
const agentCache = new Map<string, Dispatcher>();

function getAgent(config: MikrotikConfig): Dispatcher {
  const cacheKey = `${config.baseUrl}:${config.insecureTls ?? false}`;
  let agent = agentCache.get(cacheKey);
  if (!agent) {
    agent = new Agent({
      connect: { rejectUnauthorized: !config.insecureTls },
    });
    agentCache.set(cacheKey, agent);
  }
  return agent;
}

function authHeader(config: MikrotikConfig): string {
  const encoded = Buffer.from(`${config.username}:${config.password}`).toString(
    "base64",
  );
  return `Basic ${encoded}`;
}

async function mikrotikRequest<T>(
  config: MikrotikConfig,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const method = init.method ?? "GET";
  let response: Awaited<ReturnType<typeof fetch>>;

  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      method,
      dispatcher: getAgent(config),
      headers: {
        Authorization: authHeader(config),
        "Content-Type": "application/json",
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch (cause) {
    throw new MikrotikApiError(
      `Impossible de joindre le MikroTik à ${config.baseUrl}${path} : ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 401) {
      throw new MikrotikApiError(
        `Authentification refusée par le MikroTik (compte "${config.username}") — ` +
          `vérifie MIKROTIK_API_USERNAME/MIKROTIK_API_PASSWORD.`,
        401,
      );
    }
    throw new MikrotikApiError(
      `Le MikroTik a répondu ${response.status} ${response.statusText} sur ${method} ${path} : ${body}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

/** Vérifie que l'API répond, en interrogeant les infos système du routeur. */
export type SystemResource = {
  "board-name": string;
  version: string;
  uptime: string;
  [key: string]: unknown;
};

export async function testConnection(
  config: MikrotikConfig = loadMikrotikConfigFromEnv(),
): Promise<SystemResource> {
  return mikrotikRequest<SystemResource>(config, "/system/resource");
}

/** Liste les profils hotspot existants — ce sont eux que Plan.mikrotik_profile_name référencera. */
export type HotspotProfile = {
  ".id": string;
  name: string;
  [key: string]: unknown;
};

export async function listHotspotProfiles(
  config: MikrotikConfig = loadMikrotikConfigFromEnv(),
): Promise<HotspotProfile[]> {
  return mikrotikRequest<HotspotProfile[]>(config, "/ip/hotspot/user/profile");
}

/** Crée un utilisateur hotspot — c'est la création du ticket côté MikroTik. */
export type CreateHotspotUserInput = {
  username: string;
  password: string;
  /** Doit correspondre à un profil existant (voir listHotspotProfiles). */
  profile: string;
};

export type HotspotUser = {
  ".id": string;
  name: string;
  profile: string;
  [key: string]: unknown;
};

export async function createHotspotUser(
  input: CreateHotspotUserInput,
  config: MikrotikConfig = loadMikrotikConfigFromEnv(),
): Promise<HotspotUser> {
  // L'API REST RouterOS mappe les commandes CLI sur les verbes HTTP :
  // print → GET, add → PUT, set → PATCH, remove → DELETE.
  return mikrotikRequest<HotspotUser>(config, "/ip/hotspot/user", {
    method: "PUT",
    body: {
      name: input.username,
      password: input.password,
      profile: input.profile,
    },
  });
}
