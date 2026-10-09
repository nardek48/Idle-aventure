# Aethervale v3.429.21 — Sac : menu « Afficher » compact, Autovente sortie du menu

Retour de Seb (captures iPhone : « Autovente… » coupé sous le cadre). Atelier `atelier/menu-sac.html`, options A + C validées sur iPhone. S'applique sur la v3.429.20.

## Le constat, mesuré dans Chromium
- Le menu faisait 359 px de haut et s'ouvrait dans la zone défilante du panneau, qui le coupe au-dessus de la barre du bas.
- Avec l'encoche et la barre d'état, le bas du menu passe sous le cadre : « Autovente… » était coupé, voire impossible à toucher.
- À 375×667, le menu dépassait de 9 px.

## Le correctif
- **A.** « Tout » reste en pleine ligne. Armes, Armures, Bijoux et Potions passent en grille de 2 × 2, avec leur nombre. « Mieux que l'équipé » et le tri ferment le menu.
- **C.** « Autovente » devient un bouton à côté du compteur d'objets. Il ouvre « Réglages du sac », comme avant.
- Le menu prend toute la largeur de la ligne, sous le bouton Autovente compris.
- Le nom d'une catégorie rétrécit (…) au besoin ; le nombre reste toujours entier dans sa case. La police d'iOS, plus large, poussait les nombres hors des cases du prototype.
- Le bouton Autovente s'élargit avec son texte.
- Le menu de l'Entrepôt reçoit seulement le correctif partagé du nom qui rétrécit.

## Mesures dans le jeu
| Écran | Menu | Marge au-dessus de la barre du bas |
|---|---|---|
| 375×667 | 228 px | 11 px |
| 390×844 | 228 px | 182 px |
| 430×932 | 228 px | 260 px |
- Avec le texte des cases grossi jusqu'à 16 px : le nombre garde 7 px de marge dans sa case, et aucun nom n'est raccourci.
- Bouton Autovente : il s'élargit avec son texte (74 px en 12 px, 90 px en 15 px), et la ligne ne déborde jamais.

## Reste à décider
- Le menu de l'Entrepôt (9 entrées et « Choisir ma sélection… ») fait 364 px. Il dépasse de 235 px à 375×667 et de 64 px à 390×844 ; « Choisir ma sélection… » y est coupé.

## Code
- `js/ui/heros-screens-view.js` : menu du Sac et bouton Autovente.
- `js/ui/warehouse-view.js` : nom des lignes dans un `span`.
- `css/04-panel-heros-screens.css`, `css/04-panel-village.css` : styles.
- `atelier/menu-sac.html` : prototype.
- Aucun fichier protégé touché. Aucun fichier ajouté au jeu.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages (dont la règle des 12 px minimum). Boot : 4 OK. Création du héros : 44 OK. i18n : 4 203 textes, 100 %, 0 orphelin.
- `node --check` sur les fichiers modifiés.
