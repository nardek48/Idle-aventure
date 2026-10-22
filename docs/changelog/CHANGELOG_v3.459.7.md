# v3.459.7 — Lot 9c : l'ancienne couche de l'écran de combat est retirée (audit O13, phase 1)

Depuis v3.427.0, l'écran de combat est dessiné par `ui/combat-screen-view.js`, qui redéfinissait les fonctions de l'ancien écran. L'ancien code restait chargé sans jamais servir.

## JS
- `combat-view.js` : 799 → 236 lignes. Restent les services encore appelés : barre des préparatifs, feuilles de sortie et des états (fermeture), progression de mission, `confirmFlee`, raccourcis clavier, `setHtmlIfChanged`.
- `combat-group-view.js` : 372 → 90 lignes. Restent la cible collante, le portrait d'un ennemi, les actions d'un compagnon en Manuel et la feuille « Qui soigner ? ».
- Retirés (jamais appelés) : l'ancien squelette, le bandeau d'alerte, la rangée d'états, les boutons de classe et de potion, la barre de ressource, les rangées d'ennemis et d'alliés, le cadre de compagnon. `COMBAT_STATES_MAX_VISIBLE` part avec la rangée d'états.
- `combat-screen-view.js` expose quatre constructeurs au harnais (carte du héros, carte d'un compagnon, repère d'un ennemi, actions d'un compagnon). Aucun changement de rendu.
- 28 traductions orphelines retirées.

## CSS
- Environ 1 650 lignes retirées dans `03-combat.css`, `03-combat-v2.css` et `03-combat-group.css` (+ 3 règles de jauge dans `00-kgauge.css`, 1 dans `07-responsive.css`, 1 dans `99-icon-assets.css`). `03-combat-group.css` ne garde que les feuilles de soin et de sortie, et le bouton d'alerte de l'aperçu des tutoriels.
- `tools/audit/css-dead.js` relève aussi les ID morts.

## Harnais
- Les contrôles qui visaient l'ancien écran sont portés sur l'écran actuel (bandeau de la cible, puces d'alerte, pastilles, feuille des états, cartes de l'équipe, commandes, barre du haut). Les 13 contrôles qui ne lisaient que le CSS retiré sont retirés avec lui ([59], [63b], [76b], [77], [183]) ; [85] lit maintenant la pastille de touche de `03-combat-screen.css`.

## Signalé
- Deux images ne servent plus nulle part : `images/Buttons/bouton-attaque.webp` (ancien bouton Attaque) et `images/Borders/nom-ennemi.webp` (ancien cadre du nom de l'ennemi). S'y ajoute `images/UI/badges/badge-shield.webp`, signalée en v3.459.5.

## Contrôles
- Avant / après, à 390 et 320 px : combat de groupe, combat seul, Grimoire, feuilles des états, de sortie et « Qui soigner ? » identiques.
- round-harness 4524 OK, 0 échec (deux passes) ; boot OK ; parcours complets 139 OK ; i18n 100 %, 0 orphelin ; `css-dead.js` : 0 classe, 0 ID.
