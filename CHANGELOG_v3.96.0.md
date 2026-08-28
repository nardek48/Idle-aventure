# Aethervale — v3.96.0

## Refonte complète : Champs — parcelles indépendantes

Remplace le système à choix de palier global (v3.95.0-3.95.6) par 9 parcelles
**totalement indépendantes**, chacune avec son propre niveau, son propre stock, son propre
taux de production. Fait suite à une session de discussion/simulation sur l'équilibrage
du stockage Production (voir échanges précédents) — décision finale : donner une identité
de gameplay forte aux parcelles plutôt qu'un simple correctif de capacité.

### Ce qui change pour le joueur

- **Plus de niveau de bâtiment Champs** ni de bouton "Améliorer" global. La carte du haut
  garde uniquement la jauge de stock **cumulée** et un bouton **"Récolter tout"** qui vide
  toutes les parcelles ouvertes en une fois.
- Le panneau dépliable "Parcelles" devient une **grille de 9 mini-cartes**, une par
  parcelle : niveau propre (1 à 5), jauge de stock propre, icônes fertile 🌿 / irriguée 💧
  (tapables directement pour les activer), bouton contextuel (**Défricher** / **Améliorer**
  / **Niveau max**).
- **3 profils de parcelle**, répartis en pattern fixe et alterné sur les 9 emplacements
  (rapide → équilibrée → lente → rapide → …) :
  - **Rapide** : fort débit, petite réserve — récompense les sessions fréquentes.
  - **Équilibrée** : compromis.
  - **Lente** : faible débit, grande réserve — tolère l'absence prolongée.
  - Une parcelle pleine **ne bloque plus les autres** : chaque parcelle a son propre
    plafond, la production continue ailleurs.
- **Déblocage payant** (bois + pierre, coût croissant par parcelle) pour les parcelles 2 à
  9 — incite à améliorer l'existant avant d'ouvrir la suivante. La parcelle 1 reste
  gratuite (réservée à la future quête d'introduction Champs, pas encore implémentée).
- **Amélioration de niveau** (bois + eau, coût croissant par niveau) et **fertile/irriguée**
  (coûts fixes, non réversibles, cumulables) sont désormais payées **par parcelle**, plus
  au niveau du bâtiment.
- Niveaux 1 à 5 pour l'instant. Un palier 6+ lié à la progression de monde (nouvelle
  ressource de coût, meilleur rendement) est prévu pour une prochaine session, non
  implémenté ici.

### Sauvegardes existantes

**Reset volontaire de la progression Champs** (décision validée avec Seb) : toute
sauvegarde ayant l'ancien format de parcelles (bonus % global, `pendingUpgradeChoice`,
`choicesConsumed`) est automatiquement réinitialisée à l'ouverture — parcelle 1 rouverte
niveau 1, les 8 autres reverrouillées. Aucune conversion de bonus, aucune tentative de
migration partielle. Toutes les autres données de sauvegarde (Entrepôt, combat, quêtes,
etc.) restent inchangées.

### Détails techniques

- `js/data/farm-plots.js` — réécrit. `FARM_PLOTS_CONFIG` (3 profils, pattern, coûts),
  `getFarmPlotUnlockCost(plotIndex)`, `getFarmPlotUpgradeCost(level)`.
- `js/systems/farm-plots-system.js` — réécrit. Structure `game.production.farm.plots[i] =
  { state, level, fertile, irrigated, stock, lastTick }`. `tick(dt)` / `catchUpOffline()`
  itèrent sur les 9 parcelles indépendamment. `harvestAll()` additionne et vide tout.
  `unlockPlot`/`upgradePlot`/`toggleImprovement` gèrent achat + application.
- `js/systems/production-system.js` — `ensure/getLevel/getStock/getRatePerMin/getCapacity/
  tick/catchUpOffline/harvest` délèguent à `FarmPlotsSystem` pour `id === "farm"`, sans
  changer le comportement des 5 autres bâtiments (Chasse, Scierie, Mine, Carrière, Puits —
  non touchés, testés en non-régression). `buy("farm")` devient un no-op défensif (plus de
  niveau de bâtiment à acheter).
- `js/ui/production-view.js` — `buildFarmCardHTML()` (carte du haut simplifiée),
  `buildFarmPlotCardHTML()` (mini-carte par parcelle), `farmPlotUnlock/farmPlotUpgrade/
  farmPlotToggleImprovement` (handlers directs, plus de flux de sélection/validation en 2
  étapes de l'ancien système de choix de palier).
- `css/04-panel-production.css` — nouvelles classes `.farm-plot-card` (et sous-éléments),
  remplace `.farm-plot` / `.farm-upgrade-*` (supprimées).
- `js/data/production-buildings.js` — `costTiers` de `farm` conservé mais **non utilisé**
  (note ajoutée dans le fichier), pour ne pas casser `getProductionBuildingCost("farm", n)`
  si jamais appelé ailleurs.
- `sw.js` — `CACHE_VERSION` → `3.96.0`.
- Aucun fichier protégé touché (`combat-engine.js`, `progression-system.js`,
  `save-system.js`, etc.).

### Tests

Harnais `node vm` chargeant les vrais fichiers du projet (`WarehouseManager`,
`FarmPlotsSystem`, `ProductionManager`, data associées) — **39/39 tests passent** :
état initial (9 parcelles, parcelle 0 ouverte/niveau 1, 8 verrouillées), tick isolé par
parcelle, déblocage payant (succès/échec par ressources insuffisantes/parcelle déjà
ouverte), amélioration de niveau jusqu'au max, fertile/irriguée (application unique,
cumul des bonus), récolte globale (somme exacte, reste décimal conservé par parcelle),
parcelle pleine n'empêchant pas la production des autres, `buy("farm")` neutralisé,
migration de sauvegarde ancien format → reset propre, `catchUpOffline` respectant le
plafond de capacité. Non-régression vérifiée séparément sur un bâtiment classique
(Scierie) : niveau, capacité, tick, achat, récolte — comportement identique à avant.

### Pour la prochaine session

- Palier 6+ par parcelle lié à la progression de monde (nouvelle ressource de coût,
  meilleur rendement) — discuté, chiffres non encore simulés pour ce palier précis.
- Quête d'introduction Champs (débloque la parcelle 1) — pas encore écrite ; le code
  actuel suppose la parcelle 1 déjà ouverte par défaut à la création de sauvegarde, à
  réconcilier avec cette future quête le moment venu.
- Rééquilibrage à prévoir dans un second temps une fois le système testé en conditions
  réelles (accepté comme itération future, pas un blocage pour cette livraison).
- Le même principe (parcelles/domaines indépendants) pourrait être étendu aux 5 autres
  bâtiments de Production plus tard — non planifié, discuté comme piste uniquement.
