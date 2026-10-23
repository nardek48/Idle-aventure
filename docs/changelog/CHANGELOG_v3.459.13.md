# v3.459.13 — Le butin des vagues de donjon suit le donjon (retour de Seb)

## Le défaut
La Tanière du Basilic ne donne que du Commun en fin de run, mais chaque monstre des 15 vagues lâche un objet une fois sur deux, et ce butin était tiré selon le monde où se trouve le héros. Faite depuis la Crypte, la Tanière, facile, donnait donc du Rare et de l'Épique, à la puissance de la Crypte : une faille de farm.

## Ce qui change
- Pendant un donjon, le butin des vagues suit le donjon : sa rareté maximale (Tanière : Commun, Cité : Inhabituel, Ruines : Rare, Crypte : Épique) et la puissance d'objet de son monde.
- Le butin de fin de donjon prend aussi la puissance du monde du donjon.
- La vitrine de la Halle et les caravanes gardent le butin du monde, même si elles se remplissent pendant un donjon.
- Hors donjon, rien ne change.

## Code
- `loot-system.js` : `getDungeonDropContext()`, `rollDrop` (contexte du donjon), `rollWorldDrop` (butin du monde), `rollDropAtRarity` (monde du donjon) ; `equip-shop-system.js` et `caravan-system.js` passent par `rollWorldDrop`.
- Aucun fichier protégé.

## Contrôles
- Harnais [271] : 300 objets de la Tanière depuis la Crypte, tous Communs et à la puissance de la Forêt ; donjon de la Crypte jusqu'à l'Épique ; vitrine inchangée.
- Robot (9 parties) : toutes au bout, médiane 22 h.
- round-harness 4556 OK, 0 échec (deux passes) ; boot, création du héros, parcours OK.
