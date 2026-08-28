# Changelog v3.90.0

Première expédition du moteur d'Expéditions non-combat — vertical slice complet :
Rations → Préparation → Test de stat / choix → Récompense → Déblocage. Jamais de
CombatEngine. Intégré directement à la sauvegarde réelle du jeu, sans bac à sable ni
seconde version parallèle.

4 fichiers créés, 8 fichiers modifiés, tous `node --check` validés (projet complet).
Boucle complète revalidée via harnais `node vm` : démarrage, résolution de tous les
choix (power/precision/bypass), popup de secours, remboursement de réserve,
idempotence stricte de `settle()`, et surtout **persistance/reprise à chaque étape
critique** (rechargement simulé à 5 points différents du cycle de vie d'un run).

---

## Fichiers créés

### `js/data/exploration-quests.js`
Déclaration de "Le Sentier Obstrué" (`EXPLORATION_QUESTS.blockedPath`) : titre,
description, métadonnées d'affichage (`section: "expedition"`, `difficulty: "easy"`,
`progressionStage: "world_start"`, `category: "side"` — même schéma unifié introduit en
v3.89.0, pas de nouveau nom de champ), prérequis, options de provisions (Voyage
léger/préparé), options d'approche (Prudente/Équilibrée/Audacieuse — cosmétique
uniquement, ne modifie jamais `successChance`), événement du tronc (3 choix : power/
precision/bypass) et popup de secours (bypassWithReserve/retreat). Séparé de
`adventure-quests.js`/`hunt-quests.js`/`world-quests.js`, aucun de ces 3 fichiers touché.

### `js/systems/exploration-check-system.js`
Module **pur** : `ExplorationCheckSystem.resolveCheck({statValue, difficulty,
randomValue}) -> {estimate, successChance, result}`. Aucun accès à `game`, au DOM, à
`WarehouseManager` ou à `Math.random` — `randomValue` toujours injecté par l'appelant.
Formule : `successChance = clamp(35 + min(55, statValue×0.5) - difficulty×0.45, 15, 90)`.

**Ajustement du plafond de `statBonus`** (35 → 55, décidé avec Seb en session) : avec la
formule initialement donnée (plafond 35), le `successChance` réel maximum atteignable
plafonnait à ~70% dès qu'une `difficulty` positive était appliquée — la borne haute 90 du
clamp n'était donc jamais atteignable en pratique sur ce contenu. Réajusté à 55 pour
qu'un héros très fort atteigne réellement 90% (35+55=90, `difficultyPenalty=0`), sans
toucher au reste de la formule ni aux seuils perfect/success/setback.

### `js/systems/exploration-engine.js`
`ExplorationManager` — cycle de vie complet du run, jamais de `CombatEngine`, jamais
d'écriture directe dans `game.resources` (uniquement `WarehouseManager.getAmount()`/
`removeResource()`/`addResource()`, aucune méthode `hasResource()` n'existant réellement
dans `warehouse-system.js` — signalé et confirmé pendant l'analyse).

- `checkRequirements()` : héros sélectionné + au moins 1 petite ration.
- `buildHeroSnapshot()` : lit **uniquement** `game.heroPowerRaw`/`game.heroPrecisionRaw`
  (nouveaux champs, voir `stats-system.js` plus bas) — aucune seconde source de vérité,
  aucun recalcul indépendant.
- `startRun()` : valide tout, retire les rations via `WarehouseManager.removeResource()`,
  construit le run complet (forme conforme au document), sauvegarde immédiatement.
- `resolveEventChoice()` : pour power/precision, génère `randomValue` **une seule fois**
  via `Math.random()`, l'enregistre dans `run.event` avant tout retour à l'UI, appelle le
  module pur. Pour bypass (choix garanti), pas de test de stat, consomme la réserve.
  Idempotence : refuse si `run.status !== "event"`.
- `resolveFallbackChoice()` : bypassWithReserve (consomme la réserve, Bois×4) ou retreat
  (Bois×1, quête reste incomplète — marqué via `run._questRemainsIncomplete`).
- `settle()` : finalise — crédite le Bois (`WarehouseManager.addResource`), débloque
  `forgottenClearingUnlocked` si acquis, marque `blockedPathCompleted` sauf en cas de
  retour prudent, rembourse la réserve non utilisée. **Strictement idempotent** :
  `settlement.rewardsGranted`/`settlement.reserveRefunded` empêchent tout double crédit
  ou double remboursement même en cas d'appel multiple.
- `clearRun()` : nettoie `game.explorationRun` après affichage du bilan.

**Statut intermédiaire `completed_pending`** introduit (non listé explicitement dans le
document, validé avec Seb) : le résultat d'un choix est tranché et sauvegardé
immédiatement, mais les récompenses ne sont matérialisées via `WarehouseManager` que
lorsque l'UI appelle `settle()` au moment d'afficher le popup de fin — jamais avant.

### `js/ui/exploration-view.js`
Fichier UI dédié (validé avec Seb plutôt que d'alourdir `quests-view.js`, déjà
volumineux). Popups :
- **Préparation** (2 étapes + récapitulatif) : `explorationPrepStep` ("provisions" →
  "approach" → "summary"), pattern de wizard directement inspiré de `modal-view.js`
  (`heroSelectionStep`/`pendingHeroId`). Bouton "Partir" désactivé immédiatement au clic
  (`explorationPrepBusy`), re-rendu avant tout traitement — anti double-clic réel, pas
  seulement une garde logique.
- **Événement du tronc** : 3 boutons (Déplacer le tronc / Chercher un passage étroit /
  Installer un camp), estimation qualitative uniquement (Faible/Moyenne/Bonne chance —
  jamais de pourcentage affiché), bouton "Installer un camp" désactivé si pas de réserve.
- **Popup de secours** : 2 boutons, même protection anti double-clic.
- **Popup de fin** : réutilise `buildQuestCompleteHTML`-like via le pattern
  `dungeon-story-card`/`dungeon-summary-rewards` déjà en place — Bois obtenu, Clairière
  oubliée débloquée ou non, statut de la réserve (Absente/Utilisée/Rendue).
- **`resumeExplorationRun()`** : réaffiche le popup exact correspondant au `status` du run
  après un rechargement — jamais de nouveau tirage, jamais de nouvel appel `settle()` sur
  un run déjà réglé (le cas `status === "completed"` réaffiche le bilan sans rappeler
  `settle()`, cf. bug corrigé ci-dessous).

**Bug trouvé et corrigé pendant les tests** : `openExplorationPrep()` ne vérifiait pas
`isQuestCompleted()` avant d'ouvrir le popup de préparation — une quête déjà terminée
pouvait être relancée si le joueur avait toujours assez de rations. Corrigé (garde ajoutée
en premier, avant même les autres prérequis).

**Bug trouvé et corrigé pendant les tests** : un rechargement de page survenant après
`settle()` (récompenses déjà créditées) mais avant que le joueur ait cliqué "Retour aux
quêtes" laissait `resumeExplorationRun()` ne rien afficher — le run restait bloqué en
mémoire, invisible, sans bouton pour le fermer. Corrigé : le cas `status === "completed"`
réaffiche désormais le même popup de bilan (sans rappeler `settle()`, qui de toute façon
est idempotent).

---

## Fichiers modifiés

### `js/core/state.js` (non protégé)
`createInitialGameState()` : ajout de `game.explorationRun = null` et
`game.explorationProgression = { blockedPathCompleted: false, forgottenClearingUnlocked:
false }` (nouvelle fonction `createDefaultExplorationProgression()`).
`ensureGameStateDefaults()` : garde de migration — une ancienne sauvegarde sans ces champs
récupère les valeurs par défaut sûres, jamais de run recréé à partir de rien.

### `js/systems/save-system.js` — **exception explicitement autorisée par Seb pour cette session**
Modifié **uniquement** pour l'état d'Expédition, en suivant strictement le pattern déjà en
place pour `huntRun`/`huntStats` (le run le plus proche structurellement) :
- `buildSaveData()` : `explorationRun`/`explorationProgression` ajoutés.
- `loadGame()` : rechargés avec garde `typeof === "object"`, valeurs par défaut sûres
  sinon.
- `hardResetState()` (ascension) : `explorationRun` effacé **sans remboursement** — même
  traitement que `huntRun`/`dungeonRun`/`adventureQuestRun` (décision explicite validée
  avec Seb : pas d'exception pour Exploration). `explorationProgression` **conservé**
  (progression permanente, comme `worldQuestsCompleted`/`huntStats`).
- `fullResetState()` (reset complet) : les deux repartent à zéro.
Aucune autre ligne de `save-system.js` touchée — aucun renommage, aucun refactor de la
logique existante des autres systèmes.

### `js/systems/stats-system.js` — **exception explicitement validée par Seb (fichier protégé)**
2 lignes strictement additives dans `recalcStats()`, aucun calcul existant modifié :
`game.heroPowerRaw = totalPower;` et `game.heroPrecisionRaw = basePrecision +
trainedPrecision;`, juste après leur calcul déjà existant (variables locales déjà
présentes, simplement exposées). Nécessaire car `StatsSystem` ne stockait jusqu'ici aucune
valeur brute de Puissance/Précision — uniquement leurs dérivés de combat (`tapDamage`/
`critChance`), inutilisables tels quels pour un moteur non-combat sans dupliquer la
logique de calcul (ce que le document interdit explicitement).

### `js/ui/quests-view.js`
- `collectActiveQuestCardEntries()`/`collectCompletedQuestCardEntries()` : 4e boucle de
  collecte (`window.ExplorationManager`/`window.EXPLORATION_QUESTS`), sur le même modèle
  que les 3 boucles existantes. `worldId: null` (cette expédition n'est rattachée à aucun
  monde spécifique — tombe dans le groupe "Autres" du regroupement par monde existant,
  comportement déjà géré nativement).
- Nouvelle fonction `buildExplorationQuestDetailHTML(quest, run)` : affiche les 4 états
  (verrouillée avec raison exacte du verrou/disponible/en cours/terminée), les
  récompenses (principale : Clairière oubliée ; secondaire : Bois), et le bouton d'action
  approprié (Préparer l'expédition / Reprendre l'expédition / rien si terminée).
- Aucune carte ni action existante d'Histoire/Ressources/Aventure touchée.

### `js/main/boot.js` (non protégé)
Après `renderAll()`, avant `switchTab()` : si un run d'Expédition est actif
(`ExplorationManager.isRunActive()`), appelle `resumeExplorationRun()` — reprise après un
rechargement de page, sans jamais relancer un tirage aléatoire (l'état est déjà figé côté
`game.explorationRun`).

### `css/04-panel-quests.css`
Nouvelles classes `.exploration-option-list`/`.exploration-option-btn`/
`.exploration-option-label`/`.exploration-option-cost`/`.exploration-option-estimate` —
réutilisent `.settings-btn` comme base (bordure/hover/disabled déjà stylés), uniquement le
layout interne ajouté. Aucun nouveau composant générique, aucune nouvelle palette.

### `index.html`
4 nouveaux `<script>` insérés dans l'ordre conventionnel (data → systems → UI) :
`js/data/exploration-quests.js` (après `hunt-quests.js`), `js/systems/
exploration-check-system.js` puis `js/systems/exploration-engine.js` (après
`hunt-quest-system.js`, avant `save-system.js`), `js/ui/exploration-view.js` (juste avant
`quests-view.js`).

### `sw.js`
`CACHE_VERSION` : 3.89.0 → 3.90.0.

---

## Fichiers protégés — confirmation de non-modification

`combat-engine.js`, `progression-system.js`, `warehouse-system.js`, `game-loop.js`,
`class-combat-system.js`, `dungeon-system.js`, `adventure-quest-system.js`,
`hunt-quest-system.js`, `world-quest-system.js` : **aucun n'a été modifié**. Confirmé par
recherche : aucun de ces fichiers n'apparaît dans le diff de cette livraison.
`stats-system.js` : modifié **uniquement** pour les 2 lignes additives explicitement
validées par Seb (exception ponctuelle, pas une levée générale de la protection).

---

## Écarts par rapport au document (signalés en cours de route, tous validés avec Seb)

1. **`WarehouseManager.hasResource()`** n'existe pas dans le code réel — l'API expose
   `getAmount(key)` (retourne un nombre). Utilisé `getAmount(key) >= n` à la place partout
   où le document mentionnait `hasResource()`.
2. **`game.heroPowerRaw`/`game.heroPrecisionRaw`** n'existaient pas — ajoutés dans
   `stats-system.js` (exception validée) plutôt que recalculés localement dans le moteur,
   pour respecter la règle "une seule source de vérité".
3. **Plafond de `statBonus`** ajusté de 35 à 55 dans la formule de test — sinon le
   `successChance` maximum réel restait bloqué à ~70%, jamais 90%, rendant la borne haute
   du clamp inatteignable en pratique (validé avec Seb).
4. **Statut intermédiaire `completed_pending`** ajouté au cycle de vie du run (non listé
   dans le document, qui prévoyait `preparing/intro/event/fallback/completed`) — validé
   avec Seb pour séparer clairement "résultat tranché et sauvegardé" de "récompenses
   matérialisées via WarehouseManager".

---

## Tests manuels à effectuer

### Préparation
- Tenter "Préparer l'expédition" sans héros sélectionné → toast d'erreur, popup ne s'ouvre
  pas.
- Tenter avec 0 petite ration → toast d'erreur, popup ne s'ouvre pas.
- Départ avec 1 petite ration (Voyage léger) → 1 ration débitée, aucune réserve.
- Départ avec 2 petites rations (Voyage préparé) → 2 rations débitées, 1 réserve.
- Annulation à chaque étape du popup (provisions/approche/récapitulatif) → aucune ration
  débitée, run non créé.

### Résolution
- Choix "Déplacer le tronc" (Puissance) : tester plusieurs fois pour observer perfect
  (Bois×8), success (Bois×5), setback (popup de secours) — proportions cohérentes avec un
  héros de niveau moyen.
- Choix "Chercher un passage étroit" (Précision) : perfect/success (Bois×3), setback.
- Choix "Installer un camp" avec réserve disponible → réussite garantie, Bois×4, réserve
  consommée immédiatement.
- Choix "Installer un camp" sans réserve → bouton désactivé, message "Une ration de
  réserve est nécessaire."

### Intégrité
- Réserve non utilisée → remboursée exactement 1 petite ration au bilan final.
- Réserve consommée (bypass ou bypassWithReserve) → aucun remboursement au bilan.
- Double clic rapide sur "Partir" → une seule ration débitée, un seul run créé.
- Double clic rapide sur un choix d'événement → un seul résultat tranché, pas de reroll.
- Tentative de relancer l'expédition alors qu'un run est déjà actif → refusé, toast
  explicite.
- Récompense (Bois + déblocage) créditée une seule fois, quelle que soit la façon dont on
  arrive au bilan.

### Sauvegarde (le point le plus critique — testé exhaustivement via harnais vm)
- Rechargement juste après "Partir" (status `intro`) → reprend sur le popup du tronc, run
  intact.
- Rechargement sur le popup du tronc (status `event`) → identique, aucun tirage relancé.
- Rechargement après un résultat de test réussi → transition vers le bilan quasi
  instantanée côté code (settle() enchaîné de façon synchrone), testé néanmoins comme
  robuste en cas d'appel multiple.
- Rechargement sur le popup de secours (status `fallback`) → `randomValue` du 1er test
  reste figé, aucun reroll, popup de secours réaffiché à l'identique.
- **Rechargement après la récompense mais avant "Retour aux quêtes"** (status `completed`,
  bug trouvé et corrigé pendant cette session) → le popup de bilan se réaffiche
  correctement, aucun double crédit de Bois.
- Chargement d'une ancienne sauvegarde sans `explorationRun`/`explorationProgression` →
  valeurs par défaut sûres, aucun plantage (testé via simulation `delete` + migration).
- Reset de partie (complet) → `explorationRun`/`explorationProgression` repartent à zéro.
- Ascension (reset "dur") → `explorationRun` en cours perdu sans remboursement (comportement
  identique à Hunt/Dungeon/Adventure), `explorationProgression` conservé.

### Confirmations finales
- ✅ Aucun appel à `CombatEngine` dans les 4 nouveaux fichiers (vérifié par recherche).
- ✅ Aucune écriture directe dans `game.resources` (vérifié par recherche — uniquement
  `WarehouseManager.getAmount()`/`removeResource()`/`addResource()`).
- ✅ Tous les gains/retraits de ressources passent par `WarehouseManager`.
- ✅ Les 9 fichiers strictement protégés n'ont pas été touchés.
- ✅ `save-system.js` modifié uniquement pour l'état d'Expédition (3 emplacements :
  sérialisation, chargement, les 2 resets — aucun refactor du reste).
- ✅ `stats-system.js` modifié uniquement pour les 2 lignes exposant les stats brutes
  (exception explicitement validée).
- ✅ Chasse, Aventure, Histoire, Combat classique, Donjon, Production, Entrepôt et
  Artisanat non touchés (aucun de leurs fichiers n'apparaît dans le diff).
