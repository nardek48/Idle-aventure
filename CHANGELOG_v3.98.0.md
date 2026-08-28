# Aethervale — v3.98.0

## Nouveau : ateliers de craft locaux par bâtiment de Production

Remplace le craft générique de l'Entrepôt (`RECIPES`, file unique `game.craftQueue`) par
des **ateliers locaux à chaque bâtiment de Production**, chacun sa propre file de craft
indépendante. Fait suite au prototype fourni par Seb
(`aethervale-production-sections-9-zones-concept.html`) — chantier 2 de la refonte
Production, après la généralisation des zones (v3.97.0).

### Ce qui change pour le joueur

- **L'Entrepôt ne propose plus de craft.** L'écran garde uniquement la vente de ressources
  et l'entrée vers l'Atelier de Construction — la section "Fabriquer" a disparu.
- **Chaque bâtiment de Production a désormais une section "⚙️ Production"**, dépliable au
  même niveau que sa section de zones (🌾 Parcelles, 🌲 Territoires, etc.), avec **2
  ateliers** :

| Bâtiment | Atelier actif | Atelier "Bientôt" |
|---|---|---|
| Champs | 🔧 Moulin (Blé → Farine) | — |
| Champs | 🥖 Boulangerie (Farine+Eau → Pain) | — |
| Chasse | 🥩 Séchoir (Viande → Viande séchée) | — |
| Chasse | 🎒 Cuisine de camp (2 recettes au choix) | — |
| Scierie | 🪚 Scierie fine (Bois → Planche) | 🧰 Menuiserie |
| Mine | 🔥 Fonderie (Fer → Lingot) | ⚒️ Forge |
| Carrière | — | 🔨 Tailleur de pierre, 🏗️ Maçonnerie |
| Puits | — | 🏺 Réservoir, ✨ Station de purification |

- Les ateliers "Bientôt" sont visibles (nom, icône) mais sans recette ni action — la
  structure est posée pour de futures recettes, sans bloquer cette livraison.
- **Nouvelle ressource : Viande séchée.** Le Séchoir la produit à partir de Viande (×5 →
  ×1). Les recettes **Petite ration** et **Ration moyenne** ont été mises à jour pour
  utiliser Viande séchée au lieu de Viande brute (cohérence de la nouvelle chaîne
  Chasse — décision validée avec Seb).
- **Cuisine de camp propose 2 recettes au choix** dans le même atelier (onglets, comme
  l'ancien sélecteur de recette de l'Entrepôt) : Petite ration ou Ration moyenne.
- Niveau fixe pour tous les ateliers actifs (pas d'amélioration/vitesse variable pour
  cette 1ère passe — décision explicite, à étendre plus tard si besoin). File illimitée,
  comme l'ancien craft de l'Entrepôt.

### Détails techniques

- **`js/data/workshops.js`** (nouveau) — `WORKSHOPS_CONFIG` : 12 ateliers, chacun
  `buildingId`, `name`, `icon`, `active`, et `recipes` (tableau, vide si `active: false`).
  `getWorkshopsForBuilding(buildingId)` pour lister les ateliers d'un bâtiment.
- **`js/systems/workshops-system.js`** (nouveau) — `WorkshopsSystem` : `enqueueCraft`,
  `tickWorkshop`, `cancelCraft`, `canCraft`, `getMaxCraftTimes`, `refundAndClearAll`.
  Persistance dans `game.production[buildingId].workshops[workshopId] = { queue: [...] }`
  — **même bloc opaque déjà traité par `save-system.js` pour `game.production`, donc
  aucune modification de ce fichier protégé**. Le hook `WorkshopUnlockManager.
  notifyPlanchesCrafted()` (tutoriel de déblocage de l'Atelier de Construction, exige
  "Fabriquer 5 Planches") est préservé et appelé depuis `tickWorkshop()` quand l'atelier
  Scierie fine produit une Planche.
- **`js/systems/warehouse-system.js`** — tout le bloc craft retiré (`RECIPES`,
  `enqueueCraft`, `tickCraftQueue`, `canCraft`, `cancelCraft`, `_maybeRenderWarehouse`).
  `refundAndClearCraftQueue()` **conservé** comme point d'entrée générique — délègue
  désormais à `WorkshopsSystem.refundAndClearAll()`. Ce point d'entrée est appelé par
  `save-system.js:hardResetState()` (fichier protégé, non modifié) ; `game.craftQueue`
  reste initialisé en tableau vide dans `ensure()` pour rester compatible avec les 3
  lectures/écritures encore présentes dans `save-system.js` (jamais rempli ni lu par le
  jeu désormais).
- **`js/systems/production-system.js`** — `tick()` appelle `WorkshopsSystem.
  tickWorkshop(workshopId, dt)` pour chaque atelier de `WORKSHOPS_CONFIG`, filtré par
  `isBuildingUnlocked(workshopDef.buildingId)` (un atelier ne tourne pas tant que son
  bâtiment parent est verrouillé — ex. Séchoir avant déblocage de la Chasse).
- **`js/ui/warehouse-view.js`** — réécrit. Retrait de `selectWarehouseRecipe`,
  `adjustWarehouseCraftQty`, `getMaxCraftTimes`, `confirmCraftWarehouseResource`,
  `cancelWarehouseCraft`, `buildWarehouseCraftBlockHTML`, `buildWarehouseCraftQueueHTML`.
  Vente et entrée Construction inchangées. Le filtre "Bruts / 🔨 Tier 1" reste (pertinent
  pour la vente, les ressources craftées se vendant plus cher).
- **`js/ui/production-view.js`** — nouvelle section "⚙️ Production" :
  `buildWorkshopsToggleHTML`, `buildWorkshopCardHTML` (carte active avec recette(s)/file/
  stepper, ou carte "Bientôt" minimale), `buildWorkshopQueueHTML`, `selectWorkshopRecipe`,
  `adjustWorkshopCraftQty`, `confirmCraftWorkshop`, `cancelWorkshopCraft`. Réutilise les
  classes CSS `.warehouse-qty-*` / `.warehouse-craft-queue*` / `.warehouse-craft-recipe-
  tab*` déjà stylées (ex-craft Entrepôt), pour limiter la surface de nouveau CSS.
- **`css/04-panel-production.css`** — nouvelles classes `.workshop-list`, `.workshop-
  card` (active/inactive), `.workshop-card-top/-icon/-name/-soon`, `.workshop-recipe-
  line/-icon`.
- **`js/data/hunt-quests.js`** — `viande_sechee` ajoutée à `WAREHOUSE_RESOURCES`
  (`sellPrice: 8`, `tier: "crafted"`, `cap: 999`). ⚠️ Utilise l'icône `meat_icon.png` par
  défaut (pas d'asset dédié disponible) — à remplacer par une icône propre si besoin.
- **`index.html`** — `js/data/recipes.js` → `js/data/workshops.js` ; ajout de
  `js/systems/workshops-system.js` (après `production-plots-system.js`).
- **`js/data/recipes.js`** — supprimé (`RECIPES`/`RECIPE_BY_INPUT`/`RECIPES_BY_INPUT`
  obsolètes).
- `sw.js` — `CACHE_VERSION` → `3.98.0`.
- **Aucun fichier protégé modifié** (`game-loop.js` continue d'appeler `WarehouseManager.
  tickCraftQueue` sous garde `typeof === "function"` — la méthode n'existant plus,
  l'appel est simplement sauté sans erreur ; `save-system.js` traite `game.production`
  comme un bloc opaque à tous ses points de lecture/écriture, donc aucune modification
  requise pour la persistance des ateliers).

### ⚠️ Action requise avant déploiement

Supprimer `js/data/recipes.js` du projet (remplacé par `js/data/workshops.js`).

### Sauvegardes existantes

Aucun reset nécessaire pour les zones de Production (inchangées). Toute commande de craft
en cours dans l'ancien système (`game.craftQueue`) est silencieusement abandonnée au
chargement — le champ reste un tableau vide, jamais relu. Les ressources déjà déduites
pour un craft en cours au moment de la mise à jour ne sont **pas** remboursées
automatiquement (cas rare, craft généralement rapide — à signaler si ça pose problème en
pratique).

### Tests

Nouveau harnais `node vm` dédié à `WorkshopsSystem` — **32/32 assertions passent** :
structure des 12 ateliers (2 par bâtiment, 6 actifs), craft simple avec déduction
immédiate des intrants et file FIFO, atelier inactif refusant tout craft, 2 recettes au
choix dans Cuisine de camp, vérification explicite que Petite ration et Ration moyenne
n'utilisent plus Viande brute mais Viande séchée, annulation avec remboursement (sauf le
lot en cours), hook `notifyPlanchesCrafted` déclenché avec le bon montant,
`refundAndClearAll` remboursant même le lot en cours (équivalent d'une ascension), files
indépendantes vérifiées entre deux ateliers de bâtiments différents. Harnais des zones
(v3.97.x) mis à jour pour charger les nouveaux fichiers et relancé : **89/89 toujours
valides**, aucune régression. Tests fonctionnels complémentaires (génération HTML) :
page Production complète avec les 12 ateliers affichés, flux de sélection de recette →
quantité max → craft testé de bout en bout, écran Entrepôt sans aucune trace de craft
résiduelle, round-trip JSON (simulation du cycle save/load) validé sans perte de données
sur la structure `game.production[buildingId].workshops`, appel `game-loop.js` simulé
confirmant l'absence de crash après retrait de `tickCraftQueue`.

### Pour la prochaine session

- Recettes pour les 6 ateliers "Bientôt" (Menuiserie, Forge, Tailleur de pierre,
  Maçonnerie, Réservoir, Station de purification) — structure posée, contenu à définir.
- Système de niveau/amélioration d'atelier (vitesse, capacité de file) — explicitement
  différé pour cette passe.
- Icône dédiée pour Viande séchée (utilise `meat_icon.png` par défaut actuellement).
- Rééquilibrage général une fois testé en conditions réelles (reporté depuis les
  sessions précédentes, s'étend maintenant aussi aux ateliers).
