# Aethervale — v3.74.0

## Ajout : panneau Admin / Debug

Nouvel écran "Admin" accessible depuis **Paramètres → 🧪 Développement → 🛠️ Admin**
(bouton ajouté à côté du bac à sable de combat existant). Outil de développement
uniquement, routé comme un onglet caché (`switchTab('admin')`), même pattern que
`combat-sandbox`.

### Éditeur de stats et ressources
- Or, Essence : champ + bouton Appliquer, plus raccourcis "+10 000 or" / "+1 000 essence".
- Éclats de donjon (`game.dungeonShards`) : écriture directe, pas de fonction dédiée existante dans le projet.
- Stats entraînées (Puissance, Endurance, Célérité, Précision, Volonté) : modifie `game.trainedStats.*`
  puis appelle systématiquement `StatsSystem.recalcStats()`.
- Bouton "🔄 Recalculer les stats" en accès direct.
- PV du héros : champ clampé à `game.heroMaxHp` (le clamp de `recalcStats()` ne remonte jamais les PV,
  géré manuellement côté panneau) + bouton "💚 PV au maximum".
- Bouton "☠️ Tuer l'ennemi affiché" → `CombatEngine.killEnemy()` (no-op si aucun ennemi actif).
- Monde & cycle : `WorldManager.worldIndex` (pas `game.worldIndex`, qui n'existe pas) avec reset de
  `adventureIndex`/`enemyIndex` à 0 et validation contre `WORLDS` avant application ; `game.cycleCount`
  en écriture directe.

### Accès au bac à sable de combat
Bouton "🧪 Ouvrir le bac à sable" dans le panneau Admin → réutilise `switchTab('combat-sandbox')` et
l'interface `ui/combat-sandbox-view.js` déjà existante, sans duplication.

### Persistance & rafraîchissement
Chaque action passe par `adminRefresh()` qui appelle `saveGame()` puis `renderAll()` (et `renderPanel()`
si l'onglet admin est actif), conformément aux conventions du projet.

### Écarts vs. la demande initiale
- `game.trainedStats` : nom confirmé, pas de divergence.
- Aucune fonction `WorldManager` de saut direct vers un monde n'existe (seulement `advance()` pas à pas) :
  le champ écrit directement `WorldManager.worldIndex` (validé par Seb).
- "Éclats de donjon" = `game.dungeonShards`, pas dans `WarehouseManager` (catalogue `WAREHOUSE_RESOURCES`
  ne contient que les ressources d'artisanat : viande/blé/bois/fer/pierre/eau + craftés). Écriture directe
  (validé par Seb).
- Pattern d'intégration : onglet caché via `switchTab`, pas de modale flottante (validé par Seb, cohérent
  avec le bac à sable existant).

## Fichiers modifiés
- `index.html` — ajout `<link>` CSS admin + `<script>` admin-view.js
- `js/ui/settings-view.js` — bouton "🛠️ Admin"
- `js/ui/ui-root.js` — routage `case "admin"` dans `renderPanel()`
- `sw.js` — `CACHE_VERSION` 3.73.1 → 3.74.0

## Fichiers ajoutés
- `js/ui/admin-view.js`
- `css/04-panel-admin.css`

## Tests effectués
- `node --check` sur tous les fichiers JS modifiés/ajoutés.
- Harness Node.js `vm` chargeant les fichiers réels du projet (state, worlds, stats-system,
  warehouse-system, combat-engine, progression-system, admin-view) : validation de
  `adminApplyTrainedStat` (+ recalcStats), clamp de `adminApplyHeroHp`, `adminHeroHpMax`,
  `adminApplyWorldIndex` (application + reset adventure/enemy + rejet hors-limites), `adminApplyGold`,
  `adminQuickAdd`, `adminApplyShards`, `adminKillEnemy` (no-op sans ennemi, et avec ennemi réel via
  `CombatEngine.killEnemy`), et déclenchement de `saveGame()` via `adminRefresh()`.

## À noter pour Seb
- Pas de protection/flag sur le bouton Admin, tel que demandé (outil de dev, accès simple).
- Le fichier vestige `js/systems/combat-sandbox-view.js` (non chargé, doublon de `js/ui/combat-sandbox-view.js`)
  reste à traiter séparément, comme déjà flagué précédemment.
