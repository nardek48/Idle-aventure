# v3.695.0 — Décisions combat (Seb, 05/11 : COMB-1, COMB-23, COMB-2, COMB-8, COMB-9, option A)

Quatre décisions de Seb prises le 05/11 sur la page de décisions, appliquées telles quelles.

## Corrigés

- **COMB-1 + COMB-23**, option A : le repli par défaut (conseil doré, Grimoire sans règle, et donc le robot de campagne) ne joue plus la Défense que face à une annonce qu'elle contre (Charge, Silence, exaltation d'élite : `counters` de la Défense des trois classes) ou quand le héros est à 40 % de ses PV ou moins (`HERO_LOW_HP_THRESHOLD_PCT`). Sinon, l'ordre habituel : techniques prêtes, puis Attaque. L'ordre de `AUTO_POLICY_DEFAULTS` est inchangé : la Défense en est seulement retirée quand rien ne la justifie. `js/systems/combat-auto-policy-system.js` (`isDefenseFallbackWarranted`), `js/systems/class-combat-system.js` (`_chooseRoundAction`).
- **COMB-2**, option A (ajuste l'option B de v3.653) : « Varier » n'évite jamais une action qui contre une annonce en cours. La technique d'avant reste évitée sinon. `js/systems/combat-auto-policy-system.js` (`actionCountersLiveAnnounce`), `js/systems/class-combat-system.js`.
- **COMB-8**, option A : la célérité ennemie suit la courbe 100 × c / (c + 60), appliquée **au-delà de 75** et jamais sous 75 : `gain = c` jusqu'à 75, puis `max(75, 100 × c / (c + 60))`. Interprétation retenue : la courbe brute aurait changé tous les ennemis au-dessus de 40 (Forêt 58 → 49, donjons 1 à 3 jusqu'à 75 → 56). 75 est la célérité maximale mesurée des mondes 1 à 3 (cartes et élites ≤ 64) et des donjons 1 à 3 (niveaux 1 à 20, ≤ 75). Les donjons 4 à 6 prennent les valeurs de la courbe (75 à 82 au lieu de 150 à 277). `js/systems/combat-engine.js` **(protégé)** (`getEnemyGaugeGain`, `ENEMY_CELERITY_KNEE`). Le pronostic et la condition « Il frappe deux fois » lisent la même fonction.
- **COMB-9**, option A : dans le pronostic, une potion compte pour **80 %** de son soin (`FORECAST_POTION_WEIGHT = 0,8`), et non plus des PV pleins : boire prend le tour et le soin arrive tard. `js/systems/combat-forecast-system.js` (`getHealingReserve`).
- `js/lang/en.js` : 1 texte (Quoi de neuf). « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [460] : Défense au repli (sans menace, Charge, PV ≤ 40 %, technique prête), Varier et contre de soin, courbe de célérité, donjons 1 à 3 inchangés et 4 à 6 sous 100, réserve de potions.

## Mesures

### COMB-1 : campagne `node tools/sim/campagne-lot.js . --combats --joueur --n 4` (12 parties)

Le lot de contrôle contient aussi COMB-8 (donjons 4 à 6 de farm) et COMB-9 (pronostic lu par le robot).

| | 05/11 (v3.693, avec Défense au repli) | v3.695.0 |
|---|---|---|
| Au bout | 12/12 | 12/12 |
| Médiane totale | 45,1 h (p25–p75 43,6–50,5 ; 33 à 58 h) | 47,5 h (45,0–50,1 ; 39 à 74 h) |
| Médiane Chevalier / Rôdeur / Mage | 43,0 / 51,0 / 47,5 h | 46,0 / 47,5 / 50,0 h |
| Morts Chevalier | 12 (0/6/1/5) | **4** (0/2/2/0) |
| Morts Rôdeur | 24 (4/11/6/3) | 30 (6/8/13/3) |
| Morts Mage | 47 (21/11/9/6) | 41 (7/17/5/12) |
| Dragon ancien (`montagne_19`) | 35 combats, 66 % de morts, 23 morts, 0 mur | 47 combats, 79 % de morts, 37 morts, **2 murs** (Rôdeur, Mage) |
| Temps de combat actif | 2,0 h | 1,8 h |
| Mère des dragonnets | 113 combats, 28 % PV perdus, 0 mort | 106 combats, 32 % PV perdus, 0 mort |

Lecture : le Chevalier gagne nettement (morts ÷ 3), les combats sont plus courts. Ailleurs, les morts se déplacent vers le Dragon ancien : sans Défense « à vide », Rôdeur et Mage arrivent plus vite au mur de `montagne_19` et y meurent davantage (37 morts sur 75). Rien n'a été réglé ici : à juger par Seb.

### COMB-8 : relevé sur le vrai moteur (ennemis de toutes les vagues, niveaux 1, 10 et 20 ; l'ennemi le plus rapide, 12 rounds d'Attaque)

| Donjon | Célérité max | Gain max avant → après | Gains modifiés | Doubles frappes avant → après |
|---|---|---|---|---|
| 1 | 60 à 74 | inchangé | 0/22 | 7 à 8/12 → identique |
| 2 | 62 | inchangé | 0/21 | 7/12 → identique |
| 3 | 63 à 71 | inchangé | 0/24 | 7 à 8/12 → identique |
| 4 | 152 à 164 | 164 → 75 | 11 à 13/24 | 12/12 → 9/12 |
| 5 | 218 à 223 | 223 → 78,8 | 13 à 15/23 | 12/12 → 9/12 |
| 6 | 277 | 277 → 82,2 | 17 à 19/22 | 12/12 → 9/12 |

Les donjons 1 à 3 ne bougent pas ; les 4 à 6 perdent la double frappe permanente (un round sur quatre sans).

### COMB-9 : `node tools/sim/forecast-calibration-bench.js .` (80 runs par profil, « Prouver sa valeur »)

| Profil | Échec réel | Avant (poids 1) | Après (poids 0,8) |
|---|---|---|---|
| Chevalier sans arme, 3 potions | 57 % | Très difficile 1,08 | Très difficile 1,22 |
| Rôdeur sans arme, 3 potions | 100 % | Très difficile 1,06 | Très difficile 1,21 |
| **Mage sans arme, 3 potions** | 90 % | Abordable 0,56 | Abordable 0,61 |
| Profils armés (arme +10 à vitrine + 20 niveaux, 15 profils) | 0 % | ratios 0,08 à 0,41 | ratios 0,09 à 0,47 ; un seul verdict change : Chevalier arme +10, « Sans danger » 0,34 → « Abordable » 0,38 |

Sur 15 tirages par profil (médiane), le Mage sans arme passe de « Risqué » 0,93 à « Très difficile » 1,08 ; le banc officiel, lui, tombe sur un tirage favorable (voir « Repéré »). Poids testés : 1 ; 0,9 ; 0,85 ; 0,8 ; 0,75 ; 0,7 ; 0,5 ; 0,35 ; 0,25. Sous 0,8, d'autres profils armés (0 % d'échec) passent de « Sans danger » à « Abordable » ; au-dessus, le Mage sans arme reste « Risqué » en médiane.

Mère des dragonnets (sauvegardes du lot ci-dessus en entrée de Montagne et de Tour, 30 combats réels par sauvegarde) : 0 % d'échec réel, 25 à 38 % des PV perdus ; pronostic « Sans danger » ou « Abordable », ratio +0,00 à +0,03 avec le nouveau poids. Ce cas ne dépend presque pas des potions : la cause notée en v3.523 (PV des compagnons comptés avec ceux du héros) reste.

## Repéré (non corrigé)

- **Pronostic de mission tiré au hasard** : `forMission` construit l'usure avec `QuestEnemyManager.spawnFor`, qui tire les ennemis au hasard. Pour le même Mage sans arme, l'usure va de 45 à 297 PV selon le tirage, et le verdict de « Abordable » à « Très difficile ». C'est ce qui garde le Mage sans arme « Abordable » au banc officiel. À trancher par Seb (moyenne sur la réserve d'ennemis de la quête, par exemple).
- Dragon ancien : voir la campagne, 2 murs sur 12 parties après COMB-1.

## Laissés

- Aucun.

Contrôles : round-harness 6 456 OK, 0 échec (2 passes) · boot 4 OK · création 44 OK · i18n 8 447 textes, 100 %, 0 orphelin · parcours 212 OK · Quoi de neuf vu dans Chromium à 390 px (ligne 301 px de large, icône chargée, aucun défilement horizontal). Aucun fichier ajouté.
