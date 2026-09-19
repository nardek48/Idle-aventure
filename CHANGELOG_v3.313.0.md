# v3.313.0 — Boutique : Bourse lourde et Contrats lucratifs retirés (décision Seb 19/09/2026)

## Pourquoi

Les deux améliorations ne touchaient que l'or lâché par les ennemis tués (6-7 or par ennemi
en Forêt, 12-14 au Désert). Depuis la fin du farm libre, cet or pèse moins de 10 % d'une quête
(« Prouver sa valeur » : ~95 or de kills pour 800 de récompense). Bourse niveau 10 (~900 or) :
environ +3 % de revenus. Contrats lucratifs : +10 % sur l'or des boss, et ne s'ouvrait qu'au
monde 3 (inexistant).

## Ce qui change

- `UPGRADES` : `u_gold` et `u_bounty` retirés ; il ne reste que les cinq entraînements.
- **Remboursement** (`refundRetiredUpgrades`, `core/state.js`, appelé par
  `ensureGameStateDefaults`) : l'or dépensé est rendu une fois (même formule que
  `getUpgradeCost`), les clés quittent la sauvegarde, une ligne au journal. Aucun fichier
  protégé touché (le renommage historique de `save-system.js` reste inoffensif).
- **Boutique** : ouvre sur les Potions ; l'onglet Économie et sa barre n'apparaissent que s'il
  reste une amélioration d'or à vendre (`shopHasEconomyUpgrades`). Les portes « Économie » du
  Campement et de la Taverne suivent la même règle.
- **Étape Boutique de la Forêt** (`storyHasShopPurchase`) : une potion possédée suffit, comme
  avant ; la branche Bourse/Contrats est retirée.

## Suite décidée

Chantier séparé, avec banc : étendre le multiplicateur d'or (anneaux, panoplies, talents,
Fortune astrale, bestiaire, potion d'or) à l'or des missions. Tous ces bonus souffrent du même
défaut que la Bourse.

## Fichiers

`js/data/upgrades.js`, `js/core/state.js`, `js/data/story-quests.js`, `js/ui/shop-view.js`,
`js/ui/camp-view.js`, `js/ui/village-building-view.js`, `round-harness.js`, `sw.js`,
`js/core/constants.js`. Aucun fichier ajouté.

## Contrôles

- round-harness : 0 échec, stable sur 3 passages (2 875 OK, [85] sautée). Nouvelle section
  **[109]** : 9 contrôles ; [50], [52] (plus de porte Économie) et quatre tests de l'étape Boutique adaptés (achat = potion).
- boot-harness 4 OK ; hero-creation-harness 44 OK.
