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
    var run = game.sceneRun;
    if (run) this._migrateRun(run);
    return run;
  },

  /* v3.198.0 : reprise d'un run demarre sous une version anterieure (le run entier est
     persiste tel quel par save-system.js, aucune migration n'y est faite). Corde et
     provisions passent d'un booleen de disponibilite a un compteur de charges ; sans ce
     repli, un run en cours au moment de la mise a jour perdrait sa corde. Idempotent. */
  _migrateRun: function (run) {
    if (run.ropeCharges == null) run.ropeCharges = run.ropeAvailable ? 1 : 0;
    if (run.provisionCharges == null) run.provisionCharges = 0;
  },

  /* getMaxInjuries(templateId) -> nombre de blessures qui declenche l'evacuation. Defaut 3
     (regle DESIGN_Scene_Engine_v1.md §4, conservee pour expedition_faille et les quetes de
     deblocage migrees) ; la Petite Aventure declare 2 depuis v3.198.0. */
  getMaxInjuries: function (templateId) {
    var template = SceneEngine.getTemplate(templateId);
    return Math.max(1, Number((template && template.maxInjuries) || 3));
  },

  /* v3.198.0 : multiplicateur de difficulte indexe sur le developpement du heros
     (template.heroScaling, absent = 1). Indexe sur le BONUS DE CHANCE reellement gagne
     (min(55, stat*0.40), meme plafond que SceneCheckSystem.successChance) et NON sur la stat
     brute : celle-ci continue de monter apres que le bonus a plafonne, ce qui creusait un
     trou de difficulte au stade intermediaire. Calcule sur run.heroSnapshot (fige au depart
     du run) : un entrainement en cours de run ne change pas la carte deja engagee. */
  heroScale: function (run) {
    var template = SceneEngine.getTemplate(run && run.templateId);
    var cfg = template && template.heroScaling;
    if (!cfg || !run || !run.heroSnapshot) return 1;
    var keys = ["power", "precision", "endurance"];
    var sum = 0;
    for (var i = 0; i < keys.length; i++) {
      sum += Math.min(55, Number(run.heroSnapshot[keys[i]] || 0) * 0.40);
    }
    var avgBonus = sum / keys.length;
    var scale = 1 + Number(cfg.coef || 0) * Math.max(0, (avgBonus - Number(cfg.ref || 0)) / 10);
    return Math.max(1, Math.min(Number(cfg.max || 99), scale));
  },

  /* v3.198.0 : retire UNE blessure du run selon une regle de ciblage.
     "legere" -> la premiere blessure legere uniquement (autel, source : ils n'effacent plus
     une erreur grave) ; "grave" -> la plus severe (provisions, seule reponse a un echec en
     voie de puissance). Retourne la blessure retiree, ou null si aucune ne correspond. */
  _healOneInjury: function (run, mode) {
    if (!run || !run.injuries || !run.injuries.length) return null;
    var idx = -1;
    if (mode === "grave") {
      var rank = { grave: 3, normale: 2, legere: 1 };
      var best = 0;
      for (var i = 0; i < run.injuries.length; i++) {
        var r = rank[run.injuries[i].severity] || 1;
        if (r > best) { best = r; idx = i; }
      }
    } else {
      for (var j = 0; j < run.injuries.length; j++) {
        if (run.injuries[j].severity === "legere") { idx = j; break; }
      }
    }
    if (idx < 0) return null;
    return run.injuries.splice(idx, 1)[0];
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

  /* Stat effective à la profondeur courante : base - malus cumulé des blessures de CE type,
     plancher 1. v3.195.0 (recalibrage "les blessures ne se sentent pas") : remplace l'ancien
     malus fixe -2/blessure (invisible, ~0.4% de chance) par un malus dépendant de la sévérité
     de chaque blessure (run.injuries contient désormais des objets {stat, severity}, pas de
     simples clés de stat — voir resolveObstacle ci-dessous et SCENE_NODES.injurySeverityMalus,
     data/scene-nodes.js : légère -4, normale -8, grave -12). Une blessure grave (issue d'un
     échec en voie de puissance) pèse donc 3x plus qu'une légère, cohérent avec le risque pris. */
  statEffective: function (run, statKey) {
    var base = run.heroSnapshot[statKey] || 0;
    var bank = SceneEngine.getNodeBank();
    var malus = run.injuries.filter(function (inj) {
      return (inj && inj.stat) === statKey;
    }).reduce(function (sum, inj) {
      return sum + Number((bank.injurySeverityMalus && bank.injurySeverityMalus[inj.severity]) || 4);
    }, 0);
    var effective = Math.max(1, base - malus);
    // v3.196.0 (mutateur "Pluie battante") : +15% sur l'Endurance effective SEULEMENT —
    // appliqué après le malus de blessure, jamais avant (la pluie renforce la stat de base,
    // elle ne rend pas une blessure moins grave).
    var mutator = this.getActiveMutator();
    if (statKey === "endurance" && mutator.enduranceStatMult) {
      effective = Math.round(effective * mutator.enduranceStatMult);
    }
    return effective;
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
      gourdeAvailable: false, // v3.195.0

      injuries: [], // v3.195.0 : {stat, severity} cumulables (avant : simples clés de stat)
      ropeCharges: 0, // v3.198.0 : usages de corde restants (etait un booleen illimite)
      provisionCharges: 0, // v3.198.0 : provisions restantes (objet enfin actif)
      breath: 100, // v3.195.0 : ressource de run visible, 0-100, consommée par les options
                    // d'obstacle (voir SCENE_NODES.optionProfiles), restaurée par
                    // autel/source/gourde (voir resolveAutel/resolveSource/useSceneGourde)
      intensity: null, // v3.195.0 : "sentier"|"chemin"|"periple" — figé au choix, comme profile
      mutator: null, // v3.196.0 : "aucun"|"brouillard"|"pluie"|"nuit" — figé au tirage (chooseIntensity)
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
  /* v3.143.0 (variance des runs, audit Forêt) : garantit AU MOINS 1 palier combat pour le
     profil BOURRIN spécifiquement (pas "tout profil avec un poids combat > 0" — Prudent a un
     poids combat de 4 % non nul mais volontairement rare, pas garanti ; forcer un combat sur
     Prudent aurait dérivé sa promesse "peu/pas de combat"). Sim 3000 runs : sans cette
     garantie, 6.7 % des runs Bourrin n'avaient AUCUN combat, contredisant la promesse du
     profil ("run qui se déroule activement"). Convertit un palier tiré au hasard PARMI CEUX
     QUI NE SONT PAS le palier 0 (respecte firstDepthType, toujours lisible) — écrase le type
     qui y était, cohérent avec le principe déjà en place de maxSlotsPerRun (un slot peut
     retomber à un autre type que celui tiré). */
  _ensureMinCombat: function (run, template, profileId) {
    if (profileId !== "bourrin") return;
    if (!template.pools || !template.pools.combat || !template.pools.combat.length) return;
    var hasCombat = run.card.some(function (level) {
      return level.some(function (slot) { return slot.type === "combat"; });
    });
    if (hasCombat) return;

    var eligibleDepths = [];
    for (var d = 1; d < run.card.length; d++) eligibleDepths.push(d); // jamais le palier 0 (firstDepthType)
    if (!eligibleDepths.length) return;
    var pickedDepth = eligibleDepths[Math.floor(Math.random() * eligibleDepths.length)];
    var pickedGate = Math.floor(Math.random() * run.card[pickedDepth].length);
    var gabaritId = template.pools.combat[Math.floor(Math.random() * template.pools.combat.length)];
    run.card[pickedDepth][pickedGate] = { type: "combat", gabaritId: gabaritId };
  },

  /* v3.195.0 : chooseProfile ne génère plus la carte immédiatement — decoupé en deux étapes
     (profile -> intensity -> preparation/gate) car depthMax dépend désormais de l'intensité
     choisie (SCENE_INTENSITY, data/scene-templates.js), pas seulement du template. Le profil
     reste figé ici comme avant (run.profile), juste le statut suivant change. Canevas SANS
     window.SCENE_INTENSITY ou sans intensité pertinente (aucun aujourd'hui hors Petite
     Aventure, mais garde générique) : saute directement à l'ancien comportement. */
  chooseProfile: function (profileId) {
    var run = this.getRun();
    if (!run || run.status !== "profile") return { ok: false, reason: "Aucun choix de profil en cours" };
    var template = SceneEngine.getTemplate(run.templateId);
    if (!template || !template.profileWeights) return { ok: false, reason: "Expédition introuvable" };
    var weights = template.profileWeights[profileId];
    if (!weights) return { ok: false, reason: "Profil invalide" };

    run.profile = profileId;
    run._pendingProfileWeights = weights; // consommé par chooseIntensity, jamais persisté au-delà

    run.status = window.SCENE_INTENSITY ? "intensity" : "preparation";
    if (!window.SCENE_INTENSITY) this._generateCard(run, template, weights); // repli ancien flow

    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, run: run };
  },

  /* v3.195.0 : choix du curseur d'intensité ("sentier"|"chemin"|"periple", SCENE_INTENSITY) —
     ORTHOGONAL au profil Bourrin/Prudent (décision Seb : profil = nature du parcours,
     intensité = ampleur du risque/gain). Génère RÉELLEMENT la carte ici (depthMax dépend de
     l'intensité), avec les poids du profil déjà choisi (run._pendingProfileWeights). Figé
     comme profile, jamais recalculé ensuite. */
  chooseIntensity: function (intensityId) {
    var run = this.getRun();
    if (!run || run.status !== "intensity") return { ok: false, reason: "Aucun choix d'intensité en cours" };
    var intensity = window.SCENE_INTENSITY && window.SCENE_INTENSITY[intensityId];
    if (!intensity) return { ok: false, reason: "Intensité invalide" };
    var template = SceneEngine.getTemplate(run.templateId);
    if (!template) return { ok: false, reason: "Expédition introuvable" };

    run.intensity = intensityId;
    run.mutator = this._rollMutator(); // v3.196.0 : tiré ici, AVANT _generateCard (Nuit noire
                                        // influence la génération de carte elle-même)
    this._generateCard(run, template, run._pendingProfileWeights, intensity.depthMax);
    delete run._pendingProfileWeights;

    // v3.196.0 : écran d'annonce si un mutateur actif (pas "aucun") — court-circuite le statut
    // posé par _generateCard (preparation/gate), restauré par acknowledgeMutator() ci-dessous.
    // Toujours affiché (même "aucun", pour cohérence de rythme) sauf si SCENE_MUTATORS absent.
    if (window.SCENE_MUTATORS) {
      run._statusAfterMutator = run.status;
      run.status = "mutator-announce";
    }

    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, run: run };
  },

  /* v3.196.0 : accusé de lecture de l'écran d'annonce du mutateur — restaure le statut que
     _generateCard avait posé (preparation ou gate selon loadoutSlots), jamais recalculé. */
  acknowledgeMutator: function () {
    var run = this.getRun();
    if (!run || run.status !== "mutator-announce") return { ok: false, reason: "Aucune annonce en cours" };
    run.status = run._statusAfterMutator || "gate";
    delete run._statusAfterMutator;
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, run: run };
  },

  /* v3.196.0 (lot C2, mutateurs de run) : tirage pondéré sur SCENE_MUTATORS (poids égaux,
     20% chacun avec "aucun" inclus — décision Seb). Repli "aucun" si SCENE_MUTATORS absent
     (canevas hors Petite Aventure, comportement inchangé). */
  _rollMutator: function () {
    if (!window.SCENE_MUTATORS) return "aucun";
    var entries = Object.keys(window.SCENE_MUTATORS).map(function (k) { return window.SCENE_MUTATORS[k]; });
    var totalWeight = entries.reduce(function (sum, m) { return sum + Number(m.weight || 0); }, 0);
    var roll = Math.random() * totalWeight;
    var acc = 0;
    for (var i = 0; i < entries.length; i++) {
      acc += Number(entries[i].weight || 0);
      if (roll < acc) return entries[i].id;
    }
    return "aucun";
  },

  /* v3.196.0 : mutateur actif du run courant (objet complet, ou l'entrée "aucun" par défaut
     — jamais null, pour que les lectures des consommateurs n'aient pas à re-tester l'absence). */
  getActiveMutator: function () {
    var run = this.getRun();
    var id = (run && run.mutator) || "aucun";
    return (window.SCENE_MUTATORS && window.SCENE_MUTATORS[id]) || { id: "aucun" };
  },

  /* Génère la carte réelle et avance au statut suivant (preparation ou gate) — factorisé car
     appelé depuis chooseIntensity (flow normal) ET chooseProfile (repli si SCENE_INTENSITY
     absent, canevas hors Petite Aventure). depthMaxOverride facultatif : sinon template.depthMax. */
  _generateCard: function (run, template, profileWeights, depthMaxOverride) {
    var effectiveTemplate = template;
    if (depthMaxOverride) {
      // Ne mute jamais l'objet SCENE_TEMPLATES partagé : clone léger avec depthMax substitué.
      effectiveTemplate = Object.assign ? Object.assign({}, template, { depthMax: depthMaxOverride })
        : (function () { var c = {}; for (var k in template) c[k] = template[k]; c.depthMax = depthMaxOverride; return c; })();
    }
    var randCount = SceneEngine.estimateRandomCount(effectiveTemplate);
    var randomValues = [];
    for (var i = 0; i < randCount; i++) randomValues.push(Math.random());
    run.card = SceneEngine.buildCard(effectiveTemplate, randomValues, profileWeights);
    if (profileWeights) this._ensureMinCombat(run, template, run.profile);
    if (profileWeights) this._applyMutatorToCard(run, template); // v3.196.0

    var hasLoadout = Number(template.loadoutSlots || 0) > 0;
    run.status = hasLoadout ? "preparation" : "gate";
  },

  /* v3.196.0 (lot C2, mutateur "Nuit noire") : ajoute UN nœud danger supplémentaire — combat
     pour Bourrin (même pool que _ensureMinCombat), bloqueur pour Prudent (le "carrot" habituel
     de ce profil). Appelé APRÈS _ensureMinCombat pour ne jamais interférer avec sa garantie
     plancher/plafond déjà validée (session lot v3.195.0). Ne remplace jamais le palier 0
     (firstDepthType), même règle que _ensureMinCombat. Silencieux si le mutateur actif n'est
     pas "nuit" ou si aucun palier éligible. */
  _applyMutatorToCard: function (run, template) {
    var mutator = this.getActiveMutator();
    if (!mutator.extraDangerNode || !run.card.length) return;

    var eligibleDepths = [];
    for (var d = 1; d < run.card.length; d++) eligibleDepths.push(d);
    if (!eligibleDepths.length) return;

    // Respecte le plafond déjà validé (template.maxSlotsPerRun, lot v3.195.0/v3.143.0) — un
    // mutateur ne doit jamais faire dépasser la garantie ≤2 combat(s)/≤2 bloqueur(s) testée
    // au harness. Si le plafond est déjà atteint, le mutateur n'ajoute simplement rien ce run.
    var maxSlots = template.maxSlotsPerRun || {};
    var targetType = (run.profile === "bourrin") ? "combat" : "bloqueur";
    var cap = Number(maxSlots[targetType] || 99);
    var current = 0;
    run.card.forEach(function (level) {
      level.forEach(function (slot) { if (slot.type === targetType) current++; });
    });
    if (current >= cap) return;

    var pickedDepth = eligibleDepths[Math.floor(Math.random() * eligibleDepths.length)];
    var pickedGate = Math.floor(Math.random() * run.card[pickedDepth].length);

    if (run.profile === "bourrin" && template.pools && template.pools.combat && template.pools.combat.length) {
      var gabaritId = template.pools.combat[Math.floor(Math.random() * template.pools.combat.length)];
      run.card[pickedDepth][pickedGate] = { type: "combat", gabaritId: gabaritId };
    } else if (run.profile === "prudent") {
      // Même tirage que SceneEngine.buildCard pour un bloqueur naturel (template.
      // blockerDurationRange), pour ne jamais désynchroniser la durée de ce bloqueur
      // "manuel" de celle d'un bloqueur généré normalement par le tirage pondéré.
      var durMin = (template.blockerDurationRange && template.blockerDurationRange[0]) || 300000;
      var durMax = (template.blockerDurationRange && template.blockerDurationRange[1]) || 600000;
      run.card[pickedDepth][pickedGate] = { type: "bloqueur", durationMs: Math.round(durMin + Math.random() * (durMax - durMin)) };
    }
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
    // v3.198.0 : corde et provisions deviennent des charges consommables (1 par exemplaire
    // embarque) au lieu d'un simple flag de disponibilite. ropeAvailable est conserve en
    // miroir pour ne rien casser dans la vue et dans les sauvegardes existantes.
    run.ropeCharges = itemIds.filter(function (id) { return id === "corde"; }).length;
    run.ropeAvailable = run.ropeCharges > 0;
    run.provisionCharges = itemIds.filter(function (id) { return id === "provisions"; }).length;
    run.amuletAvailable = itemIds.indexOf("amulette") !== -1;
    run.gourdeAvailable = itemIds.indexOf("gourde") !== -1; // v3.195.0
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

  /* v3.196.0 (lot C2, mutateur "Brouillard") : centralise le calcul d'horizon de visibilité,
     auparavant dupliqué à 2 endroits dans scene-view.js (buildScenePathHTML/
     buildSceneProgressHTML, même formule run.depth + (torche ? 2 : 1)). Brouillard force
     l'horizon à 0 (jamais d'aperçu du palier suivant), MÊME avec la torche active — cohérent
     avec le flavor ("tu avances à l'aveugle") : la torche perd son usage habituel ce run-là,
     mais reste utilisable pour ses autres effets éventuels (aucun actuellement). */
  getVisibilityHorizon: function () {
    var run = this.getRun();
    if (!run) return 0;
    var mutator = this.getActiveMutator();
    if (typeof mutator.horizonOverride === "number") {
      return run.depth + mutator.horizonOverride;
    }
    var torchOn = this.torchActiveThisLevel();
    return run.depth + (torchOn ? 2 : 1);
  },

  GOURDE_BREATH_AMOUNT: 30, // cohérent avec l'item Gourde (data/scene-templates.js)

  /* useSceneGourde() -> { ok, reason }. Utilisable à tout moment (pas seulement en attente
     de nœud, décision Seb : "à utiliser quand tu veux" — desc de l'item), réutilisable comme
     la corde (pas de charges consommées, juste un flag de disponibilité). Restaure du Souffle
     jusqu'au plafond 100, jamais au-delà. */
  useSceneGourde: function () {
    var run = this.getRun();
    if (!run || !run.gourdeAvailable) return { ok: false, reason: "Gourde indisponible" };
    if (Number(run.breath || 0) >= 100) return { ok: false, reason: "Souffle déjà au maximum" };
    run.breath = Math.min(100, Number(run.breath || 0) + this.GOURDE_BREATH_AMOUNT);
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null };
  },

  /* v3.198.0 : vrai si un soin d'autel/source aurait un effet ici (au moins une blessure
     legere). La vue s'en sert pour ne pas proposer une offrande qui ne rendrait rien. */
  canHealHere: function (run) {
    if (!run || !run.injuries) return false;
    for (var i = 0; i < run.injuries.length; i++) {
      if (run.injuries[i].severity === "legere") return true;
    }
    return false;
  },

  /* useSceneProvision() -> { ok, reason, severity }. v3.198.0 : les provisions etaient
     offertes en preparation depuis v3.120.0 mais AUCUN code ne les lisait — le mot n'existait
     que dans data/scene-templates.js. Elles soignent desormais la blessure la PLUS GRAVE, ce
     qui en fait la seule reponse a un echec en voie de puissance (autel et source ne retirent
     que les legeres). Utilisable a tout moment du run, comme la gourde. */
  useSceneProvision: function () {
    var run = this.getRun();
    if (!run || Number(run.provisionCharges || 0) <= 0) return { ok: false, reason: "Plus de provisions" };
    if (!run.injuries || !run.injuries.length) return { ok: false, reason: "Aucune blessure à soigner" };
    var healed = this._healOneInjury(run, "grave");
    run.provisionCharges = Math.max(0, Number(run.provisionCharges || 0) - 1);
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, severity: healed ? healed.severity : null };
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
      // v3.198.0 : un obstacle revele depuis un mystere expose les memes voies restreintes
      // qu'un obstacle genere directement (template.optionsPerNode), sinon le mystere serait
      // devenu la porte de secours qui redonne acces aux 3 voies.
      slot.voies = SceneEngine.pickVoies(template, slot.gabaritId, Math.random());
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
    var gainAmount = SceneEngine.rollLoot(template.lootRanges.decouverte, run.depth, Math.random(), 1, this._runLootMult(run));
    run.loot += gainAmount;
    this._creditLoot(template, gainAmount);

    run.pendingNode = null; run.currentGate = null; run.blockerReadyAt = null;
    this._advanceOrFinish(run);
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, gainAmount: gainAmount };
  },

  /* ---------- Résolution d'un obstacle (nœud "check") ---------- */
  /* v3.195.0 : facteurs de difficulté/gain de l'option choisie (SCENE_NODES.optionProfiles —
     power/precision/endurance, générique à tous les gabarits) composés avec l'intensité de
     run (SCENE_INTENSITY, Petite Aventure uniquement — repli 1 pour les autres canevas comme
     expedition_faille). Centralisé ici, appelé par getObstacleEstimate ET resolveObstacle
     pour ne jamais désynchroniser l'affichage AVANT résolution du calcul RÉEL. */
  _obstacleFactors: function (run, optionKey) {
    var bank = SceneEngine.getNodeBank();
    // v3.198.0 : un canevas peut surcharger localement les profils d'option
    // (template.optionProfiles) — la Petite Aventure a un triangle bien plus tranche que le
    // defaut partage, sans imposer ce calibrage a expedition_faille ni aux quetes migrees.
    var template = SceneEngine.getTemplate(run.templateId);
    var profiles = (template && template.optionProfiles) || bank.optionProfiles || {};
    var profile = profiles[optionKey] || { diffMod: 1, lootMod: 1, breathCost: 0, injurySeverity: "normale" };
    var intensity = (run.intensity && window.SCENE_INTENSITY) ? window.SCENE_INTENSITY[run.intensity] : null;
    var mutator = this.getActiveMutator(); // v3.196.0
    return {
      diffMult: profile.diffMod * ((intensity && intensity.diffMult) || 1) * this.heroScale(run),
      lootMult: profile.lootMod * ((intensity && intensity.lootMult) || 1) * (mutator.lootMult || 1),
      breathCost: profile.breathCost * (mutator.breathCostMult || 1),
      injurySeverity: profile.injurySeverity
    };
  },

  /* getObstacleEstimate(optionKey) -> "low"|"medium"|"high", pour affichage AVANT résolution
     (jamais de % exact — convention du jeu). Applique le riskMod de la porte courante ET les
     facteurs d'option/intensité (v3.195.0, voir _obstacleFactors). */
  getObstacleEstimate: function (optionKey) {
    var run = this.getRun();
    if (!run || !run.pendingNode || run.pendingNode.type !== "obstacle") return "low";
    var gabarit = SceneEngine.getNodeBank().obstacles[run.pendingNode.gabaritId];
    var option = gabarit && gabarit.options[optionKey];
    if (!option) return "low";
    var statEff = this.statEffective(run, option.stat);
    var factors = this._obstacleFactors(run, optionKey);
    return SceneEngine.estimateObstacle(gabarit, optionKey, statEff, run.depth, run.pendingNode.riskMod, factors.diffMult);
  },

  /* resolveObstacle(optionKey|"corde") -> { ok, reason, outcome, gainAmount }. Idempotent :
     refuse si le nœud courant n'est pas un obstacle en attente. randomValue tiré ici
     (une seule fois), jamais recalculé ensuite (même garde-fou anti-double-clic que sur les
     autres résolutions de nœud de ce fichier — resolveAutel, resolveDecouverte, etc.).
     v3.195.0 : refuse si le Souffle est insuffisant pour l'option choisie (breathCost, voir
     _obstacleFactors) — SAUF pour "corde" (gratuite en Souffle, comme avant). L'échec pousse
     désormais {stat, severity} dans run.injuries (au lieu d'une simple clé de stat), et
     déduit le Souffle qu'il y ait réussite ou échec (l'effort est le même). */
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
    if (isRope && !(Number(run.ropeCharges || 0) > 0 && gabarit.ropeOption)) {
      return { ok: false, reason: "Approche à la corde indisponible ici" };
    }
    // v3.198.0 : une voie masquee par le noeud (slot.voies, template.optionsPerNode) est
    // refusee ici aussi, jamais seulement cachee dans la vue — meme garde-fou que partout
    // ailleurs dans ce fichier : on ne fait jamais confiance a l'ecran.
    if (!isRope) {
      var pendingSlot = (this.getCurrentLevel() || [])[run.currentGate] || run.pendingNode;
      if (SceneEngine.nodeVoies(gabarit, pendingSlot).indexOf(optionKey) === -1) {
        return { ok: false, reason: "Cette approche n'est pas praticable ici" };
      }
    }
    if (!isRope) {
      var precheckFactors = this._obstacleFactors(run, optionKey);
      if (Number(run.breath || 0) < precheckFactors.breathCost) {
        return { ok: false, reason: "Pas assez de Souffle pour cette approche" };
      }
    }

    var outcome, gainAmount;
    if (isRope) {
      // Corde : réussite garantie (85% dans le proto -> en v1 sandbox, garanti pour la
      // simplicité du premier jet ; nuance à trancher si le calibrage l'exige) mais gain réduit
      // — volontairement INDÉPENDANTE du riskMod de la porte (la corde neutralise le risque
      // qu'il soit haut ou bas, c'est tout son intérêt). Gratuite en Souffle (v3.195.0).
      outcome = "success";
      // v3.198.0 : consomme une charge. La corde reste une reussite garantie a gain reduit,
      // mais un seul obstacle par exemplaire embarque (avant : illimitee, ce qui laissait
      // passer 3.8 obstacles par Periple sans jamais jeter un de).
      run.ropeCharges = Math.max(0, Number(run.ropeCharges || 0) - 1);
      run.ropeAvailable = run.ropeCharges > 0;
      gainAmount = SceneEngine.rollLoot(template.lootRanges.obstacleRope, run.depth, Math.random());
      run.loot += gainAmount;
    } else {
      var option = gabarit.options[optionKey];
      if (!option) return { ok: false, reason: "Approche invalide" };
      var factors = this._obstacleFactors(run, optionKey);
      var statEff = this.statEffective(run, option.stat);
      var randomValue = Math.random();
      var checkResult = SceneEngine.resolveObstacle(gabarit, optionKey, statEff, run.depth, randomValue, riskMod, factors.diffMult);

      // Amulette : relance automatique du premier échec du run.
      if (checkResult.result === "setback" && run.amuletAvailable) {
        run.amuletAvailable = false;
        checkResult = SceneEngine.resolveObstacle(gabarit, optionKey, statEff, run.depth, Math.random(), riskMod, factors.diffMult);
        run._amuletUsed = true;
      }

      run.breath = Math.max(0, Number(run.breath || 0) - factors.breathCost);

      if (checkResult.result === "setback") {
        outcome = "setback";
        // v3.195.0 : {stat, severity} au lieu d'une simple clé de stat — voir statEffective.
        run.injuries.push({ stat: option.stat, severity: factors.injurySeverity });
        gainAmount = SceneEngine.rollLoot(template.lootRanges.obstacleSetback, run.depth, Math.random(), riskMod);
        run.loot += gainAmount;
      } else {
        outcome = checkResult.result; // "success" | "perfect" traités identiquement côté gain v1
        // v3.195.0 : lootMult ajouté (option choisie x intensité de run) — voir _obstacleFactors.
        gainAmount = SceneEngine.rollLoot(template.lootRanges.obstacleSuccess, run.depth, Math.random(), riskMod, factors.lootMult);
        if (checkResult.result === "perfect") gainAmount = Math.round(gainAmount * 1.2);
        run.loot += gainAmount;
      }
    }

    this._creditLoot(template, gainAmount);

    run.pendingNode = null;
    run.currentGate = null;

    // Plafond de blessures = évacuation immédiate (règle DESIGN_Scene_Engine_v1.md §4).
    // v3.198.0 : le seuil vient du canevas (template.maxInjuries, defaut 3) — la Petite
    // Aventure evacue a 2, voir getMaxInjuries.
    if (run.injuries.length >= this.getMaxInjuries(run.templateId)) {
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
  /* v3.195.0 : lootMult de run = intensité seule (SCENE_INTENSITY, Petite Aventure
     uniquement — 1 pour les autres canevas), appliqué aux nœuds SANS option choisie par le
     joueur (découverte, bloqueur) : distinct de _obstacleFactors qui compose EN PLUS le
     lootMod de l'option prise. */
  _runLootMult: function (run) {
    var intensity = (run.intensity && window.SCENE_INTENSITY) ? window.SCENE_INTENSITY[run.intensity] : null;
    var mutator = this.getActiveMutator(); // v3.196.0
    return ((intensity && intensity.lootMult) || 1) * (mutator.lootMult || 1);
  },

  /* v3.195.0 : restauration de Souffle à un nœud "carotte" (autel accepté, source) — donne
     enfin un rôle actif à ces nœuds vis-à-vis du Souffle, pas seulement des blessures.
     Montant fixe modeste (20) : suffisant pour reprendre une option coûteuse, pas pour
     spammer indéfiniment la voie de puissance. */
  SOFT_HEAL_BREATH_AMOUNT: 20,

  resolveAutel: function (accept) {
    var run = this.getRun();
    if (!run || run.status !== "node" || !run.pendingNode || run.pendingNode.type !== "autel") {
      return { ok: false, reason: "Aucun autel à résoudre" };
    }
    var template = SceneEngine.getTemplate(run.templateId);
    // v3.198.0 : l'autel ne retire plus qu'une blessure LEGERE. Une blessure grave, prise en
    // voie de puissance, reste jusqu'au bout du run ; seules les provisions l'effacent. Sans
    // cela, autel + source + amulette + provisions absorbaient cinq echecs sur un budget de
    // deux blessures et le plafond n'avait aucun effet (mesure de session). L'offrande n'est
    // facturee que si un soin a effectivement eu lieu. Le Souffle, lui, est rendu dans tous
    // les cas : c'est le role de "carotte" du noeud (v3.195.0), independant des blessures.
    if (accept && this.canHealHere(run)) {
      var cost = Math.max(5, Math.round(run.loot * (template.autelCostRatio || 0.2)));
      run.loot = Math.max(0, run.loot - cost);
      this._healOneInjury(run, "legere");
      run.breath = Math.min(100, Number(run.breath || 0) + this.SOFT_HEAL_BREATH_AMOUNT);
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
    var gainAmount = SceneEngine.rollLoot(template.lootRanges.decouverte, run.depth, Math.random(), 1, this._runLootMult(run));
    run.loot += gainAmount;
    this._creditLoot(template, gainAmount);
    run.pendingNode = null; run.currentGate = null;
    this._advanceOrFinish(run);
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, gainAmount: gainAmount };
  },

  /* resolveSource() -> soin gratuit d'une blessure si présente + restauration de Souffle
     (v3.195.0, voir SOFT_HEAL_BREATH_AMOUNT). */
  resolveSource: function () {
    var run = this.getRun();
    if (!run || run.status !== "node" || !run.pendingNode || run.pendingNode.type !== "source") {
      return { ok: false, reason: "Aucune source à résoudre" };
    }
    // v3.198.0 : meme regle que l'autel — la source ne lave qu'une blessure legere.
    var healed = !!this._healOneInjury(run, "legere");
    run.breath = Math.min(100, Number(run.breath || 0) + this.SOFT_HEAL_BREATH_AMOUNT);
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
    // v3.195.0 : depthMax RÉEL du run = intensité choisie si présente (SCENE_INTENSITY),
    // sinon template.depthMax (canevas sans intensité, ex. expedition_faille — inchangé). Le
    // run.card généré par _generateCard a déjà la bonne longueur, mais _advanceOrFinish doit
    // savoir OÙ s'arrêter sans dépendre de card.length pour rester cohérent avec l'affichage
    // "Profondeur X/depthMax" de la vue (buildSceneStatusBarHTML).
    var intensity = (run.intensity && window.SCENE_INTENSITY) ? window.SCENE_INTENSITY[run.intensity] : null;
    var depthMax = (intensity && intensity.depthMax) || Number(template.depthMax || 1);
    if (run.depth >= depthMax) {
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
      // v3.195.0 : lootMult de l'intensité de run appliqué au bonus sûr de finale (le
      // double-ou-rien du choix "risque" ci-dessous porte déjà son propre facteur x2/÷2,
      // appliqué au loot DÉJÀ multiplié par l'intensité tout du long du run — cohérent, pas
      // de double application).
      var safeGain = Math.round(template.lootRanges.finalSafe[0] * this._runLootMult(run));
      run.loot += safeGain;
      this._creditLoot(template, safeGain);
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
      addLog("👑 Le silence, d'un coup. Quelque chose de plus lourd arrive.", "event"); // v3.197.0 (bible B §4.4)
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
    addLog("💀 Le parcours s'arrête là. Ce que tu portais reste dans la forêt. Retour au feu.", "event"); // v3.197.0 (bible B §4.4)
    vibrate([80, 40, 80]);

    run.status = "completed";
    game.justDied = true;
    if (typeof switchTab === "function") switchTab("campement");
    if (typeof saveGame === "function") saveGame();
  }
};

window.SceneRunManager = SceneRunManager;
