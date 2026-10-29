# v3.562.0 — Crypte et Montagne plus difficiles

Retour de Seb, point 1 : la Crypte et la Montagne étaient trop faciles. Dans ses journaux, aucune mort dans ces deux mondes, la Montagne bouclée en 1,2 h, et un niveau supérieur de 2 à 4 crans à celui du robot. Options A et B retenues après banc.

## Constat au banc (6 campagnes, 3 classes, profils habituel et appliqué)
- Combats ordinaires de l'Histoire : 4 à 7 % des PV à la Crypte, 6 à 11 % à la Montagne.
- Seuls les boss et les élites résistaient.

## Changements
- **A — les ennemis suivent davantage un héros en avance**, à la Crypte et à la Montagne seulement :
  - marge 15 % → 5 %, suivi 0,5 → 0,75 (`WORLD_HERO_SCALING.byWorld`) ;
  - avec 30 % d'avance sur le héros de référence, les ennemis sont +17 % plus forts au lieu de +6 % ;
  - un héros au niveau prévu ne voit presque rien changer.
- **B — les ennemis ordinaires des quêtes sont plus forts** (`WORLD_HERO_SCALING.questEnemyByWorld`) ; boss et élites inchangés :
  - Crypte : +20 % de PV, +40 % de puissance ;
  - Montagne : +10 % de PV, +20 % de puissance.

## Banc des réglages (12 campagnes)
| | Avant | A seul | A + B1 (+20/+40) | A + B2 (+30/+70) |
|---|---|---|---|---|
| Crypte : PV perdus par combat | 4-7 % | 4-9 % | 6-10 % | 6-14 % |
| Montagne : PV perdus par combat | 6-11 % | 7-12 % | 8-16 % | 11-16 % |
| Montagne : morts (profil habituel) | 0-3 | 1-4 | 15-20 | 25-33 |

B1 convenait à la Crypte, mais pas à la Montagne, d'où le réglage plus doux retenu là-bas.

## Contrôle du réglage livré (6 campagnes, toutes à 101 étapes sur 101)
- Crypte : 5 à 11 % des PV par combat de l'Histoire, 0 à 6 morts.
- Montagne : 8 à 15 % des PV par combat, 2 à 21 morts.
- Le Mage reste le plus exposé à la Montagne : la plupart de ses morts viennent de la Mère des dragonnets (élite de carte), du Dragon ancien et du Vieux Golem.
- C'est un seul ajustement, comme convenu ; Seb jugera en jeu.

## Fichiers
- `js/data/worlds.js` : `byWorld`, `questEnemyByWorld`.
- `js/systems/combat-forecast-system.js` : `getHeroScale` lit le réglage du monde.
- `js/systems/quest-enemy-system.js` (système de quêtes, accord de Seb) : `applyWorldMult`, appliqué aux ennemis seuls et aux groupes.
- `tools/sim/campagne-harness.js` : essais `ESSAI_HS=exp,marge` et `ESSAI_B=pv,puissance` (`off` pour couper).
- `tools/harness/round-harness.js` : contrôle [377] ; [194] calcule la référence de la Crypte depuis la Crypte.

Aucun fichier ajouté.
