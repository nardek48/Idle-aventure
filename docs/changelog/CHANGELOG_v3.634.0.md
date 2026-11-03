# v3.634.0 — Équilibre des classes

Question de Seb (03/11) : faut-il booster le Chevalier avant d'équilibrer la Tour ? La mesure montre que ce n'est pas le Chevalier qui est faible, c'est le Rôdeur qui est trop fort. Décision de Seb : **converger au milieu**.

## Mesure (avant)
- Campagne complète v3.632.0, temps simulé jusqu'à la fin de l'Histoire :
  - Rôdeur : 30,8 h ;
  - Chevalier : 38,4 h ;
  - Mage : 41,2 h.
- Dragon ancien : Rôdeur en 1 essai, Chevalier en 9, Mage en 7.
- Banc `montagne-acte3-bench.js --detail` (nouvelle option : dégâts infligés héros / compagnons, reçus, esquivés, techniques), dégâts du héros par round :

| Combat | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| Dragon ancien | ~6 300 | ~15 500 | ~13 200 |
| Couronne de la Crypte | ~2 700 | ~4 600 | ~3 400 |

- Le Rôdeur cumulait le plus de dégâts (1,35 à 1,7 fois les autres) et une survie correcte.
- Le Chevalier encaissait bien mais ses combats duraient deux fois plus longtemps : il était en danger contre les boss qui montent en rage.
- Le Mage avait de bons dégâts mais c'était la classe la plus fragile.

## Le réglage
Champ `balance` par classe dans `data/classes.js` :
- **Chevalier** : ×1,15 sur tous ses dégâts.
- **Rôdeur** : ×0,85.
- **Mage** : +5 % de PV. Un essai à +10 % ne changeait rien contre le Dragon, qui est une course aux dégâts ; on est resté à +5 % comme validé.

Le multiplicateur passe par `VeinSystem.classMult()`, appliqué dans `bladeMult` : c'est la seule accroche hors fichiers protégés qui couvre l'attaque de base et les techniques. Les PV passent par `TalentManager.getStatBonuses()`.

## Mesure (après) — campagne complète, trois classes : 122 contrôles, 0 échec chacune

| | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| Temps total | 35,3 h | 36,8 h | 33,4 h |
| Montagne | 14,5 h | 12,6 h | 14,8 h |
| Tour | 3,7 h | 2,7 h | 3,2 h |
| Dragon ancien | 1 essai, 56 % | 4 essais, 11 % | 2 essais, 20 % |
| La silhouette | 58 % | 37 % | 43 % |
| Seul | 43 % | 100 % | 48 % |

La silhouette tombe maintenant près de la cible de la conception (25 à 40 %) pour le Rôdeur et le Mage. La Tour reste courte (2,7 à 3,7 h).

## Code
- `data/classes.js` : `balance`.
- `systems/vein-system.js` : `classMult`.
- `systems/talent-system.js` : PV de classe.
- Aucun fichier protégé touché, aucun fichier ajouté.

## Outils
- `round-harness.js` : [429] ; tests des veines et de la braise lus hors multiplicateur de classe.
- `montagne-acte3-bench.js` : `--detail`.
