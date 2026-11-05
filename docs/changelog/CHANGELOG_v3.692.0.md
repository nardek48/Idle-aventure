# v3.692.0 — Ménage du code (audit du 04/11, lots A4 et A5)

Code mort, doublons, commentaires périmés et globales fantômes retirés. Une seule chose change à l'écran : un contre réussi affiche « ⚡ CONTRÉ ! » sur l'ennemi visé (ARCH-V1). Aucune règle de jeu ni aucun chiffre d'équilibrage n'a changé. Captures avant/après de 14 écrans comparées au pixel (Chromium 390 × 844).

- **ARCH-4** : `game/vh/vtabs320.png` (capture de travail, 147 Ko) et `images/Dungeons/donjon_poison/LISEZ-MOI.txt` (faux : les images existent) supprimés. Aucun n'était cité ni précaché.
- **ARCH-5** : appels à des fonctions qui n'existent plus retirés : `renderSpecialAttackButton` et `renderDefenseButton` (`js/main/boot.js`, `js/ui/ui-root.js`), `ensureDailyQuests` (`js/systems/save-system.js` **(protégé)**), `openExplorationPrep` (`js/systems/story-quest-system.js` **(protégé, quêtes)**). Le harnais contrôle aussi les globales en minuscule, `boot.js` et `pwa.js` compris.
- **ARCH-7** (ancien affichage, cycles) :
  - `js/systems/combat-engine.js` **(protégé)** : les 4 fonctions d'affichage de l'ancien combat (`#enemy-display`, absent du DOM) deviennent des points d'accroche vides, remplacés par l'écran de combat. `advanceSelection`, `finishManualRound` et `DEFEAT_GOLD_PENALTY` sont retirés : aucun appel. −86 lignes.
  - `js/systems/progression-system.js` **(protégé)** : `WorldManager.advance` retiré (aucun appelant depuis v3.293). Son seul usage, `AdventureQuestManager.isTransitionUnlocked`, est retiré aussi (`adventure-quest-system.js` **(protégé, quêtes)**).
  - Commentaire de `world-travel-system.js` corrigé.
  - Les formules de cycle restent : une ancienne sauvegarde peut avoir `cycleCount` > 0. Le champ Admin « Nombre de cycles » reste aussi (voir Laissés).
- **ARCH-V1** : `js/ui/combat-screen-view.js` surcharge `showCounterSuccessPopup`. « ⚡ CONTRÉ ! » flotte sur l'ennemi visé, au style existant d'un coup bloqué (`.cbx-num.is-blocked`, pas de nouveau visuel). Mesuré dans Chromium : voir Contrôles.
- **ARCH-8** (code mort hors fichiers protégés) :
  - Ancien écran Équipement/Talents (18 fonctions, ≈ 240 lignes de `equipment-view.js` et `talents-view.js`) et ses deux `case` de `renderPanel`. Injoignable : `switchTab` mène « equip » et « talents » dans Héros depuis v3.244.
  - Fonctions et méthodes sans appel : `renderChronique`, `renderClassResourceBar`, `renderCombatMissionProgress`, `cbxStatesOf`, `ProductionPlotsSystem._payAll`, `PotionManager.getHealCooldownRemainingMs`, `TowerSystem.axesOf`, `LabyrinthRun.echoOf`.
  - Constantes sans lecture : `RPG_STAT_LABELS` (et sa ligne de `lang/data-fields.js`), `HERO_LEVELING`, `SCENE_STAT_LABELS`, `CAMP_MISSION_TYPE_LABEL`, `LMX_TAP_SLOP`, `LMX_DOUBLE_TAP_MS`, `RSB_HERO_BY_CLASS`, `filRougeLastKey`, `achievementTotalsOpen`, `showInventorySortMenu`.
  - CSS : `tools/audit/css-dead.js` donnait **35 classes mortes avant** et en donne **0 après**. Cela fait 85 classes et 2 id retirés : les 35 d'avant, puis celles que le retrait de l'ancien écran et de l'ancien affichage a rendues mortes. 6 `@keyframes` sans usage et 3 blocs `@media` vides sont retirés aussi (19 fichiers CSS, ≈ −960 lignes).
  - `js/lang/en.js` : les 16 textes devenus orphelins sont retirés.
- **ARCH-10** : `quests`, `questProgress`, `questResetTime` et `hasSeenOnboarding` (jamais lus) sortent des 4 points : `buildSaveData`, `restoreBaseState`, `fullResetState` **(protégé)** et `createInitialGameState` / `ensureGameStateDefaults`. Sortent aussi `getDefaultQuestProgress`, `normalizeProgressMap` et `DEFAULT_QUEST_PROGRESS`. Une ancienne sauvegarde qui porte ces clés se charge toujours : elles sont ignorées.
- **ARCH-12 / ARCH-13** (commentaires faux) :
  - 89 renvois à `COMMENTAIRES_ORIGINAUX.md` et `save-system_notes.md`, qui n'existent pas, sont retirés (dont 21 dans `save-system.js` **(protégé)**).
  - « Redonne 1M d'or » devient « Repart à 0 or (v2.26) ».
  - `sw.js` : « ~38 Mo » devient « ~67 Mio » (mesuré).
  - Les « à générer » / « à fournir » sont retirés pour les images livrées : `tools/audit/missing-icons.js` ne trouve aucune image absente.
  - `donjon_poison.jpg` devient `.webp` dans un commentaire CSS.
- **ARCH-14** : `noteErreur` dans les 3 catch muets : `isCurrentStepReady` (`story-quest-system.js` **(protégé, quêtes)**), `AchievementManager.getProgress` et `CodexManager.isUnlocked`. Le parcours-harness compte une erreur rattrapée (`[rattrapée]`) comme une erreur de console.
- **ARCH-15** (en partie) : `journal-test.js` ne maquille plus `toString`. L'original reste lisible par `_journalOrig`. Les 5 contrôles qui lisaient une méthode enveloppée passent par `srcOf()`.
- **ARCH-16** : contrôle au harnais. Chaque fonction surchargée par `combat-screen-view.js` doit être définie plus tôt dans `index.html`.
- **ARCH-17** (doublons) :
  - `POTION_AUTO_NEW_GAME` passe dans `core/constants.js`. Il est lu (copié) par `createInitialGameState` et `fullResetState` **(protégé)** : le réglage « Tard » n'est plus écrit en dur à 2 endroits.
  - `normalizeGrimoirePresets` (`core/state.js`) sert aussi à `restoreBaseState` **(protégé)**.
  - `HuntQuestManager.applyQuestTheme` reprend celui de l'aventure (`hunt-quest-system.js` **(protégé, quêtes)**).
  - L'icône d'action de l'écran de combat reprend `getGrimoireActionIcon`.
  - `WorkshopsSystem._notifyCrafted` remplace deux blocs identiques (en ligne et hors ligne).
- **ARCH-21** : le catalogue de l'Entrepôt (`WAREHOUSE_RESOURCES`, plafonds, `RATION_IDS`) sort de `hunt-quests.js`. `tools/sim/seve-bench.js` et `tools/docs-gen/generate-balance-guide.js` sont suivis.
- **Fichier ajouté** : `js/data/warehouse-resources.js`, dans `index.html` (avant `hunt-quests.js`) et dans le précache de `sw.js`, dans ce même commit.
- **Fichiers supprimés** : `vh/vtabs320.png` et `images/Dungeons/donjon_poison/LISEZ-MOI.txt`, jamais précachés.
- « Quoi de neuf » : une ligne (FR + EN).

Contrôles du harnais adaptés parce qu'ils vérifiaient le code retiré :
- [15] et [148] : l'arbre de Héros remplace l'ancien plateau.
- [35b] : la feuille du Sac remplace l'ancien Inventaire.
- [54b] : la liste vit dans la feuille de l'emplacement.
- [58] : le contrôle était vide, faute de bloc `.combat-mission-progress`.
- [174] : plus de filtre de l'ancien Inventaire.
- [189] et [300] : règles de l'ancienne grille des parcelles retirées.
- [261] C13 : l'ancien écran Talents est retiré.
- [340] : `DEFAULT_QUEST_PROGRESS` retiré.
- [416] : 2 masques au lieu de 4, `.kc-doc` retiré.
- [451] : le témoin v3.685 n'attend plus les 4 clés d'ARCH-10.
- [415] lit `warehouse-resources.js`.

Nouvelle section [457].

## Laissés

- **ARCH-9** (retrait des chasses) : décision de Seb.
- **ARCH-1, ARCH-2, ARCH-3** : documentation, lot à part.
- **ARCH-18** (découpage de `restoreBaseState`, 356 l.) : ce n'est pas une modification minimale d'un fichier protégé, et le risque est sans gain visible. À proposer en lot dédié.
- **ARCH-20** (outils de test publiés) : décision close (v3.591.0). Le champ Admin « Nombre de cycles » reste pour la même raison, et parce que les formules de cycle lisent encore `cycleCount`.
- **ARCH-15** (reste) : les 12 contrôles qui lisent le texte du code ne sont pas réécrits en contrôles d'effet. C'est une réécriture de tests, pas un ménage.
- **ARCH-21** (reste) : les noms d'onglet « ascension » (Mémoire) et « more » (Héros) sont gardés, parce qu'ils sont écrits dans les sauvegardes (`activeTab`, `unlockedTabs`).
- Doublons de données (`afterGo` de deux étapes d'Histoire, `go` du fil rouge) : laissés, ce sont des fermetures de données propres à chaque étape.

## Déjà corrigés

- COMB-12 (v3.689.0), ARCH-6 (v3.687.0), ARCH-11 et ARCH-19 (v3.686.0).
- Le « plafond 50 % supprimé » de `boot.js` n'existe plus dans le code actuel.

## Repéré

L'amélioration C13 de v3.458 (« le prochain au niveau N » / « plafond de l'acte ») ne vivait que dans l'ancien écran Talents, injoignable depuis v3.244. L'arbre de Héros affiche seulement « a / b placés ». À reprendre si Seb le souhaite (UI : atelier d'abord).

Contrôles : `node --check` sur chaque JS modifié ; round 6 410 OK, 0 échec (2 passes) ; boot 4 OK ; création 44 OK ; i18n 8 440 textes, 100 %, 0 orphelin ; parcours 212 OK (2 passes, les erreurs rattrapées comptent désormais) ; css-dead 35 → 0 classe morte ; missing-icons : aucune image absente ; 14 écrans comparés au pixel avant/après (identiques ; la carte du monde a moins de 16 niveaux d'écart, effet d'animation) ; « CONTRÉ ! » mesuré dans Chromium 390 × 844 : 79 × 15 px à (130, 224), dans la carte de l'araignée (94, 187, 201 × 201), 18 px, bleu `rgb(147, 197, 253)`, retiré après 1,1 s. Fichier ajouté : `js/data/warehouse-resources.js` (index.html + précache sw.js). Fichiers protégés touchés : `combat-engine.js`, `progression-system.js`, `save-system.js`, `story-quest-system.js`, `adventure-quest-system.js`, `hunt-quest-system.js` (retraits et commentaires, aucune règle changée).
