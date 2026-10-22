# v3.459.8 — Lot 10a : le Terrain 12-13 se paie en Cire de sépulcre (audit P11)

## Le constat
La fin de jeu reposait sur la Sève de l'Arbre-mère : environ 63 combats par partie contre l'élite de la Forêt, en partie pour la Résine du Terrain 12-13 (20 Résine), réclamé par la Crypte.

## Ce qui change
- Terrain 12 (Crypte, acte II) : 6 Cire de sépulcre au lieu de 8 Résine.
- Terrain 13 (Crypte, acte III) : 8 Cire de sépulcre au lieu de 12 Résine.
- L'or et les matériaux sont ceux d'avant, au chiffre près. Le Terrain 11 (Ruines) et le Terrain 14 (pas encore ouvert) gardent la Résine. La Résine des reforges ne bouge pas (décision du 09/10).
- Donnée seule : `village-buildings.js` (le palier 10-13 du Terrain est découpé en trois).

## Mesure (robot, 18 parties, `campagne-lot --combats --n 6`)
| | Avant (v3.459.7) | Après |
|---|---|---|
| Parties au bout | 18 / 18 | 18 / 18 |
| Durée médiane | 26 h (22 à 42) | **22 h (20 à 28)** |
| Combats d'Arbre-mère par partie | ~63 | **~43** |
| Soin au camp | 13,2 h | 10,0 h |
| Attente du lendemain (max) | 14 h | 0 h |

Aucune pénurie de Cire de sépulcre (elle sert aussi à la Cire consacrée).

## Contrôles
- Harnais [267] ; round-harness 4528 OK, 0 échec (deux passes) ; boot, création du héros, parcours OK.
