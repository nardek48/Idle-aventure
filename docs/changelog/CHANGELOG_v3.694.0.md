# v3.694.0 — Décisions économie (Seb, 05/11 : ECON-1 et ECON-2, option A)

Deux décisions de Seb prises le 05/11 sur la page de décisions, appliquées telles quelles.

## Corrigés

- **ECON-1** (= EQUI-1, QUET-3), option A : « la réserve du Grand Ouvrage couvre toujours la Forge demandée par l'Histoire ». Le versement automatique garde désormais, pour chaque matière brute, au moins le coût du prochain niveau de Forge quand une étape d'Histoire en cours ou à venir du chapitre ouvert l'exige (`ruines_13` Forge 4, `crypte_13` Forge 5, `montagne_13` Forge 6, `tour_13` Forge 7, lus sur les paliers de `story-quests.js`), et seulement si ce niveau est ouvert (`getNextCost("forge")`, donc après `forgeActStep`). Toujours plafonné par l'Entrepôt. À l'Entrepôt 0 et au seuil 0,70 : 400 pierres gardées à la Forge 5, 480 aux Forges 6 et 7 (au lieu de 350). Hors de ces étapes, ou Forge déjà bâtie, rien ne change. `getUsableCap` et `capHint` (v3.687) lisent `autoKeep` : leurs messages suivent. L'achat automatique des parcelles n'entame pas non plus cette part. `js/systems/grand-ouvrage-system.js` (`storyForgeKeep`, `_storyStepPending`), `js/systems/production-plots-system.js` (`_autoKeep`).
- **ECON-2**, option A : revente d'une potion au plus à la valeur de ses ingrédients (recette de l'Apothicaire, valeurs du Grand Ouvrage) : Soin mineur 16 or (12 Eau + 4 Blé), Soin majeur 64 or (24 Eau + 2 Pain ; le Pain vaut 20 = 15 Blé + 5 Eau, le rapport comptait 62 avec un Pain à 19). Potion de puissance 21 or. Une potion sans recette garde la moitié de son prix. Le stock ne distingue pas une potion achetée d'une préparée : le plafond vaut pour toutes. Le bouton dit « Vendre (+16 or) » (340 px à 390 px, mesuré dans Chromium). `js/systems/potion-system.js` (`getSellValue`), `js/ui/equipment-view.js`.
- `js/lang/en.js` : 1 texte. « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [459] : Forge 5, 6 et 7 payables à l'Entrepôt 0 et au seuil 0,70, comportement d'avant hors de ces étapes, plafond de l'Entrepôt, parcelles ; prix de revente, vente réelle, bouton.

## Campagne de contrôle

`node tools/sim/campagne-lot.js . --combats --n 2` (profil par défaut, 6 parties) : 6/6 au bout, Tour jouée 6/6, médiane 30,1 h (26 à 42 h). Plus aucun arrêt à `montagne_13` (médiane 2,4 h) ni à `tour_13` (2,3 h) ; `crypte_13` 3,5 h. Murs restants, hors économie : `montagne_19` Dragon ancien 3/6, `tour_18` La silhouette 1/6.

## Laissés

- Aucun.

Contrôles : round-harness 6 444 OK, 0 échec (2 passes) · boot 4 OK · création 44 OK · i18n 100 %, 0 orphelin · parcours 212 OK. Aucun fichier ajouté.
