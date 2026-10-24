# v3.471.1 — Donjons : la Gueule du volcan fermée

Point 8 du bilan des donjons, demandé par Seb.

## Ce qui change en jeu
- La Gueule du volcan (donjon de la Montagne) est fermée, comme le Sommet interdit : sa carte affiche « Pas encore disponible ».
- Avant, elle s'ouvrait seule dès le monde 4 atteint, sans pool d'ennemis (repli sur ceux de tous les mondes), sans élites, sans matériau de monde, sans étape d'Histoire et sans calibrage. L'Histoire s'arrêtant à la Crypte, personne ne pouvait encore y tomber : le verrou est posé avant d'ouvrir la Montagne.
- À rouvrir avec son contenu (pool, élites, boss au banc, verrou d'Histoire `requiresStoryStep` comme les autres donjons).

## Code
- `data/dungeon.js` : donjon 5, `locked: true` et `lockedHint` (texte déjà traduit). Aucun fichier protégé, aucun fichier ajouté.

## Outils
- `round-harness.js` : section [292] (fermée même monde 4 atteint et Ossuaire fini, entrée refusée).
