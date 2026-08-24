# Aethervale — v3.75.0

## Ajout : vitesse de combat x1 / x2 / x4

Nouveaux boutons x1/x2/x4 dans une barre dédiée (`#combat-speed-bar`), visible
uniquement en Combat/Donjon (toggle dans `switchTab`, même critère que `#stats-bar`
et `#game-area`).

### Choix de conception (détail, hors code)

- **Le Donjon n'a pas de fonction de tick séparée** : il réutilise `switchTab("combat")`
  (`dungeon-system.js` ligne 189), donc `game.activeTab === "combat"` couvre déjà les deux
  sans code dédié au Donjon. C'est le même critère `inCombatScreen` qui gate tous les ticks
  concernés dans `game-loop.js`.
- **Portée du dt accéléré** : en plus des deux fonctions citées dans la demande initiale
  (`ClassCombatManager.tick`, `CombatEngine.enemyAttackTick`), le dt accéléré (`combatDt`)
  s'applique aussi à `CombatEngine.autoAttack`, `tickBasicAttackCooldown`, `enemyChargeTick`,
  `enemySilenceTick`, `bossPatternTick` et `ClassCombatManager.tickAutoSkills` — toutes ces
  fonctions sont gatées par le même `activeTab === "combat"` dans la boucle, et pour
  `ClassCombatManager.tick`/`tickAutoSkills` la garde interne `isCombatActive()` est identique
  au critère `inCombatScreen` de `game-loop.js`, donc leur accélérer le dt inconditionnellement
  n'a aucun effet hors combat (choix validé).
- **`ClassCombatManager.tryAutoBasicAttack()`** n'a pas de paramètre `dt` : elle se déclenche déjà
  plus vite naturellement car elle dépend de `game.basicAttackCooldownMs`, qui décrémente via
  `tickBasicAttackCooldown(combatDt)` — pas de modification directe nécessaire.
- **Hors périmètre, confirmé inchangé** : `VillageManager.tickAmbientHunting`, `ProductionManager.tick`,
  `WarehouseManager.tickCraftQueue` reçoivent toujours le `dt` réel (non multiplié). La progression
  monde/cycle (`WorldManager.advance()`, appelée depuis `CombatEngine.killEnemy()`) n'est pas cadencée
  par `dt` — elle avance par kill, donc accélérer le combat accélère mécaniquement le nombre de kills/minute
  mais pas de logique dt séparée à protéger ici.
- **`syncAutoTapLoop()`** : l'intervalle réel (`setInterval`) est divisé par `getCombatSpeedMult()`
  après application des talents (auto-tap, transe de combat), donc les deux se cumulent normalement.
- **Persistance vs reset** : `game.combatSpeed` est sauvegardé/rechargé (via `saveGame()`/`loadGame()`,
  comme demandé), mais `switchTab()` le remet à 1 dès qu'on quitte l'écran Combat (option choisie par
  Seb) — en pratique, la valeur ne survit donc à une session que si l'écran Combat reste ouvert au
  moment de la sauvegarde/fermeture. Pas de reset dans `hardResetState`/`fullResetState` : c'est une
  préférence UI, pas un état de progression.
- **Plafond de `dt`** : la boucle limite déjà `dt` à 0.25s/frame avant tout calcul. Avec x4, `combatDt`
  plafonne donc à 1.0s/frame — pas de bond disproportionné même après un onglet en arrière-plan.

### UI
- Barre `#combat-speed-bar` insérée dans `index.html` juste après `#stats-bar`, même largeur/masquage.
- Boutons stylés avec les tokens `--nb-*` existants (cohérence visuelle avec le reste du thème parchemin,
  contrairement au panneau Admin qui est volontairement hors-thème). Bouton actif visuellement distinct
  (fond doré, comme `.settings-btn` actif).

## Fichiers modifiés
- `js/core/state.js` — valeur par défaut `combatSpeed: 1` + normalisation dans `ensureGameStateDefaults()`
- `js/systems/save-system.js` — `buildSaveData()` + `restoreBaseState()`
- `js/main/game-loop.js` — `getCombatSpeedMult()`, `combatDt`, application ciblée, `syncAutoTapLoop()` accéléré
- `js/ui/ui-root.js` — `switchTab()` : toggle `#combat-speed-bar`, reset vitesse en quittant combat, render au retour
- `index.html` — ajout `#combat-speed-bar` + `<link>`/`<script>`
- `sw.js` — `CACHE_VERSION` 3.74.1 → 3.75.0

## Fichiers ajoutés
- `js/ui/combat-speed-view.js`
- `css/04-panel-combat-speed.css`

## Tests effectués
- `node --check` sur tous les fichiers JS modifiés/ajoutés.
- Harness `vm` chargeant les fichiers réels (state, game-loop, combat-speed-view, ui-root) :
  `getCombatSpeedMult` (valeurs valides/invalides), `setCombatSpeed` (application + saveGame appelé +
  `syncAutoTapLoop` recalcule bien l'intervalle divisé), rejet d'une vitesse invalide, `switchTab` qui
  réinitialise `combatSpeed` à 1 en quittant combat mais pas en y restant/entrant, et
  `renderCombatSpeedBar` qui marque le bon bouton actif. Tout passe.
