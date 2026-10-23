# v3.462.0 — Niveaux de donjon, lot 3 : le mode libre (et l'or des vagues au niveau)

Troisième lot de la conception « Niveaux de donjon » v0.3 (N6, N-C, N-H, N-L, N-M), avec un correctif du lot 2. L'écran viendra au lot 5 : tant qu'il n'est pas là, rien ne change pour le joueur.

## Correctif du lot 2 (v3.461.0)
Le +10 % d'or par niveau au-delà du plafond (N-I) ne s'appliquait qu'à l'or de fin (~2 800 à la Crypte). L'essentiel de l'or d'un run vient pourtant des monstres des vagues. Désormais, l'or des monstres suit le même multiplicateur. Robot : à la Crypte, un run passe de ~52 000 or au niveau 1 à ~71 000 aux niveaux 4-5 (lot 0 : à peine plus).

## Le mode libre
- Ouvert dès que le donjon est fini une fois en sortie classique (N-M).
- Sorties illimitées : il ne compte pas dans les 3 sorties du jour, et ne prend jamais la sortie offerte par l'Histoire.
- Coût : 1 Ration moyenne par run, pour les 4 donjons (N-L).
- Tout l'or du run (vagues et fin) ÷ 4 (N-H) ; Éclats du run ÷ 2 (N-C) ; objets pleins.
- Aucune ressource de monde (N6), même au campement des Ruines.
- Le meilleur niveau compte dans les deux modes.
- Les compteurs d'Histoire liés aux donjons servent tous à des étapes antérieures à la première victoire : le mode libre ne peut pas les faire avancer.

## Code
- `data/dungeon.js` : `freeGoldMult` 0,25, `freeShardMult` 0,5.
- `dungeon-system.js` (protégé, accord de Seb) :
  - `getRunGoldMult` (niveau et mode) ;
  - `buildWaveEnemy` met l'or des monstres au run ;
  - `start(id, marks, level, free)` ;
  - `finish` (or, Éclats ÷ 2, pas de ressource de monde) ;
  - `reachCamp` (pas de pierre en libre).
  - Le run porte `dungeonRun.free`, déjà sauvegardé avec `dungeonRun`.
- `provisions-system.js` : vivres `"dungeonFree"` (Ration moyenne).
- `en.js` : « Free mode: clear this dungeon once first ».
- Robot : la phase `--faille` mesure aussi le mode libre au niveau tenu.
- Aucun fichier ajouté.

## Contrôles
- Harnais [275] :
  - accès refusé si le donjon n'a jamais été fini, et sans Ration moyenne ;
  - quota du jour intact, 1 Ration moyenne prélevée ;
  - or d'un monstre ÷ 4 en libre et ×1,4 à la Crypte 5 ;
  - or de fin ÷ 4, Éclats ÷ 2, aucune Cire de sépulcre ;
  - un ticket d'Histoire en attente ne rend pas le run classique.
- Harnais [32b] mis à jour.
- Harnais [53b] : le cache de 500 ms de « Régler d'un coup » est vidé à chaque lecture. Il pouvait garder la puce d'un combat précédent, et le test échouait au hasard.
- Harnais [272]/[273] : les vivres remplacés pour le test sont rétablis en fin de section.
- Robot (3 parties, phase faille) :
  - niveaux tenus Tanière 23, Cité 14-15, Ruines 11-12, Crypte 4-5 ;
  - Crypte au niveau tenu : ~71 000 or en classique, ~21 600 en libre ;
  - Éclats : 41-44 en classique, 20-22 en libre.
  - Le banc mesure en plus ~5 000 or par run, aussi en classique, qui ne passent pas par le donjon : le temps du village tourne pendant le run.
- i18n 100 % ; round-harness 4605 OK, 0 échec (trois passes) ; boot, création du héros, parcours (139) OK.
