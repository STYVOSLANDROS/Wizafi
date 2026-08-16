# Walled Garden — configuration MikroTik

Référence : spec §7. Avant que le client ne soit authentifié sur le hotspot, il doit pouvoir
atteindre **uniquement** ce qui est strictement nécessaire pour payer et recevoir son ticket —
jamais "tout Internet", jamais "tout un domaine tiers sans distinction".

## Ce qu'il faut whitelister

### 1. Le domaine de la plateforme (obligatoire)

Le client doit pouvoir atteindre ton installation WIZAFI (`APP_DOMAIN` dans `.env`) pour :
- charger la page d'achat `/pay/<slug>`
- soumettre le formulaire de paiement
- voir la page de statut et son ticket

### 2. Le domaine CamPay (à confirmer selon le flux réellement utilisé)

L'intégration actuelle (`lib/payments/campay.ts`) utilise l'endpoint `/collect/` : le paiement se
déclenche via une notification USSD directement sur le téléphone du client, **pas** via une
redirection de son navigateur vers un site CamPay. Dans ce cas précis, le navigateur du client
n'a normalement pas besoin d'atteindre un domaine CamPay.

**Cela dit**, si vous passez un jour à leur flux de paiement hébergé (lien de paiement CamPay,
redirection du navigateur), il faudra alors whitelister leur domaine de paiement — à confirmer
dans leur documentation à jour au moment de l'intégration (spec §4 : ne rien figer en dur sans
vérification). Ce point n'a pas pu être vérifié depuis l'environnement de développement utilisé
pour construire cette première version (accès à leur documentation bloqué) — à revérifier avant
la mise en production.

## Script à coller dans WinBox (Terminal)

Remplace `TON-DOMAINE` par la valeur de `APP_DOMAIN` (sans le `https://`).

```
/ip hotspot walled-garden
add dst-host=TON-DOMAINE action=allow comment="WIZAFI - plateforme"
add dst-host=*.TON-DOMAINE action=allow comment="WIZAFI - sous-domaines eventuels"
```

Le dashboard (page **Routeurs → Walled Garden**) génère ce script automatiquement avec ton
vrai domaine — copie-colle directement depuis là plutôt que de le retaper à la main.

## Vérification

Une fois le script appliqué, débranche-toi du Wifi (ou ouvre une session invité), tente
d'atteindre un site quelconque (ex. google.com) : il doit être bloqué par le portail captif.
Puis ouvre la page d'achat (`https://TON-DOMAINE/pay/<slug>`) : elle doit se charger normalement
alors que tu n'es pas encore authentifié — c'est la preuve que le Walled Garden fonctionne.
