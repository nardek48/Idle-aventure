# v3.696.0 — Décisions d'équilibrage (Seb, 05/11 : EQUI-6 A, EQUI-10 B, EQUI-18 A, EQUI-7 A, EQUI-8 A, Dragon ancien A)

Décisions prises par Seb le 05/11 sur la page de décisions, appliquées telles quelles. Toutes les mesures sont faites sur la v3.695.0, donc après le nouveau repli de combat (COMB-1).

## Corrigés

- **EQUI-6**, option A : le Golem de la vague 12 du Sanctuaire scellé devient une élite à part, `golem_sanctuaire` : puissance **4 → 3,4**. Endurance, célérité, escorte et portrait restent ceux du Golem. Le Golem de l'étape 14 (`golem`, quêtes `aq_ruines_golem` et `aq_ruines_coeur`) et celui de la carte (`golem_tour`) gardent 4. L'élite `golem_sanctuaire` n'existait pas : elle est créée. Elle a sa propre fiche au Bestiaire (« Le Golem », lore propre, traduit). Les hauts faits « Le Golem, encore » et celui des élites des Ruines la comptent aussi. Fichiers : `js/data/elites.js`, `js/data/dungeon.js` (`eliteWaves`), `js/data/achievements.js`.
- **EQUI-10**, option B : la Liche des sépulcres (boss de l'Ossuaire, `crypte_15`) passe de **0,72 à 0,83** en puissance, le Porte-couronne (vague 8 de l'Ossuaire) de **3 à 3,45**, soit +15 % chacun. La quête « La couronne de trop » remplace la puissance par son propre calage (`eliteStatMult.power` 2,1) : elle ne change pas. Fichiers : `js/data/dungeon.js`, `js/data/elites.js`.
- **EQUI-18**, option A : le « 10 » est le multiplicateur de prix des Ruines dans `EQUIP_SHOP_WORLD_PRICE_MULT`, indexé sur le monde le plus loin atteint. La grille devient **1, 4, 7, 15, 20, 30**. Elle s'applique aux objets de la vitrine, à la relique et au renouvellement manuel. L'Enchanteresse garde sa grille (`ENCHANT_WORLD_PRICE_MULT`). Fichier : `js/systems/equip-shop-system.js`.
- **EQUI-7**, option A : la voie Faucon du Rôdeur a un conseil (`tip`), affiché dans la fiche de chacun de ses talents, sous l'effet. Aucun chiffre ne change. Texte : « Conseil : Faucon frappe fort mais protège peu (seule Visée posée donne des PV). Si un boss te met à terre, essaie Ombre : ses esquives t'usent moins, et la remise à zéro est gratuite. » Le conseil a été vérifié :
  - dans le code : Visée posée (`a_tir_ajuste`, +10 % PV) est le seul talent de Faucon qui donne des PV. `TalentManager.respec` ne coûte rien ;
  - au banc Sanctuaire, profil Rare, contre Varrek : Ombre finit avec plus de PV et boit moins de potions que Faucon, avant comme après EQUI-6 (voir plus bas).

  Fichiers : `js/data/talent-trees.js`, `js/ui/talents-view.js`, `css/04-panel-talents.css` (`.tt-sheet-tip`), `js/lang/data-fields.js` (champ `*.paths.*.tip`). Vu dans Chromium à 390 × 844, en français et en anglais : le texte va de 14 à 376 px, en 12 px, sur 50 px de haut, sans défilement horizontal.
- **EQUI-8**, option A : remesuré au banc. Le Mage meurt moins de 2 fois plus que la moyenne des deux autres classes, donc **rien n'a changé** (chiffres plus bas). À noter : `hpPct` du Mage vaut **déjà 0,05** depuis le 03/11 (`classes.js`). Le « 0 → 0,05 » de la consigne datait d'avant ce réglage.
- `js/lang/en.js` : 3 textes (lore de `golem_sanctuaire`, conseil Faucon, Quoi de neuf). « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` :
  - [461] : élite et vague 12, Golem de l'étape 14 inchangé, haut fait, Liche, Porte-couronne et sa quête, grille de l'échoppe et prix aux Ruines, Enchanteresse, conseil présent dans Faucon, traduit, absent dans Ombre, PV par classe ;
  - [contrôle du Sanctuaire existant] : la vague 12 attend maintenant `golem_sanctuaire`.

## Mesures

### EQUI-6 : `node tools/sim/ruines-acte3-bench.js . --profil rare --runs 40 --voie A|B` (Wenna + Maddoc, campement « Souffler »)

Taux de victoire contre Varrek, puis PV restants en fin de sortie :

| Voie | Classe | Avant (Golem à 4) | Après (`golem_sanctuaire` à 3,4) |
|---|---|---|---|
| A (Faucon pour le Rôdeur) | Chevalier | 95 % · 58 % PV · 0,6 potion | 100 % · 64 % · 0,2 |
| A | **Rôdeur** | **65 %** · 40 % · 1,5 | **85 %** · 45 % · 1,1 |
| A | Mage | 95 % · 42 % · 1,3 | 100 % · 51 % · 0,6 |
| B (Ombre pour le Rôdeur) | Chevalier | 100 % · 64 % · 0,3 | 100 % · 68 % · 0,1 |
| B | **Rôdeur** | **78 %** · 41 % · 1,3 | **88 %** · 48 % · 0,9 |
| B | Mage | 53 % · 37 % · 1,7 | 85 % · 46 % · 1,4 |

- Avant toute modification, le Rôdeur en voie A était déjà à 65 % (27 % dans l'audit du 04/11). C'est l'effet de COMB-1.
- 3,4 tient la cible RU6 (Rôdeur ≥ 60 %) et la dépasse un peu (85 à 88 %, pour une fourchette de 65 à 80 %). Ce n'est pas un écart large : **aucun second ajustement**.

### EQUI-10 : `node tools/sim/crypte-acte3-bench.js . --profil epique --runs 40` (Ossuaire complet : Porte-couronne, campement, Pleureuse, Liche)

| Classe | Défaites contre la Liche, avant → après | PV au campement | PV restants en fin de sortie (PV perdus) | Potions |
|---|---|---|---|---|
| Chevalier | 0 % → 0 % | 65 → 63 % | 58 → 49 % (42 → 51 % perdus) | 0,1 → 0,5 |
| Rôdeur | 2 % → **17 %** | 57 → 54 % | 51 → 39 % (49 → 61 %) | 0,8 → 1,3 |
| Mage | 5 % → 5 % | 61 → 59 % | 50 → 45 % (50 → 55 %) | 0,3 → 0,7 |

L'Ossuaire coûte maintenant 49 à 61 % des PV avec potions. Le Rôdeur dépasse la cible de 10 % de défaites (17 %). Le réglage reste « à juger en jeu par Seb », comme le prévoyait l'option B.

### EQUI-18 : prix réels de l'échoppe aux Ruines (vrai moteur, `EquipShopManager.getPrice`), rapportés au lot de campagne v3.695.0

Repères du lot : or gagné aux Ruines, médiane 147 500 (de 143 600 à 187 200) ; bourse en fin de Ruines, 30 000 à 36 000. Achats à l'échoppe aux Ruines : 0 à 2 par partie.

| Pièce | ×10 (avant) | ×7 (après) | Part de l'or des Ruines | Payable par la règle du robot (< 40 % d'une bourse de 33 000) |
|---|---|---|---|---|
| Commune | 3 000 | 2 100 | 2,0 → 1,4 % | oui → oui |
| Inhabituelle | 10 000 | 7 000 | 6,8 → 4,7 % | oui → oui |
| Rare | 25 000 | **17 500** | 16,9 → **11,9 %** | non → non (il faudrait une bourse de 43 750, contre 62 500 avant) |
| Relique | 10 000 | 7 000 | | |
| Renouvellement (1er) | 10 000 | 7 000 | | |

La Rare des Ruines passe de 17 % à 12 % de l'or du monde. La Crypte reste à ×15, ce qui garde la grille croissante.

### EQUI-8 : défaites par classe aux points durs (sauvegardes du lot v3.695.0, une par classe, au même point de l'Histoire)

| Point | Banc | Chevalier | Rôdeur | Mage | Moyenne Ch./Rô. | Mage ÷ moyenne |
|---|---|---|---|---|---|---|
| `montagne_02` « Ce qui affleure » | `montagne-acte1-bench --save <classe>_mountain.json --runs 20` (sans potion) | 55 % | 45 % | 75 % | 50 % | 1,5 |
| `montagne_19` Dragon ancien | `montagne-acte3-bench --quetes aq_montagne_dragon --save <classe>_tower.json --runs 20` | 5 % | 95 % | 90 % | 50 % | 1,8 |
| `forest_13` Tanière du Basilic | `montagne-acte3-bench --donjon 1 --save <classe>_desert.json --runs 20` | 0 % | 0 % | 0 % | 0 % | sans objet |
| Lot de campagne v3.695.0, morts au Basilic (`forest_13`) | | 0 | 4 | 4 | 2 | 2,0 |

- Sur les trois points, le Mage meurt 1,5 à 2 fois plus. Il ne dépasse jamais 2 fois la moyenne des deux autres classes. Le seuil n'est pas atteint : **pas de +5 % de PV**.
- Il n'y a pas de Liche à `montagne_02`. Cette étape, c'est « Ce qui affleure », aux Pentes de cendres (morts : Ifrit). La Liche des sépulcres est mesurée au point EQUI-10, Mage 5 % de défaites.
- La Tanière est jouée avec un héros de fin de Forêt, plus fort qu'à `forest_13` et sans Marque. Elle ne départage pas les classes ; le lot de campagne sert de repère.

## Proposé à Seb (non appliqué) : Dragon ancien (`montagne_19`)

Banc : `montagne-acte3-bench --quetes aq_montagne_dragon --runs 20`, sauvegardes d'entrée de Tour du lot v3.695.0. Ce héros est un peu plus fort qu'à `montagne_19`, donc le banc est plutôt optimiste. Réglage actuel : `bossHpMult` 3,5, `bossPowerMult` 0,94.

| Essai (PV × / puissance ×) | Victoires Ch. / Rô. / Ma. |
|---|---|
| 3,5 / 0,94 (actuel) | 95 / 5 / 10 % |
| 3,5 / 0,80 | 100 / 20 / 15 % |
| 3,0 / 0,80 | 100 / 45 / 25 % |
| 2,6 / 0,70 | 100 / 95 / 50 % |

- Au réglage actuel (`--detail`), le Mage tient 30 rounds contre 45 pour le Chevalier. Il inflige 420 000 dégâts contre 634 000, alors que le Dragon est faible à la magie. Le mur vient de la survie du Rôdeur et du Mage.
- Pour comparaison, la campagne : 79 % de défaites, 37 morts (Rôdeur 19, Mage 17, Chevalier 1), 2 murs.
- **Proposition** : `bossHpMult` 3,5 → **2,6** et `bossPowerMult` 0,94 → **0,70**. C'est le seul essai qui sort le Rôdeur du mur. Le Mage n'y atteint que 50 % : une option complémentaire propre au Mage reste à choisir par Seb.
- Variante plus prudente : 3,0 / 0,80, mais Rôdeur et Mage y restent sous 50 %.

## Repéré (non corrigé)

- Le Bestiaire a maintenant trois fiches « Le Golem » : `golem`, `golem_tour` et `golem_sanctuaire`. Elles partagent le même portrait, et c'est bien la même créature. Le lore diffère. Les victoires passées contre le Golem du Sanctuaire restent comptées sur `golem`. À Seb de voir s'il veut une fiche commune.
- EQUI-10 : le Rôdeur atteint 17 % de défaites contre la Liche après +15 %, au-delà de la cible de 10 %.

## Laissés

- Aucun : les six décisions sont appliquées ou mesurées. Le Dragon ancien est seulement proposé, comme demandé.

Contrôles : round-harness 6 465 OK, 0 échec (2 passes) · boot 4 OK · création 44 OK · i18n 8 450 textes, 100 %, 0 orphelin · parcours 212 OK · conseil Faucon vu dans Chromium à 390 px, en français et en anglais. Aucun fichier ajouté.
