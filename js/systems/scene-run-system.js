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
     "preparation" (aucun équipement à choisir pour une quête simple à 1 palier). */
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

    var randCount = SceneEngine.estimateRandomCount(template);
    var randomValues = [];
    for (var i = 0; i < randCount; i++) randomValues.push(Math.random());
    var card = SceneEngine.buildCard(template, randomValues);

    var hasLoadout = Number(template.loadoutSlots || 0) > 0;

    var run = {
      id: "scene_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      templateId: templateId,
      status: hasLoadout ? "preparation" : "gate", // preparation -> gate -> node -> completed

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
      pendingNode: null // { type, gabaritId?, optionKey? } — nœud en cours de résolution
    };

    game.sceneRun = run;

    if (window.SortieManager) SortieManager.start("scene");

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
     révèle le mystère si besoin, prépare le nœud à résoudre côté vue. */
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

    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, node: run.pendingNode };
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
    run.depth += 1;
    var template = SceneEngine.getTemplate(run.templateId);
    if (run.depth >= Number(template.depthMax || 1)) {
      run.status = "finale";
    } else {
      run.status = "gate";
    }
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

    run.status = "completed";
    var summary = window.SortieManager ? SortieManager.end("success") : null;
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, summary: summary };
  },

  /* Nettoie le run terminé (après affichage du bilan). */
  clearRun: function () {
    game.sceneRun = null;
    if (typeof saveGame === "function") saveGame();
  }
};

window.SceneRunManager = SceneRunManager;
