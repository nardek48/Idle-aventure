# v3.473.1 — Donjons : or et Éclats au-delà du plafond, en cumul

Bilan des donjons, points 6 et 7 (décisions de Seb).

## Point 6 — échelle de difficulté : clos, rien à changer
Les écarts de `difficultyMult` entre mondes (1,8 / 2,6 / 6 / 14) sont voulus : chaque donjon ouvert est réglé au banc sur sa cible d'Histoire (Tanière 100/100/97 %, Sanctuaire Rare 80/60/67 %, Ossuaire Épique 77/70/90 %). Seul écart réel : le Chevalier à la Cité (47 % au profil de l'étape 12), qui relève du point 3 (classes). Le commentaire de `data/dungeon.js` qui annonçait un « rebasage » est mis à jour ; Volcan et Sommet, fermés, seront réglés à l'ouverture de leur monde.

## Point 7 — ce qui change en jeu
Au-delà du plafond de niveau d'un donjon, l'or (vagues et fin) et les Éclats montent maintenant **en cumul**, +10 % par niveau multipliés, comme la difficulté des monstres (+10 % de puissance en cumul) :

| Niveaux au-delà du plafond | 3 | 5 | 10 | 20 |
| --- | --- | --- | --- | --- |
| Avant (+10 % par niveau) | ×1,30 | ×1,50 | ×2,00 | ×3,00 |
| Maintenant (×1,10 par niveau) | ×1,33 | ×1,61 | ×2,59 | ×6,73 |

Aux niveaux tenus aujourd'hui (environ 3 au-delà à la Tanière, 5 à la Crypte), l'écart reste faible ; il compte quand l'équipement permet d'aller plus loin. La feuille de lancement affiche le nouveau pourcentage (« Or et Éclats +33 % » au 3e niveau au-delà).

## Code
- **Fichier protégé (accord Seb)** : `systems/dungeon-system.js`, `getBeyondMult(pct, n)` = 1,10^n, utilisé par `getRunGoldMult` et les Éclats de fin.
- `ui/dungeon-view.js` : le pourcentage de la feuille de lancement.
- `data/dungeon.js` : commentaires (cumul, point 6).

## Outils
- `round-harness.js` : [273], [275] et [277] passent au cumul (×1,1^4 à la Crypte 5, +33 % à l'Ossuaire 4).
