# v3.767.0 — Un seul suivi du héros en avance, sur la courbe (C3b) (10/11/2026)

Décision de Seb (10/11, C3b, option A, puis A1 après mesure ; accord pour `progression-system.js`). Aucun fichier ajouté. Pas de ligne « Quoi de neuf » : le changement ne se voit qu'à la marge (héros très en avance).

## Ce qui change
- **Un seul suivi** : `HERO_TRACKING` (`data/worlds.js`) remplace `WORLD_HERO_SCALING` (quêtes) et `PA2_HERO_SCALING` (Petites Aventures, Labyrinthe, Faille). Réglage par chapitre repris des quêtes : suivi 0,5 / marge 15 % en Forêt, Désert, Ruines ; 0,75 / 5 % de la Crypte à la Tour ; plafond ×2,5 ; obstacles ×(moyenne)^0,6 ; coupé dans les Cycles. `CombatForecast.getHeroScale(ref, worldId)`.
- **Référence = la courbe à l'étape du combat** : `QuestEnemyManager.trackAt` (quêtes : étape de la quête ; Labyrinthe et Faille : étape d'ouverture) ; Petites Aventures : héros de référence de la tranche. Les deux références fixes par monde (`refByWorld`) et le `heroRef` du Trône sont retirés.
- **`progression-system.js`** (protégé, accord de Seb) : `generateEnemy` ne suit plus le héros, `getHeroScale` et `_heroRefKey` retirés ; chaque combat applique le suivi lui-même.
- **Donjons et élites : pas de suivi** (option A1, choix de Seb après mesure) : contenu répétable, difficulté choisie par les niveaux de donjon. Les escortes d'élite, qui suivaient le héros par effet de bord de `generateEnemy`, ne le suivent plus.

## Mesures
- Essai A (suivi étendu aux donjons et aux élites) : robot 42 morts (28 avant), Sphinx 6, Wyrm en entretien 18 ; Cité engloutie au plafond, Rôdeur 70 → 15 %. Écarté.
- A1 : robot, campagne entière, 6 parties par classe : 18/18 au bout, 31,3 h médianes, **12 morts** (28 en v3.765.0), dont 1 en Histoire (l'Orc) ; le reste au Wyrm de cendres en entretien (Rôdeur). `plafond-bench` (20 runs) : équivalent (Orc, Rôdeur 85 → 70 %, seul écart notable).

## Outils
- `campagne-harness.js` : `ESSAI_HS` sur `HERO_TRACKING`. `generate-balance-guide.js` : section 2.8 sur le suivi unique. `courbe-bench.js --implicite` : lit l'avant C1 seulement.

## Contrôles
- `round-harness` 7293 OK sur 3 passes ([194], [226], [231], [238], [308], [377], [420], [492] mis à jour ; [518] nouveau) ; boot 4 OK ; création du héros 44 OK ; parcours P11 15 OK ; i18n 100 %.
