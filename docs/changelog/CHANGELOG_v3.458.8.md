# v3.458.8 — Lot 8c, deuxième dossier : Maps en WebP (audit O4)

## Retirés
- Les 55 PNG d'équipement, remplacés par du WebP en v3.458.7 (gardés une version, comme prévu).

## Maps en WebP
- 37 images (`images/Maps/`, `labyrinthe/`, `pa2/`, `parcours/`) : fonds de combat, cartes vivantes, cartes des Petites Aventures et des parcours, labyrinthe. 11,1 → 6,0 Mo.
- Dimensions gardées à l'identique : les cartes placent leurs points en pixels sur l'image (`width`, `height`, `start` de `pa2-maps.js`).
- Qualité 75 pour les illustrations (comparée à pleine résolution : pas de différence visible), 85 pour les PNG à transparence.
- Chemins changés : `worlds.js`, `living-maps.js`, `pa2-maps.js`, `labyrinth.js`, `tutorial-view.js`, `caravan-view.js`, `expeditions-view.js`, `04-panel-labyrinth.css` (61 références).
- Les JPG et PNG d'origine restent une version ; ils seront retirés à la suivante.

## Contrôles
- Les 37 WebP se décodent dans Chromium ; `missing-icons.js` : toujours les 24 mêmes absentes.
- round-harness 4543 OK, 0 échec (deux passes) ; 12 attentes de chemins mises à jour ; boot, création du héros OK ; parcours complets 139 OK, 0 échec.
