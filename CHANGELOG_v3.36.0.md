# Aethervale — v3.35.0 → v3.36.0

## Pierre (brute) + Carrière, Farine (tier 1, Blé → Farine), vente tier 1

### Fichiers modifiés

- **`js/data/hunt-quests.js`** — `WAREHOUSE_RESOURCES` étendu :
  - `pierre` ajoutée (`tier: "raw"`, `sellPrice: 2`).
  - `farine` ajoutée (`tier: "crafted"`, `sellPrice: 7`, `cap: 999`).
  - `planche`/`lingot` : `sellPrice` passé de `0` à **7 / 10 or** (volontairement sous la valeur de revente des 5 intrants bruts : Bois×5=10or, Fer×5=15or — le craft doit rester motivé par la progression, pas par l'arbitrage de revente).

- **`js/data/production-buildings.js`** — 5e bâtiment `quarry` (Carrière) ajouté à `PRODUCTION_BUILDINGS`, même coefficients `PRODUCTION_CONFIG` partagés que les 4 autres (décision explicite validée avec toi — pas de config par-bâtiment séparée pour l'instant).

- **`js/data/recipes.js`** — recette `farine` ajoutée (`Blé × 5 → Farine × 1`), même format exact que planche/lingot.

- **`js/systems/save-system.js`** — `pierre`/`farine` ajoutées aux 4 endroits obligatoires (`buildSaveData`, `loadGame`/`restoreBaseState`, `hardResetState`, `fullResetState`). Migration douce vérifiée : une ancienne sauvegarde sans ces clés charge bien `pierre: 0`/`farine: 0` sans planter.

- **`sw.js`** — `CACHE_VERSION` : `3.35.0` → `3.36.0`.

### Fichiers **non modifiés** (déjà génériques, aucune touche nécessaire)

C'est le point notable de cette session : l'architecture posée en v3.31/v3.35 a absorbé tout le scope demandé sans une seule ligne de code UI/logique en plus.

- `js/systems/production-system.js` — `ProductionManager` itère déjà `Object.keys(PRODUCTION_BUILDINGS)` partout (`ensure`, `tick`, `catchUpOffline`, `harvest`, `buy`). La Carrière est créée, produit, se récolte et s'améliore automatiquement dès que la data existe.
- `js/ui/production-view.js` — `buildProductionHTML()` itère aussi `Object.keys(PRODUCTION_BUILDINGS)`. La carte Carrière apparaît automatiquement, même style que Mine/Scierie.
- `js/systems/warehouse-system.js` — `sellResource()` lit `def.sellPrice` sans aucune restriction de tier. Passer `sellPrice` de 0 à une vraie valeur suffit à activer la vente, `canCraft`/`craft` fonctionnent déjà pour n'importe quelle recette de `RECIPES`.
- `js/ui/warehouse-view.js` — le filtre Bruts/Tier 1 lit déjà `WAREHOUSE_RESOURCES[key].tier`, le bloc Fabriquer lit déjà `RECIPE_BY_INPUT[key]`, le bloc Vendre s'affiche déjà dès que `sellPrice > 0`. Pierre et Farine s'intègrent sans aucune modification.
- CSS (`04-panel-village.css`, `04-panel-production.css`) — aucune classe nouvelle nécessaire, tout est réutilisé tel quel.

### Assets

- `images/Icons/resources/stone_icon.png`, `flour_icon.png` — fournis par toi, même style/dimensions que les icônes ressources existantes.
- `images/Production/quarry.png` — fourni par toi (portrait rond cadre doré, même style exact que `mine.png`/`hunt.png`).

## Tests

23 assertions (nouveau harnais, `tests/test_v3_36.js`), chargeant les vrais fichiers du projet :
- Catalogue : `pierre`/`farine`/`quarry` correctement déclarés (tier, resourceKey, RECIPE_BY_INPUT).
- Carrière : `ensure()` crée le bâtiment au niveau 1 (5 bâtiments au total), `harvest()` transfère le stock local vers l'entrepôt en conservant la fraction restante.
- Farine : `canCraft`/`craft` ×2, consommation exacte du blé, crédit exact de la farine.
- Vente tier 1 : Planche → 7 or, Lingot → 10 or, Farine → 7 or (exactement les critères de validation du brief), Pierre toujours vendable (20 or pour 10 unités), pas de vente à découvert.
- Migration : une ancienne sauvegarde (sans `pierre`/`farine` dans `resources`) charge ces clés à 0 sans toucher aux valeurs existantes (bois, planche...). Testé en isolant directement le bloc de code de migration plutôt qu'en stubant l'intégralité de `restoreBaseState()` (trop couplée à `WorldManager`/`VillageManager`/`StatsSystem`/`ClassCombatManager` pour un stub honnête).

Rendu HTML revérifié (`render_check_v3_36.js`, même approche `vm` sans navigateur que la session précédente — Playwright toujours indisponible, sandbox sans accès réseau) : grille Bruts à 5 entrées, grille Tier 1 à 3 entrées, bloc Fabriquer correct pour Blé, bloc Vendre correct pour Pierre/Farine, carte Production Carrière présente avec bon portrait et bon bouton Récolter.

Non-régression : les 23 assertions du harnais v3.35 (planche/lingot) toujours au vert.

## Reporté (comme prévu)

- Constructions consommant Pierre + Planche.
- Bâtiment Atelier / `station` non nul.
- Tiers supérieurs (tier 2+).
- Craft asynchrone / file d'attente (`craftTimeMs` toujours inerte).
- Escortes.
- Les 7 icônes fournies lors d'une session précédente (farine — maintenant utilisée —, ceinture, encrier, lingot de cuivre, fenêtre, tissu, mortier) : farine intégrée cette session, les 6 autres toujours de côté.
