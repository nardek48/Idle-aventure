# v3.657.0 — Élites à niveaux

Idée de Seb (04/11) : comme les donjons, monter le niveau d'une élite pour une récompense plus grande, plutôt que refaire des milliers de fois le même combat. Proposition validée en bloc ; atelier `atelier/elites-niveaux.html`, **placement A** (feuille de préparation) ; **option B** pour le matériau (2 × niveau, sans bonus par monde d'avance).

## Avant
- Une élite rejouable par carte (deux en Montagne).
- Une victoire rapportait 2 du matériau de la carte, +1 par monde d'avance, un peu d'or, et pour la plupart des élites une pièce à 35 % (garantie à la 3e victoire sans pièce).
- Seul frein : +25 % de force par victoire du jour.
- 60 Givre bleu demandaient une trentaine de combats identiques.

## Le niveau
- **Ouverture** : comme les donjons, battre le niveau N ouvre le niveau N+1, sans maximum. Sans choix, l'élite est jouée à son meilleur niveau battu.
- **Force** : PV ×1,15 et puissance ×1,10 par niveau, cumulés (même courbe que les donjons). Niveau 5 : PV +75 %, dégâts +46 %. Niveau 10 : PV ×3,5, dégâts ×2,4.
- **Matériau de la carte** : 2 × niveau. Le bonus « +1 par monde d'avance » (v3.532.0) passe à 0, le niveau le remplace (option B).
- **Or** de l'élite : +10 % par niveau.
- **Inchangés** : la pièce (35 %, garantie à la 3e) et le frein du jour (+25 % par victoire), qui s'ajoute au niveau.
- **Sauvegarde** : le meilleur niveau est noté sur l'état du secteur (`game.livingMaps`, déjà sauvegardé en entier). Aucun champ ajouté à `save-system.js`.

## L'écran
- **Feuille de préparation** d'une élite de carte rejouable :
  - sélecteur ‹ Niveau › (comme la feuille des donjons) ;
  - « À gagner » : matériau ×niveau, or, pièce ;
  - « Ce qui t'attend » : PV et dégâts du niveau, frein du jour ;
  - le pronostic suit le niveau choisi.
- **Panneau du secteur**, sur la carte : une ligne « Niveau : » (meilleur battu, niveau ouvert, règle du matériau).
- **Message de victoire** : « Niveau N battu : le niveau N+1 est ouvert. »

## Mesure (pronostic du jeu sur les héros réels du robot ; « sûr » = Sans danger ou Abordable)

| Héros | Arbre-mère | Dard | Golem tour | Pleureuse | Mère dragonnets | Vieux golem | Gardien |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Entrée de la Crypte (Ch / Rô / Ma) | 16 / 18 / 19 | 7 / 9 / 9 | 8 / 9 / 10 | 2 / 3 / 4 | — | — | — |
| Entrée de la Tour | 29 / 31 / 32 | 20 / 22 / 22 | 21 / 22 / 23 | 14 / 16 / 16 | 10 / 11 / 12 | 9 / 10 / 11 | 5 / 6 / 7 |
| Fin de la Tour | 30 / 30 / 31 | 21 / 21 / 22 | 21 / 22 / 23 | 15 / 15 / 16 | 10 / 11 / 11 | 9 / 10 / 11 | 5 / 6 / 6 |

- **Élites du monde en cours** : 10 à 24 matériaux par victoire au niveau sûr, au lieu de 2. On farme 5 à 12 fois moins de combats.
- **Élites des mondes passés** : l'Arbre-mère à l'entrée de la Crypte donne 32 à 38 Sève par victoire (au lieu de 4).
- Les trois classes restent proches.

## Code (aucun fichier protégé)
- `data/living-maps.js` : `repeatableElite.levelHpMult` / `levelPowerMult` / `levelGoldPct`, `sevePerWorldAhead` 0.
- `systems/living-map-system.js` :
  - `getEliteLevelBest`, `getEliteMaxLevel`, `clampEliteLevel`, `getEliteLevelMult`, `getRepeatRewardAt` ;
  - le niveau du combat est porté par `livingMaps.fight` ;
  - la victoire paie au niveau et ouvre le suivant ;
  - la reprise après rechargement garde le niveau.
- `systems/elite-system.js` : `opts.levelMult` (PV, puissance, or) dans `build`.
- `systems/combat-forecast-system.js` : `forMapElite(…, level)`.
- `ui/sortie-prep-view.js` :
  - le sélecteur et ses blocs ;
  - la feuille passe ses choix à `onGo` ;
  - une élite déjà battue ouvre toujours la feuille.
- `ui/living-map-view.js` : le niveau transmis au départ, la ligne du panneau.
- `lang/en.js` : 11 textes (espace insécable avant « % »).

## Contrôles
- `node --check` sur les fichiers modifiés.
- `round-harness.js` : 6 140 OK, 0 échec, sur deux passes.
  - [351] adapté : 2 par victoire au niveau 1, quel que soit le monde atteint.
  - [440] ajouté, 10 contrôles : niveau ouvert, ramené au maximum, courbe, force de l'élite au niveau 5, matériau ×niveau, victoire au niveau 3 qui ouvre le 4, feuille de préparation.
- `boot-harness.js` : 4 OK. `parcours-harness.js` : 212 OK. Audit i18n : 0 manquant, 0 orphelin.
- Campagne complète du robot (Rôdeur) : 122 OK, 0 échec.
- **Chromium à 320 et 390 px** (Vieux Golem, meilleur 6, niveau 7) : sélecteur, « Cendre vive +14 (×7) », « Or +77 % », PV +131 %, pronostic « Abordable », pas de défilement horizontal.

## Fichiers
- Fichiers modifiés : `data/living-maps.js`, `systems/living-map-system.js`, `systems/elite-system.js`, `systems/combat-forecast-system.js`, `ui/sortie-prep-view.js`, `ui/living-map-view.js`, `ui/news-view.js`, `lang/en.js`, `core/constants.js`, `sw.js`.
- Outils : `tools/sim/elites-niveaux-bench.js` (nouveau, outil hors jeu), `round-harness.js`.
- Aucun fichier protégé touché, aucun fichier de jeu ajouté.
