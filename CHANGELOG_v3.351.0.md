# Aethervale v3.351.0 — Harnais de parcours (H-0), et le vrai bug de l'écran de retour

Base : v3.350.0. Carte des systèmes v3.350.0, §7 : lot H-0 validé par Seb (25/09/2026).

**Aucun fichier JS nouveau dans le jeu** (précache inchangé, sauf `CACHE_VERSION`). **Aucun fichier protégé touché.**

## Ce que le harnais a trouvé dès son premier passage

**Un héros qui a un compagnon n'avait jamais d'écran de retour au démarrage.** C'est le vrai bug du matin du 25/09, que ni le code relu ni les bancs en VM n'avaient vu : aucun d'eux ne chargeait un héros avec Wenna.

- `CompanionManager.restore()`, appelé **pendant** `loadGame()`, relit les réglages de chaque compagnon par `setSetting()`.
- `setSetting()` **sauvegardait** à chaque appel (3 écritures par compagnon), ce qui avait deux effets :
  1. `lastOnline` repassait à maintenant, et l'écran de retour du démarrage ne voyait plus aucune absence ;
  2. la partie était écrite **à moitié restaurée**, en plein chargement.
- Depuis la v3.271.0 (réglages de Wenna), aucun héros avec compagnon ne voyait donc l'écran de retour **au démarrage**. La reprise de la PWA restée ouverte n'était pas touchée, et la production était bien rattrapée : seul l'écran manquait.

**Correctif** (`systems/companion-system.js`) : `setSetting(id, clé, valeur, silent)`. `restore()` passe `silent` et ne sauvegarde plus. Un réglage changé par le joueur sauvegarde toujours.

## Le harnais de parcours — `sim/parcours-harness.js` (nouveau, hors jeu)

- Le **vrai `index.html`**, servi en `http://127.0.0.1` par le script lui-même, service worker compris, dans **Chromium à la taille d'un iPhone** (390 × 844, tactile).
- Il fait les **gestes du joueur** : ouvrir l'app, la tuer, toucher « Continuer », « Charger », « Tout récolter », « ATTAQUER », changer d'onglet, fermer les tutoriels par « Compris ».
- Il vérifie **ce qui est à l'écran**. L'état interne ne sert qu'à fabriquer une partie de départ et à confirmer un effet (ressource créditée).
- L'absence se simule en vieillissant la sauvegarde entre deux ouvertures (toutes ses dates reculent).
- Une capture à chaque étape clé dans `sim/parcours/` (à ne pas livrer), et les erreurs de console contrôlées.

```
node sim/parcours-harness.js .          # les trois parcours
node sim/parcours-harness.js . P2 P5    # au choix
```

Prérequis, une fois sur le poste : `npm i -D playwright` puis `npx playwright install chromium`.

| Parcours | Ce qu'il joue | Contrôles | v3.350.0 | v3.351.0 |
| --- | --- | --- | --- | --- |
| **P2** Soir / matin | Village à 6 zones, Wenna en patrouille de 8 h, app tuée, 9 h plus tard « Continuer », écran de retour (9 h, Village, Wenna), « Tout récolter », Entrepôt crédité | 13 | **2 ✔, 8 ✘** (aucun écran de retour) | 13 / 13 |
| **P3** Deux héros | Nardek joué il y a 8 h, Luca il y a 1 h. « Continuer » propose Luca ; « Charger » Nardek : un seul écran de retour, 8 h, sauvegarde de Luca intacte ; Héros › Mes héros › Luca : son écran de retour | 9 | ✔ | 9 / 9 |
| **P5** Élite de la carte | Carte de la Forêt, secteur de l'Arbre-mère, carte d'entrée (portrait propre, « Élite »), combat, coup final, victoire « Nouveau trophée », Sève créditée | 12 | ✔ | 12 / 12 |

Les trois parcours passent **34 / 34, stables sur 2 passages**.

## round-harness.js — section [134] (nouvelle)

`loadGame()` d'un héros avec Wenna, absent depuis 9 h :

- aucune écriture pendant le chargement ;
- l'absence reste lisible (9 h) ;
- les réglages du compagnon sont relus.

Sur la v3.350.0, la section trouve **3 écritures** et une absence effacée.

## Contrôles

| Contrôle | Résultat |
| --- | --- |
| round-harness.js ([85] neutralisée) | 0 échec, 3 318 OK, 2 passages |
| boot-harness.js | 4 OK |
| hero-creation-harness.js | 44 OK |
| retour-demarrage-bench.js | 7 / 7 |
| **parcours-harness.js** | **34 / 34**, 2 passages |

## Fichiers

- `js/systems/companion-system.js`
- `round-harness.js`
- `sim/parcours-harness.js` : **NOUVEAU**, outil hors jeu, pas dans `index.html` ni au précache
- `js/core/constants.js` (`GAME_VERSION`), `sw.js` (`CACHE_VERSION`)

## Suite (H-1)

Les sept autres parcours de la carte des systèmes, dans l'ordre proposé :

- P4 : reprise en plein combat ;
- P7 : Petite Aventure et fuite ;
- P8 : défaite ;
- P6 : quête d'élite escortée ;
- P1 : premier lancement ;
- P9 : mise à jour du service worker ;
- P10 : réglages par appareil.
