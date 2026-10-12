# Aethervale v3.448.5 — Lisibilité : contrastes, textes à 12 px, zones de toucher

Suite de l'audit du 11/10 (interface mobile, points 2 à 4). Atelier validé par Seb : `atelier/lisibilite.html`. S'applique sur la v3.448.4.

## Ce qui change
- **Contrastes sur le parchemin** (cible 4,5:1) :
  | Jeton | Usage | Avant | Après |
  |---|---|---|---|
  | `--nb-ink-dim` #8a7a5c → **#6b5d45** | texte secondaire (127 usages) | 3,2 à 3,6:1 | 4,8 à 5,4:1 |
  | `--nb-gold-deep` #8a5c14 → **#7c5114** | or de texte : récompenses, « Histoire », progression | 4,5 à 5,0:1 | 5,3 à 5,9:1 |
  | `--nb-green-text` **#1e7236** (nouveau) | soin au camp, rations, caravane | 3,6 à 4,0:1 | 4,6 à 5,1:1 |
  - L'or de la carte (« 50 or », boss d'aventure) quitte `--nb-gold` (1,7:1) pour `--nb-gold-deep`.
  - La palette générée (`--c-*`) n'est pas touchée.
- **Textes à 12 px** (avant 10 à 11 px) : niveau, PV et XP du haut ; PV du feu de camp ; en combat, « À toi », « Niv. », « Prêt », « à distance », coûts des techniques et « / 391 ».
  - Sous 360 px de large (iPhone SE), « Prêt » s'efface pour garder le nom du compagnon entier, comme dans une équipe à trois.
- **Surface de toucher de 44 px**, sans changer la taille visible : « ? » du Camp, croix des feuilles, pastilles du combat (Fuir, vitesse), « à distance », badges de traits, « Voir les quêtes terminées », bulles du dock, liens `.klink`, boutons d'expédition.
  - Pseudo-élément `::after` transparent et centré (`00-components.css`).
  - Vérifié dans Chromium : le « ? » du Camp passe de 0 à 3 côtés touchables sur 4, la petite bulle du dock et les pastilles du combat à 4 sur 4 ; aucune zone ne prend le toucher d'un bouton voisin.

## Mesure (Chromium, 8 écrans × 390 et 320 px)
- Textes sous 12 px : 3 à 5 par écran → **0**.
- Contrastes sous 4,5:1 détectés : 2 à 5 par écran → **0** (reste le « 391 / 391 » posé sur la jauge verte, faux positif de l'outil).
- Aucun débordement horizontal, aucune erreur de page. Captures identiques à celles de l'atelier (hors halo animé du dock et initiative tirée au hasard).

## Non traité
- Les autres jauges du jeu restent à leur taille (base `.kgauge-text` à 11 px, résumé du héros à 10 px) : hors des écrans validés à l'atelier.
- Point 1 de l'audit (zone sûre du bas iPhone) : clos, aucun problème constaté par Seb. Point 5 (bulles du dock à 320 px) : non retenu pour l'instant.

## Code
- `css/00-tokens.css`, `css/00-components.css`, `css/02-layout.css`, `css/03-combat-screen.css`, `css/04-panel-camp.css`, `css/04-panel-village.css`, `css/06-map.css`.
- `tools/harness/round-harness.js` : section [229] (8 contrôles).
- Aucun fichier ajouté, aucun fichier protégé touché.

## Contrôles
- Round : **4 240 OK**, 0 échec, sur trois passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- `missing-icons.js` : inchangé (les 6 icônes d'objets de combat).
