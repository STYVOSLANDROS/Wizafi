/**
 * Script à lancer À LA MAIN, sur le réseau du MikroTik, pour valider la
 * Phase 1 (spec §12) : `npm run test:mikrotik`.
 *
 * Critère de réussite (guide de démarrage, Prompt n°3) : ce script doit
 * s'exécuter sans erreur ET un utilisateur doit apparaître réellement dans
 * IP → Hotspot → Users dans WinBox. Tant que ce n'est pas le cas, ne pas
 * passer à CamPay.
 */
import {
  testConnection,
  listHotspotProfiles,
  createHotspotUser,
  loadMikrotikConfigFromEnv,
  MikrotikApiError,
} from "../lib/mikrotik/client";
import { generateTicketCredentials } from "../lib/mikrotik/ticket-generator";

async function main() {
  console.log("1. Configuration (.env)");
  const config = loadMikrotikConfigFromEnv();
  console.log(`   MIKROTIK_BASE_URL      = ${config.baseUrl}`);
  console.log(`   MIKROTIK_API_USERNAME  = ${config.username}`);
  console.log(
    `   MIKROTIK_INSECURE_TLS  = ${config.insecureTls ?? false}` +
      (config.insecureTls ? "  (certificat auto-signé accepté)" : ""),
  );

  console.log("\n2. Test de connexion (/system/resource)");
  const resource = await testConnection(config);
  console.log(`   OK — board-name: ${resource["board-name"]}, version: ${resource.version}`);

  console.log("\n3. Liste des profils hotspot (/ip/hotspot/user/profile)");
  const profiles = await listHotspotProfiles(config);
  if (profiles.length === 0) {
    throw new Error(
      "Aucun profil hotspot trouvé. Crée au moins un profil dans " +
        "IP → Hotspot → User Profiles avant de continuer.",
    );
  }
  for (const profile of profiles) {
    console.log(`   - ${profile.name}`);
  }

  const testProfile = process.env.MIKROTIK_TEST_PROFILE ?? profiles[0].name;
  console.log(
    `\n4. Création d'un utilisateur hotspot de test (profil "${testProfile}")`,
  );
  console.log(
    "   Astuce : fixe MIKROTIK_TEST_PROFILE dans .env pour choisir un autre profil.",
  );
  const credentials = generateTicketCredentials("simple");
  const user = await createHotspotUser(
    { username: credentials.username, password: credentials.password, profile: testProfile },
    config,
  );
  console.log(`   OK — utilisateur créé : ${user.name} (id ${user[".id"]})`);

  console.log("\n✔ Phase 1 validée si tu vois maintenant ce ticket dans WinBox :");
  console.log(`  IP → Hotspot → Users → ${credentials.username}`);
}

main().catch((error) => {
  if (error instanceof MikrotikApiError) {
    console.error(`\n✘ Échec MikroTik : ${error.message}`);
  } else {
    console.error("\n✘ Échec inattendu :", error);
  }
  process.exitCode = 1;
});
