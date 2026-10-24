# v3.469.6 — Petites Aventures : un gardien battable au Périple

Dernier point du bilan des Petites Aventures. Au banc, la moitié à trois quarts des KO du Périple venaient du gardien (Forêt, Désert, Ruines), qu'on ne battait presque jamais, alors que trois objets du coffre se gagnent en le battant. Seb a choisi l'option 1.

## Ce qui change en jeu
- **Le gardien ne prend que la moitié du renfort de l'anneau** : ×1,15 au Chemin (au lieu de ×1,30) et ×1,375 au Périple (au lieu de ×1,75). Au Sentier, rien ne change.
- Les autres combats gardent le renfort entier.
- L'estimation affichée au seuil suit le même calcul.

## Mesures (`pa2-bench`, 150 runs par cellule)
| Monde | Chemin avant → après | Périple avant → après |
| --- | --- | --- |
| Forêt | 15 % → 10 % | 35 % → 25 % |
| Désert | 29 % → 21 % | 44 % → 41 % |
| Ruines | 22 % → 15 % | 36 % → 28 % |
| Crypte | 16 % → 15 % | 24 % → 24 % (gardien qui dort, déjà contournable) |

Le Désert reste le plus dur : le Ver y est toujours la principale cause de KO.

## Code
- `systems/pa2-run.js` : `_foe`, renfort de l'anneau partagé pour le gardien.
- `data/pa2-content.js` : `PA2_RULES.guardRingShare` (0,5).
- Aucun fichier protégé, aucun fichier ajouté.

## Contrôles
- `round-harness.js` [288] : gardien ×1,15 au Chemin et ×1,375 au Périple, autres combats ×1,75.
- i18n 100 %, aucun orphelin.
- round-harness 4770 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
