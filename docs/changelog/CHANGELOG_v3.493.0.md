# v3.493.0 — Chantier du héros, H1 : l'entraînement au-delà de 150

Premier lot du chantier du héros (conception `systemes/Aethervale_Conception_Heros_v0_1.md`, dépôt de documentation). Décisions de Seb du 26/10 : le plafond monte dès la Montagne (1 : A), en deux temps (2 : A), au prix ×15 (3), avec des ennemis de fin de Montagne renforcés (R1) et les prix du Terrain proposés.

## Ce qui change en jeu
- **Plafond d'entraînement : 200** au lieu de 150, sur les cinq caractéristiques.
- **Terrain d'entraînement 14 à 18** (+10 niveaux chacun) : 160, 170 à l'acte III de la Montagne (« La bouche »), puis 180 à 200 à l'acte IV (« Ce qui respire »). Ils se paient en or, Planches, Pierre, Acier et **Obsidienne taillée** : de 10 000 or + 3 Obsidiennes (Terrain 14) à 20 736 or + 6 (Terrain 18), soit environ 74 000 or et 21 Obsidiennes en tout.
- **Prix ×15 au-delà de 150** : la Force passe de 82 or (niveau 150) à 1 248 (niveau 151). Monter les cinq caractéristiques de 150 à 200 coûte 266 142 or. Les niveaux 1 à 150 gardent leur prix.
- **Fin de la Montagne plus résistante (R1)** :
  - Gueule du volcan : difficulté 22 → 30 (vagues et Wyrm : +36 % de PV, +17 % de puissance) ;
  - quêtes de l'étape 14 et de l'acte IV : PV des rencontres ×1,8 → ×2,6 ;
  - Dragon ancien : PV ×1,7 → ×2,5, puissance ×0,7 → ×0,75.

## Mesures
Banc `montagne-acte3-bench.js`, héros de fin de campagne, 30 runs (Chevalier / Rôdeur / Mage) :

| Combat | Avant (150, ennemis d'avant) | Après (H1 + R1) |
| --- | --- | --- |
| Wyrm (héros à 170) | 97 / 93 / 100 %, 50 / 37 / 39 rounds | 87 / 93 / 87 %, 63 / 45 / 49 rounds |
| Dragon ancien (héros à 200) | 100 / 100 / 87 % | 97 / 93 / 70 % |

Campagne de la Montagne au robot, depuis la fin de la Crypte : 20 étapes sur 20 pour les trois classes.
- Le Chevalier passe en 20,9 h (3 morts, contre 0 en M-6).
- Le Rôdeur passe en 23,9 h (0 mort).
- Le Mage passe en 16,8 h (3 morts, contre 39,3 h et 11 morts en M-6).
- Les trois finissent à 200 et Terrain 18, avec encore 430 000 à 660 000 or (la revente des Épiques farmés domine).

## Code
- **Fichiers protégés (accord Seb)** :
  - `systems/progression-system.js` : `getTrainingPriceMult` (tranche ×15) et plafond lu sur `TRAINING_HARD_CAP` au lieu de 150 en dur ;
  - `data/dungeon.js` et `data/adventure-quests.js` (accord Montagne) : R1.
- `data/upgrades.js` : `TRAINING_HARD_CAP = 200`, `TRAINING_PRICE_TRANCHES`.
- `data/village-buildings.js` : Terrain à 18 niveaux. Le palier en Résine (jamais ouvert, inutile depuis le socle à 20) est remplacé par l'Obsidienne.
- `data/world-caps.js` : Terrain 15 à `montagne_11`, 18 à `montagne_16`.
- `systems/village-building-system.js` : la reprise des très vieilles sauvegardes (avant v3.213) s'arrête au Terrain 13, au lieu d'offrir le Terrain 14.
- `ui/heros-screens-view.js` : « Maximum absolu » lu sur le nouveau plafond.
- Aucun fichier ajouté, aucun nouvel état sauvegardé.

## Outils
- `round-harness.js` : section [322] (prix, plafonds, paliers par acte). Les sections [STATS/CAP], [22b], [23b], [50b], [105] et [267] sont mises à jour pour le plafond de 200.
- `montagne-acte3-bench.js` : option `--entrainement N`.
