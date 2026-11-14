# v3.799.0 — Pronostic : le soin du boss contré par le Grimoire ne compte plus (14/11/2026)

Audit de l'Alpha du 13/11, priorité 1 : le pronostic annonçait « Hors de portée » sur des combats gagnés facilement (Nezzam, le Basilic, la Meute). Option A de Seb (14/11). Jeu principal d'abord, l'Alpha ensuite. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Diagnostic (robot joueur, 6 parties complètes, trace `PRONO=1`, 505 sorties)
- 47 « Hors de portée » pour 1 mort, 12 « Très difficile » pour 0 ; un « Hors de portée » finissait avec 60 % des PV en médiane, comme un « Abordable ».
- Trois causes :
  1. le soin du boss retiré des dégâts du joueur alors que la règle du Grimoire l'annule (Nezzam : 91 à 105 rounds annoncés, 23 à 45 joués) ;
  2. l'usure des quêtes à rencontres de la Crypte comptée 2 à 3 fois trop fort ;
  3. les élites (Porte-couronne, Pleureuse).

## Option A
- `systems/combat-forecast-system.js` : quand une règle active du Grimoire contre « le boss se soigne » (même lecture que le moteur, `getConfiguredCounterSlotsForCondition`), le soin ne compte plus dans le pronostic (`healCountered`). Sans règle qui le contre, rien ne change.
- Le seuil de soin des Petites Aventures (`pa2-run.js`, sans Grimoire) est inchangé.
- `ui/combat-forecast-view.js` : la fenêtre « Avant de partir » affiche « Il se soigne · ta règle du Grimoire le contre ».

## Mesure après A (mêmes 6 parties)
| | Avant | Après |
| --- | --- | --- |
| « Hors de portée » | 47 (1 mort) | 36 (0 mort) |
| « Très difficile » | 12 | 3 |
| Donjons « Hors de portée » / « Très difficile » | 8 / 8 | 2 / 2 |
| Nezzam (6 passages) | Hors de portée | Abordable (39 à 64 rounds, 36 à 72 % des PV restants) |

- Temps de campagne inchangé (médiane 21,3 → 20,6 h, dans le bruit), 6 parties au bout, aucun mur.
- Banc `forecast-calibration-bench.js` (héros faibles, sans Grimoire) : sortie identique avant et après ; « Hors de portée » sort toujours quand c'est vrai.
- Restent à traiter : l'usure des quêtes à rencontres (option B) et les élites (option C).

## Outils
- Robot `tools/sim/campagne-harness.js` : trace `PRONO=1` (verdict au départ de chaque quête et donjon, puis issue réelle), commitée à part.

## Contrôles
- `round-harness` 7104 OK, 0 échec, sur 2 passes ([513i] : soin contré, Petites Aventures inchangées, règle sans contre ignorée, ligne affichée).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %, 0 orphelin.
- Capture du pronostic de Nezzam (sauvegarde du robot à desert_17) : sans règle « Hors de portée, ~110 rounds contre ~56 » ; avec la règle « se soigne → Tir perforant », « Abordable », la fenêtre ne s'ouvre plus.
- Quoi de neuf : une ligne (FR + EN).
