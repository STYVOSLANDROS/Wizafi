# SPÉCIFICATION TECHNIQUE — WIZAFI
### Plateforme de vente automatique de tickets Wifi — Cameroun
### Document final à donner tel quel à Claude Code
### Version 5 — corrigée le 15 août 2026

---

## 0. NOTE DE TRANSPARENCE

Ce document s'inspire du **mécanisme fonctionnel observé** de TICKETWIFI (SONOTIC) — son
comportement réel, capturé par observation directe de son interface (voir section 10) — pas
de son code ou de sa base de données, non publiés. Version 4, définitive : corrige une erreur
technique de la V2 (le DDNS MikroTik ne contourne PAS le CGNAT — section 3), intègre les
correctifs validés après double relecture critique, et formalise une structure de dashboard
observée sur le concurrent, en excluant délibérément son modèle de crédit prépayé — le
paiement direct est le différenciateur assumé de WIZAFI.

**Corrections apportées en V5 (relecture technique du 15 août 2026) :**
1. **Next.js 15 → Next.js 16.** Next.js 15 est passé en Maintenance LTS et arrive en fin de
   support le 21 octobre 2026. Démarrer un projet neuf dessus reviendrait à devoir migrer
   dans les deux mois. Next.js 16 est la version Active LTS (support jusqu'en octobre 2027).
2. **Unité monétaire unifiée.** La V4 stockait `Operator.balance` « en centimes XAF » sans
   préciser l'unité de `Plan.price` ni de `Transaction.amount` — risque de facteur 100 entre
   les tables. Le franc CFA n'a pas de subdivision utilisée : **tous les montants sont des
   entiers en XAF**, partout (section 5).
3. **Taux de commission cohérent.** Le schéma de flux de la section 1BIS utilisait 5 % alors
   que le texte fixe 10 % par défaut. Corrigé à 10 % partout.
4. **Pages manquantes dans l'arborescence.** La section 10 décrit une page Retraits et une
   page Santé du système absentes de la structure de dossiers (section 11). Ajoutées.
5. **`PAYMENT_EXPIRED` défini.** Le statut existait dans la machine d'état sans délai ni
   déclencheur. Délai fixé et job d'expiration ajouté (sections 4 et 5).
6. **Mode de développement local précisé** (section 3) : le développement de la Phase 1 se
   fait sur le réseau local, ce qui neutralise entièrement la question du CGNAT tant qu'on
   n'est pas en production.

---

## 1. CONTEXTE ET VISION

Wifi Zone commerciale au Cameroun, routeur **MikroTik RouterOS 7**, portail captif natif.
Objectif : plateforme de vente automatique par Mobile Money pour ma propre Wifi Zone d'abord,
puis revendable à d'autres exploitants une fois validée sur mon propre terrain pendant
plusieurs semaines.

**Principe fondateur, non négociable** : séparation stricte des responsabilités.
- **Le MikroTik reste responsable du réseau** : durée, vitesse, nombre d'appareils, expiration.
- **La plateforme reste responsable du commerce** : vente, paiement, historique, statistiques.

Le MikroTik ne doit jamais savoir qu'un paiement a eu lieu ni combien il a coûté.

**Contraintes opérateur :**
- Une seule passerelle de paiement pour commencer (CamPay)
- SMS optionnel, jamais dans le chemin critique
- Architecture la plus légère possible pour un débutant assisté par Claude Code
- Connexion à un ou plusieurs MikroTik à distance

---

## 1BIS. MODÈLE ÉCONOMIQUE ET GESTION DES RETRAITS

**Flux de l'argent** : WIZAFI encaisse via son propre compte marchand CamPay, prélève sa
commission automatiquement à chaque transaction confirmée, crédite le reste au solde
retirable de l'opérateur.

```
Client paie 500 XAF
       │
   CamPay confirme (webhook)
       │
   Commission WIZAFI prélevée (10% = 50 XAF)
       │
   Solde opérateur crédité : 450 XAF
       │
   (l'opérateur accumule, puis demande un retrait quand il le souhaite)
```

**Différenciateur assumé face à TICKETWIFI** : pas de quota prépayé, pas de recharge
obligatoire, pas de blocage des ventes. La commission se prélève automatiquement sur chaque
transaction, jamais en amont. C'est la raison d'être commerciale de WIZAFI.

**Taux de commission** : **10% par défaut** (`Operator.commission_rate`, configurable par
opérateur si besoin d'ajuster plus tard). Cohérent avec le taux observé chez la référence du
marché — le différenciateur de WIZAFI n'est pas un taux plus bas, mais l'absence de quota
prépayé et un retrait sans friction.

**Exemple chiffré, ticket à 500 XAF :**
```
Client paie              500 XAF
CamPay prélève (~2%)     -10 XAF   (frais technique, absorbé par WIZAFI)
Commission WIZAFI (10%)   50 XAF   → marge nette WIZAFI ≈ 40 XAF
Solde crédité opérateur  450 XAF
```

**Vigilance sur les très petits tickets (ex. 100 XAF) :** vérifier au moment de l'intégration
si CamPay applique, en plus du pourcentage, un **frais minimum fixe** par transaction — si ce
plancher existe et dépasse la commission calculée en %, la marge de WIZAFI sur ce ticket
précis pourrait être négative. À 10%, le risque est faible (commission de 10 XAF sur un
ticket à 100 XAF) mais reste à confirmer dans la documentation CamPay à jour avant mise en
production. Si nécessaire, implémenter un plancher :
`commission = max(taux × montant, plancher_fixe_configurable)`.


**Retraits : sur demande, jamais automatique par transaction.** Un versement Mobile Money à
chaque vente engendrerait des frais de transfert disproportionnés sur de petits montants
(un ticket à 100 XAF, par exemple). Le solde s'accumule, l'opérateur déclenche un retrait
quand il le souhaite, avec un seuil minimum (ex. 1000 XAF) pour éviter les micro-retraits.

**Traitement du retrait en MVP** : demande créée par l'opérateur → statut `PENDING` →
traitement **manuel** par l'administrateur de la plateforme via un virement Mobile Money
classique → statut `PAID` (ou `REJECTED` avec motif). L'automatisation complète (API de
disbursement CamPay, si disponible) est une amélioration V2, pas un prérequis MVP.

**Point de vigilance légale — à vérifier avant tout lancement commercial réel.** Ce modèle
fait de WIZAFI un intermédiaire qui détient transitoirement les fonds des clients. Selon la
réglementation camerounaise et les conditions contractuelles de CamPay, cela peut relever d'un
statut particulier (établissement de monnaie électronique, partenariat avec un PSP agréé,
etc.). **Ce point n'est pas tranché ici** — à vérifier directement auprès de CamPay et, si
besoin, d'un conseil juridique local avant toute mise en production commerciale à des tiers.
Pour un usage limité à ta propre Wifi Zone, ce risque reste minime ; il devient réel au moment
de facturer d'autres opérateurs.

---

## 2. LE MÉCANISME DE RÉFÉRENCE

```
1. Client connecté au Wifi (ouvert) → portail captif MikroTik
2. Bouton "Acheter" → page de paiement de la plateforme
   (Walled Garden : le MikroTik autorise ce trafic précis avant authentification)
3. Client choisit un forfait, paie par Mobile Money (CamPay)
4. CamPay notifie la plateforme via webhook SIGNÉ (vérification obligatoire)
5. La plateforme, dès confirmation :
   a. Crée le ticket via l'API MikroTik (username/password + profile)
   b. Affiche le code au client (canal principal, toujours actif)
   c. SI SMS activé par l'opérateur → envoi en plus (jamais bloquant)
6. Le client retape le code sur le portail → le MikroTik applique lui-même
   la durée, la vitesse, le nombre d'appareils via le Profile assigné
```

**Règle absolue** : jamais de ticket "réussi" côté client tant que le webhook serveur n'a pas
confirmé le paiement. Le navigateur du client n'est jamais la source de vérité.

---

## 3. ARCHITECTURE RÉSEAU — connexion au MikroTik (correction majeure v3)

### Erreur corrigée depuis la V2
La V2 affirmait que MikroTik Cloud DDNS suffisait à rendre un routeur derrière CGNAT Starlink
joignable depuis Internet. **C'est faux.** Le DDNS résout un nom vers une adresse, mais ne
permet pas à une connexion entrante de traverser un CGNAT qui la bloque par nature.

### Deux modes de connexion, à prévoir dans le modèle de données dès maintenant

**Mode A — Direct (pour le MVP, sur IP publique ou réseau non-CGNAT)**
```
VPS → HTTPS → API REST MikroTik
```
Protections minimales obligatoires même en MVP : compte API dédié (jamais le compte admin),
permissions API strictement limitées, règle firewall MikroTik n'acceptant les connexions API
que depuis l'adresse IP fixe du VPS.

**Mode B — Tunnel WireGuard (recommandé dès qu'on sort du prototype personnel)**
```
MikroTik ──── connexion sortante WireGuard ────► VPS
```
Le MikroTik initie lui-même la connexion vers le VPS — fonctionne même derrière un CGNAT
strict, puisque c'est une connexion sortante. C'est le mode à activer avant de commercialiser
la plateforme à d'autres opérateurs.

**Validation externe de ce choix** : TICKETWIFI elle-même recommande à ses utilisateurs un
service tiers (MikroTunnel) pour l'accès distant sécurisé à leurs MikroTik — confirmation que
l'architecture à privilégier sur ce marché est bien un tunnel VPN, pas une exposition directe.
WIZAFI a l'avantage de l'intégrer nativement plutôt que de renvoyer vers un service externe.

**Décision pour ce projet** : construire le modèle de données pour accepter les deux modes
dès le départ (`Router.connection_mode: "direct" | "wireguard"`), développer et valider
d'abord en Mode A sur mon propre MikroTik, ajouter le Mode B avant toute vente à un tiers.

### Mode de développement local (précision V5)

Pendant toute la phase de développement, l'application tourne **sur le PC de développement,
lui-même branché sur le réseau du MikroTik**. Le routeur est donc joignable directement à son
adresse LAN (`https://192.168.88.1/rest`) : ni CGNAT, ni DDNS, ni tunnel ne sont nécessaires
pour développer et tester les Phases 1 à 6. La question de l'accès distant ne se pose qu'au
moment de déployer sur le VPS (Phase 7), et c'est précisément là que le Mode B intervient.

Conséquence pratique : `Router.ddns_or_ip` accepte aussi bien une adresse LAN qu'un nom DNS
public. Ne pas coder de validation qui rejetterait une adresse privée.

---

## 4. STACK TECHNIQUE

### Next.js 16 (App Router) + TypeScript
Un seul framework pour frontend (page d'achat, dashboard) et backend (routes API, webhooks).

**Version corrigée en V5 :** Next.js 15 passe en fin de support le 21 octobre 2026. Le projet
démarre donc sur **Next.js 16** (Active LTS jusqu'en octobre 2027), sur **Node.js 24 LTS**.
Ne figer aucun numéro de version mineure dans ce document : installer la dernière 16.x
disponible au moment du `create-next-app`.

### PostgreSQL + Prisma
Toutes les données au même endroit. Transactions, contraintes d'unicité, JSON natif.

### File d'attente : pg-boss (dans PostgreSQL, pas de Redis)
Le worker pg-boss tourne **dans le même conteneur** que l'application Next.js au démarrage
(un seul processus qui lance les deux) — ce n'est pas un troisième service à héberger, juste
un processus supplémentaire dans le même conteneur. Séparable en conteneur distinct plus tard
si la charge l'exige.

**Ce qui passe par pg-boss (asynchrone, avec retry) :**
- Création de ticket sur le MikroTik après paiement confirmé
- Healthcheck périodique des routeurs
- Envoi SMS (si activé)
- **Expiration des transactions non payées** (ajout V5) : job périodique, toutes les minutes,
  qui bascule en `PAYMENT_EXPIRED` toute transaction restée en `CREATED` ou
  `PAYMENT_PENDING` au-delà du délai défini en section 5. Sans ce job, ces transactions
  resteraient en attente indéfiniment et fausseraient les statistiques.

**Ce qui reste synchrone (jamais mis en file) :**
- Lecture des forfaits, tableau de bord, tests de connexion manuels

### Authentification
**Google OAuth + email/mot de passe dès la Phase 1**, via Auth.js. Cette authentification
concerne uniquement le *gérant* de la Wifi Zone qui se connecte au tableau de bord — jamais
le client final qui achète un ticket (lui n'a besoin d'aucun compte, voir section 9). Le report
évoqué dans une version antérieure de ce document ne se justifiait que si l'auth touchait le
parcours d'achat du client, ce qui n'est pas le cas : Google OAuth peut donc être posé dès le
départ sans risque sur la conversion des ventes.

### Paiement : CamPay
Frais et endpoints à **revérifier dans leur documentation au moment de l'intégration** — les
conditions d'une API tierce peuvent évoluer, ne pas figer de chiffre en dur dans le code.
Le code d'appel reste isolé dans un seul module (`lib/payments/campay.ts`) derrière une
interface minimale, pour pouvoir ajouter un second fournisseur plus tard sans réécrire le reste.

### Génération des codes tickets
**Générateur aléatoire cryptographiquement sûr** (module `crypto` de Node, jamais
`Math.random()`), alphabet excluant les caractères ambigus :
```
ABCDEFGHJKLMNPQRSTUVWXYZ23456789
```
Deux modes possibles, au choix de l'opérateur par forfait :
- Simple : `username = password = code`
- Renforcé : `username = code`, `password = code différent`

### Hébergement
VPS 2 vCPU/4 Go + Docker Compose (`app`, `db`). **Backup PostgreSQL automatique quotidien vers
un stockage externe au VPS** — un VPS n'est pas un backup en soi.

---

## 5. MODÈLE DE DONNÉES

```
Operator
  - id, email, password_hash, name, phone, country,
    sms_enabled (bool, def. false), commission_rate (def. 0.10),
    balance (solde retirable, entier XAF — voir règle d'unité ci-dessous),
    created_at

Site (nouveau depuis v3 — regroupe les routeurs d'un même lieu/opérateur)
  - id, operator_id (FK), name, address

Router
  - id, site_id (FK), name, connection_mode ("direct" | "wireguard"),
    ddns_or_ip, wireguard_pubkey (nullable), api_username,
    api_password_encrypted, hotspot_dns_name, public_slug (aléatoire, pas
    d'ID séquentiel exposé), status ("online"|"offline"), last_checked_at

Plan (le forfait commercial — distinct du profil technique MikroTik)
  - id, router_id (FK), name, duration_label, price, currency,
    mikrotik_profile_name (correspond à un User Profile réel du MikroTik,
    vérifié par API au moment de la création du Plan), active (bool)

Transaction — état explicite, jamais binaire
  - id, plan_id (FK), customer_phone, amount, currency,
    campay_reference (unique, contrainte DB pour empêcher les doublons),
    status: CREATED → PAYMENT_PENDING → PAYMENT_CONFIRMED → TICKET_PENDING
            → COMPLETED
            (ou PAYMENT_FAILED / PAYMENT_EXPIRED / TICKET_FAILED)
  - created_at, confirmed_at, expires_at (horodatage d'expiration du paiement)

Ticket — jamais supprimé, même expiré
  - id, transaction_id (FK, contrainte unique : une transaction = un seul ticket),
    router_id, plan_id, username, password,
    status: CREATED → ACTIVATED → EXPIRED (ou DISABLED)
  - mikrotik_creation_status ("pending"|"success"|"failed"),
    mikrotik_creation_attempts, created_at, expires_at (indicatif, calculé
    localement pour les statistiques — le MikroTik reste la seule autorité
    réelle sur l'expiration effective)

Payout (demande de retrait — section 1bis)
  - id, operator_id (FK), amount, status ("pending"|"paid"|"rejected"),
    rejection_reason (nullable), requested_at, processed_at,
    processed_by (identifiant admin ayant traité manuellement en MVP)
```

**Règle d'unité monétaire (V5) — à ne jamais enfreindre.** Le franc CFA n'a pas de
subdivision en usage. Tous les montants de la base — `Plan.price`, `Transaction.amount`,
`Operator.balance`, `Payout.amount` — sont des **entiers, en XAF**, jamais des décimaux et
jamais des centimes. Un seul type (`Int` côté Prisma), une seule unité, aucune conversion
nulle part. La commission se calcule avec un arrondi explicite à l'entier inférieur
(`Math.floor`), le reliquat restant acquis à WIZAFI.

**Délai d'expiration du paiement (V5).** Une transaction créée mais non confirmée expire au
bout de **15 minutes** (valeur configurable en variable d'environnement, pas en dur). Passé ce
délai, le job d'expiration de la section 4 la bascule en `PAYMENT_EXPIRED`. Un webhook CamPay
arrivant après coup sur une transaction expirée doit malgré tout être honoré : si le paiement
est réellement confirmé, la transaction repart en `PAYMENT_CONFIRMED` et le ticket est créé —
le client a payé, il doit recevoir son ticket. L'expiration est un nettoyage d'affichage,
pas un refus de vente.

**Isolation multi-opérateur dès le schéma** : toute requête doit systématiquement filtrer par
`operator_id` (via les relations Site → Router → Plan). Pas de logique de rôles/permissions
complexe pour l'instant (un seul utilisateur par compte au départ) — juste l'isolation stricte
des données entre comptes, qui coûte peu à poser maintenant et coûterait cher à ajouter après.

---

## 6. FIABILITÉ — création de ticket et gestion des échecs

### Idempotence stricte
Contrainte unique en base sur `Transaction.campay_reference` ET sur `Ticket.transaction_id` —
un même webhook reçu plusieurs fois (comportement normal côté passerelles) ne doit jamais
produire deux tickets.

### Distinguer erreur temporaire et erreur définitive
```
Timeout / routeur injoignable  → retry automatique (backoff : 5s, 15s, 1min, 5min)
Erreur d'authentification API  → alerte opérateur immédiate, pas de retry aveugle
Profil MikroTik inexistant     → erreur définitive, pas de retry — vérifier la
                                   config du Plan
```
Après épuisement des retries sur une erreur temporaire → `TICKET_FAILED`, alerte opérateur,
**jamais de remboursement automatique** au premier échec (le ticket peut encore être créé
manuellement une fois le routeur de nouveau joignable).

### Filet de secours opérateur
Prévoir dans le dashboard un bouton **"Réessayer"** sur une transaction en échec, et un
**"Créer un ticket manuellement"** pour continuer à servir les clients même si CamPay ou le
MikroTik est temporairement indisponible.

### Créditer le solde de l'opérateur — uniquement à `COMPLETED`
Le crédit du `Operator.balance` (montant moins commission) ne doit avoir lieu **qu'une fois
le ticket effectivement créé avec succès** (`Transaction.status = COMPLETED`), jamais dès la
confirmation du paiement seule. Sinon un opérateur pourrait être crédité pour une vente dont
le client n'a en réalité jamais reçu de ticket (cas `TICKET_FAILED`). Opération à exécuter dans
la même transaction base de données que le passage à `COMPLETED`, pour éviter tout écart entre
les deux.

---

## 7. WALLED GARDEN

Avant authentification, le client doit pouvoir atteindre uniquement : le domaine de la
plateforme, et celui de CamPay. **Minimal, jamais "tout Internet" ni "tout CamPay sans
distinction".** Le dashboard doit afficher à l'opérateur la liste exacte des domaines à
whitelister pour son installation précise, avec si possible un script `/tool fetch` prêt à
coller dans WinBox.

---

## 8. SÉCURITÉ — non négociable dès le MVP

- Secrets MikroTik et CamPay **chiffrés en base** (AES-256-GCM, clé maîtresse en variable
  d'environnement, jamais en dur)
- HTTPS partout
- Vérification de signature systématique sur le webhook CamPay
- Rate limiting sur `/pay/*` et `/webhook/*`
- **Jamais** d'identifiant MikroTik ni de clé API transmis au navigateur du client — toute
  communication avec le routeur transite exclusivement par le serveur
- URLs publiques (`/pay/<slug>`) en identifiant aléatoire, jamais un ID séquentiel
- Le healthcheck périodique doit tester une **vraie requête API authentifiée**, pas un simple
  ping ICMP (un routeur peut répondre au ping avec une API pourtant hors service)

---

## 9. PARCOURS D'ACHAT — mobile-first, minimal

Pas de compte client à créer — juste un numéro Mobile Money, e-mail facultatif. Toute
friction supplémentaire réduit directement le taux de conversion. Le lien collé sur le portail :
```html
<a href="https://[domaine]/pay/<public_slug>">Acheter un ticket</a>
```

---

## 10. TABLEAU DE BORD — structure de référence

Cette structure s'appuie sur l'observation directe de l'interface TICKETWIFI (captures
d'écran réelles) — on en reprend les composants d'UX qui font leurs preuves, en écartant
explicitement ce qui ne correspond pas au modèle économique de WIZAFI.

**Explicitement écarté, par choix assumé** : tout système de crédit prépayé avec commission
fixe et seuil de recharge minimum (mécanisme observé chez TICKETWIFI : quota à recharger,
10% de commission dessus). Ce n'est pas un oubli — c'est précisément le type de friction que
WIZAFI cherche à éviter. Le paiement CamPay va directement à l'opérateur, sans quota
intermédiaire à gérer.

**Page d'accueil du dashboard**
- Cartes de synthèse : solde disponible, tickets vendus aujourd'hui, recettes du jour,
  recettes du mois
- Graphique d'évolution des ventes (bascule Aujourd'hui / 7 jours / 30 jours / Ce mois)
- Liste "Ventes du jour" avec export/impression

**Page Routeurs**
- Liste des routeurs avec : nom, DNS Name, contact d'assistance, plateforme, statut
  (actif/hors-ligne), actions (modifier/supprimer)
- Recherche par nom, référence, DNS, téléphone
- Bouton "Ajouter un routeur"

**Page Tarifs (nos Plans)**
- Liste des forfaits par routeur, avec prix et durée
- Lien direct pour générer le bouton HTML à coller sur le portail

**Page Ventes / Recettes avancées**
- Filtres combinables : routeur/hotspot, plage de dates, statut de la transaction,
  recherche libre (référence, téléphone client)
- Graphique d'évolution avec bascule Barres/Courbe, option de comparaison à la période
  précédente
- Répartition **par hotspot** et **par réseau** (utile dès qu'un opérateur gère plusieurs
  Sites/Routers — cohérent avec notre modèle de données Site → Router)
- Activité par heure de la journée — utile pour identifier les pics de charge

**Page Retraits**
- Solde disponible, cumuls en attente / payés / rejetés (globaux et sur la période)
- Historique filtrable par référence, promoteur, numéro, montant, statut
- Demande de retrait déclenchée par l'opérateur — traité manuellement en MVP, automatisable
  plus tard une fois le volume établi

**Page Santé du système** (déjà prévue section 6, formalisée ici)
- Statut de chaque routeur (en ligne / hors-ligne), horodatage de la dernière vérification
- Historique des échecs de création de ticket, avec bouton "Réessayer"

---

## 11. STRUCTURE DE DOSSIERS

```
/app
  /(public)/pay/[slug]
  /(dashboard)/{login,sites,routers,plans,transactions,payouts,health,settings}
  /api/webhooks/campay
  /api/routers/[id]/{verify,profiles}
/lib
  /mikrotik/{client.ts, ticket-generator.ts}
  /payments/campay.ts
  /queue/{setup.ts, ticket-creation.job.ts, router-healthcheck.job.ts,
          transaction-expiry.job.ts}
  /crypto/encryption.ts
/prisma/schema.prisma
/docs/walled-garden-setup.md
```

---

## 12. ORDRE DE DÉVELOPPEMENT

**Phase 0 — Fondations**
Next.js 16 + Prisma + PostgreSQL + Docker Compose (2 conteneurs). Schéma complet (section 5)
posé dès maintenant, même si toutes les tables ne sont pas encore utilisées. Dépôt Git
initialisé et `.env` exclu du dépôt dès le premier commit.

**Phase 1 — MikroTik seul, sans paiement**
Wrapper API REST, création/suppression manuelle de ticket testée en dur, healthcheck réel.
**Ne pas toucher à CamPay avant que cette phase soit solide.**

**Phase 2 — Dashboard minimal**
Login email/mot de passe + Google OAuth (gérant uniquement), gestion Sites/Routers/Plans.

**Phase 3 — Paiement sandbox**
Formulaire CamPay, webhook, vérification de signature, machine d'état de la Transaction.

**Phase 4 — Liaison complète**
Paiement confirmé → pg-boss → création ticket → affichage. Tester avec de petits montants
réels (limite sandbox CamPay).

**Phase 5 — Fiabilité**
Retries différenciés, idempotence vérifiée, alertes, boutons de secours manuel.

**Phase 6 — Portail et UX**
Walled Garden documenté, lien d'achat mobile-first.

**Phase 7 — Avant toute commercialisation à un tiers**
Mode WireGuard, audit de sécurité, tests de charge légers.

---

## 13. HORS SCOPE MVP — feuille de route V2/V3 (à ne pas construire maintenant)

Rôles utilisateurs multiples (OWNER/ADMIN/OPERATOR/VIEWER) · vente comptoir intégrée ·
impression thermique · WhatsApp · plusieurs passerelles de paiement ·
abonnements et facturation SaaS · conformité réglementaire télécom camerounaise (à étudier
séparément avant toute commercialisation à des tiers, hors sujet technique).

---

## 14. CE QUE JE VEUX QUE TU (Claude Code) FASSES EN PREMIER

1. Initialise Next.js 16 + TypeScript + Prisma, structure section 11
2. Schéma Prisma complet (section 5), première migration
3. Docker Compose : `app` (Next.js + worker pg-boss dans le même processus) + `db`
4. Wrapper MikroTik REST (`lib/mikrotik/client.ts`) : test de connexion, création de ticket,
   liste des User Profiles — **valide cette phase avant de passer à la suivante**
5. Explique-moi à chaque étape ce que fait le code et pourquoi, je suis débutant en
   développement

Pose des questions si un point n'est pas assez précis. Nom de la plateforme : placeholder
`WIZAFI` / variable d'environnement `APP_NAME`, à définir plus tard.
