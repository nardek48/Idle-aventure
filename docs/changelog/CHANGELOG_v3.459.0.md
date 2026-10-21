# v3.459.0 — Lot 8c, quatrième dossier : ennemis et boss en WebP (audit O4)

## Retirés
- Les 12 PNG des portraits de héros, remplacés par du WebP en v3.458.9.

## Ennemis et boss en WebP
- 49 illustrations (`images/Enemies/`, `images/Boss/`), mêmes dimensions, qualité 75 : 12,7 → 3,8 Mo.
- Chemins : `enemies.js`, `bosses.js`, `elites.js`, `dungeon.js`, `labyrinth.js`, `tutorial-view.js`. Aucune sauvegarde ne garde ces chemins (les ennemis sont rebâtis depuis les données).
- Les JPG restent une version.

## Contrôles
- Les 49 WebP se décodent dans Chromium ; combat de la Crypte vérifié à l'écran ; `missing-icons.js` : les 24 mêmes absentes.
- round-harness 4545 OK, 0 échec (deux passes) ; boot, création du héros OK ; parcours complets 139 OK, 0 échec.
