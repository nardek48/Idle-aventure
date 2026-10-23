# v3.460.0 — Niveaux de donjon, lot 1 : le moteur

Premier lot de la conception « Niveaux de donjon » v0.3 (décisions N-A, N-B, N4). Le moteur connaît les niveaux, mais **l'écran de choix viendra au lot 5** (atelier d'abord) : en attendant, chaque run se joue au niveau 1 et rien ne change pour le joueur.

## Ce qui change dans le moteur
- Chaque donjon a des niveaux, sans maximum. Un niveau est jouable jusqu'au meilleur niveau terminé + 1. Un donjon déjà fini avant cette version compte comme tenu au niveau 1.
- Par niveau au-dessus du 1 : PV des ennemis ×1,15 et puissance ×1,10, composés (N-B). Vagues, élites, escortes et boss.
- Paliers de butin (N-A), mesurés au lot 0 : au niveau dit, le butin des vagues et de fin devient celui du donjon visé (rareté maximale et puissance d'objet de son monde), seulement si ce donjon est débloqué.
  - Tanière : Cité au niveau 10, Ruines au 13, Crypte au 20.
  - Cité : Ruines au 5, Crypte au 12.
  - Ruines : Crypte au 8.
- La sortie offerte par l'Histoire se joue toujours au niveau 1.

## Code
- `data/dungeon.js` : `DUNGEON_CONFIG.levelHpPct` / `levelPowerPct`, `levelSteps` par donjon.
- `dungeon-system.js` (protégé, accord de Seb) : `getLevelBest`, `getMaxLevel`, `getRunLevel`, `getLevelMult`, `getLevelLootSource`, `getRunDropSource` ; `buildWaveEnemy` applique le niveau (l'ancien corps devient `buildWaveEnemyBase`) ; `start(id, marks, level)` ; `finish` enregistre le meilleur niveau et tire le butin de fin au niveau.
- Nouvel état persistant `game.dungeonLevelBest` (meilleur niveau terminé, par donjon), câblé aux 4 points : `buildSaveData`, `restoreBaseState`, `fullResetState` (`save-system.js`, protégé, accord de Seb) et `createInitialGameState`. Le niveau du run vit dans `dungeonRun.level`, déjà sauvegardé.
- `loot-system.js` : `getDungeonDropContext()` lit le butin du niveau.
- Robot : la phase `--faille` joue désormais les vrais niveaux du moteur.
- Aucun fichier ajouté.

## Contrôles
- Harnais [272] : puissance au niveau 11 (vague, boss, élite et escorte), paliers de butin, palier fermé si le donjon visé n'est pas débloqué ou si le monde n'est pas atteint, Tanière 20 jusqu'à l'Épique et Tanière 1 que du Commun, niveau borné au meilleur + 1, sortie de l'Histoire au niveau 1, sauvegarde aux 4 points.
- Robot (3 parties, phase `--faille` sur les vrais niveaux) : niveaux tenus Tanière 22 / 23 / 25, Cité 14 / 14 / 15, Ruines 10 / 11 / 12, Crypte 4 / 4 / 5, comme au lot 0. Aucune entrée refusée.
- round-harness 4577 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
