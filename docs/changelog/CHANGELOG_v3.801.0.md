# v3.801.0 — Pronostic : correctifs d'usure de la Tanière et de deux quêtes de la Tour (14/11/2026)

Suite de la v3.800.0 : options T1 et T2b de Seb (14/11), les 16 « Hors de portée » restants (0 mort). Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Diagnostic (robot, 6 parties, trace `PRONO=1`)
- **Tanière du Basilic** : l'ancien correctif `forecastAttritionMult: 2` (v3.429.7, héros « juste ») surestimait l'usure de 2 à 4 fois (58 sorties).
- **`aq_tour_pied`, `aq_tour_haut`** : usure estimée 2,35 fois le réel. Les combats sont 1,4 fois plus courts que prévu (rendement de classe calé sur les duels de boss), et les coups reçus 1,2 fois moins forts que prévu (sonde rencontre par rencontre, sauvegarde du robot à tour_02).
- Les autres quêtes à rencontres sont justes (0,9 à 1,5) : pas de correction globale.

## Changement
- `data/dungeon.js` : Tanière, `forecastAttritionMult` 2 → 1 (T1).
- `data/adventure-quests.js` : `forecastAttritionMult: 0.5` sur `aq_tour_pied` et `aq_tour_haut` (T2b).
- `systems/combat-forecast-system.js` : `forMission` applique le `forecastAttritionMult` de la quête, comme celui des donjons. Pronostic seul : les combats ne changent pas.

## Mesure (mêmes 6 parties)
| | v3.800.0 | v3.801.0 |
| --- | --- | --- |
| « Hors de portée » | 16 (0 mort) | 2 (0 mort) |
| « Très difficile » | 3 | 1 |
| Tanière | 4 Hors de portée, 2 Très difficile | 0 |
| Tour (`pied`, `haut`) | 12 Hors de portée | 1 Très difficile |

- Restent : `aq_montagne_veines` (1, usure 5 587 prévue pour 1 819 réelle) et l'Ossuaire au donjon 4 (1).
- Banc `forecast-calibration-bench.js` (héros faibles) : sortie identique.
- 6 parties au bout, aucun mur ; temps de campagne dans la dispersion habituelle du robot (17 à 28 h).

## Signalé, sans correction
Trois morts sous « Abordable », déjà présentes avant ces versions (le pronostic n'y voit pas le danger, à l'inverse des fausses alertes) :
- **La silhouette** (`aq_tour_silhouette`, Chevalier, 2 parties sur 2) : ratio 0,52 à 0,54, mort à 2-3 % des PV (round intouchable, combat seul).
- **Seigneur de guerre orc** (`aq_forest_depths`, Mage) : usure prévue 481 PV pour 1 266 réels.
- Porte-couronne (série précédente) : l'élite elle-même.

## Contrôles
- `round-harness` 7112 OK, 0 échec, sur 2 passes ([513k] : Tanière ×1, Tour ×0,5, aucune autre quête, correctif appliqué par `forMission`).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).
