# v3.548.0 — Petite aventure de l'Histoire : le chemin vers l'objectif seul

Retour de Seb (journaux de campagne du 29/10) : pendant une étape d'Histoire qui vise un secteur précis, toute la carte du monde était offerte. On pouvait libérer gratuitement tous les secteurs et garder l'objectif pour la fin.

## Règle
- Une étape qui vise un ou plusieurs secteurs (`storyPa.targets`) n'offre plus que les secteurs non libérés situés sur un plus court chemin entre le déjà libéré et l'objectif le plus proche. Tout autre secteur se paie normalement.
- Si plusieurs chemins ont la même longueur, ils restent tous offerts ; dès qu'on libère un secteur de l'un d'eux, les autres se ferment.
- Avec plusieurs objectifs, seul le plus proche ouvre son chemin, puis le suivant après lui.
- Les étapes « libère N secteurs au choix » sont inchangées : forest_brume, desert_04, ruines_07, crypte_07, montagne_07. Leur offre s'arrêtait déjà à la réussite.
- Un échec reste offert, comme avant.

## Libérations offertes jusqu'à l'objectif (carte vierge)
| Étape | Avant | Après |
|---|---|---|
| desert_06 | 12 | 3 |
| desert_14 | 12 | 3 |
| crypte_11 | 14 | 3 |
| crypte_16 | 14 | 3 |
| montagne_16 | 11 | 6 |

## Fichiers
- `js/systems/living-map-system.js` : `LivingMapManager.getStoryPath(mapId, targets)`. Le chemin servira aussi à la mise en évidence sur la carte (point 5 du retour).
- `js/systems/scene-run-system.js` : `isStoryPaFree` lit le chemin ; nouvelle fonction `storyPaTargets`.
- `js/data/story-quests.js` (accord de Seb) : `targets` sur desert_05, 06, 11, 14, ruines_11, 16, crypte_11, 16, montagne_11, 16.
- `tools/harness/round-harness.js` : contrôle [365].

Aucun fichier ajouté.
