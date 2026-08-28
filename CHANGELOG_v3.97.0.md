# Aethervale — v3.97.0

## Généralisation des zones indépendantes aux 5 autres bâtiments de Production

Étend le système de parcelles indépendantes de Champs (v3.96.0-3.96.4) aux 5 autres
bâtiments de Production : **Chasse, Scierie, Mine, Carrière, Puits**. Décision validée avec
Seb : même mécanique, mêmes formules, mêmes montants pour les 6 bâtiments — seuls changent,
par bâtiment, le nom de section affiché et les ressources de coût.

### ⚠️ Action requise avant déploiement

Ce patch **renomme** les fichiers du système de parcelles. Dans le projet, supprimer :
- `js/data/farm-plots.js` → remplacé par `js/data/production-plots.js`
- `js/systems/farm-plots-system.js` → remplacé par `js/systems/production-plots-system.js`

`index.html` est fourni en entier dans ce zip (2 lignes `<script>` changées) — remplacer le
fichier existant plutôt que de fusionner à la main.

### Ce qui change pour le joueur

- **Chasse, Scierie, Mine, Carrière et Puits ont désormais 9 zones indépendantes chacun**,
  exactement comme Champs : niveau propre (1-5), stock local plafonné, taux propre par
  zone, 3 profils (rapide/équilibrée/lente) en pattern alterné. Une zone pleine ne bloque
  plus les autres.
- Chaque bâtiment garde son thème et son nom de section :
  - 🌾 **Parcelles** (Champs)
  - 🌲 **Territoires** (Chasse)
  - 🪵 **Bosquets** (Scierie)
  - ⛏️ **Galeries** (Mine)
  - 🪨 **Filons** (Carrière)
  - 💧 **Réseau hydraulique** (Puits)
- Les 5 nouveaux bâtiments perdent leur ancien niveau de bâtiment unique et leur bouton
  "Améliorer" global — remplacés par le même flux que Champs (sélection d'une zone → zone
  d'actions commune avec Défricher/Améliorer/Fertile/Irriguée et leurs coûts).
- **Sélection et panneau dépliés indépendamment par bâtiment** : ouvrir le panneau Territoires
  de la Chasse n'affecte pas l'état du panneau Galeries de la Mine.

### Grille de coûts (validée avec Seb)

Ressources de coût choisies pour ne **jamais** chevaucher la propre production du bâtiment
concerné :

| Bâtiment | Produit | Coût déblocage | Coût amélioration |
|---|---|---|---|
| Champs | Blé | Bois + Pierre | Bois + Eau |
| Chasse | Viande | Bois + Pierre | Bois + Eau |
| Scierie | Bois | Fer + Pierre | Fer + Pierre |
| Mine | Fer | Bois + Pierre | Bois + Pierre |
| Carrière | Pierre | Fer + Eau | Bois + Fer |
| Puits | Eau | Viande + Pierre | Bois + Fer |

Montants de base et courbes de croissance identiques aux 6 bâtiments (mêmes valeurs que
Champs — voir `PRODUCTION_PLOTS_SHARED` dans `data/production-plots.js`).

### Sauvegardes existantes

**Reset de la progression pour les 5 bâtiments nouvellement concernés** (Chasse, Scierie,
Mine, Carrière, Puits) — même traitement que celui déjà appliqué à Champs en v3.96.0 :
toute sauvegarde ayant un niveau de bâtiment classique sur ces 5 bâtiments est
automatiquement réinitialisée à l'ouverture (zone 0 rouverte niveau 1, les 8 autres
verrouillées). Aucune conversion de niveau en zones équivalentes. Champs n'est pas concerné
par ce reset (déjà migré en v3.96.0, structure inchangée).

### Détails techniques

- **`js/data/farm-plots.js` → `js/data/production-plots.js`** (renommé et généralisé) :
  `PRODUCTION_PLOTS_SHARED` (profils, bonus, multiplicateurs de coût — communs aux 6
  bâtiments), `PRODUCTION_PLOTS_BUILDINGS` (config par bâtiment : `sectionLabel`,
  `zoneNamePrefix`, `unlockCost`, `upgradeCost`, `improvementCost`),
  `getProductionPlotUnlockCost(buildingId, plotIndex)`,
  `getProductionPlotUpgradeCost(buildingId, level)` — toutes deux paramétrées par
  `buildingId` (remplace `getFarmPlotUnlockCost`/`getFarmPlotUpgradeCost` câblées sur Champs).
- **`js/systems/farm-plots-system.js` → `js/systems/production-plots-system.js`** (renommé
  et généralisé) : `ProductionPlotsSystem`, toutes les méthodes (`ensurePlots`, `getPlots`,
  `tick`, `catchUpOffline`, `harvestAll`, `unlockPlot`, `upgradePlot`, `toggleImprovement`,
  etc.) prennent désormais `buildingId` en premier paramètre. Nouvelle méthode
  `getManagedBuildingIds()` / `isManaged(buildingId)` — source de vérité unique dérivée de
  `PRODUCTION_PLOTS_BUILDINGS`, utilisée par `ProductionManager` pour savoir quels
  bâtiments déléguer. `getTotalStock()` applique déjà le correctif v3.96.4 (arrondi par
  zone avant somme) dès l'origine pour les 5 nouveaux bâtiments.
- **`js/systems/production-system.js`** — tous les `if (id === "farm")` remplacés par
  `if (ProductionPlotsSystem.isManaged(id))`, généralisant `ensure/getLevel/getStock/
  getRatePerMin/getCapacity/tick/catchUpOffline/harvest/buy` aux 6 bâtiments. Les
  bâtiments verrouillables (`quarry`, `hunt`, `well` — voir `PRODUCTION_UNLOCK_FLAGS`)
  conservent leur comportement de déblocage par quête, inchangé par ce patch.
- **`js/ui/production-view.js`** — réécrit : `buildFarmCardHTML` → `buildPlotsCardHTML(buildingId,
  def)`, `buildFarmPlotCardHTML` → `buildPlotCardHTML(buildingId, plot, index, selectedIndex)`,
  `buildFarmPlotActionsHTML` → `buildPlotActionsHTML(buildingId, plot, index)`,
  `farmPlotUnlock/farmPlotUpgrade/farmPlotToggleImprovement` → `productionPlotUnlock/
  productionPlotUpgrade/productionPlotToggleImprovement(buildingId, ...)`. États locaux
  `farmPlotsPanelExpanded`/`selectedFarmPlotIndex` (valeurs uniques) remplacés par
  `productionPlotsPanelExpanded`/`selectedProductionPlotIndex` (objets indexés par
  `buildingId`) pour permettre 6 états indépendants simultanés.
- **`css/04-panel-production.css`** — **inchangé**. Les classes (`.farm-plot-card`,
  `.farm-plots-toggle`, `.farm-plot-actions`, etc.) n'étaient déjà pas spécifiques à Champs
  dans leurs sélecteurs — elles s'appliquent automatiquement aux 5 nouveaux bâtiments dès
  que le JS les génère avec la même structure.
- `js/data/production-buildings.js` — commentaire d'en-tête mis à jour (costTiers
  désormais inutilisés pour les 6 bâtiments, plus seulement Champs) ; aucune donnée
  modifiée.
- `index.html` — 2 lignes `<script>` mises à jour vers les fichiers renommés.
- `sw.js` — `CACHE_VERSION` → `3.97.0`.
- **Aucun fichier protégé touché.**

### Tests

Harnais `node vm` étendu : **89 assertions passent** (0 échec), dont pour **chacun des 6
bâtiments** : 9 zones créées, zone 0 ouverte/niveau 1 par défaut, zones 1-8 verrouillées,
tick isolé par zone, coûts de déblocage/amélioration/fertile/irriguée n'incluant jamais la
propre production du bâtiment (vérifié programmatiquement contre `resourceKey`), déblocage
payant (succès/échecs), amélioration jusqu'au niveau max, fertile/irriguée (application
unique, cumul), récolte globale (somme exacte), `buy()` neutralisé, `getLevel()` = 1 par
convention. Suite complémentaire : régression du bug de somme d'arrondis (v3.96.4)
vérifiée générique et toujours correcte, zone pleine n'empêchant pas la production des
autres (testé sur Mine), migration d'un ancien format à niveau de bâtiment unique (testé
sur Chasse), `catchUpOffline` (testé sur Puits). Test fonctionnel complémentaire (génération
HTML complète) : les 6 bâtiments génèrent leur carte, panneau et zone d'actions sans
exception, avec leur nom de section personnalisé affiché correctement.

### Pour la prochaine session

- Système d'ateliers "Production" (craft par bâtiment, avec recettes/files/quantités) —
  évoqué dans le même prototype fourni par Seb, explicitement mis de côté pour cette
  session, à traiter séparément.
- Rééquilibrage général une fois testé en conditions réelles sur les 6 bâtiments (déjà
  anticipé pour Champs seul, s'étend maintenant à tous).
- Quêtes d'introduction pour les zones 0 des 5 nouveaux bâtiments (même remarque que pour
  Champs en v3.96.0 — pas encore écrites, le code suppose ces zones déjà ouvertes par défaut).
- Palier 6+ par zone lié à la progression de monde — toujours en discussion, non chiffré,
  s'appliquerait potentiellement aux 6 bâtiments désormais.
