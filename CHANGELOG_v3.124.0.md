# CHANGELOG v3.124.0 — Retrait complet de l'ancien moteur (fin du chantier scene-engine)

Dernière étape du chantier scene-engine (Lots S1 → S2a → S2b → ce retrait final). Les 10
fichiers de l'ancien moteur d'expéditions à jet de stat et de minage/puits sont supprimés,
avec tous leurs appelants adaptés pour lire directement les flags de progression plutôt que de
passer par les managers disparus.

## Fichiers supprimés (10)

```
js/systems/exploration-engine.js
js/systems/exploration-check-system.js
js/systems/mining-system.js
js/systems/mining-check-system.js
js/systems/well-system.js
js/systems/well-check-system.js
js/ui/exploration-view.js
js/ui/mining-view.js
js/ui/well-view.js
js/data/exploration-quests.js
css/04-panel-mining.css
css/04-panel-well.css
```

## Découverte pendant le retrait : code mort jamais branché

`buildQuarryBonusQuestDetailHTML()` et `buildWellBonusQuestDetailHTML()` (activité de récolte
bonus répétable de la Carrière et du Puits) n'étaient appelées **nulle part** dans le code —
ni par `MissionBoard`, ni par une section de `QUEST_SECTIONS`. Décision Seb (session
précédente) : supprimées avec le reste, sans être migrées — la fonctionnalité n'ayant jamais
été accessible au joueur, aucune régression à éviter.

## Bug détecté et corrigé pendant le retrait : gating d'affichage cassé

**Régression réelle trouvée par le harness (8 tests en échec), pas en jeu.** `MissionBoard.
_sceneMissions()` lisait `EXPLORATION_QUESTS[legacyId].boardRequires` pour décider si une carte
migrée devait apparaître au tableau — avec `exploration-quests.js` supprimé, `EXPLORATION_QUESTS`
devenait `undefined`, et le garde `if (legacyQuest && !visible) return;` ne se déclenchait
plus jamais (`legacyQuest` toujours falsy) : **les 6 quêtes migrées seraient devenues visibles
en permanence dès le boot**, y compris avant d'avoir rempli leurs prérequis (Village ouvert,
Sentier Obstrué terminé, etc.) — la même classe de régression que le fix v3.118.0 avait déjà
corrigée une fois sur l'ancien moteur.

**Corrigé en profondeur, pas en repli temporaire** : `boardRequires` est désormais déclaré
**directement sur chaque `SCENE_TEMPLATES[templateId]`** (rapatrié depuis les données
supprimées), et `_sceneMissions()` appelle `_isExplorationQuestBoardVisible(template)`
directement — cette méthode ne lit qu'une forme générique `{boardRequires}`, qu'elle vienne
d'un ancien objet `EXPLORATION_QUESTS[...]` ou d'un template scene-engine, donc aucune
duplication de logique de gating.

## Fichiers modifiés (lecture directe des flags, sans dépendance aux managers retirés)

- **`data/scene-templates.js`** : `boardRequires` ajouté aux 5 templates qui en avaient un
  dans l'ancien système (`sentier_obstrue`, `bosquet_silencieux`, `terre_en_friche`,
  `veine_instable`, `eboulis_ferreux` — `source_tarie` n'en a jamais eu, accessible dès le
  départ, inchangé).
- **`systems/mission-board-system.js`** :
  - `_explorationMissions()` **entièrement retirée** — après les migrations S2a/S2b, elle
    filtrait déjà 100% des 6 quêtes d'`EXPLORATION_QUESTS`, ne produisait plus jamais aucune
    mission (code mort avant même la suppression du fichier de données).
  - `_sceneMissions()` corrigée pour lire `boardRequires` sur le template lui-même (voir bug
    ci-dessus).
  - `_workshopMissions()` : `MiningManager.isQuestCompleted()` remplacé par une lecture directe
    de `game.explorationProgression.unstableVeinDiscoveryCompleted`/`quarryUnlocked`.
- **`ui/quests-view.js`** : les 6 fonctions dédiées à l'ancien moteur
  (`buildExplorationQuestDetailHTML`, `buildMiningQuestDetailHTML`,
  `buildUnstableVeinQuestDetailHTML`, `buildDriedSpringQuestDetailHTML`,
  `buildQuarryBonusQuestDetailHTML`, `buildWellBonusQuestDetailHTML`) remplacées par une seule
  fonction générique `buildSceneQuestCompletedDetailHTML(template)`, lue depuis
  `SCENE_TEMPLATES` + `game.explorationProgression` — l'historique des 6 quêtes fonctionne
  toujours, sans dépendance aux managers retirés. `collectCompletedQuestCardEntries()` adaptée
  en conséquence.
- **`ui/tutorial-view.js`** : condition du tutoriel `village_production` réécrite en lecture
  directe du flag (`explorationProgression.unstableVeinDiscoveryCompleted`/`quarryUnlocked`).
- **`data/story-quests.js`** : `storyExplorationDone(questId)` réécrite — nouvelle table
  `STORY_EXPLORATION_FLAGS` (mapping questId → completionFlag/unlockFlag), lecture directe de
  `game.explorationProgression` sans passer par `ExplorationManager`. Les 2 appels directs à
  `WellManager.isQuestCompleted()`/`MiningManager.isQuestCompleted()` (Source Tarie, Veine
  Instable) remplacés par `storyExplorationDone(...)`.
- **`main/boot.js`** : les 3 blocs de reprise après rechargement de page
  (`resumeExplorationRun`/`resumeMiningSession`/`resumeWellSession`) retirés — plus de manager
  à interroger, `resumeSceneRun()` (scene-engine) couvre tous les cas désormais.
- **`systems/production-system.js`** : commentaire mis à jour (référence à
  `MiningManager.settle()` remplacée par `SceneRunManager._applyUnlock()`).
- **`index.html`** : 10 balises `<script>`/`<link>` retirées (6 systems, 3 UI, 1 data, 2 CSS).

## Fichiers volontairement inchangés

- **`save-system.js`/`core/state.js` — `gatheringActivity`** : structure de sauvegarde des
  anciennes sessions de minage/puisage bonus, laissée en dormant plutôt que purgée. Plus lue ni
  écrite par aucun code actif, mais retirer un champ de save peut créer des soucis de migration
  pour des sauvegardes existantes qui le contiendraient — le coût de la garder est nul, le
  bénéfice de la retirer est marginal.

## Harness

`round-harness.js` : gros nettoyage — le bloc de test historique sur `ExplorationManager`/
`MiningManager` (démarrage, résolution, settle des anciennes quêtes silentGrove/fallowField/
ironLode/unstableVein) remplacé par un test équivalent sur le nouveau moteur (Bosquet
Silencieux, chemin complet démarrage → résolution → déblocage). Toutes les autres occurrences
résiduelles des anciens noms ne sont plus que des commentaires historiques, aucune référence de
code exécutable.

**677 OK, 0 échec**, stable sur 5 runs consécutifs. `node --check` validé sur tous les fichiers
modifiés. Test bout-en-bout manuel supplémentaire (hors harness) : les 6 quêtes jouées de bout
en bout dans une même session, historique affiché sans exception, ascension (`hardResetState`)
sans crash, onglet Expédition toujours accessible après ascension.
