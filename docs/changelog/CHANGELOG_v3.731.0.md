# v3.731.0 — Mage : l'échelle des ennemis ne reprend plus ses PV en plus (06/11/2026)

Décision de Seb (06/11) : piste C du diagnostic Mage × Montagne (`captures/mage-montagne/`). Aucun fichier protégé.

## Constat (banc, 200 parties, graines fixes)
Sur « Les pentes » (montagne_02), le Mage gagnait 59 % de ses parties, contre 95 % au Chevalier et au Rôdeur. Problème du jeu, pas du robot (corriger le robot : ±2 points). Cause principale : la mise à l'échelle des ennemis sur le héros (`getHeroScale`) suit ses PV effectifs ; le Mage est le seul des trois au-dessus de la référence, ses ennemis frappaient jusqu'à 12 % plus fort.

## Changé
- `WORLD_HERO_SCALING.classPowerGabarit = { mage: 1.2 }` (`js/data/worlds.js`), champ séparé de `classEhpGabarit` : il ne joue que sur la puissance des ennemis mis à l'échelle, ni sur leurs PV, ni sur le diviseur des quêtes fixes (`getClassGabarit`). Lu dans `CombatForecast.getHeroScale` (`js/systems/combat-forecast-system.js`).
- Le pronostic « Avant de partir » suit le combat réel (même calcul).

## Mesures (banc, profil `jeu`, politique « contre »)
| Scénario | Mage avant → après | Chevalier, Rôdeur |
|---|---|---|
| Les pentes (montagne_02) | 59 → 78 % | inchangés partie par partie |
| Ceux qu'il a triés (montagne_18) | 72,5 → 76,5 % (KO de compagnons 0,97 → 0,71) | inchangés |
| Cœur, Gouffre, Nuée, Couloirs, Sépulcres | 100 % inchangé (PV de fin +0 à +2,3 points) | inchangés |

## Outil
`tools/sim/charge-bench.js` : scénario `tries` (montagne_18) ajouté.

## Contrôles
round-harness 6 982 OK, 0 échec (2 passes), dont la section [492] (33 contrôles) ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
