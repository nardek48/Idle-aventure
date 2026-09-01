# Aethervale v3.110.0 — Lot A : déblocage des bâtiments de production par quête

## Nouveautés
- **Champs, Scierie et Mine sont désormais verrouillés** pour les nouvelles parties, comme
  Chasse/Puits/Carrière, chacun derrière une quête secondaire d'expédition :
  - 🪓 **Le Bosquet Silencieux** (Scierie) — expédition test de stat, **gratuite** (aucune
    ration : à l'ouverture du Village, la Petite ration est encore infabricable). Visible au
    tableau dès l'onglet Village (forest_06). Échec = simple contretemps, relançable.
  - ⛏️ **L'Éboulis Ferreux** (Mine) — réutilise le **minijeu de minage** (jauge/timing,
    3 coups), ressources inversées : **fer en principal, pierre en bonus** de coup parfait.
    Requiert la Carrière + 1 petite ration. Échec = retenter avec une nouvelle ration.
  - 🌾 **La Terre en Friche** (Champs) — expédition test de stat avec provisions
    léger/préparé + réserve (même parcours que Le Sentier Obstrué). Requiert le Puits.
- Ordre pensé pour l'Acte II : Scierie tôt (avant « Les fondations », timing bois/planches
  quasi identique à avant), Mine après la Carrière, Champs après le Puits.

## Migration des sauvegardes
- **« Déjà en jeu = acquis »** : tout bâtiment ayant déjà un bucket `game.production[id]`
  (preuve d'une sauvegarde antérieure au verrou) reçoit son flag de déblocage au premier
  `ensure()`. Un nouveau joueur ne peut pas s'auto-débloquer : aucun bucket n'est créé
  pour un bâtiment verrouillé. Les cartes de ces quêtes apparaissent alors « Terminées »
  (même pattern que la Carrière migrée en v3.92.2).
- Limite connue : une sauvegarde **très ancienne (pré-v3.90, sans aucun bucket de
  production)** referait les 3 quêtes — cas jugé marginal.

## Technique
- `exploration-engine.js` généralisé : récompenses génériques `resources: {clé: qté}` +
  `unlockBuilding` (créditées via WarehouseManager, déblocage via
  `unlockBuildingId`/`unlockFlag`/`completionFlag` des données), verrou de lancement
  `requiresProgressFlag`/`lockedReason`. Chemin historique du Sentier Obstrué intact.
- `mining-system.js` généralisé par `questId` (défaut `"unstableVein"` pour tous les
  appelants historiques) : ressources principale/bonus par quête
  (`minigame.primaryResourceId`/`bonusResourceId`, défauts pierre/fer), montants
  `amount` (repli `stone`), chance de bonus `perfectBonusChancePct` (repli
  `perfectIronOreChancePct`), déblocage lu dans les données. Les champs de session
  gardent leurs noms historiques (compat sessions actives en migration).
- `mission-board-system.js` : gating d'affichage `boardRequires` (onglet ou flag de
  progression) pour les expéditions ; carte de L'Éboulis Ferreux ; correctif — un run
  d'Éboulis ne marque plus la carte Veine Instable « En cours » (questId vérifié).
- `exploration-view.js` : choix de contournement/bypass **optionnels** (rendus seulement
  si définis), icône d'événement et bilan de fin pilotés par les données, ligne « Ration
  de réserve » masquée pour une quête sans rations, libellé « Aucune ration nécessaire ».
- `mining-view.js` : points d'entrée par quête (`openIronLodeQuest`), libellés du bilan
  et de l'historique des coups via `quest.ui` (défauts = textes historiques).
- `quests-view.js` : builder de minage générique (`buildMiningQuestDetailHTML`),
  libellés de récompense par quête, cartes Terminées des 3 nouvelles quêtes.
- Changement mineur de message : « La Carrière est déjà déverrouillée » devient
  « Ce bâtiment est déjà déverrouillé » (générique).
- Harnais : section [71] (verrous, migration, gating, run complet Bosquet via le vrai
  moteur, run complet Éboulis, non-régression Veine Instable) — **467 OK, 0 échec**,
  stable sur 5 exécutions.

## Fichiers modifiés
`js/core/state.js`, `js/data/exploration-quests.js`, `js/systems/exploration-engine.js`,
`js/systems/mining-system.js`, `js/systems/production-system.js`,
`js/systems/mission-board-system.js`, `js/ui/exploration-view.js`, `js/ui/mining-view.js`,
`js/ui/quests-view.js`, `sw.js`, `round-harness.js`.
Aucun fichier protégé touché.
