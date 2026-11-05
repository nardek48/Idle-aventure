# v3.715.0 — Coque du téléphone : cadres à 4 px du bord, comme les cartes

Demande de Seb (05/11). Aucun état sauvegardé nouveau, aucun fichier ajouté.

## Livré

- **Cadre du haut** : `.hk-plate` à `calc(4px - 0,35 %)` / `calc(4px - 0,18 %)` (la marge transparente de l'image est déduite) : bord visible du cadre à 4 px du bord de la colonne, comme les cartes (`#panel-container .kfb`, 4 px). Avant : 6,6 / 4,7 px à 390 px.
- **Barre du bas** : `#tab-bar` à `min(386px, calc(100% - 6px))` au lieu de `min(404px, 94%)` : bord visible à 4 px. Avant : 11,7 px de chaque côté à 390 px. La barre garde ses proportions (un peu plus haute : ~87 px au lieu de ~83 à 390 px).
- Mesuré dans Chromium à 320, 390 et 430 px (élément puis marge de l'image) : cadre et barre à 4 px ± 0,3 du bord de la colonne de jeu.
- Quoi de neuf : une ligne FR + EN.

## Contrôles

- `node --check` sur chaque JS modifié.
- `round-harness.js` : 6 637 OK, 0 échec (deux passes) ; `boot-harness.js` 4/0 ; `hero-creation-harness.js` 44/0 ; `parcours-harness.js` 232/0.
