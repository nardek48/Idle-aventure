# Aethervale v3.457.2 — Le Chevalier n'est plus puni par les quêtes fixes

Décision de Seb du 20/10/2026 : option A, avec son accord pour modifier `quest-enemy-system.js`.

## Le constat
- Sur les 15 parties du robot en v3.457, le Chevalier meurt 10,4 fois par partie, contre 7,2 pour le Mage et 6,6 pour le Rôdeur. Ses morts sont surtout dans la Forêt : 23 sur 5 parties au seul **Cœur de la Forêt**, le Seigneur de guerre orc, à l'étape 15.
- Au banc (`plafond-bench.js`, 20 combats), le Chevalier gagne ce combat à **30 %**, contre 95 % pour le Rôdeur et 85 % pour le Mage.
- Pourquoi :
  - les ennemis restent sur lui : il encaisse deux fois plus de coups (337 tours au contact, contre 162 et 150) ;
  - il fait environ 25 % de dégâts utiles en moins par action.
  - Les résistances n'y sont pour rien : un boss ignore les résistances et les faiblesses.
- Depuis la v3.448.7, les quêtes qui s'ajustent au héros (`heroRef`, par exemple Nezzam) divisent la puissance ennemie par 1,3 contre le Chevalier. Les quêtes à multiplicateur fixe (`enemyPowerMult`, `bossPowerMult`) ne le faisaient pas.

## Le changement
- `QuestEnemyManager.getPowerMult` divise maintenant le multiplicateur fixe par le diviseur de la classe, lu dans `WORLD_HERO_SCALING.classEhpGabarit` (Chevalier : 1,3 ; les autres classes : 1).
- Les quêtes à `heroRef` ne sont pas concernées : le diviseur y est déjà appliqué, il ne compte pas deux fois.
- Le Rôdeur et le Mage ne changent pas.

## Mesures
| Combat (banc) | Chevalier avant | Chevalier après | Rôdeur | Mage |
|---|---|---|---|---|
| Cœur de la Forêt (Seigneur orc), 20 combats | 30 % | **85 %** | 85 à 95 % | 85 % |
| Les maillons (Crypte, profil Épique), 40 combats | 88 % | **98 %** | 98 % | 98 % |
| Celui qui retient (Crypte, profil Épique), 40 combats | 63 % | **98 %** | 83 % | 83 % |
| Les dunes, la nuée (Désert), 20 combats | — | 100 % | 100 % | 90 à 100 % |

- J'ai essayé un diviseur de 1,2 pour les quêtes seulement : le Chevalier tombait à 75 % au Cœur, sous les autres, et restait à 93 % sur « Celui qui retient ». J'ai gardé le diviseur actuel de 1,3, celui de Nezzam.
- **À juger en jeu** : sur « Celui qui retient », le Chevalier passe désormais devant (98 % contre 83 %).

**Campagne au robot** (6 parties) : 6 sur 6 au bout, médiane 55 h, aucun mur.

| Morts par partie | En tout | Au Cœur |
|---|---|---|
| Chevalier | **4,5** (10,4 avant) | **0,5** (4,6 avant) |
| Rôdeur | 6,0 | 0,5 |
| Mage | 5,5 | 0,5 |

## Code
- **Fichier protégé, avec l'accord de Seb** : `quest-enemy-system.js` (`getPowerMult`, et le nouveau `getClassGabarit`).
- **Harnais** :
  - la section [121] teste le multiplicateur brut avec un Mage ;
  - nouvelle section [252] pour le diviseur du Chevalier ;
  - résultat : 4 479 OK, 0 échec, sur deux passes.

Aucun fichier n'a été ajouté et il n'y a pas de nouveau texte.
