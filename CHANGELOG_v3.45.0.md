# Aethervale — v3.45.0

## Puits (6e bâtiment de Production) + Eau + recettes croisées Pain/Ration

### Écart trouvé par rapport au brief

Le schéma `recipe.inputs` était **déjà un tableau** `[{resourceId, quantity}, ...]`
depuis la première version de `data/recipes.js` (v3.35) — pas un objet à clé
unique. Aucune extension de schéma n'a donc été nécessaire, ni sur `data/recipes.js`
ni sur la logique de craft (`canCraft`/`enqueueCraft`/`cancelCraft`/
`refundAndClearCraftQueue` dans `warehouse-system.js`), qui itèrent toutes déjà
sur `recipe.inputs.forEach`/`.every` et fonctionnaient pour N intrants sans
modification.

Le vrai écart trouvé était dans **`ui/warehouse-view.js`** : `getMaxCraftTimes()`
et `buildWarehouseCraftBlockHTML()` ne lisaient que `recipe.inputs[0]` (limitation
d'affichage héritée des 3 recettes single-input existantes, pas du schéma) —
généralisées à cette occasion.

### 1. Puits (nouveau 6e bâtiment de Production)

`data/production-buildings.js` — entrée `well` ajoutée à `PRODUCTION_BUILDINGS`,
produit `eau`. Utilise le `PRODUCTION_CONFIG` partagé tel quel (même rendement,
capacité, coût, niveau max 15 que les 5 autres bâtiments — aucune formule
spéciale, comme demandé). Accessible dès le départ. `production-system.js` et
`production-view.js` n'ont nécessité aucune modification (itèrent déjà
génériquement sur `Object.keys(PRODUCTION_BUILDINGS)`).

### 2. Eau (nouvelle ressource brute)

`data/hunt-quests.js` — ajoutée à `WAREHOUSE_RESOURCES`, `tier: "raw"`, sans
`cap` (illimitée, comme les 5 autres ressources brutes), `sellPrice: 1`
(ressource la moins chère du jeu, cohérent avec Bois/Blé/Pierre à 2 or).

### 3. Pain (première recette croisée + première recette `station`)

`data/recipes.js` :
- Intrants : 5 Eau + 3 Farine → 1 Pain.
- **Prix de vente : 19 or** — sous la valeur de revente brute des intrants
  (5 Eau × 1 or + 3 Farine × 7 or = 26 or), ratio ~73% cohérent avec les
  recettes existantes (Planche 70%, Farine 70%).
- **`craftTimeMs: 5000`** — +67% par rapport aux recettes single-input
  (3000 ms), reflète 2 intrants et le statut de première recette "station".
- **`station: "workshop"`** — première recette à exiger
  `game.construction.workshop.level >= 1` (déjà vérifié techniquement depuis
  v3.43, jamais utilisé jusqu'ici).

### 4. Ration

`data/recipes.js` :
- Intrants : 10 Viande + 1 Pain → 1 Ration.
- **Prix de vente : 36 or** — sous la valeur de revente brute (10 Viande ×
  3 or + 1 Pain × 19 or = 49 or), ratio ~73% cohérent.
- **`craftTimeMs: 8000`** — +60% par rapport à Pain, reflète la recette de
  2e niveau (intrant déjà transformé).
- **`station: "workshop"`**, comme Pain.
- Uniquement vendable pour l'instant — aucun mécanisme de consommation créé
  (pas d'escorte, pas de lien combat), comme demandé.

### 5. Généralisation UI multi-intrants (`ui/warehouse-view.js`)

- `getMaxCraftTimes()` : calcule désormais le **minimum sur tous les
  intrants** (`Array.reduce`/`Math.min`) au lieu de ne lire que `inputs[0]`.
  Les 3 recettes single-input restent correctes (min sur un seul élément).
- `buildWarehouseCraftBlockHTML()` : texte de recette affiche **tous** les
  intrants ("5 Eau + 3 Farine → 1 Pain"). Deux messages d'erreur distincts
  ajoutés : "Nécessite [Atelier] (niveau 1)" quand la station manque,
  "Pas assez de [ressource]" ciblé sur le **premier** intrant réellement
  insuffisant quand le stock manque (au lieu d'un message générique).

### 6. Sauvegarde (`systems/save-system.js`)

`eau`, `pain`, `ration` ajoutés aux 4 emplacements où le catalogue de
ressources par défaut est codé en dur (`buildSaveData`, `loadGame`,
`hardResetState`, `fullResetState`) — pattern déjà suivi pour pierre/farine.
`WarehouseManager.ensure()` complète de toute façon automatiquement les clés
manquantes au premier accès ; ces listes ne servent qu'aux valeurs par défaut
d'une ancienne sauvegarde.

### 7. Icône de l'Atelier de Construction (hors scope initial, ajoutée à ta demande)

- `data/construction.js` : `icon: "images/Icons/construction_icon.png"` ajouté
  à `CONSTRUCTION_BUILDINGS.workshop`.
- `ui/warehouse-view.js` : `buildConstructionEntryCardHTML()` utilise
  désormais `renderIconOrEmojiHTML()` (helper déjà existant, `core/utils.js`)
  au lieu de l'emoji 🏗️ en dur — repli automatique sur l'emoji si `icon` est
  absent, donc rien ne casse si l'image manque.
- `css/04-panel-construction.css` : nouvelle classe `.construction-entry-icon-img`.

### Images ajoutées

- `images/Production/well.png` (illustration du Puits)
- `images/Icons/resources/water_icon.png`, `bread_icon.png`, `ration_icon.png`
- `images/Icons/construction_icon.png`

Note : ces 5 images sont plus lourdes (~430-740 Ko chacune) que les icônes
existantes du projet (~170-400 Ko) — sans impact fonctionnel, mais à garder en
tête si le poids total du build devient un jour un sujet.

### Limitation d'architecture signalée (pas un bug, rien à corriger cette session)

`RECIPE_BY_INPUT` (`data/recipes.js`) reste un index `resourceId → UNE SEULE
recette` (dernier assignant gagne en cas de collision). Pas de collision
réelle aujourd'hui (Eau/Farine ne sont consommées que par Pain, Pain n'est
consommé que par Ration), mais si une ressource devient un jour l'intrant de
deux recettes différentes, cet index ne pourra plus représenter les deux —
signalé pour une session future, hors scope ici.

### Fichiers modifiés

- `js/data/hunt-quests.js` — Eau, Pain, Ration ajoutés à `WAREHOUSE_RESOURCES`.
- `js/data/production-buildings.js` — Puits ajouté à `PRODUCTION_BUILDINGS`.
- `js/data/recipes.js` — recettes Pain et Ration ajoutées à `RECIPES`.
- `js/data/construction.js` — `icon` ajouté sur `workshop`.
- `js/ui/warehouse-view.js` — `getMaxCraftTimes()`/`buildWarehouseCraftBlockHTML()`
  généralisés multi-intrants ; icône Atelier remplace l'emoji.
- `js/systems/save-system.js` — `eau`/`pain`/`ration` dans les 4 emplacements.
- `css/04-panel-construction.css` — style `.construction-entry-icon-img`.
- `sw.js` — `CACHE_VERSION` : `3.44.0` → `3.45.0`.
- 5 nouvelles images (voir ci-dessus).

### Tests

`node --check` OK sur les 6 fichiers JS touchés. Harnais Node dédié (`vm`,
chargement des vrais fichiers), 8 scénarios :
1. Eau ajoutée au catalogue (1 or, illimitée, `raw`).
2. Récolte + vente d'Eau (50 unités → 50 or).
3. Pain : 2 intrants corrects, `station: "workshop"`, `craftTimeMs: 5000`,
   refusé sans Atelier (aucun intrant déduit), autorisé et livré correctement
   avec Atelier niveau 1.
4. Ration : intrants corrects (dont Pain, déjà transformé), `craftTimeMs: 8000`,
   livrée correctement.
5. Planche/Lingot/Farine toujours utilisables sans aucune construction
   (`station: null` inchangé, non-régression).
6. `getMaxCraftTimes()` généralisé : prend bien le minimum sur les 2 intrants
   de Pain (testé dans les deux sens, Eau limitante puis Farine limitante),
   et 0 sans Atelier peu importe le stock.
7. Puits présent dans `PRODUCTION_BUILDINGS` (6 bâtiments au total), aucune
   formule spéciale (pas de champ `rateGrowthPerLevel` ou autre en dur sur
   l'entrée `well` — `PRODUCTION_CONFIG` reste unique et partagé).
8. Rendu HTML du bloc Fabriquer : texte "5 Eau + 3 Farine → 1 Pain" correct,
   message "Nécessite [Atelier]" quand la station manque, message "Pas assez
   de Eau" ciblé sur le bon intrant quand le stock est insuffisant.

### Tests manuels à réaliser (device)

- Construire le Puits (accessible dès le départ), récolter et vendre de l'Eau.
- Sans avoir construit l'Atelier (niveau 0) : vérifier que le bloc Fabriquer
  de Pain affiche "Nécessite Atelier de Construction (niveau 1)" et que le
  bouton Fabriquer est absent/inactif.
- Construire l'Atelier niveau 1, puis fabriquer du Pain avec les bons
  intrants (5 Eau + 3 Farine) — vérifier ~5s d'attente et la livraison.
- Fabriquer une Ration (10 Viande + 1 Pain) — vérifier ~8s d'attente.
- Vendre du Pain et de la Ration, vérifier les montants (19 or/unité,
  36 or/unité, avant bonus éventuel de l'Atelier).
- Vérifier que Bois→Planche, Fer→Lingot, Blé→Farine fonctionnent toujours
  normalement, sans exigence de station.
- Vérifier visuellement l'icône de l'Atelier sur la carte Entrepôt (image au
  lieu de l'emoji 🏗️).

### Laissé pour les sessions futures

- Usage de consommation de la Ration (escorte, lien combat) — non créé,
  comme demandé.
- Éventuel palier 3 de Construction — non touché.
- Limitation `RECIPE_BY_INPUT` (une seule recette par ressource en entrée) à
  garder en tête si une future ressource devient l'intrant de 2 recettes.
