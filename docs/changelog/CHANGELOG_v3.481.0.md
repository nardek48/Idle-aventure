# v3.481.0 — Refonte de l'économie, RE-4 : les matériaux de monde servent dans les mondes suivants

Lot F3 de la refonte (conception §6), option 3 retenue par Seb : les reforges et les bâtiments. Jusqu'ici, seule la Résine (Sève de la Forêt) servait au-delà de son monde ; le Verre des dunes, par exemple, ne servait qu'une fois (6 dans toute la partie, pour 96 donnés par la carte du Désert).

## Ce qui change en jeu
**Reforges** (les 7 emplacements, comme la Résine aujourd'hui) :
| Reforge | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- |
| Verre trempé (nouveau) | 1 | 2 | 2 | 3 |
| Clé de voûte | 1 | 2 | **1** (nouveau) | **2** (nouveau) |

**Bâtiments** :
- Aux Ruines, le Verre trempé remplace la Résine : Terrain 11 (6), Enchanteresse 2 (5), Entrepôt 7 (4), Palissade 8 (6). Les autres coûts ne changent pas.
- À la Crypte, la Halle 9 et 10 demandent 3 et 4 Clés de voûte.
- Les niveaux déjà construits restent acquis.

**Textes** : la description du Verre trempé et de la Clé de voûte dit où ils servent ; la fiche de l'Entrepôt range le Verre trempé, la Clé et la Cire consacrée parmi les matériaux de la Forge.

## Demande sur toute la partie (matière rare brute)
| | Verre des dunes | Pierre errante | Sève |
| --- | --- | --- | --- |
| Avant | 6 | 72 | 426 |
| Après | 160 | 156 | 384 |
| Donné une seule fois (carte + Histoire) | 96 | 159 | 85 |

Le Verre demande maintenant ≈ 64 de plus que la carte (2 à 3 jours au Désert : Dard, Cité engloutie, Petites Aventures). La Sève, seule ressource rare vraiment rare, est soulagée de 42.

## Code
- `systems/forge-system.js` : `getCost`, Verre trempé aux reforges 7 à 10, Clé de voûte aux 9 et 10 (après les remises de la clé du Cœur et de la Mémoire, qui ne visent que la bande 7-8).
- `data/village-buildings.js` : paliers du Terrain 11, de l'Enchanteresse 2, de l'Entrepôt 7 et de la Palissade 8 (Verre trempé), de la Halle 9-10 (Clé de voûte) ; bases recalculées, mêmes arrondis.
- `data/hunt-quests.js`, `ui/warehouse-view.js`, `lang/en.js` : textes.
- Aucun fichier protégé, aucun fichier ajouté.

## Outils
- `round-harness.js` :
  - section [302] (6 contrôles : reforges 7 à 10, reforge 6 inchangée, bâtiments des Ruines, Désert inchangé, Halle 9-10, descriptions) ;
  - [23b], [59b], [243], [267], [268] mis à jour (le Terrain 11 au Verre trempé, la Palissade en quatre paliers, la reforge 9 avec Clé et Verre, l'Entrepôt 7).

## Contrôles
- Chromium, vrai jeu, Établi de la Forge à 390 et 320 px : six matières sur une reforge 9, le coût passe sur deux lignes, rien ne déborde.
- i18n 100 %, aucun orphelin.
- round-harness 4881 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
