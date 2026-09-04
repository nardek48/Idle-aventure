"use strict";
/* systems/scene-run-system.js — glue jeu du scene-engine générique (DESIGN_Scene_Engine_v1.md).
   Consomme le moteur pur SceneEngine + SceneCheckSystem, persiste game.sceneRun (même règle
   que explorationRun : survit au rechargement, PAS à l'ascension — save-system.js),
   route TOUT le loot/XP via SortieManager (context "scene", voir sortie-system.js) plutôt que
   de gérer un banking séparé. Ne charge JAMAIS CombatEngine, n'écrit jamais dans
   game.resources directement (uniquement via WarehouseManager, lui-même appelé par
   SortieManager.bank()). v3.120.0 (Lot S1) : sandbox — un seul canevas (expedition_faille),
   pas encore branché à MissionBoard (Lot S2). Détail : COMMENTAIRES_ORIGINAUX.md */

var SceneRunManager = {
  ensureDefaults: function () {
    if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
    if (!game.sceneRun) game.sceneRun = null;
    // v3.125.0 (Petites Aventures, Lot PA1) : cap journalier léger, persisté dans
    // explorationProgression (objet déjà whitelisté save-system.js, pas de nouvelle clé
    // racine — même règle que villageQuests/boardAccepted). "day" = jour civil local
    // (toDateString), pas un timestamp — évite tout souci de fuseau/minuit ambigu.
    if (!game.explorationProgression) game.explorationProgression = {};
    if (!game.explorationProgression.petiteAventure || typeof game.explorationProgression.petiteAventure !== "object") {
      game.explorationProgression.petiteAventure = { day: "", count: 0 };
    }
  },

  PETITE_AVENTURE_DAILY_CAP: 3,

  _today: function () { return new Date().toDateString(); },

  /* v3.125.0 : nombre de Petites Aventures déjà lancées aujourd'hui (reset automatique au
     changement de jour civil, pas de tâche de minuit à programmer). */
  petiteAventureCountToday: function () {
    this.ensureDefaults();
    var pa = game.explorationProgression.petiteAventure;
    if (pa.day !== this._today()) return 0;
    return Number(pa.count || 0);
  },

  canStartPetiteAventureToday: function () {
    return this.petiteAventureCountToday() < this.PETITE_AVENTURE_DAILY_CAP;
  },

  _consumePetiteAventureSlot: function () {
    this.ensureDefaults();
    var pa = game.explorationProgression.petiteAventure;
    var today = this._today();
    if (pa.day !== today) { pa.day = today; pa.count = 0; }
    pa.count += 1;
  },

  getRun: function () {
    this.ensureDefaults();
    return game.sceneRun;
  },

  isRunActive: function () {
    var run = this.getRun();
    return !!(run && run.status !== "completed");
  },

  /* v3.122.0 (Lot S2a) : vrai si la quête (canevas à unlockOnSuccess) est déjà réussie de
     façon permanente — même contrat que ExplorationManager.isQuestCompleted() (repli sur
     unlockFlag si completionFlag absent, migration "déjà en jeu = acquis" incluse). Les
     canevas sans unlockOnSuccess (expédition générative répétable) ne sont jamais
     "complétés" au sens permanent — retourne toujours false pour eux. */
  isQuestCompleted: function (templateId) {
    this.ensureDefaults();
    var template = SceneEngine.getTemplate(templateId);
    if (!template || !template.unlockOnSuccess) return false;
    var spec = template.unlockOnSuccess;
    if (game.explorationProgression && spec.completionFlag && game.explorationProgression[spec.completionFlag]) return true;
    if (spec.buildingId && spec.unlockFlag && game.explorationProgression && game.explorationProgression[spec.unlockFlag]) return true;
    return false;
  },

  /* Snapshot des 3 stats brutes au moment du départ — jamais recalculé ensuite pendant le run
     (même règle que ExplorationManager.buildHeroSnapshot / MiningManager / WellManager). */
  buildHeroSnapshot: function () {
    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }
    return {
      heroId: game.heroId,
      power: Number(game.heroPowerRaw || 0),
      precision: Number(game.heroPrecisionRaw || 0),
      endurance: Number(game.heroEnduranceRaw || 0)
    };
  },

  /* Stat effective à la profondeur courante : base - 2 par blessure de ce type, plancher 1
     (règle DESIGN_Scene_Engine_v1.md §4). */
  statEffective: function (run, statKey) {
    var base = run.heroSnapshot[statKey] || 0;
    var count = run.injuries.filter(function (k) { return k === statKey; }).length;
    return Math.max(1, base - 2 * count);
  },

  /* ---------- Démarrage ---------- */
  /* startRun(templateId) -> { ok, reason, run }. Génère la carte via SceneEngine.buildCard
     (les randomValues sont tirées ICI, une seule fois, avec Math.random — le moteur pur ne
     tire jamais lui-même). v3.122.0 (Lot S2a) : débite template.entryCost si déclaré
     (WarehouseManager, avant toute création de run — échec propre si insuffisant, comme
     ExplorationManager.startRun). Si template.loadoutSlots est 0/absent, saute l'étape
     "preparation" (aucun équipement à choisir pour une quête simple à 1 palier).
     v3.125.0 (Petites Aventures, Lot PA1) : si template.profileWeights est déclaré, la carte
     n'est PAS générée ici — le run démarre en status "profile" (choix Bourrin/Prudent avant
     préparation), la génération réelle se fait dans chooseProfile(). Vérifie aussi le cap
     journalier (voir canStartPetiteAventureToday) AVANT tout débit de ressource. */
  startRun: function (templateId) {
    this.ensureDefaults();

    if (this.isRunActive()) {
      return { ok: false, reason: "Une expédition est déjà en cours", run: null };
    }

    var template = SceneEngine.getTemplate(templateId);
    if (!template) return { ok: false, reason: "Expédition introuvable", run: null };

    if (this.isQuestCompleted(templateId)) {
      return { ok: false, reason: "Expédition déjà terminée", run: null };
    }

    var needsProfile = !!template.profileWeights;
    if (needsProfile && !this.canStartPetiteAventureToday()) {
      return { ok: false, reason: "Plus de petite aventure disponible aujourd'hui (revenir demain)", run: null };
    }

    if (template.entryCost) {
      var costResource = template.entryCost.resourceId;
      var costAmount = Number(template.entryCost.amount || 0);
      if (!window.WarehouseManager || typeof WarehouseManager.removeResource !== "function") {
        return { ok: false, reason: "Entrepôt indisponible", run: null };
      }
      if (WarehouseManager.getAmount(costResource) < costAmount) {
        var resDef = (window.WAREHOUSE_RESOURCES || {})[costResource];
        return { ok: false, reason: "Pas assez de " + ((resDef && resDef.name) || costResource), run: null };
      }
      var removed = WarehouseManager.removeResource(costResource, costAmount);
      if (!removed) return { ok: false, reason: "Échec du retrait des ressources", run: null };
    }

    var hasLoadout = Number(template.loadoutSlots || 0) > 0;
    var card = needsProfile ? [] : (function () {
      var randCount = SceneEngine.estimateRandomCount(template);
      var randomValues = [];
      for (var i = 0; i < randCount; i++) randomValues.push(Math.random());
      return SceneEngine.buildCard(template, randomValues);
    })();

    var run = {
      id: "scene_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      templateId: templateId,
      // profile -> preparation -> gate -> node -> completed (Petites Aventures)
      // preparation -> gate -> node -> completed (canevas sans profil, inchangé)
      status: needsProfile ? "profile" : (hasLoadout ? "preparation" : "gate"),
      profile: null, // "bourrin" | "prudent" — figé une fois choisi, jamais recalculé

      startedAt: Date.now(),
      heroSnapshot: this.buildHeroSnapshot(),

      card: card,
      depth: 0,

      loadout: [], // ids d'objets choisis en préparation (3 max, doublons permis)
      torchCharges: 0,
      ropeAvailable: false,
      amuletAvailable: false,

      injuries: [], // clés de stat ("power"/"precision"/"endurance"), cumulables
      loot: 0, // ressource lootResource, non banquée tant que SortieManager n'a pas end()

      currentGate: null, // index de porte sélectionnée en attente de résolution (idempotence)
      pendingNode: null, // { type, gabaritId?, optionKey?, readyAt? } — nœud en cours de résolution
      blockerReadyAt: null // v3.125.0 : timestamp de fin du bloqueur courant (nœud "bloqueur")
    };

    game.sceneRun = run;

    if (needsProfile) this._consumePetiteAventureSlot(); // consommé au lancement, pas au succès (même esprit que l'entryCost)
    if (window.SortieManager) SortieManager.start("scene");

    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, run: run };
  },

  /* v3.125.0 (Petites Aventures, Lot PA1) : choix du profil (Bourrin/Prudent), génère
     RÉELLEMENT la carte avec les poids du profil (SceneEngine.buildCard slotWeightsOverride).
     Concept §2 : le profil détermine la NATURE du parcours — décidé une fois, jamais recalculé
     ensuite (run.profile figé, comme heroSnapshot). */
  chooseProfile: function (profileId) {
    var run = this.getRun();
    if (!run || run.status !== "profile") return { ok: false, reason: "Aucun choix de profil en cours" };
    var template = SceneEngine.getTemplate(run.templateId);
    if (!template || !template.profileWeights) return { ok: false, reason: "Expédition introuvable" };
    var weights = template.profileWeights[profileId];
    if (!weights) return { ok: false, reason: "Profil invalide" };

    var randCount = SceneEngine.estimateRandomCount(template);
    var randomValues = [];
    for (var i = 0; i < randCount; i++) randomValues.push(Math.random());
    run.card = SceneEngine.buildCard(template, randomValues, weights);
    run.profile = profileId;

    var hasLoadout = Number(template.loadoutSlots || 0) > 0;
    run.status = hasLoadout ? "preparation" : "gate";

    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, run: run };
  },

  /* Valide l'équipement choisi en préparation (exactement loadoutSlots objets) et passe au
     premier palier. */
  confirmLoadout: function (itemIds) {
    var run = this.getRun();
    if (!run || run.status !== "preparation") return { ok: false, reason: "Aucune préparation en cours" };

    var template = SceneEngine.getTemplate(run.templateId);
    if (!template) return { ok: false, reason: "Expédition introuvable" };

    var slots = Number(template.loadoutSlots || 3);
    if (!Array.isArray(itemIds) || itemIds.length !== slots) {
      return { ok: false, reason: "Choisis exactement " + slots + " objets" };
    }
    var validIds = Object.keys(template.items || {});
    var allValid = itemIds.every(function (id) { return validIds.indexOf(id) !== -1; });
    if (!allValid) return { ok: false, reason: "Objet invalide" };

    run.loadout = itemIds.slice();
    run.torchCharges = itemIds.filter(function (id) { return id === "torche"; }).length > 0
      ? (template.items.torche.charges || 3) : 0;
    run.ropeAvailable = itemIds.indexOf("corde") !== -1;
    run.amuletAvailable = itemIds.indexOf("amulette") !== -1;
    run.status = "gate";

    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, run: run };
  },

  /* ---------- Palier courant ---------- */
  /* getCurrentLevel() -> tableau des portes du palier courant (run.card[run.depth]). */
  getCurrentLevel: function () {
    var run = this.getRun();
    if (!run) return [];
    return run.card[run.depth] || [];
  },

  /* Consomme une charge de torche (idempotent : ne descend jamais sous 0). Retourne true si
     une charge a été effectivement consommée pour CE palier (une seule fois par palier). */
  useTorchForLevel: function () {
    var run = this.getRun();
    if (!run || run.torchCharges <= 0) return false;
    if (run._torchUsedAtDepth === run.depth) return true; // déjà consommée pour ce palier
    run.torchCharges -= 1;
    run._torchUsedAtDepth = run.depth;
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  torchActiveThisLevel: function () {
    var run = this.getRun();
    return !!(run && run._torchUsedAtDepth === run.depth);
  },

  /* Révèle un nœud "mystere" au moment d'y entrer (tirage pur SceneEngine, randomValue ici). */
  _revealMystery: function (run, slot) {
    var types = ["obstacle", "autel", "decouverte", "source"];
    var picked = SceneEngine.pickFromArray(types, Math.random());
    slot.type = picked;
    if (picked === "obstacle") {
      var template = SceneEngine.getTemplate(run.templateId);
      slot.gabaritId = SceneEngine.pickFromArray(template.pools.obstacle, Math.random());
      var riskMin = (template.riskModRange && template.riskModRange[0]) || 0.6;
      var riskMax = (template.riskModRange && template.riskModRange[1]) || 1.6;
      slot.riskMod = riskMin + Math.random() * (riskMax - riskMin);
    }
    return slot;
  },

  /* enterGate(gateIndex) -> { ok, reason, node } — sélectionne une porte du palier courant,
     révèle le mystère si besoin, prépare le nœud à résoudre côté vue.
     v3.125.0 (Petites Aventures, Lot PA1) : un slot "bloqueur" démarre son minuteur ICI
     (run.blockerReadyAt = maintenant + slot.durationMs) — tourne en fond par construction
     (aucun setInterval/hook game-loop, juste un timestamp comparé à Date.now() à l'affichage,
     voir isBlockerReady()), cohérent avec la reco du concept ("carotte", pas un blocage strict
     d'écran). */
  enterGate: function (gateIndex) {
    var run = this.getRun();
    if (!run || run.status !== "gate") return { ok: false, reason: "Aucun palier à choisir" };
    var level = this.getCurrentLevel();
    var slot = level[gateIndex];
    if (!slot) return { ok: false, reason: "Porte invalide" };

    if (slot.type === "mystere") this._revealMystery(run, slot);

    run.currentGate = gateIndex;
    run.status = "node";
    run.pendingNode = { type: slot.type, gabaritId: slot.gabaritId || null, riskMod: slot.riskMod || null };

    if (slot.type === "bloqueur") {
      run.blockerReadyAt = Date.now() + Number(slot.durationMs || 300000);
    }

    if (typeof saveGame === "function") saveGame();

    // v3.126.0 (Lot PA2) : un slot combat démarre le combat immédiatement (pas d'écran
    // intermédiaire "engager le combat ?" — la porte EST le combat, cohérent avec le concept
    // "Bourrin : run qui se déroule activement"). enterCombatNode gère lui-même son propre
    // saveGame() et switchTab, appelé après le save ci-dessus pour ne pas perdre run.pendingNode
    // si jamais enterCombatNode échoue (groupe introuvable, etc.).
    if (slot.type === "combat") {
      var combatResult = this.enterCombatNode();
      if (!combatResult.ok) return combatResult;
    }

    return { ok: true, reason: null, node: run.pendingNode };
  },

  /* ---------- Nœud bloqueur (Prudent uniquement) ---------- */
  /* v3.125.0 : true si le minuteur du bloqueur courant est écoulé — pure lecture de
     timestamp, aucun état à faire évoluer (le temps réel fait le travail, offline compris :
     un joueur qui revient après 20 min voit le bloqueur déjà prêt, comme tout cooldown basé
     sur Date.now() ailleurs dans le jeu). */
  isBlockerReady: function () {
    var run = this.getRun();
    if (!run || !run.pendingNode || run.pendingNode.type !== "bloqueur") return false;
    return Date.now() >= Number(run.blockerReadyAt || 0);
  },

  blockerRemainingMs: function () {
    var run = this.getRun();
    if (!run || !run.blockerReadyAt) return 0;
    return Math.max(0, run.blockerReadyAt - Date.now());
  },

  /* resolveBloqueur() -> { ok, reason, gainAmount }. Refuse tant que le minuteur n'est pas
     écoulé (idempotence naturelle : le bouton de la vue n'est actionnable qu'une fois prêt,
     mais le garde est aussi côté manager — jamais confiance aveugle en la vue). Gain modeste,
     type "decouverte" (pas d'échec possible, contrairement à un obstacle — c'est une attente,
     pas un jet de stat, cohérent avec le concept "carotte" plutôt que risque). */
  resolveBloqueur: function () {
    var run = this.getRun();
    if (!run || run.status !== "node" || !run.pendingNode || run.pendingNode.type !== "bloqueur") {
      return { ok: false, reason: "Aucun bloqueur à résoudre" };
    }
    if (!this.isBlockerReady()) return { ok: false, reason: "L'attente n'est pas terminée" };

    var template = SceneEngine.getTemplate(run.templateId);
    var gainAmount = SceneEngine.rollLoot(template.lootRanges.decouverte, run.depth, Math.random());
    run.loot += gainAmount;
    this._creditLoot(template, gainAmount);

    run.pendingNode = null; run.currentGate = null; run.blockerReadyAt = null;
    this._advanceOrFinish(run);
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, gainAmount: gainAmount };
  },

  /* ---------- Résolution d'un obstacle (nœud "check") ---------- */
  /* getObstacleEstimate(optionKey) -> "low"|"medium"|"high", pour affichage AVANT résolution
     (jamais de % exact — convention du jeu). Applique le riskMod de la porte courante. */
  getObstacleEstimate: function (optionKey) {
    var run = this.getRun();
    if (!run || !run.pendingNode || run.pendingNode.type !== "obstacle") return "low";
    var gabarit = SceneEngine.getNodeBank().obstacles[run.pendingNode.gabaritId];
    var option = gabarit && gabarit.options[optionKey];
    if (!option) return "low";
    var statEff = this.statEffective(run, option.stat);
    return SceneEngine.estimateObstacle(gabarit, optionKey, statEff, run.depth, run.pendingNode.riskMod);
  },

  /* resolveObstacle(optionKey|"corde") -> { ok, reason, outcome, gainAmount }. Idempotent :
     refuse si le nœud courant n'est pas un obstacle en attente. randomValue tiré ici
     (une seule fois), jamais recalculé ensuite (même garde-fou que resolveEventChoice). */
  resolveObstacle: function (optionKey) {
    var run = this.getRun();
    if (!run || run.status !== "node" || !run.pendingNode || run.pendingNode.type !== "obstacle") {
      return { ok: false, reason: "Aucun obstacle à résoudre" };
    }
    var template = SceneEngine.getTemplate(run.templateId);
    var gabarit = SceneEngine.getNodeBank().obstacles[run.pendingNode.gabaritId];
    if (!gabarit) return { ok: false, reason: "Obstacle introuvable" };
    var riskMod = run.pendingNode.riskMod || 1;

    var isRope = (optionKey === "corde");
    if (isRope && !(run.ropeAvailable && gabarit.ropeOption)) {
      return { ok: false, reason: "Approche à la corde indisponible ici" };
    }

    var outcome, gainAmount;
    if (isRope) {
      // Corde : réussite garantie (85% dans le proto -> en v1 sandbox, garanti pour la
      // simplicité du premier jet ; nuance à trancher si le calibrage l'exige) mais gain réduit
      // — volontairement INDÉPENDANTE du riskMod de la porte (la corde neutralise le risque
      // qu'il soit haut ou bas, c'est tout son intérêt).
      outcome = "success";
      gainAmount = SceneEngine.rollLoot(template.lootRanges.obstacleRope, run.depth, Math.random());
      run.loot += gainAmount;
    } else {
      var option = gabarit.options[optionKey];
      if (!option) return { ok: false, reason: "Approche invalide" };
      var statEff = this.statEffective(run, option.stat);
      var randomValue = Math.random();
      var checkResult = SceneEngine.resolveObstacle(gabarit, optionKey, statEff, run.depth, randomValue, riskMod);

      // Amulette : relance automatique du premier échec du run.
      if (checkResult.result === "setback" && run.amuletAvailable) {
        run.amuletAvailable = false;
        checkResult = SceneEngine.resolveObstacle(gabarit, optionKey, statEff, run.depth, Math.random(), riskMod);
        run._amuletUsed = true;
      }

      if (checkResult.result === "setback") {
        outcome = "setback";
        var injury = option.stat;
        run.injuries.push(injury);
        gainAmount = SceneEngine.rollLoot(template.lootRanges.obstacleSetback, run.depth, Math.random(), riskMod);
        run.loot += gainAmount;
      } else {
        outcome = checkResult.result; // "success" | "perfect" traités identiquement côté gain v1
        gainAmount = SceneEngine.rollLoot(template.lootRanges.obstacleSuccess, run.depth, Math.random(), riskMod);
        if (checkResult.result === "perfect") gainAmount = Math.round(gainAmount * 1.2);
        run.loot += gainAmount;
      }
    }

    this._creditLoot(template, gainAmount);

    run.pendingNode = null;
    run.currentGate = null;

    // 3 blessures = évacuation immédiate (règle DESIGN_Scene_Engine_v1.md §4).
    if (run.injuries.length >= 3) {
      this._evacuate();
      if (typeof saveGame === "function") saveGame();
      return { ok: true, reason: null, outcome: "evacuation", gainAmount: gainAmount };
    }

    // v3.122.0 (Lot S2a) : template.unlockOnSuccess (bâtiment + flags de progression permanents)
    // est appliqué à la chambre finale (resolveFinale), pas ici — un échec sur un palier
    // intermédiaire fait perdre un peu de loot et continuer, comme l'expédition sandbox
    // (décision Seb : ces quêtes utilisent la même mécanique de push-your-luck).
    this._advanceOrFinish(run);
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, outcome: outcome, gainAmount: gainAmount };
  },

  /* ---------- Salles non-obstacle ---------- */
  /* resolveAutel(accept) -> soigne 1 blessure contre un pourcentage du loot courant. */
  resolveAutel: function (accept) {
    var run = this.getRun();
    if (!run || run.status !== "node" || !run.pendingNode || run.pendingNode.type !== "autel") {
      return { ok: false, reason: "Aucun autel à résoudre" };
    }
    var template = SceneEngine.getTemplate(run.templateId);
    if (accept && run.injuries.length > 0) {
      var cost = Math.max(5, Math.round(run.loot * (template.autelCostRatio || 0.2)));
      run.loot = Math.max(0, run.loot - cost);
      run.injuries.pop();
      // SortieManager.addGold()/addResource() ne supportent que des montants positifs
      // (clampés à 0) : un coût se traduit en resynchronisant directement la valeur exacte
      // (voir _debitLootTo), jamais par un delta négatif.
      this._debitLootTo(template, run.loot);
    }
    run.pendingNode = null; run.currentGate = null;
    this._advanceOrFinish(run);
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, run: run };
  },

  /* resolveDecouverte() -> loot ou objet trouvé, appliqué automatiquement (pas de choix joueur). */
  resolveDecouverte: function () {
    var run = this.getRun();
    if (!run || run.status !== "node" || !run.pendingNode || run.pendingNode.type !== "decouverte") {
      return { ok: false, reason: "Aucune découverte à résoudre" };
    }
    var template = SceneEngine.getTemplate(run.templateId);
    var gainAmount = SceneEngine.rollLoot(template.lootRanges.decouverte, run.depth, Math.random());
    run.loot += gainAmount;
    this._creditLoot(template, gainAmount);
    run.pendingNode = null; run.currentGate = null;
    this._advanceOrFinish(run);
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, gainAmount: gainAmount };
  },

  /* resolveSource() -> soin gratuit d'une blessure si présente. */
  resolveSource: function () {
    var run = this.getRun();
    if (!run || run.status !== "node" || !run.pendingNode || run.pendingNode.type !== "source") {
      return { ok: false, reason: "Aucune source à résoudre" };
    }
    var healed = false;
    if (run.injuries.length > 0) { run.injuries.pop(); healed = true; }
    run.pendingNode = null; run.currentGate = null;
    this._advanceOrFinish(run);
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, healed: healed };
  },

  /* Force game.sortie.loot.resources[key] à une valeur exacte (contournement du clamp positif
     d'addResource() pour les cas où le run doit RETIRER du loot déjà comptabilisé — coût
     d'autel, perte du coffre risqué). N'écrit jamais directement dans WarehouseManager/
     game.resources : seulement dans le bloc "loot en attente" de la sortie en cours. */
  _syncSortieResource: function (resourceKey, exactValue) {
    if (!window.SortieManager) return;
    var s = SortieManager.ensure();
    s.loot.resources[resourceKey] = Math.max(0, Math.floor(Number(exactValue) || 0));
  },

  /* v3.122.0 (Lot S2a) : applique le déblocage narratif d'une quête simple (bâtiment de
     production + flags de progression permanents), une seule fois au succès du jet unique.
     unlockSpec : { buildingId, unlockFlag, completionFlag } — même contrat que
     ExplorationManager.settle() (production-system.js + explorationProgression). */
  _applyUnlock: function (unlockSpec) {
    if (!unlockSpec) return;
    this.ensureDefaults();
    if (!game.explorationProgression) game.explorationProgression = {};
    if (unlockSpec.unlockFlag) game.explorationProgression[unlockSpec.unlockFlag] = true;
    if (unlockSpec.completionFlag) game.explorationProgression[unlockSpec.completionFlag] = true;
    if (unlockSpec.buildingId && window.ProductionManager && typeof ProductionManager.unlockBuilding === "function") {
      ProductionManager.unlockBuilding(unlockSpec.buildingId);
    }
  },

  /* ---------- Loot : or ou ressource, selon template.lootResource ---------- */
  /* v3.121.0 (recalibrage Seb) : lootResource === "gold" route vers SortieManager.addGold(),
     toute autre valeur route vers addResource() comme avant (Lot S2 : ressources liées à la
     quête migrée). Un seul point d'entrée pour ne pas dupliquer la branche partout. */
  _creditLoot: function (template, amount) {
    if (!window.SortieManager || amount === 0) return;
    if (template.lootResource === "gold") SortieManager.addGold(amount);
    else SortieManager.addResource(template.lootResource, amount);
  },

  /* Équivalent négatif de _creditLoot (contournement du clamp positif, voir
     _syncSortieResource ci-dessus) — force la valeur EXACTE du loot déjà comptabilisé. */
  _debitLootTo: function (template, exactValue) {
    if (!window.SortieManager) return;
    if (template.lootResource === "gold") {
      var s = SortieManager.ensure();
      s.loot.gold = Math.max(0, Math.floor(Number(exactValue) || 0));
    } else {
      this._syncSortieResource(template.lootResource, exactValue);
    }
  },

  /* ---------- Progression ---------- */
  _advanceOrFinish: function (run) {
    this._rollSeveAeswynPerNode(run); // v3.127.0 (Lot PA3) : chance faible à CHAQUE nœud résolu
    run.depth += 1;
    var template = SceneEngine.getTemplate(run.templateId);
    if (run.depth >= Number(template.depthMax || 1)) {
      run.status = "finale";
    } else {
      run.status = "gate";
    }
  },

  /* v3.127.0 (Petites Aventures, Lot PA3) : tirage Sève d'Aeswyn au passage de CHAQUE nœud
     (obstacle/autel/découverte/source/bloqueur/combat — tous passent par _advanceOrFinish,
     directement ou via onCombatWon). Silencieux si le template n'a pas de config seveAeswyn
     (canevas hors Petites Aventures, ex. expedition_faille) — n'affecte qu'un seul canevas
     par construction (lecture de template.seveAeswyn). Crédité via WarehouseManager
     DIRECTEMENT (pas SortieManager) : décision Seb — contrairement au loot chiffré principal
     (or/ressource de la quête), la Sève d'Aeswyn n'est PAS mise en jeu en cas de mort ou de
     fuite (c'est une trouvaille de collection, pas un butin de sortie ordinaire). Log discret,
     pas de popup pour ne pas alourdir un flux déjà chargé (obstacle/autel/etc. ont chacun
     leur propre feedback). */
  _rollSeveAeswynPerNode: function (run) {
    var template = SceneEngine.getTemplate(run.templateId);
    var cfg = template && template.seveAeswyn;
    if (!cfg || !run.profile) return;
    var chancePct = Number((cfg.perNodeChancePct && cfg.perNodeChancePct[run.profile]) || 0);
    if (chancePct <= 0 || Math.random() * 100 >= chancePct) return;
    var min = (cfg.perNodeAmount && cfg.perNodeAmount[0]) || 1;
    var max = (cfg.perNodeAmount && cfg.perNodeAmount[1]) || 1;
    var amount = min + Math.floor(Math.random() * (max - min + 1));
    this._creditSeveAeswyn(cfg.resourceId, amount);
  },

  /* Bonus garanti à la chambre finale (voir resolveFinale ci-dessous) — quel que soit le choix
     de coffre (sûr ou risqué), la Sève n'est jamais remise en jeu par le double-ou-rien. */
  _rollSeveAeswynFinale: function (run) {
    var template = SceneEngine.getTemplate(run.templateId);
    var cfg = template && template.seveAeswyn;
    if (!cfg || !run.profile) return;
    var amount = Number((cfg.finaleGuaranteedAmount && cfg.finaleGuaranteedAmount[run.profile]) || 0);
    if (amount > 0) this._creditSeveAeswyn(cfg.resourceId, amount);
  },

  _creditSeveAeswyn: function (resourceId, amount) {
    if (!window.WarehouseManager || typeof WarehouseManager.addResource !== "function" || amount <= 0) return;
    WarehouseManager.addResource(resourceId, amount);
    var resDef = (window.WAREHOUSE_RESOURCES || {})[resourceId];
    addLog("✨ Trouvaille : +" + amount + " " + ((resDef && resDef.name) || resourceId), "event");
  },

  /* leaveNow() -> rentre volontairement, banque via SortieManager("success") — voir décision
     Seb 03/09/2026 : un retour volontaire est traité comme une mission réussie (loot 100%,
     XP forfaitaire), la profondeur atteinte n'influence QUE le loot déjà accumulé, jamais l'XP. */
  leaveNow: function () {
    var run = this.getRun();
    if (!run || (run.status !== "gate" && run.status !== "preparation")) {
      return { ok: false, reason: "Impossible de rentrer maintenant" };
    }
    run.status = "completed";
    var summary = window.SortieManager ? SortieManager.end("success") : null;
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, summary: summary };
  },

  _evacuate: function () {
    var run = this.getRun();
    run.status = "completed";
    if (window.SortieManager) SortieManager.end("flee"); // 50% du loot, 0 XP (règle §4)
  },

  /* abandon() -> quitte l'expédition prématurément via la tab-bar/bouton retour (garde dans
     ui-root.js:switchTab). Même traitement que l'évacuation à 3 blessures : end("flee"),
     50% du loot conservé, 0 XP — cohérent avec "fuir" ailleurs dans le jeu (jamais de perte
     totale hors mort en combat). Idempotent : sans run actif, ne fait rien. */
  abandon: function () {
    var run = this.getRun();
    if (!run || run.status === "completed") return { ok: false, reason: "Aucune expédition en cours" };
    run.status = "completed";
    var summary = window.SortieManager ? SortieManager.end("flee") : null;
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, summary: summary };
  },

  /* ---------- Chambre finale ---------- */
  /* resolveFinale(choiceId: "sur"|"risque") -> banque via SortieManager("success"). */
  resolveFinale: function (choiceId) {
    var run = this.getRun();
    if (!run || run.status !== "finale") return { ok: false, reason: "Chambre finale non atteinte" };
    var template = SceneEngine.getTemplate(run.templateId);

    if (choiceId === "sur") {
      run.loot += template.lootRanges.finalSafe[0];
      this._creditLoot(template, template.lootRanges.finalSafe[0]);
    } else if (choiceId === "risque") {
      var win = Math.random() < 0.5;
      if (win) {
        var gain = run.loot; // double : on ajoute l'équivalent du loot actuel (delta positif, OK)
        run.loot *= 2;
        this._creditLoot(template, gain);
      } else {
        run.loot = Math.ceil(run.loot / 2); // perte : delta négatif -> resynchronisation directe
        this._debitLootTo(template, run.loot);
      }
    } else {
      return { ok: false, reason: "Choix invalide" };
    }

    // v3.122.0 (Lot S2a) : déblocage narratif permanent (bâtiment + flags), une seule fois,
    // au moment où la chambre finale est effectivement résolue (le run va jusqu'au bout).
    if (template.unlockOnSuccess) this._applyUnlock(template.unlockOnSuccess);

    // v3.127.0 (Lot PA3) : bonus Sève d'Aeswyn garanti à la finale, quel que soit le choix de
    // coffre — AVANT le SortieManager.end("success") ci-dessous (déjà créditée directement via
    // WarehouseManager, pas affectée par le double-ou-rien ni par le "success" de la sortie).
    this._rollSeveAeswynFinale(run);

    run.status = "completed";
    var summary = window.SortieManager ? SortieManager.end("success") : null;
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, summary: summary };
  },

  /* Nettoie le run terminé (après affichage du bilan). */
  clearRun: function () {
    game.sceneRun = null;
    if (typeof saveGame === "function") saveGame();
  },

  /* ---------- Nœud combat (profil Bourrin, v3.126.0, Lot PA2) ---------- */
  /* v3.126.0 : le nœud combat charge un VRAI combat CombatEngine (décision Seb, confirmée
     avant ce lot) — contrairement au reste du scene-engine qui reste pur (jamais de
     CombatEngine, jamais game.resources directement). Le run scene-engine est mis en PAUSE
     (status "combat") pendant que le combat se déroule sur l'onglet Combat ; le gold/essence
     du kill est automatiquement routé vers SortieManager par CombatEngine.grantGold/grantEssence
     (inSortie() vrai, contexte "scene" déjà actif) — aucune gestion de butin spécifique ici.
     v3.130.0 (retour Seb 03/09/2026, "les combats sont trop courts") : un nœud combat n'est
     plus un ennemi unique mais une VAGUE de plusieurs ennemis — même pattern que
     DungeonManager.onEnemyKilled()/spawnWave() (compteur de kills, respawn tant que la cible
     n'est pas atteinte). Un point de choix "combat" reste un seul événement à l'échelle du
     parcours (le concept parle de "points", pas de vagues), mais représente désormais une
     vraie rencontre substantielle plutôt qu'un kill isolé. Décision Seb : run plus long
     assumé, plusieurs points combat restent possibles sur un même parcours (aucun changement
     de profileWeights). Cible aléatoire 6-10 par vague, tirée UNE FOIS à l'entrée du nœud
     (run._combatWaveTarget), jamais recalculée en cours de vague. */

  /* Vrai si AUCUN autre slot "combat" n'existe dans les paliers RESTANTS du run (après le
     palier courant) — sert à savoir si le nœud combat en cours doit culminer sur le boss de
     l'aventure plutôt qu'une vague normale (décision Seb : boss seulement au tout dernier
     point combat du parcours complet, pas à chaque rencontre). run.card est entièrement
     généré à l'avance par chooseProfile() : un simple scan des paliers futurs suffit, pas
     besoin de recalculer quoi que ce soit dynamiquement. */
  _isLastCombatNodeOfRun: function (run) {
    if (!run || !run.card) return true;
    for (var d = run.depth + 1; d < run.card.length; d++) {
      var level = run.card[d] || [];
      for (var i = 0; i < level.length; i++) {
        if (level[i] && level[i].type === "combat") return false;
      }
    }
    return true;
  },

  /* enterCombatNode() -> { ok, reason }. Appelé côté vue à l'entrée sur un slot "combat"
     (voir enterGate ci-dessus, révélé comme les autres types). Spawn l'ennemi via
     QuestEnemyManager.spawnFor() avec le groupe du gabarit (SCENE_NODES.combatGroups),
     bascule vers l'onglet combat — même schéma que AdventureQuestManager.start().
     v3.129.0 (correctif Seb 03/09/2026) : BUG corrigé — la pseudo-quête pointait en dur sur
     worldId "forest"/adventureIndex 0, quel que soit le monde RÉEL où se trouve le joueur
     (WorldManager.worldIndex/adventureIndex). Un joueur avancé (plusieurs cycles, mondes
     ultérieurs) recevait donc un ennemi calibré sur le tout début du jeu — largement en
     dessous de ses dégâts par coup, le combat se résolvait en un seul tap avant que le
     joueur ait le temps de réagir. Corrigé : le monde/l'aventure suivent désormais la
     progression réelle (WorldManager), comme le farm libre. enemyFilter (thématique
     "gobelins/loups/araignées" du gabarit) n'est conservé QUE si au moins un des ids filtrés
     existe dans le pool du monde courant (QuestEnemyManager.spawnFor le vérifie déjà côté
     ENEMY_DB, mais pas côté pool réel du monde) — sinon abandonné pour laisser sortir un
     ennemi normal du monde où le joueur se trouve, plutôt que de forcer un ennemi de forêt
     hors-thème dans un désert/donjon avancé.
     v3.130.0 : initialise la vague (run._combatWaveTarget, run._combatWaveKills) — le premier
     ennemi de la vague est toujours un ennemi normal (jamais le boss, même sur le dernier
     nœud combat du run — le boss n'apparaît qu'au DERNIER kill de la vague, voir
     _spawnNextCombatEnemy). */
  enterCombatNode: function () {
    var run = this.getRun();
    if (!run || run.status !== "node" || !run.pendingNode || run.pendingNode.type !== "combat") {
      return { ok: false, reason: "Aucun combat à engager" };
    }
    var group = SceneEngine.getNodeBank().combatGroups && SceneEngine.getNodeBank().combatGroups[run.pendingNode.gabaritId];
    if (!group || !window.QuestEnemyManager || !window.WorldManager || !window.WORLDS) return { ok: false, reason: "Groupe d'ennemis introuvable" };

    run._combatGroupId = run.pendingNode.gabaritId;
    // v3.132.0 : taille de vague lue sur le canevas (template.combatWaveRange, défaut 6-10 historique) —
    // Petite Aventure calibrée à 4-6 (audit Forêt, sim Monte-Carlo : 12 + boss = pire cas jouable).
    var template = SceneEngine.getTemplate(run.templateId);
    var wr = (template && template.combatWaveRange) || [6, 10];
    run._combatWaveTarget = wr[0] + Math.floor(Math.random() * (wr[1] - wr[0] + 1));
    run._combatWaveKills = 0;
    run._combatIsFinalWave = this._isLastCombatNodeOfRun(run);

    var spawned = this._spawnNextCombatEnemy(run, false);
    if (!spawned) return { ok: false, reason: "Impossible de générer l'ennemi" };

    run.status = "combat"; // en pause sur le scene-engine tant que le combat n'est pas résolu
    if (typeof switchTab === "function") switchTab("combat");

    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null };
  },

  /* Génère l'ennemi suivant de la vague en cours (ou le boss, si forceBoss). Point commun à
     enterCombatNode() (premier ennemi) et onCombatWon() (ennemis suivants + transition boss). */
  _spawnNextCombatEnemy: function (run, forceBoss) {
    var group = SceneEngine.getNodeBank().combatGroups && SceneEngine.getNodeBank().combatGroups[run._combatGroupId];
    if (!group) return false;

    var currentWorld = WORLDS[WorldManager.worldIndex] || WORLDS[0];
    var currentAdventure = (currentWorld.adventures && currentWorld.adventures[WorldManager.adventureIndex]) || (currentWorld.adventures && currentWorld.adventures[0]);
    var enemyPool = (currentAdventure && currentAdventure.enemyPool) || [];
    var filterMatchesCurrentWorld = Array.isArray(group.enemyFilter) && group.enemyFilter.some(function (id) { return enemyPool.indexOf(id) !== -1; });

    var pseudoQuest = {
      worldId: currentWorld.id,
      adventureIndex: WorldManager.adventureIndex,
      enemyFilter: filterMatchesCurrentWorld ? group.enemyFilter : undefined
    };
    var enemy = QuestEnemyManager.spawnFor(pseudoQuest, !!forceBoss);
    if (!enemy) return false;

    game.enemy = enemy;
    if (window.CombatEngine && typeof CombatEngine.prepareEnemy === "function") CombatEngine.prepareEnemy(enemy);
    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
    return true;
  },

  /* onCombatWon() -> appelé par combat-engine.js:killEnemy() (dispatch game.sceneRun.status
     === "combat"). Le kill a déjà crédité gold/essence via SortieManager (voir note ci-dessus).
     v3.130.0 : la vague continue tant que run._combatWaveKills < run._combatWaveTarget — le
     run scene-engine ne reprend sa progression (_advanceOrFinish) qu'une fois la vague
     entièrement nettoyée. Sur le DERNIER point combat du run (run._combatIsFinalWave), le
     kill qui termine la vague fait apparaître le boss de l'aventure à la place de continuer
     le run — un kill de boss réel derrière déclenche à nouveau ce même dispatch, on distingue
     donc le boss vaincu (run._combatBossSpawned) pour ne pas relancer indéfiniment. */
  onCombatWon: function () {
    var run = this.getRun();
    if (!run || run.status !== "combat") return;

    if (run._combatBossSpawned) {
      // Le boss vient d'être vaincu : fin de la vague finale, run continue normalement.
      run._combatBossSpawned = false;
      run._combatGroupId = null; run._combatWaveTarget = 0; run._combatWaveKills = 0; run._combatIsFinalWave = false;
      run.pendingNode = null; run.currentGate = null;
      this._advanceOrFinish(run);
      if (typeof switchTab === "function") switchTab("scene");
      if (typeof saveGame === "function") saveGame();
      return;
    }

    run._combatWaveKills = Number(run._combatWaveKills || 0) + 1;

    if (run._combatWaveKills < Number(run._combatWaveTarget || 1)) {
      this._spawnNextCombatEnemy(run, false); // vague pas terminée : ennemi suivant
      if (typeof saveGame === "function") saveGame();
      return;
    }

    if (run._combatIsFinalWave) {
      // Dernier kill de la dernière vague du run : le boss de l'aventure apparaît.
      run._combatBossSpawned = true;
      addLog("👑 Le calme après la tempête... une présence bien plus dangereuse approche.", "event");
      this._spawnNextCombatEnemy(run, true);
      if (typeof saveGame === "function") saveGame();
      return;
    }

    // Vague normale terminée (pas la dernière du run) : reprend la progression du parcours.
    run._combatGroupId = null; run._combatWaveTarget = 0; run._combatWaveKills = 0; run._combatIsFinalWave = false;
    run.pendingNode = null; run.currentGate = null;
    this._advanceOrFinish(run);
    if (typeof switchTab === "function") switchTab("scene");
    if (typeof saveGame === "function") saveGame();
  },

  /* onCombatDefeat() -> appelé par combat-engine.js:onHeroDefeated() (même dispatch). Mort en
     combat de Petite Aventure = perte totale (décision Seb confirmée avant le lot) —
     SortieManager.end("death") déjà exécuté par l'appelant avant ce dispatch (règle universelle
     de combat-engine.js). Termine le run proprement, même traitement PV/retour Campement que
     AdventureQuestManager.onDefeat()/DungeonManager.onDefeat() (Sang-froid, justDied). */
  onCombatDefeat: function () {
    var run = this.getRun();
    if (!run) return;
    var keptPct = (game.talents && game.talents.t_essence_bloom) ? game.talents.t_essence_bloom * 0.10 : 0;
    game.heroHp = Math.floor((game.heroMaxHp || 1) * keptPct);
    addLog("💀 Petite aventure interrompue — le butin de ce parcours est perdu. Retour au Campement.", "event");
    vibrate([80, 40, 80]);

    run.status = "completed";
    game.justDied = true;
    if (typeof switchTab === "function") switchTab("campement");
    if (typeof saveGame === "function") saveGame();
  }
};

window.SceneRunManager = SceneRunManager;
