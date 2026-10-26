# v3.495.0 — Chantier du héros, H3 : des rangs de talent en plus

Troisième lot du chantier du héros (conception `systemes/Aethervale_Conception_Heros_v0_1.md`). Décision de Seb du 26/10 : option C (des rangs de plus sur les nœuds existants), chiffres gardés après mesure.

## Ce qui change en jeu
Par classe, 5 nœuds gagnent un rang : un nœud de tronc passe à 3 rangs, et chaque voie gagne deux nœuds à 2 rangs.

| Classe | Nœud | Rang 1 → rang 2 (ou 3) |
| --- | --- | --- |
| Chevalier | Cuirasse | 3 rangs : +18 % de PV au lieu de +12 % |
| | Mur | Garde −65 % → −70 % |
| | Riposte | 30 % → 45 % des dégâts bloqués renvoyés |
| | Brise-os | vulnérabilité +30 % → +40 % |
| | Soif du bourreau | ennemi tué : +20 → +30 Rage |
| Rôdeur | Œil vif | 3 rangs : +12 % de critique au lieu de +8 % |
| | Coup au but | critique : +10 → +15 Concentration |
| | Perforation | Tir perforant : 40 → 35 Concentration |
| | Transe | frappes bonus +20 % → +30 % |
| | Nuée de flèches | Rafale : 4 → 5 coups |
| Mage | Peau d'arcane | 3 rangs : +15 % de PV au lieu de +10 % |
| | Braises tenaces | brûlure 3 → 4 rounds |
| | Incendie | Déflagration +25 % → +40 % sur une cible qui brûle |
| | Barrière vive | absorbe 55 % → 65 % |
| | Surtension | au-dessus de 80 Mana : +10 % → +15 % |

- **Plafond de points** à la Montagne : 18 à l'acte I, 20 à l'acte II, 21 à l'acte III, 23 à l'acte IV.
- **Ce qui s'achète au plus** : une classe dépense 18 points (les clés restent exclusives), le Commandement 5, soit 23. Les points en réserve en fin de Montagne deviennent utiles.
- **Porte de la clé** : elle compte des nœuds de la voie, pas des rangs (« 3 nœuds » reste 3 nœuds).

## Mesures
Banc `montagne-acte3-bench.js --talents-max`, héros de fin de campagne, 30 runs (Chevalier / Rôdeur / Mage) :
- le Wyrm passe de 59 / 32 / 40 à 56 / 29 / 38 rounds ;
- la quête de l'étape 14 passe de 100 / 100 / 90 % à 100 / 100 / 97 % ;
- le Dragon ancien passe de 97 / 93 / 90 % à 100 / 100 / 97 %.

Les 5 points valent environ 25 points d'entraînement, la moitié des rangs de sorts (H2).

## Code
- `data/talent-trees.js` : `maxRank` et valeurs par rang. Un `set` en tableau donne la valeur du rang, de même qu'une valeur en tableau dans `TALENT_VALUES`.
- `systems/talent-system.js` :
  - `modKit` lit la valeur du rang ;
  - `V(k, id)` lit la valeur au rang du talent ;
  - `pathSpent` compte des nœuds.
- `data/world-caps.js` : `TALENT_CAP_BY_ACT` gagne trois crans à la Montagne.
- `lang/en.js` : 24 textes mis à jour.
- Aucun fichier ajouté, aucun fichier protégé, aucun nouvel état sauvegardé.

## Outils
- `round-harness.js` : section [324] (rangs par classe, valeurs par rang, porte de la clé, plafond par acte) ; [122] mis à jour (Cuirasse à 3 rangs).
- `montagne-acte3-bench.js` : option `--talents-max`.
