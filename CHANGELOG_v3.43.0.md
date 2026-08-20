# Aethervale — v3.43.0

## Craft asynchrone en file d'attente + activation du champ `station`

### 1. Délai de craft réel, proportionnel à la quantité

Le craft n'est plus instantané au clic. Temps total d'une commande =
`recipe.craftTimeMs × quantité commandée` (ex. 5 Planches à 3000 ms/unité =
15 secondes). `craftTimeMs` existait déjà dans le schéma de `data/recipes.js`
depuis v3.35 mais n'était jusqu'ici jamais lu.

### 2. File d'attente FIFO

Nouvelle structure `game.craftQueue` (tableau). Le joueur peut empiler
plusieurs commandes (même recette ou recettes différentes) sans attendre
qu'une commande se termine. Traitement dans l'ordre d'ajout, une commande
"en cours" (position 0) à la fois.

- **Intrants déduits immédiatement** à la mise en file (`enqueueCraft`), pas
  au démarrage réel — empêche de commander plus que le stock possédé.
- **Outputs crédités seulement à la fin du décompte** (`tickCraftQueue`).
- **Annulation d'une commande en attente** (`cancelCraft`) : remboursement
  intégral. La commande en cours (position 0) n'est pas annulable.
- **Tourne en continu** tant que l'app reste ouverte (hook dans
  `main/game-loop.js`, juste à côté de `ProductionManager.tick()`), quel que
  soit l'écran affiché. **Aucun rattrapage hors-ligne** : la file reprend
  simplement là où elle était après un rechargement, sans compenser le temps
  écoulé app fermée (pas d'appel ajouté dans `main/boot.js`).
- **Persistance** : `game.craftQueue` (avec progression `msRemaining` exacte)
  sérialisé dans les 4 emplacements obligatoires de `save-system.js`.

### 3. Interface

Nouveau bloc "File de fabrication" dans le panneau détail de l'Entrepôt :
commande en cours avec barre de progression (réutilise le style
`.map-quest-step-bar`/`.map-quest-step-fill` existant) + temps restant en
secondes ; commandes en attente avec bouton ✕ d'annulation. Le bouton
"Fabriquer" reste actif même avec une commande en cours (on empile), désactivé
uniquement si le stock manque pour la nouvelle commande — `getMaxCraftTimes()`
renvoie aussi 0 si `recipe.station` est requis et non construit.

### 4. Activation du champ `station` (infrastructure uniquement)

`WarehouseManager.canCraft()` vérifie désormais `game.construction[recipe.station].level >= 1`
si `recipe.station` est défini. **Les 3 recettes existantes gardent
`station: null`** (aucune modification de `data/recipes.js` au-delà du
commentaire) — totalement inaffectées, aucun effet visible dans cette
session. Vérifié explicitement par test : les 3 recettes restent craftables
avec `game.construction = {}` (aucune construction).

### Décision validée avec Seb : remboursement à l'ascension

Contrairement à `huntRun`/`dungeonRun`/`adventureQuestRun` (progression en
cours perdue sans remboursement à l'ascension), la file de craft est
**intégralement remboursée avant d'être vidée** (`refundAndClearCraftQueue()`,
appelée en tout début de `hardResetState()`, avant que `keptResources` ne
soit figé) — y compris la commande déjà en cours. Une ascension ne doit pas
faire perdre des ressources déduites pour un craft jamais livré.

### Fichiers modifiés

- **`js/systems/warehouse-system.js`** — `enqueueCraft()` (remplace
  l'ancien `craft()` instantané), `tickCraftQueue()`, `cancelCraft()`,
  `refundAndClearCraftQueue()`, `_maybeRenderWarehouse()` (throttle de rendu,
  même principe que `ProductionManager.tick()` v3.31.1), vérification
  `station` dans `canCraft()`. `ensure()` initialise `game.craftQueue = []`.
- **`js/data/recipes.js`** — commentaire d'en-tête mis à jour uniquement,
  aucune recette modifiée.
- **`js/main/game-loop.js`** — appel `WarehouseManager.tickCraftQueue(dt)`.
- **`js/ui/warehouse-view.js`** — `confirmCraftWarehouseResource()` appelle
  `enqueueCraft` ; nouveau `cancelWarehouseCraft()`, `isWarehouseScreenVisible()`,
  `buildWarehouseCraftQueueHTML()` (bloc global, affiché même sans ressource
  sélectionnée) ; `getMaxCraftTimes()` tient compte de `station`.
- **`js/systems/save-system.js`** — `craftQueue` dans `buildSaveData`/
  `loadGame`/`fullResetState` (repart à `[]`) ; remboursement intégral en
  tout début de `hardResetState`.
- **`css/04-panel-village.css`** — styles `.warehouse-craft-queue*`.
- **`sw.js`** — `CACHE_VERSION` : `3.42.0` → `3.43.0`.

### Tests

`node --check` OK sur les 5 fichiers JS touchés. Harnais Node dédié (`vm`,
chargement des vrais fichiers), 9 scénarios :
1. Délai total = `craftTimeMs × quantité` (15000 ms pour 5 Planches).
2. FIFO : 2 commandes empilées, traitées dans l'ordre, une à la fois.
3. Annulation d'une commande en attente (remboursement intégral) ; commande
   en cours protégée contre l'annulation.
4. Les 3 recettes existantes restent craftables sans aucune construction
   (`station: null` inchangé).
5. Vérification `station` fonctionnelle sur une recette factice (infra prête
   pour une future recette `station: "workshop"`).
6. La file (avec `msRemaining` exact) survit à une sérialisation JSON
   (persistance).
7. Le reliquat de temps s'enchaîne correctement sur la commande suivante
   dans le même tick (pas de perte de fraction de frame).
8. Hook `WorkshopUnlockManager.notifyPlanchesCrafted()` déclenché à la
   **livraison réelle** (fin de délai), pas à la commande — étape 2 de la
   chaîne ("Fabriquer 5 Planches") confirmée réalisable sans Atelier construit.
9. `refundAndClearCraftQueue()` rembourse intégralement (commande en cours +
   commandes en attente) avant de vider la file.

### Tests manuels à réaliser (device)

- Commande simple (ex. ×3 Planches) : vérifier ~9s d'attente avant crédit.
- Empiler 2-3 commandes différentes : vérifier l'ordre de traitement et que
  chaque commande déduit ses intrants immédiatement (stock visible baisse
  tout de suite, pas seulement à la fin).
- Annuler une commande en attente (pas celle en cours) : vérifier le
  remboursement exact et que le bouton ✕ n'apparaît pas sur la commande en cours.
- Lancer une commande, changer d'écran (Combat, Village...), revenir à
  l'Entrepôt : la progression doit avoir continué.
- Lancer une commande, recharger la page en cours de craft : la file et sa
  progression doivent être identiques après rechargement (± quelques ms).
- Vérifier que Bois→Planche, Fer→Lingot, Blé→Farine fonctionnent toujours
  sans qu'aucun Atelier ne soit construit.
- Vérifier que l'étape 2 de la chaîne ("Fabriquer 5 Planches") se valide
  bien AVANT que l'étape 4 ("Construire l'Atelier niveau 1") ne soit
  accessible — ordre de la chaîne inchangé.
- (Optionnel, plus tard) Ascensionner avec une commande en cours : vérifier
  le remboursement intégral avant reset.

### Laissé pour les sessions futures

- Première recette utilisant `station: "workshop"` (chaîne Pain/Ration).
- Aucune autre recette créée dans cette session.
