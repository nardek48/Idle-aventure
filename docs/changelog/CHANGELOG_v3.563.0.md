# v3.563.0 — Les feuilles ne remontent plus en haut

Retour de Seb : dans les feuilles (zones de production, Entrepôt…), les boutons sont en bas. Après chaque validation, la feuille se redessinait et revenait en haut ; il fallait redescendre à chaque fois.

## Cause
La position était bien censée être gardée, mais le code lisait le défilement de `.ksheet-body`, qui ne défile pas (`overflow: visible`). C'est la feuille elle-même (`.full-menu`) qui défile. La valeur lue valait donc toujours 0.

## Correction
- Une aide commune dans `js/ui/modal.js` : `getSheetScroll(root)` lit le plus grand défilement entre `.full-menu` et `.ksheet-body`, et `setSheetScroll(root, top)` le remet sur les deux.
- Feuilles concernées : bâtiment de production (zones, ateliers), feuille d'atelier, Entrepôt, Campement › Expéditions (dont la caravane), Grand Ouvrage, bâtiments du Village (même fiche redessinée), feuilles du Héros, Grimoire, et les trois feuilles du donjon (entrée, campement, halte).
- Ouvrir une autre fiche repart toujours en haut.

Vérifié dans Chromium à 390 px : feuille défilée, puis redessinée comme après un clic.

| Feuille | Avant | Après |
|---|---|---|
| Production | 233 → 0 | 233 → 233 |
| Entrepôt | 121 → 0 | 121 → 121 |
| Grand Ouvrage | 300 → 0 | 300 → 300 |

## Fichiers
`js/ui/modal.js`, `production-view.js`, `warehouse-view.js`, `expeditions-view.js`, `grand-ouvrage-view.js`, `village-building-view.js`, `heros-view.js`, `grimoire-view.js`, `dungeon-view.js` ; harnais [378]. Aucun fichier ajouté.
