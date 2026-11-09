# v3.758.0 — Talents : le bouton « Apprendre » ne déborde plus (remarque de Seb, 09/11)

Constat (mesuré dans Chromium à 390 px) : dans le panneau du talent choisi, le bouton « Apprendre » allait de 264 à 404 px, pour un panneau qui s'arrête à 386 px et un écran de 390. Il était coupé de 14 px au bord. Cause : le minimum de 140 px des boutons du kit (v3.719.0) dans une colonne de 110 px au plus. L'Équipement avait reçu la même exception à l'époque (`hs-edetail-act`), pas les Talents.

- `css/04-panel-heros-screens.css` : `.hst-detail-act` à 128 px (la colonne de l'Équipement) ; son bouton prend la largeur de la colonne, sans le minimum de 140 px.
- Mesuré à 320, 390 et 430 px : le bouton tient dans le panneau, « Apprendre » et « Rang suivant » sans texte coupé.
- Le style général de l'écran Talents (sélecteur Classe / Commandement, bandeau des points, panneau de détail, d'avant le kit) n'est pas touché : atelier proposé, non demandé pour l'instant.
- Quoi de neuf : une ligne (FR + EN).
- `tools/harness/round-harness.js` : section [510].

Contrôles : round-harness 7 281 OK, 0 échec (×2) ; boot 4 OK ; création du héros 44 OK ; i18n 8 963 textes, 100 % ; parcours 235 OK.
