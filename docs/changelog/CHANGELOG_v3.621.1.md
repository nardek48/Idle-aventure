# v3.621.1 — forest_13 : des vagues, pas des kills

Écart relevé par l'audit de la v3.621.0, correction validée par Seb (fichier protégé `story-quest-system.js`, modification minimale).

## Problème
« Marques du corrompu » promet « passer 5 vagues dans le même run » sous Marque. Le compteur `coeurKillsMarked` ajoutait les kills : depuis les vagues de groupe de la Tanière (v3.471.0, vague 3 à deux ennemis), l'étape se validait dès la fin de la vague 4.

## Changement
- `js/systems/story-quest-system.js` (`_countKills`, 5 lignes) : le compteur vaut le nombre de vagues franchies dans le run, soit la vague en cours, moins elle-même si un de ses ennemis est encore debout (`CombatActors.aliveEnemies`). Sans effet de l'ordre (vague suivante déjà apparue ou non) ; même run, sous Marque, remise à zéro à chaque nouveau run : inchangés.
- Textes de l'étape inchangés (ils disaient déjà « vagues »).
- Quoi de neuf : une ligne (FR + EN).

## Harnais
- [416] : vague de groupe à moitié tombée (2, pas 3), vague comptée une fois, 4/5 sans validation, 5/5 validé, nouveau run à 0, sans Marque rien.
- [64b] : trois contrôles adaptés (ils simulaient des vagues par des kills) ; même intention (un run, remise à zéro, rechargement).

## Contrôles
- Harnais 5 853 OK, 0 échec (2 passes) ; parcours 212 OK ; boot, création du héros, i18n.
- Robot de campagne, combats réels (`--combats --joueur --classe knight --jusqua forest_wenna`) : forest_13 validée dans la vraie Tanière, 17 OK, 0 échec.
