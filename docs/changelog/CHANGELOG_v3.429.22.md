# Aethervale v3.429.22 — Entrepôt : menu « Afficher » compact ; les menus s'ouvrent en entier

Atelier `atelier/menu-entrepot.html`, validé par Seb sur iPhone. S'applique sur la v3.429.21.

## Le constat, mesuré dans le jeu
- Le menu de l'Entrepôt fait 364 px (9 entrées et « Choisir ma sélection… »).
- À 390×844, il dépassait de 64 px sous la barre du bas, et « Choisir ma sélection… » était coupé. À 375×667, il dépassait de 235 px.

## Le correctif
- **Menu compact.** « Tout » reste en pleine ligne. Matières brutes, Fabriqué, Rare et Ma sélection passent en grille de 2 × 2. Sous « État », Pleins et En fabrication sont côte à côte. « Choisir ma sélection… » reste en bas. Le menu passe de 364 à 252 px (272 px avec une police plus large).
- **Noms longs.** Un nom trop long passe sur deux lignes au lieu d'être coupé (« Matières brutes » sur iPhone SE). Le nombre reste entier dans sa case.
- **Ouverture.** À l'ouverture, la zone défile juste ce qu'il faut pour montrer le menu entier (`revealDropdownMenu`). C'est partagé avec le Sac. Sur l'écran du Village, chargé en haut, c'est ce qui rend le menu entier visible sur iPhone SE.

## Mesures dans le jeu (ouverture depuis le haut de l'écran)
| Écran | Sac | Entrepôt |
|---|---|---|
| 375×667 | entièrement visible | entièrement visible (défilement automatique de 125 px) |
| 390×844 | entièrement visible | entièrement visible |
| 430×932 | entièrement visible | entièrement visible |
- Avec le texte des cases grossi jusqu'à 16 px : le nombre garde 7 px de marge dans sa case, et aucun nom n'est coupé.

## Code
- `js/ui/warehouse-view.js` : menu de l'Entrepôt et `revealDropdownMenu`.
- `js/ui/heros-screens-view.js` : le Sac appelle `revealDropdownMenu` à l'ouverture.
- `css/04-panel-village.css` : grille commune (`.wh-dd-grid`, `.wh-dd-cap`, `.wh-filter-wide`).
- `js/lang/en.js` : clé « État ».
- `atelier/menu-entrepot.html` : prototype.
- Aucun fichier protégé touché. Aucun fichier ajouté au jeu.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK. i18n : 4 204 textes, 100 %, 0 orphelin.
- `node --check` sur les fichiers modifiés.
