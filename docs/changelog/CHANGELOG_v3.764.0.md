# v3.764.0 — Courbe de référence : les quêtes réglées dans ses unités (C1) (10/11/2026)

Décision de Seb (10/11, équilibrage propre C, étape C1, option A puis A2). Aucun fichier protégé touché, aucun fichier ajouté. Pas de ligne « Quoi de neuf » : le jeu est le même pour le joueur.

## Ce qui change
- **Courbe de référence** (`QuestEnemyManager.courbeRef`, `quest-enemy-system.js`) : la force attendue du héros (dégâts par round, PV effectifs) à chaque étape de l'Histoire, interpolée entre `foret1` et les héros du robot de fin de chapitre (`COURBE_DEBUT`, `COURBE_FIN_DE_CHAPITRE`, `worlds.js`) ; la Tour prolonge la pente de la Montagne.
- **Place d'une quête** (`placeOf`) : l'étape dont le lien vise `adv_<quête>` ; sinon `quest.etape`, sinon le quart ou les trois quarts du chapitre (Couronne, élites de la Forêt).
- **Ennemi moyen** (`baseline`) : PV et coup de l'ennemi moyen du pool d'origine de l'aventure, sans suivi du héros ni Cycle (ou le boss lui-même), en cache.
- **Cibles des 41 quêtes** (`adventure-quests.js`) : `target` (ennemi moyen) et `bossTarget` (boss) en `{ rounds, hit }`. `rounds` = PV ÷ dégâts par round du héros attendu ; `hit` = part de ses PV effectifs par coup. Elles remplacent `enemyHpMult`, `bossHpMult`, `enemyPowerMult`, `bossPowerMult`, `encounterHpMult`, `noWorldBossHp` ; chaque ligne garde en commentaire l'ancien réglage. `questEnemyByWorld` et `questBossHpByWorld` (`worlds.js`) sont fondus dedans. La forme des rencontres (`hpMult`, `groupHpMult`) reste.
- **Moteur de quête** : `applyTarget` (niveau = cible × héros attendu ÷ ennemi moyen) remplace `getPowerMult`, `applyPowerMult`, `applyWorldMult`. Petites Aventures et Labyrinthe (pas des quêtes du jeu) : inchangés.
- **Silhouette face au Rôdeur** (`tower-system.js`) : `bossHpFactor` 0,7294 (= 3,1 / 4,25) sur sa cible.

## Mesures
- `courbe-bench.js` (nouveau banc, sans combat, tirage fixé), `main` contre v3.764.0 : 137 rencontres, écart maximal 3,3 % (arrondi d'un point de puissance sur les petits ennemis de la Forêt), 135 à moins de 2 %.
- Robot, campagne entière, 6 parties par classe : 18/18 au bout, 31,1 h médianes (31,2 h en v3.763.0) ; 6 morts en Histoire (5 en v3.763.0), dans le bruit du lot. 4 morts « entretien » du Rôdeur au Wyrm de cendres (donjon, C2).

## Outils
- `tools/sim/courbe-bench.js` : ennemis de quête contre la courbe (`--implicite` : unités de la courbe).
- Options d'essai des bancs (`--enc`, `--qboss`, `--hp`…) : multiplicateurs de la cible (×1 = réglage actuel). `ESSAI_B` du robot retiré.

## Contrôles
- `round-harness` 7284 OK sur 3 passes ([48b], [65b], [89], [121], [141], [226], [252], [342], [377], [465], [496] mis à jour ; [515] nouveau) ; boot 4 OK ; création du héros 44 OK ; parcours P11 15 OK ; i18n 100 %.

## Pour la suite
- Badge facile / moyen / difficile : à tirer des PV perdus par quête au robot (la cible seule ne compte ni le nombre de rencontres ni les mécaniques de boss).
- `FORECAST_CLASS_DMG_MULT` (pronostic) : à revoir avec `forecast-calibration-bench`.
- C2 : donjons et élites sur la même courbe (`dungeon-system.js`, protégé).
