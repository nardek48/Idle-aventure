# v3.800.0 — Pronostic : les morts qui dorment comptent dans l'usure des rencontres (14/11/2026)

Suite de l'audit de l'Alpha (13/11) et de la v3.799.0 : option B de Seb (14/11), l'usure des quêtes à rencontres. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Diagnostic
- Robot (6 parties, trace `PRONO=1` complétée des PV réellement perdus par le groupe) : pour la plupart des quêtes, usure prévue / réelle entre 0,9 et 1,5. Écart sur quelques quêtes seulement :
  - ×4 à ×8 sur les rencontres de la Crypte (`aq_crypte_ysolt`, `chaines`, `appel`), ×20 et plus avant les élites de l'Ossuaire (Porte-couronne, Pleureuse) ;
  - ×2,4 à ×2,9 sur la Tour (`aq_tour_pied`, `aq_tour_haut`).
- Cause pour la Crypte : ses rencontres déclarent des **morts qui dorment** (`sleepers`, `sleep-system.js`). Ils ne frappent pas, et le combat est gagné quand les éveillés tombent. Le pronostic comptait tout le groupe comme s'il se battait.
- Pas un coefficient global : la cause est un oubli du modèle.

## Changement
- `systems/combat-forecast-system.js` :
  - `getGroupFight(list, fullParty, sleepers)` : avec des dormeurs, moyenne sur tous les choix de dormeurs et sur le réveil seul (3 à 5 rounds, constantes du jeu). Un dormeur ne frappe ni n'est visé avant son réveil ; si les éveillés tombent avant, le combat s'arrête là. Réveillé, il rejoint la file normale.
  - `simGroupFight` : le calcul de la file (ordre des PV, arrivée au contact), commun aux deux cas.
  - `forMission` passe les dormeurs déclarés de chaque rencontre. Sans dormeur, le calcul est celui d'avant.
- Hors champ : les groupes de la Crypte sans dormeurs déclarés (donjon, carte), les Petites Aventures, « Régler d'un coup ».

## Mesure (mêmes 6 parties, série propre)
| | v3.799.0 | v3.800.0 |
| --- | --- | --- |
| « Hors de portée » | 36 (0 mort) | 16 (0 mort) |
| « Très difficile » | 3 | 3 |
| Quêtes de la Crypte à dormeurs | 23 « Hors de portée » sur 36 | 0 (24 Sans danger, 11 Abordable, 2 Risqué) |

- Sonde rencontre par rencontre (`aq_crypte_ysolt`, sauvegarde du robot à crypte_03) : usure prévue / réelle ×8 → ×1,7. Porte-couronne : usure avant l'élite prévue 2 265 → 285 PV, pour ~150 réels.
- Une mort sous « Abordable » sur le Porte-couronne (1 sur 6) : c'est l'élite elle-même qui tue, l'usure prévue avant elle est juste (302 prévus, 402 réels). Relève de l'option C (élites).
- Banc `forecast-calibration-bench.js` (héros faibles) : sortie identique.
- Temps de campagne : 6 parties au bout, aucun mur, médiane inchangée (~21 h, dispersion 16 à 27 h du robot).
- Restent en fausse alerte : la Tour (`aq_tour_pied`, `aq_tour_haut`, 12 sorties, ×1,4 à ×2 par rencontre, combats plus courts que prévu) et la Tanière (4 + 2, ancien correctif `forecastAttritionMult: 2`).

## Outils
- Robot `tools/sim/campagne-harness.js` : la trace `PRONO=1` note les PV réellement perdus par le groupe (héros et compagnons), en tout et avant le dernier combat.

## Contrôles
- `round-harness` 7108 OK, 0 échec, sur 2 passes ([513j] : sans dormeur inchangé, dormeurs moins coûteux en combat court, un ennemi seul ne dort pas, dormeurs passés par `forMission`).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).
