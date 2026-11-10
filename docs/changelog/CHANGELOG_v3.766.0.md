# v3.766.0 — Courbe de référence : Petites Aventures, Labyrinthe et Faille (C3a) (10/11/2026)

Décision de Seb (10/11, équilibrage propre C, étape C3a ; accord pour `progression-system.js`, non touché ici). Aucun fichier ajouté au jeu. Pas de ligne « Quoi de neuf » : le jeu est le même pour le joueur.

## Ce qui change
- **Petites Aventures** (`pa2-content.js`, `pa2-run.js`) : chaque tranche de `PA2_LEVEL_BANDS` porte `target` `{ rounds, hit }` en unités de son héros de référence (`heroRef`), au lieu de `foeScale` (0,8 en tranche 1). `Pa2Run.levelOf` relit la cible dans les données (un run sauvegardé garde une copie de sa tranche). Actes, anneaux, nœuds, gardien (`PA2_GUARDIAN`) et suivi du héros restent la forme.
- **Labyrinthe et Faille** (`labyrinth.js`, `faille.js`, `labyrinth-run.js`) : `guardTarget`, `foeTarget` (Contremaître), `bossTarget` (gardien) à l'étape d'ouverture (`requiresStoryStep`, `etape: "tour_20"` pour la Faille), au lieu de `guardMult`, `foeHpMult` / `foePowMult`, `bossHpMult` / `bossPowMult`. `LabyrinthRun.levelOf` / `baseline` (ennemis bruts sans Cycle, en cache). Croissance par étage et type de garde restent la forme.

## Mesures
- Niveaux recalculés contre les anciens multiplicateurs : à 0,4 % au plus (arrondi des cibles) — Labyrinthe gardes ×1,80, Contremaître ×0,55 / ×0,80, gardien ×8,0 / ×2,4 ; Faille ×1,2 et ×5,3 / ×1,6 ; tranches ×0,80 puis ×1,00.
- `pa2-bench` (40 runs) contre `main` : mêmes taux, écarts de 2 à 3 points dans les deux sens (tirages décalés).
- Robot, campagne entière, 2 parties par classe : 6/6 au bout, Tour jouée, aucun mur, 5 morts.

## Outils
- `pa2-bench.js` : `scale1` agit sur la cible de la tranche 1 (0,8 = réglage actuel).

## Contrôles
- `round-harness` 7295 OK sur 3 passes ([160] mis à jour ; [517] nouveau) ; boot 4 OK ; création du héros 44 OK ; parcours P11 15 OK ; i18n 100 %.

## Pour la suite
- C3b : un seul suivi du héros en avance, sur la courbe (change le jeu, à mesurer et à valider par Seb).
