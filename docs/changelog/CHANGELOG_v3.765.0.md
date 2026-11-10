# v3.765.0 — Courbe de référence : donjons et élites (C2) (10/11/2026)

Décision de Seb (10/11, équilibrage propre C, étape C2 ; accord pour `dungeon-system.js`). Aucun fichier du jeu ajouté. Pas de ligne « Quoi de neuf » : le jeu est le même pour le joueur.

## Donjons (`dungeon-system.js`, protégé, accord de Seb ; `data/dungeon.js`)
- Chaque donjon porte trois cibles dans les unités de la courbe : `target` (vague ordinaire, escortes et groupes compris), `eliteTarget` (élites des vagues), `bossTarget` (boss), à l'étape du donjon (`requiresStoryStep`, `etape: "forest_13"` pour la Tanière).
- Retirés : `difficultyMult` (sa part « force »), `wavePremiumMult` (Tanière), le `statMult` des six boss. Deux effets cachés de `difficultyMult` deviennent des champs explicites : `speedMult` (vitesse des ennemis = √ de l'ancienne valeur : ×1,34 Tanière à ×8,37 Sommet) et `rewardRank` (récompenses de fin de run, formule inchangée).
- `applyTargets` (dans `buildWaveEnemy`, avant le niveau du run), `levelOf`, `baseline` (ennemis moyens neutres en cache, Sommet coupé, statMult d'origine des élites). La puissance exacte est gardée jusqu'au dernier arrondi (`_powRaw`, effacé ensuite).
- Restent la forme : rampe des vagues, groupes, escortes, identité des élites, niveaux de donjon, Marques, cartes de halte, Sommet dur.

## Élites hors donjon (`elite-system.js`, `data/elites.js`)
- 13 élites de carte et de quête portent `target` (à mi-chapitre du monde où elles se battent) ; `EliteManager.levelOf` / `baseline` (duel neutre, statMult d'origine). `ELITE_HP_BY_WORLD` et `ELITE_POWER_BY_WORLD` fondus dedans. Escortes et `eliteStatMult` des quêtes restent la forme. Labyrinthe inchangé (C3).

## Mesures
- `courbe-bench.js --donjons --elites`, avant contre après : élites à 0,14 % au plus ; donjons 88 vagues sur 96 à moins de 2 %, les 8 autres d'un point de puissance ou de PV sur de petits ennemis.
- `plafond-bench` (20 runs) : mêmes taux, écarts de quelques points dans les deux sens, y compris sur des quêtes que C2 ne touche pas (le calcul de l'ennemi moyen consomme des tirages : séquences décalées).
- Robot, campagne entière, 6 parties par classe : 18/18 au bout, 30,8 h médianes ; 28 morts (11 au lot C1), dans la fourchette déjà vue sans changement (8 à 29).

## Outils
- `tools/sim/essai-cible.js` (nouveau, outillage) : essais de banc sur les cibles (×1 = réglage actuel). `--diff` et essais de boss de `cite-vague5`, `crypte-acte3`, `montagne-acte3`, `plafond`, `ruines-acte3` ; `--elite-hp` de `forge-mondes` (par élite).
- `courbe-bench.js` : `--donjons`, `--elites`.

## Contrôles
- `round-harness` 7289 OK sur 3 passes ([47b], [55b], [115], [121], [377], [461] mis à jour ; [516] nouveau) ; boot 4 OK ; création du héros 44 OK ; parcours P11 15 OK ; i18n 100 %.

## Pour la suite
- C3 : ennemis du monde, Petites Aventures, Labyrinthe, Tour ; un seul suivi du héros en avance (`progression-system.js`, protégé).
