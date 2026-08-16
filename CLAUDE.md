@AGENTS.md

# WIZAFI — consignes permanentes

- La spécification de référence est `SPEC-WIZAFI-V5.md`, à la racine du dépôt. En cas de doute,
  elle fait autorité. Si une consigne donnée en session la contredit, le signaler avant d'agir.
- Utilisateur débutant en développement. Expliquer ce que fait chaque fichier et pourquoi ce
  choix, avant d'écrire le code.
- Une phase à la fois (§12 de la spec). Ne jamais commencer la phase suivante sans validation
  explicite de la précédente.
- Tous les montants sont des entiers en XAF. Jamais de centimes, jamais de décimaux, aucune
  conversion, nulle part.
- Aucun secret en dur dans le code : tout passe par `.env`, et `.env` n'est jamais commité
  (seul `.env.example` l'est, avec des valeurs de démonstration).
- Faire un commit Git à chaque étape terminée, avec un message clair.

## État du projet

- **Phase 0 (fondations) — terminée** : Next.js 16 + TypeScript + App Router, Prisma
  (PostgreSQL, encore sans modèles), `docker-compose.yml` (service `db` seul), `.env.example`.
- **Schéma de données (Prompt n°2) — terminé** : les 7 modèles de la spec §5
  (`Operator`, `Site`, `Router`, `Plan`, `Transaction`, `Ticket`, `Payout`) sont dans
  `prisma/schema.prisma`, migration `init_schema` appliquée et vérifiée (contraintes uniques
  testées, écriture/lecture réelle confirmée).
- **Prisma 7 exige un driver adapter au runtime** (`@prisma/adapter-pg`) — `PrismaClient` ne lit
  plus `DATABASE_URL` tout seul. Le singleton applicatif est dans `lib/prisma.ts`, à importer
  partout ailleurs plutôt que d'instancier `PrismaClient` à la main.
- **Prochaine étape (Prompt n°3 du guide de démarrage — Phase 1)** : `lib/mikrotik/client.ts`,
  le wrapper de l'API REST RouterOS 7 (tester la connexion, lister les User Profiles, créer un
  utilisateur hotspot), à valider contre un vrai routeur avant de toucher à CamPay.
- Développement en local : le MikroTik est joignable directement sur le réseau local
  (`https://192.168.88.1/rest`), sans CGNAT ni tunnel à gérer avant la Phase 7 (spec §3).
- Pense-bête pour la Phase 7 : limiter l'accès au service `www-ssl` du MikroTik à la seule IP
  du VPS avant toute mise en production (spec §6).
