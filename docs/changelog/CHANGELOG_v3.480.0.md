# v3.480.0 — Refonte de l'économie, RE-3 : le Bois et le Fer partent en caravane

Lot F2 (débouchés des matières communes), mesuré au banc `tools/sim/debouches-bench.js` ; Seb retient l'option 1. Elle revient sur l'exclusion de la v3.421.0 (décision « B » : le Bois et le Fer manquaient aux constructions) : en fin de monde, ces deux matières n'avaient plus d'autre débouché que la Taverne.

## Ce qui change en jeu
- **La caravane de la Halle emporte aussi le Bois et le Fer**, avec la même règle que les autres matières : seulement ce qui dépasse la moitié du plafond et la réserve protégée de l'Entrepôt. Les planches et les lingots gardent toujours leur moitié.
- Le Fer vaut 3 or l'unité au trajet Long (le Bois 1).
- La fiche de la caravane ne dit plus « Le Bois et le Fer restent au village ».

## Mesures (`debouches-bench.js`, village fini au plafond du monde, 4 passages par jour)
| | Avant | Après |
| --- | --- | --- |
| Bois récolté par jour, Désert | 32 | 1 312 |
| Fer récolté par jour, Désert | 19 | 1 147 |
| Bois récolté par jour, Crypte | 28 | 2 442 |
| Or du surplus par jour, Désert | 10 521 | 12 401 (+18 %) |
| Or du surplus par jour, Crypte | 20 658 | 25 855 (+25 %) |

À 1 passage par jour : +20 % au Désert, +44 % à la Crypte. La quantité totale qui part en caravane ne change pas : c'est la capacité des caravanes qui borne, le Bois et le Fer prennent leur part.

## Code
- `systems/caravan-system.js` : `CARAVAN_EXCLUDED` vide.
- `ui/caravan-view.js` : une phrase retirée ; `lang/en.js` : sa traduction retirée.
- Aucun fichier protégé, aucun fichier ajouté.

## Outils
- `round-harness.js` :
  - section [301] (4 contrôles : Bois et Fer chargés au-dessus de la moitié, la moitié reste, or du trajet, fiche) ;
  - [191] : les ressources éligibles comprennent le Bois et le Fer ; le Bois protégé par sa réserve ne part pas.
- `debouches-bench.js` (nouveau banc, poussé le 25/10) : flux par ressource et par jour, scénarios A0 à A5.

## Contrôles
- i18n 100 %, aucun orphelin.
- round-harness 4875 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
