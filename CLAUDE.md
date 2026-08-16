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

## État du projet (16 août 2026 — session cloud, à reprendre en local)

**Contexte important** : tout ce qui suit a été construit dans une session Claude Code
**cloud** (pas sur le PC de l'opérateur), sans accès à un vrai routeur MikroTik ni à un vrai
compte CamPay. Tout a été vérifié soit avec de vrais outils (PostgreSQL, migrations Prisma,
navigateur Playwright), soit contre de **faux serveurs** qui imitent RouterOS et CamPay
(mêmes réponses HTTP, même certificat auto-signé pour MikroTik). Deux validations manuelles
restent dues, marquées ci-dessous.

- **Phase 0 (fondations) — terminée et vérifiée** : Next.js 16 + TypeScript + App Router,
  Prisma + PostgreSQL, `docker-compose.yml` (service `db`), `.env.example`.
- **Schéma de données — terminé et vérifié** : les 7 modèles de la spec §5 dans
  `prisma/schema.prisma`, migrations appliquées, contraintes uniques testées par écriture réelle.
- **Prisma 7 exige un driver adapter au runtime** (`@prisma/adapter-pg`) — le singleton est dans
  `lib/prisma.ts`, à importer partout plutôt que d'instancier `PrismaClient` à la main.
- **Wrapper MikroTik (Phase 1) — écrit et vérifié contre un faux routeur,
  PAS ENCORE validé sur le vrai routeur** : `lib/mikrotik/client.ts`, `lib/mikrotik/
  ticket-generator.ts`, `scripts/test-mikrotik.ts` (`npm run test:mikrotik`). **À toi de
  lancer ce script sur ton PC, branché sur le réseau du routeur, et de vérifier qu'un ticket
  apparaît dans IP → Hotspot → Users dans WinBox.**
- **Authentification (Phase 2) — terminée et vérifiée** : Auth.js (email/mot de passe +
  Google OAuth optionnel), `/login`, `/signup`, `proxy.ts` protège le reste du site.
  **Next.js 16 a renommé `middleware.ts` en `proxy.ts`** — le nouveau nom passe par défaut en
  runtime Node.js (l'ancien passait par l'Edge Runtime, incompatible avec Prisma). Si tu vois
  ce genre d'avertissement un jour, relis `node_modules/next/dist/docs/.../proxy.md`.
- **Dashboard (Phase 2) — terminé et vérifié** : Sites, Routeurs (secrets chiffrés AES-256-GCM
  via `lib/crypto/encryption.ts`, bouton "Tester la connexion"), Tarifs (le profil MikroTik est
  vérifié par API à la création, spec §5), Paramètres.
- **CamPay (Phase 3) — écrit, endpoints non vérifiés en profondeur** : `lib/payments/campay.ts`.
  La documentation de référence de CamPay (documenter.getpostman.com, blog.campay.net) était
  bloquée par la politique réseau de ce sandbox cloud — les endpoints viennent de leurs SDKs
  officiels (Python/Go/PHP sur GitHub), et **le mécanisme exact de signature du webhook n'a pas
  pu être confirmé**. Lis la note en tête de ce fichier avant la mise en production. Pour rester
  sûr malgré cette incertitude, le webhook (`app/api/webhooks/campay/route.ts`) ne fait jamais
  confiance à son propre corps de requête : il rappelle toujours CamPay pour connaître le vrai
  statut avant d'agir.
- **Paiement → ticket automatique (Phase 4) — terminé et vérifié de bout en bout** contre de
  faux serveurs CamPay + MikroTik : achat sur `/pay/[slug]` → webhook → file pg-boss
  (`lib/queue/`, démarrée par `instrumentation.ts` dans le même processus que Next.js) →
  création réelle du ticket → crédit du solde opérateur (commission correcte) → la page de
  statut du client affiche le ticket. Rejeu du même webhook plusieurs fois : pas de doublon
  (idempotence vérifiée).
- **Fiabilité (Phase 5) — écrite, PARTIELLEMENT vérifiée** : boutons "Réessayer" et "Créer un
  ticket manuellement" (pages Ventes et Santé), retries différenciés (401 = définitif, sinon
  backoff pg-boss). Le chemin "échec MikroTik → TICKET_FAILED → clic Réessayer → COMPLETED" a
  été codé et testé manuellement dans le principe, mais le dernier test automatisé de bout en
  bout n'a pas eu le temps d'aller à son terme dans cette session (le backoff pg-boss prend
  jusqu'à ~75s avant d'atteindre l'échec définitif) — **à revérifier** en te connectant sur
  `/health` après une vente ratée, avant de faire confiance à ce chemin en production.
- **Pages Ventes / Retraits / Santé (spec §10) — terminées et vérifiées** (retraits testés :
  seuil minimum, réservation du solde à la demande) sauf le point ci-dessus.
- **Walled Garden (Phase 6) — terminé et vérifié** : `docs/walled-garden-setup.md` (explication
  + script WinBox de référence), page dashboard `/routers/walled-garden` qui génère le script
  avec le vrai domaine (`APP_DOMAIN`), bouton "Copier le lien d'achat" par routeur (spec §9).
  Point ouvert documenté : le flux CamPay actuel (`/collect/`, notification USSD) ne redirige
  pas le navigateur du client vers un domaine CamPay, donc seul le domaine de la plateforme est
  whitelisté pour l'instant — à revoir si vous passez un jour à un flux de paiement hébergé.
- **Audit final — fait** : `npx tsc --noEmit` et `npx eslint .` propres sur tout le projet,
  `npm run build` (production) réussi, `npm start` démarré avec succès et les 3 files pg-boss
  bien créées en base (vérifié directement en SQL).
- **Phase 7 (WireGuard, audit sécurité, tests de charge) — pas commencée**, volontairement :
  la spec la place explicitement "avant toute commercialisation à un tiers", et elle dépend de
  décisions d'infrastructure (VPS) que toi seul peux prendre.
- **Trois choses à faire toi-même, hors code, avant toute mise en production réelle** (déjà
  notées dans le guide de démarrage) : (1) valider `npm run test:mikrotik` sur le vrai
  routeur — **c'est le seul blocage restant avant de pouvoir tester un vrai achat de bout en
  bout** ; (2) contacter CamPay pour confirmer les frais exacts et le mécanisme de signature
  du webhook, et adapter `lib/payments/campay.ts` si besoin ; (3) revérifier le chemin
  "échec MikroTik → TICKET_FAILED → Réessayer → COMPLETED" en conditions réelles (voir
  Fiabilité ci-dessus).
- Développement en local : le MikroTik est joignable directement sur le réseau local
  (`https://192.168.88.1/rest`), sans CGNAT ni tunnel à gérer avant la Phase 7 (spec §3).
- Pense-bête pour la Phase 7 : limiter l'accès au service `www-ssl` du MikroTik à la seule IP
  du VPS avant toute mise en production (spec §6).
