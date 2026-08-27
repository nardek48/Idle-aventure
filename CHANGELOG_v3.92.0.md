# Changelog v3.92.0 — Jalon B : La Veine Instable + déblocage de la Carrière

Deuxième expédition non-combat : minijeu de récolte (jauge/timing, 3 coups), déblocage
réel et définitif du bâtiment Carrière (jamais débloqué auparavant — voir migration),
puis activité bonus répétable une fois débloquée. Suite directe du Jalon A (v3.91.0).

5 fichiers créés, 8 modifiés, tous `node --check` OK sur le projet complet. Boucle
complète et persistance revalidées via harnais `node vm` : verrou réel de production,
3 coups (perfect/correct/miss), déblocage, idempotence, échec complet + retentative,
activité bonus avec cooldown, et surtout la **migration de sauvegarde** (5 cas testés,
1 bug trouvé et corrigé avant livraison).

---

## Architecture retenue (validée avec Seb avant codage)

Le moteur `ExplorationManager` existant (Sentier Obstrué) est structurellement pensé pour
un run à **résultat unique** (`run.rewards.wood`, un seul choix résolu). Le minijeu de la
Veine Instable est **cumulatif sur 3 coups**, avec deux ressources différentes et un
composant visuel entièrement nouveau (jauge animée). Plutôt que de dénaturer
`ExplorationManager`, un **nouveau moteur indépendant** a été créé : `MiningManager`,
réutilisé à la fois par la quête (`source: "quest"`) et par l'activité bonus répétable de
la Carrière (`source: "quarry_bonus"`) — un seul moteur, deux points d'entrée, exactement
comme demandé. La donnée déclarative de la quête reste dans `EXPLORATION_QUESTS` (pour
que la carte apparaisse dans la catégorie UI "Expéditions"), mais sa logique passe
entièrement par `MiningManager`, jamais par `ExplorationManager`.

---

## Fichiers créés

### `js/systems/mining-check-system.js`
Module **pur** : `MiningCheckSystem.resolveHit({precision, hitPositionPct}) ->
{result: "miss"|"correct"|"perfect", perfectHalf, correctHalf}`. Aucun accès à `game`, au
DOM, à `WarehouseManager` ou à `Math.random`.

**Zones de la jauge** (validées avec Seb avant codage) :
- `perfectWindowBonusPct(precision) = clamp(precision × 0.15, 0, 12)` — formule exacte du
  document.
- Zone bleue (parfait) : demi-largeur `3 + bonus/2` → de 6% de large (Précision 0) à 18%
  de large (Précision élevée, bonus max 12).
- Zone orange (correct) : 15% de plus de chaque côté de la zone bleue.
- Au-delà : rouge (raté).

### `js/systems/mining-system.js`
`MiningManager` — cycle de vie complet des sessions de minage, jamais de `CombatEngine`,
jamais d'écriture directe dans `game.resources` (uniquement `WarehouseManager.getAmount()`
/`removeResource()`/`addResource()`).

- `checkQuestRequirements()` : Sentier Obstrué terminé + Clairière découverte + héros +
  1 petite ration + Carrière pas déjà débloquée (non répétable).
- `checkQuarryBonusRequirements()` : Carrière débloquée + pas de session active + pas de
  cooldown.
- `buildHeroSnapshot()` : lit uniquement `game.heroPrecisionRaw` (StatsSystem, déjà exposé
  depuis le Jalon précédent) — aucune seconde source de vérité.
- `startQuestSession()`/`startQuarryBonusSession()` : retire la ration (quête uniquement),
  crée la session, sauvegarde immédiatement.
- `resolveHit(hitPositionPct)` : appelle le module pur, génère le tirage Minerai de fer
  **une seule fois par coup parfait** avant tout retour à l'UI, accumule dans
  `session.minigame.hits[]`/`totalStone`/`totalIronOre`. Idempotent (refuse un coup hors
  session active ou déjà résolue).
- `settle()` : crédite Pierre/Minerai (`WarehouseManager`), débloque la Carrière si session
  de quête avec au moins 1 coup non-manqué (appelle `ProductionManager.unlockQuarry()`),
  applique le cooldown si activité bonus. Strictement idempotent
  (`settlement.rewardsGranted`/`cooldownApplied`).
- `clearSession()` : nettoie après affichage du bilan.

### `js/ui/mining-view.js`
Popups intro (bloquant, commun aux deux sources) → session avec jauge → bilan. Jauge
animée entièrement en **CSS pur** (`@keyframes` aller-retour), position lue via
`getBoundingClientRect()` **au moment du clic** — la seule source de vérité de la position
est le rendu visuel réel que le joueur voit, pas un calcul JS dupliqué. Bouton "Frapper"
cliquable/tapable, plus Espace/Entrée en clavier (`keydown` listener attaché/détaché
proprement à l'ouverture/fermeture de session). Protection anti double-clic sur "Partir"
et sur "Frapper" (désactivation immédiate avant tout traitement).

### `css/04-panel-mining.css`
Jauge horizontale (`.mining-gauge`), zones colorées (rouge/orange/bleu), curseur animé
(`@keyframes mining-cursor-sweep`, 1.4s aller-retour), historique des coups en badges,
bloc "Veine Instable" sous la carte Carrière. Composant entièrement nouveau — aucune
jauge de timing n'existait dans le projet avant.

---

## Fichiers modifiés

### `js/data/exploration-quests.js`
Ajout de `EXPLORATION_QUESTS.unstableVein` : titre, description, prérequis (héros, ration,
quête précédente + flag de déblocage requis), coût fixe (1 petite ration, aucun choix de
réserve contrairement au Sentier Obstrué), config du minijeu (3 coups, récompenses par
résultat, 20% de chance de Minerai sur coup parfait), texte d'échec, `unlockBuildingId:
"quarry"`.

### `js/core/state.js`
`explorationProgression` étendu : `unstableVeinDiscoveryCompleted`, `quarryUnlocked`
(les deux `false` par défaut pour une **vraie** nouvelle partie). Nouveau
`game.gatheringActivity = { quarry: { cooldownEndsAt: 0, activeSession: null } }`. Gardes
de migration correspondantes dans `ensureGameStateDefaults()`.

### `js/systems/production-system.js` (non protégé, premier verrou réel de Production)
- Nouvelle méthode `isBuildingUnlocked(id)` : `true` pour tout bâtiment sauf `quarry`,
  dont le verrou dépend de `game.explorationProgression.quarryUnlocked`.
- `ensure()` : n'initialise **plus jamais** `game.production.quarry` tant que non
  débloquée — verrou réel demandé par Seb (pas seulement un filtre d'affichage).
- `tick()`/`catchUpOffline()` : ignorent `quarry` tant que verrouillée + garde défensive
  (`if (!b) return;`) contre un plantage si l'entrée est absente.
- `harvest()`/`buy()` : gardes défensives équivalentes.
- Nouvelle méthode `unlockQuarry()` : initialisation rétroactive au moment du déblocage
  (idempotente — ne réinitialise pas un bâtiment déjà présent, notamment via migration).
- **Aucun changement de comportement pour les 5 autres bâtiments** (Chasse/Champs/Scierie/
  Mine/Puits) — `isBuildingUnlocked()` retourne toujours `true` pour eux.

### `js/ui/production-view.js`
`buildProductionHTML()` filtre `quarry` de la grille tant que verrouillée (invisible, pas
juste grisée). `buildProductionCardHTML()` ajoute le bloc "Veine Instable" (activité bonus)
sous la carte Carrière une fois débloquée, avec état Prête/Recharge dans mm:ss/Session en
cours.

### `js/ui/quests-view.js`
Les deux quêtes d'Expédition sont désormais distinguées explicitement :
`EXPLORATION_QUESTS.blockedPath` continue de router vers `ExplorationManager`/
`exploration-view.js` (inchangé), `EXPLORATION_QUESTS.unstableVein` route vers
`MiningManager`/`mining-view.js` (nouveau). Nouvelle fonction
`buildUnstableVeinQuestDetailHTML()` avec les 4 états demandés (verrouillée avec la raison
exacte, disponible, en cours, terminée avec le message "Carrière déverrouillée" +
"Une Veine instable peut maintenant être exploitée depuis la Carrière").

### `js/main/boot.js` (non protégé)
Reprise d'une session de minage active après rechargement (`resumeMiningSession()`), même
pattern que `resumeExplorationRun()` du Jalon précédent.

### `js/systems/save-system.js` — exception explicitement autorisée
Modifié **uniquement** pour l'état d'Expédition/minage : `gatheringActivity` ajouté aux 4
emplacements (`buildSaveData`/`loadGame`/`hardResetState`/`fullResetState`),
`explorationProgression` étendu avec les 2 nouveaux flags. `hardResetState` : la session de
minage active et le cooldown sont effacés (pas de sens de les faire survivre à une
ascension), `quarryUnlocked`/`unstableVeinDiscoveryCompleted` sont conservés (progression
permanente, même règle que `forgottenClearingUnlocked`).

**Migration `quarryUnlocked` — bug trouvé et corrigé avant livraison** : la première
version de la condition ne migrait que les sauvegardes ayant déjà un
`explorationProgression` (v3.90.0+) mais sans `quarryUnlocked`. Les sauvegardes **plus
anciennes** (avant v3.90.0, sans aucun `explorationProgression`) — pourtant les plus
susceptibles d'avoir une Carrière déjà développée avec du stock — tombaient dans le
fallback par défaut (`quarryUnlocked: false`), donc **n'étaient pas migrées**. Corrigé :
la migration s'applique désormais dès qu'une sauvegarde réelle est chargée (`d` présent),
peu importe si `explorationProgression` existait déjà ou non. Confirmé par test isolé sur
5 cas (ancienne save avec le champ, save récente avec la valeur explicite à false, save
récente avec la quête déjà réussie, save très ancienne sans le champ du tout, save très
ancienne minimaliste).

### `index.html`
5 nouveaux `<script>` (`mining-check-system.js`, `mining-system.js`, `mining-view.js`,
dans l'ordre pur → engine → UI) et 1 nouveau `<link>` CSS (`04-panel-mining.css`).

### `sw.js`
`CACHE_VERSION` : 3.91.0 → 3.92.0.

---

## Migration de la Carrière (règle validée avec Seb avant codage)

La Carrière n'a **jamais** eu de système de verrouillage avant cette version —
`ProductionManager.ensure()` l'initialisait nativement pour tout le monde dès la création
de partie. La seule migration cohérente : **toute sauvegarde existante** (quel que soit son
état, ancienne ou récente d'avant v3.92.0) obtient `quarryUnlocked: true` automatiquement à
la première ouverture après mise à jour — rien ne change pour ces joueurs. Seules les
**vraies nouvelles parties** créées après cette version ont la Carrière verrouillée jusqu'à
la réussite de "La Veine Instable".

---

## Fichiers protégés — confirmation de non-modification

`combat-engine.js`, `stats-system.js`, `progression-system.js`, `game-loop.js`,
`class-combat-system.js`, `dungeon-system.js`, `adventure-quest-system.js`,
`hunt-quest-system.js`, `world-quest-system.js` : **aucun n'a été modifié**.
`production-system.js` a été modifié (non protégé, autorisé) — c'est le premier système de
verrou réel introduit dans Production, avec gardes défensives partout pour ne jamais
planter sur une entrée absente.

---

## Tests manuels à effectuer

### Prérequis
- Sentier Obstrué non terminé : carte "La Veine Instable" verrouillée, raison affichée.
- Clairière oubliée absente : idem.
- Héros absent : départ impossible.
- Petite ration absente : départ impossible.
- Carrière déjà débloquée : carte affiche "Terminée" (non répétable).

### Quête
- 1 petite ration consommée une fois au départ, pas de choix de réserve.
- Coup parfait (viser le centre de la jauge) : Pierre +4, chance de Minerai de fer.
- Coup correct (zone orange) : Pierre +2.
- Coup manqué (zone rouge) : 0.
- Au moins 1 coup non-manqué sur 3 → Carrière déverrouillée, popup "Carrière déverrouillée".
- 3 coups manqués → aucune Pierre, aucun déblocage, ration perdue, message d'échec exact,
  carte redevient "disponible" pour retenter.
- Double clic sur "Partir explorer" : une seule session, une seule ration débitée.
- Double clic sur "Frapper" : un seul coup compté par clic.

### Carrière et activité bonus
- Invisible dans l'onglet Production avant déblocage.
- Visible immédiatement après déblocage, production passive fonctionnelle (niveau 1,
  stock, récolte, amélioration — comportement identique aux 5 autres bâtiments).
- Bloc "Veine Instable" affiché sous la carte Carrière, bouton "Miner la veine".
- Session de l'activité bonus : Pierre réduite (2/1/0 au lieu de 4/2/0), cooldown 10min
  appliqué après la session (réussie ou non), bouton désactivé pendant le cooldown,
  redevient actif après (y compris après rechargement de page).

### Sauvegarde (le point le plus critique)
- Rechargement à chaque étape : après départ, après 1 coup, après le 3e coup (avant
  bilan), après le bilan (avant clic sortie) — testé exhaustivement via harnais vm, tous
  cohérents, aucun reroll, aucun double crédit.
- **Chargement d'une sauvegarde antérieure à v3.90.0** (avant même le moteur
  d'Expéditions) : `quarryUnlocked` doit être `true` automatiquement, Carrière visible
  immédiatement, aucune perte de niveau/stock existant.
- Chargement d'une sauvegarde v3.90.x/v3.91.x (moteur d'Expéditions déjà présent, sans les
  nouveaux flags) : même migration, `true` automatique.
- Reset de partie (complet) : `gatheringActivity`/`explorationProgression` repartent à
  zéro, Carrière reverrouillée.
- Ascension : `unstableVeinDiscoveryCompleted`/`quarryUnlocked` conservés, session de
  minage active et cooldown effacés (comme les autres runs éphémères).

### Non-régression
- Production des 5 autres bâtiments (Chasse/Champs/Scierie/Mine/Puits) inchangée.
- Sentier Obstrué (Jalon précédent) inchangé — toujours routé via `ExplorationManager`.
- Entrepôt, craft, Construction, Chasse, Aventure, Histoire, Combat classique, Donjon :
  aucun de ces fichiers n'a été touché.
- Aucun appel à `CombatEngine` dans les nouveaux fichiers (vérifié par recherche).
- Aucune écriture directe dans `game.resources` (vérifié par recherche — uniquement
  `WarehouseManager`).
