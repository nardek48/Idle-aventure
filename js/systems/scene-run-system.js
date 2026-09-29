"use strict";
/* systems/scene-run-system.js — glue jeu du scene-engine générique (DESIGN_Scene_Engine_v1.md).
   Consomme le moteur pur SceneEngine + SceneCheckSystem, persiste game.sceneRun (même règle
   que explorationRun : survit au rechargement, PAS à l'ascension — save-system.js),
   route TOUT le loot/XP via SortieManager (context "scene", voir sortie-system.js) plutôt que
   de gérer un banking séparé. Ne charge JAMAIS CombatEngine, n'écrit jamais dans
   game.resources directement (uniquement via WarehouseManager, lui-même appelé par
   SortieManager.bank()). v3.120.0 (Lot S1) : sandbox — un seul canevas (expedition_faille, retiré en v3.388.0),
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
      game.explorationProgression.petiteAventure = { spent: 0, since: null }; // v3.366.0 : réserve rechargeable
    }
  },

  PETITE_AVENTURE_DAILY_CAP: 3,

  /* v3.366.0 (décision Seb 28/09/2026) — RECHARGE au lieu du plafond du jour civil. La réserve
     vaut le cap du monde (3 en Forêt, 4 au Désert, + Carte de l'éclaireur) ; chaque place
     dépensée revient une à une, une toutes les PETITE_AVENTURE_RECHARGE_MS (une seule horloge,
     comme une jauge). Persisté dans explorationProgression.petiteAventure : spent (places
     dépensées, négatif = bonus de l'Admin) et since (départ de l'horloge, null si réserve pleine). */
  PETITE_AVENTURE_RECHARGE_MS: 4 * 3600e3,

  _today: function () { return new Date().toDateString(); },

  /* Lecture de l'état, migration de l'ancien compteur du jour (day/count), puis recharge due. */
  _paState: function () {
    this.ensureDefaults();
    var pa = game.explorationProgression.petiteAventure, now = Date.now();
    if (typeof pa.spent !== "number") {
      // ancienne forme : le compteur du jour devient des places dépensées, l'horloge part maintenant
      pa.spent = (pa.day === this._today()) ? Number(pa.count || 0) : 0;
      pa.since = pa.spent > 0 ? now : null;
      delete pa.day; delete pa.count;
    }
    if (pa.spent > 0) {
      if (typeof pa.since !== "number" || pa.since > now) pa.since = now;
      var k = Math.floor((now - pa.since) / this.PETITE_AVENTURE_RECHARGE_MS);
      if (k > 0) {
        var back = Math.min(k, pa.spent);
        pa.spent -= back;
        pa.since += back * this.PETITE_AVENTURE_RECHARGE_MS;
      }
    }
    if (pa.spent <= 0) pa.since = null;
    return pa;
  },

  /* Places dépensées et pas encore revenues (nom historique conservé : l'Admin et le tableau le lisent). */
  petiteAventureCountToday: function () {
    return Number(this._paState().spent || 0);
  },

  /* v3.298.0 (W-1b, D10) : cap du jour lu sur le plus haut monde atteint (WORLD_CAPS,
     petiteAventureCap) : 3 en Forêt, 4 au Désert. Recalculé à chaque lecture, donc dès la
     traversée. PETITE_AVENTURE_DAILY_CAP reste la valeur de repli (et l'ancre des bancs).
     v3.366.0 : c'est désormais la RÉSERVE de places, rechargées une à une. */
  getPetiteAventureCap: function () {
    var c = (window.WorldCaps && typeof WorldCaps.getPetiteAventureCap === "function") ? WorldCaps.getPetiteAventureCap() : null;
    var base = (typeof c === "number" && isFinite(c)) ? c : this.PETITE_AVENTURE_DAILY_CAP;
    // v3.321.0 : Carte de l'éclaireur (boutique d'Éclats), ajoutée au cap du monde
    var bonus = (window.DungeonManager && typeof DungeonManager.getShardEffect === "function") ? DungeonManager.getShardEffect("paBonus") : 0;
    return base + bonus;
  },

  canStartPetiteAventureToday: function () {
    return this.petiteAventureCountToday() < this.getPetiteAventureCap();
  },

  /* v3.366.0 : délai avant la prochaine place (ms), 0 si une place est libre ou si rien ne recharge. */
  petiteAventureNextInMs: function () {
    var pa = this._paState();
    if (this.canStartPetiteAventureToday() || !(pa.spent > 0) || typeof pa.since !== "number") return 0;
    return Math.max(0, pa.since + this.PETITE_AVENTURE_RECHARGE_MS - Date.now());
  },

  /* v3.366.0 : « 2 h 13 », « 45 min » — pour les refus et le tableau. */
  formatPetiteAventureWait: function (ms) {
    var m = Math.max(1, Math.ceil(Number(ms || 0) / 60000));
    var h = Math.floor(m / 60);
    m = m % 60;
    return h ? (_t("{n} h", { n: h }) + (m ? " " + (m < 10 ? "0" : "") + m : "")) : _t("{n} min", { n: m });
  },

  /* Phrase de refus commune (carte vivante, tableau, départ) */
  petiteAventureWaitLabel: function () {
    return _t("Prochaine expédition dans {d}", { d: this.formatPetiteAventureWait(this.petiteAventureNextInMs()) });
  },

  _consumePetiteAventureSlot: function () {
    var pa = this._paState();
    if (!(pa.spent > 0)) pa.since = Date.now(); // réserve pleine : l'horloge part avec cette place
    pa.spent = Number(pa.spent || 0) + 1;
  },

  /* v3.355.0 (D6) : un échec SUBI (évacuation, Souffle épuisé, mort) rend la place.
     L'abandon volontaire la garde : sinon on relancerait le tirage sans limite.
     v3.366.0 : la place revient tout de suite dans la réserve, quel que soit le jour. */
  _refundPetiteAventureSlot: function (run) {
    if (!run || !run.paSlotDay) return;
    var pa = this._paState();
    if (Number(pa.spent || 0) > 0) pa.spent -= 1;
    if (pa.spent <= 0) pa.since = null;
    run.paSlotDay = null;
  },

  getRun: function () {
    this.ensureDefaults();
    var run = game.sceneRun;
    if (run && this._retireLegacyRun(run)) return null;
    if (run) this._migrateRun(run);
    return run;
  },

  /* v3.388.0 (PA2-6) : un run de Petite Aventure v1 (ou du bac à sable retiré) repris d'une
     ancienne sauvegarde se clôt proprement : le butin ramassé est rapporté, la place rendue. */
  _retireLegacyRun: function (run) {
    if (run.pa2 || run.status === "completed") return false;
    var tpl = window.SceneEngine ? SceneEngine.getTemplate(run.templateId) : null;
    if (tpl && !(window.Pa2Run && Pa2Run.isTemplate(tpl))) return false;
    this._refundPetiteAventureSlot(run);
    game.sceneRun = null;
    if (window.SortieManager && SortieManager.isActive()) SortieManager.end("success");
    // v3.389.0 : un parcours (quête, étape d'Histoire) repris d'avant sa bascule reprend du début, sans être repayé.
    if (tpl && tpl.mode === "parcours") {
      if (tpl.entryCost && window.WarehouseManager) WarehouseManager.refundResource(tpl.entryCost.resourceId, Number(tpl.entryCost.amount || 0));
      if (typeof addLog === "function") addLog(_t("{t} : le parcours a changé. Il reprend du début, sans nouveau coût.", { t: _td(tpl.title || "") }), "event");
      return true;
    }
    if (typeof addLog === "function") addLog(_t("L'ancienne Petite aventure en cours est close : ton butin est rapporté."), "event");
    return true;
  },

  /* v3.198.0 : reprise d'un run demarre sous une version anterieure (le run entier est
     persiste tel quel par save-system.js, aucune migration n'y est faite). Corde et
     provisions passent d'un booleen de disponibilite a un compteur de charges ; sans ce
     repli, un run en cours au moment de la mise a jour perdrait sa corde. Idempotent. */
  _migrateRun: function (run) {
    if (run.pa2) return; // v3.381.0 : un run v2 n'a ni corde ni provisions à migrer
    if (run.ropeCharges == null) run.ropeCharges = run.ropeAvailable ? 1 : 0;
    if (run.provisionCharges == null) run.provisionCharges = 0;
  },

  /* getMaxInjuries(templateId) -> nombre de blessures qui declenche l'evacuation. Defaut 3
     (regle DESIGN_Scene_Engine_v1.md §4) ; un canevas peut declarer template.maxInjuries. */
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
    // v3.257.0 (C-3) : en mode "legere", repli sur la première blessure normale si l'effet tenu le permet.
    if (idx < 0 && mode !== "grave" && this.autelHealsNormal()) {
      for (var k = 0; k < run.injuries.length; k++) {
        if (run.injuries[k].severity === "normale") { idx = k; break; }
      }
    }
    if (idx < 0) return null;
    return run.injuries.splice(idx, 1)[0];
  },

  isRunActive: function () {
    var run = this.getRun();
    return !!(run && run.status !== "completed");
  },

  /* v3.307.0 (retour Seb) : héros engagé sur la route — rien de ce qui le touche ne se fait
     ailleurs (combats, soins, équipement, talents…). Le combat de nœud reste libre (potion). */
  isHeroEngaged: function () {
    var run = this.getRun();
    // v3.384.0 (PA2-2, D4) : en préparation v2, rien n'est engagé (le héros part au « Entrer »).
    return !!(run && run.status !== "completed" && run.status !== "combat" && run.status !== "pa2-prep");
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
    return effective;
  },

  /* ---------- Démarrage ---------- */
  /* startRun(templateId) -> { ok, reason, run }. Génère la carte via SceneEngine.buildCard
     (les randomValues sont tirées ICI, une seule fois, avec Math.random — le moteur pur ne
     tire jamais lui-même). v3.122.0 (Lot S2a) : débite template.entryCost si déclaré
     (WarehouseManager, avant toute création de run — échec propre si insuffisant, comme
     ExplorationManager.startRun). Si template.loadoutSlots est 0/absent, saute l'étape
     "preparation" (aucun équipement à choisir pour une quête simple à 1 palier).
     v3.388.0 (PA2-6) : les Petites Aventures v1 (profils, intensités, mutateurs, bloqueurs) sont
     retirées ; un canevas mode "pa2" est mené par Pa2Run. opts.livingMap = { mapId, sectorId } :
     run ciblé sur un secteur, fin rapportée à LivingMapManager.onRunEnd (_notifyLivingMap). */
  startRun: function (templateId, opts) {
    this.ensureDefaults();

    if (this.isRunActive()) {
      return { ok: false, reason: _t("Une expédition est déjà en cours"), run: null };
    }

    var template = SceneEngine.getTemplate(templateId);
    if (!template) return { ok: false, reason: _t("Expédition introuvable"), run: null };

    if (this.isQuestCompleted(templateId)) {
      return { ok: false, reason: _t("Expédition déjà terminée"), run: null };
    }

    // Petite Aventure (canevas mode "pa2") : menée par Pa2Run.
    if (window.Pa2Run && Pa2Run.isTemplate(template)) return Pa2Run.start(templateId, opts);

    if (template.entryCost) {
      var costResource = template.entryCost.resourceId;
      var costAmount = Number(template.entryCost.amount || 0);
      if (!window.WarehouseManager || typeof WarehouseManager.removeResource !== "function") {
        return { ok: false, reason: _t("Entrepôt indisponible"), run: null };
      }
      if (WarehouseManager.getAmount(costResource) < costAmount) {
        var resDef = (window.WAREHOUSE_RESOURCES || {})[costResource];
        return { ok: false, reason: _t("Pas assez de {x}", { x: (resDef && resDef.name) ? _td(resDef.name) : costResource }), run: null };
      }
      var removed = WarehouseManager.removeResource(costResource, costAmount);
      if (!removed) return { ok: false, reason: _t("Échec du retrait des ressources"), run: null };
    }

    var hasLoadout = Number(template.loadoutSlots || 0) > 0;
    var card = (function () {
      var randCount = SceneEngine.estimateRandomCount(template);
      var randomValues = [];
      for (var i = 0; i < randCount; i++) randomValues.push(Math.random());
      return SceneEngine.buildCard(template, randomValues);
    })();

    var run = {
      id: "scene_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      templateId: templateId,
      status: hasLoadout ? "preparation" : "gate", // preparation -> gate -> node -> finale -> completed

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
      exhausted: false, // v3.199.0 : run terminé par Souffle épuisé (distinct des blessures)
      ropeCharges: 0, // v3.198.0 : usages de corde restants (etait un booleen illimite)
      provisionCharges: 0, // v3.198.0 : provisions restantes (objet enfin actif)
      breath: 100, // v3.195.0 : ressource de run visible, 0-100, consommée par les options
                    // d'obstacle (voir SCENE_NODES.optionProfiles), restaurée par
                    // autel/source/gourde (voir resolveAutel/resolveSource/useSceneGourde)
      livingMap: (opts && opts.livingMap) ? { mapId: opts.livingMap.mapId, sectorId: opts.livingMap.sectorId } : null, // v3.256.0 (C-2)
      livingMapReport: null, // v3.256.0 : compte rendu de LivingMapManager.onRunEnd, affiché au bilan
      loot: 0, // ressource lootResource, non banquée tant que SortieManager n'a pas end()

      currentGate: null, // index de porte sélectionnée en attente de résolution (idempotence)
      pendingNode: null // { type, gabaritId?, optionKey? } — nœud en cours de résolution
    };

    game.sceneRun = run;

    if (window.SortieManager) SortieManager.start("scene");

    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, run: run };
  },

  /* v3.256.0 (C-2) : rapporte la fin d'un run ciblé à la carte, une seule fois par run.
     result : "success" | "fail" | "neutral" (voir LivingMapManager.onRunEnd). */
  _notifyLivingMap: function (run, result) {
    if (!run || !run.livingMap || run.livingMapReport || !window.LivingMapManager) return;
    run.livingMapReport = LivingMapManager.onRunEnd(run.livingMap.mapId, run.livingMap.sectorId, result);
  },

  /* Valide l'équipement choisi en préparation (exactement loadoutSlots objets) et passe au
     premier palier. */
  confirmLoadout: function (itemIds) {
    var run = this.getRun();
    if (!run || run.status !== "preparation") return { ok: false, reason: _t("Aucune préparation en cours") };

    var template = SceneEngine.getTemplate(run.templateId);
    if (!template) return { ok: false, reason: _t("Expédition introuvable") };

    var slots = Number(template.loadoutSlots || 3);
    if (!Array.isArray(itemIds) || itemIds.length !== slots) {
      return { ok: false, reason: _t("Choisis exactement {n} objets", { n: slots }) };
    }
    var validIds = Object.keys(template.items || {});
    var allValid = itemIds.every(function (id) { return validIds.indexOf(id) !== -1; });
    if (!allValid) return { ok: false, reason: _t("Objet invalide") };

    /* v3.303.0 (Désert D3) : un objet peut se payer en ressource (item.consumes), comme l'Outre
       pleine, fabriquée au village. Tout est vérifié avant tout retrait (tout-ou-rien). */
    var need = this._loadoutCost(template, itemIds);
    var missing = Object.keys(need).filter(function (rid) { return !window.WarehouseManager || WarehouseManager.getAmount(rid) < need[rid]; });
    if (missing.length) {
      var def0 = (window.WAREHOUSE_RESOURCES || {})[missing[0]];
      return { ok: false, reason: _t("Pas assez de {x}", { x: (def0 && def0.name) ? _td(def0.name) : missing[0] }) };
    }
    Object.keys(need).forEach(function (rid) { WarehouseManager.removeResource(rid, need[rid]); });

    run.loadout = itemIds.slice();
    run.torchCharges = itemIds.filter(function (id) { return id === "torche"; }).length > 0
      ? (template.items.torche.charges || 3) : 0;
    // v3.198.0 : corde et provisions deviennent des charges consommables (1 par exemplaire
    // embarque) au lieu d'un simple flag de disponibilite. ropeAvailable est conserve en
    // miroir pour ne rien casser dans la vue et dans les sauvegardes existantes.
    run.ropeCharges = itemIds.filter(function (id) { return id === "corde"; }).length;
    // v3.257.0 (Cartes Vivantes, C-3) : Pont du gué tenu -> la corde embarquée tient un usage de plus.
    if (run.ropeCharges > 0 && window.LivingMapManager && LivingMapManager.hasEffect("corde_plus")) {
      run.ropeCharges += Number(LivingMapManager.getEffectValue("ropeBonus", 1));
    }
    run.ropeAvailable = run.ropeCharges > 0;
    run.provisionCharges = itemIds.filter(function (id) { return id === "provisions"; }).length;
    run.amuletAvailable = itemIds.indexOf("amulette") !== -1;
    run.gourdeAvailable = itemIds.indexOf("gourde") !== -1; // v3.195.0
    // v3.304.0 (décision Seb, option B) : un canevas peut compter les gorgées (template.gourdeUses).
    // Au Désert, une seule : sinon la gourde illimitée annule la soif et l'Outre. Absent = illimitée.
    run.gourdeUses = (run.gourdeAvailable && Number(template.gourdeUses) > 0) ? Number(template.gourdeUses) : null;
    // v3.322.0 : Seconde gorgée (Mémoire niveau 5) — une gorgée de plus là où elles sont comptées
    if (run.gourdeUses != null && window.MemoryManager && MemoryManager.has("seconde_gorgee")) run.gourdeUses += 1;
    // v3.303.0 : objets qui rendent du Souffle, une fois chacun (item.breath), ex. l'Outre pleine
    run.breathItems = {};
    itemIds.forEach(function (id) {
      var it = template.items[id];
      if (it && Number(it.breath || 0) > 0) run.breathItems[id] = Number(run.breathItems[id] || 0) + 1;
    });
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
    var torchOn = this.torchActiveThisLevel();
    return run.depth + (torchOn ? 2 : 1);
  },

  GOURDE_BREATH_AMOUNT: 25, // v3.199.0 : 30 -> 25, le Souffle compte désormais vraiment

  /* useSceneGourde() -> { ok, reason }. Utilisable à tout moment (pas seulement en attente
     de nœud, décision Seb : "à utiliser quand tu veux" — desc de l'item), réutilisable comme
     la corde (pas de charges consommées, juste un flag de disponibilité). Restaure du Souffle
     jusqu'au plafond 100, jamais au-delà. */
  /* v3.303.0 : ressources à payer pour un choix d'objets de préparation ({ resourceId: qté }). */
  _loadoutCost: function (template, itemIds) {
    var need = {};
    (itemIds || []).forEach(function (id) {
      var it = template && template.items && template.items[id];
      if (it && it.consumes && it.consumes.resourceId) need[it.consumes.resourceId] = Number(need[it.consumes.resourceId] || 0) + Number(it.consumes.amount || 1);
    });
    return need;
  },

  /* v3.303.0 : Souffle rendu par un objet à boire (item.breath).
     v3.305.0 : un secteur tenu peut le renforcer (item.breathBonusEffect, ex. le puits sec). */
  getBreathItemAmount: function (itemId, template) {
    template = template || (this.getRun() ? SceneEngine.getTemplate(this.getRun().templateId) : null);
    var it = template && template.items && template.items[itemId];
    if (!it) return 0;
    var bonus = (it.breathBonusEffect && window.LivingMapManager && LivingMapManager.hasEffect(it.breathBonusEffect))
      ? Number(LivingMapManager.getEffectValue("outreBreathBonus", 15)) : 0;
    var total = Number(it.breath || 0) + bonus;
    // v3.322.0 : Outre de cuir (Mémoire niveau 5) — +50 % de Souffle rendu par un objet à boire
    if (window.MemoryManager && MemoryManager.has("outre_cuir")) total = Math.floor(total * 1.5);
    return total;
  },

  /* useBreathItem(itemId) -> { ok, reason, gained }. Une charge par exemplaire emporté ; jamais
     au-delà de 100 de Souffle. Refusé si le Souffle est déjà plein (la charge est gardée). */
  useBreathItem: function (itemId) {
    var run = this.getRun();
    if (!run || !run.breathItems || !(Number(run.breathItems[itemId] || 0) > 0)) return { ok: false, reason: _t("Objet indisponible") };
    if (Number(run.breath || 0) >= 100) return { ok: false, reason: _t("Souffle déjà au maximum") };
    var before = Number(run.breath || 0);
    run.breath = Math.min(100, before + this.getBreathItemAmount(itemId));
    run.breathItems[itemId] -= 1;
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, gained: run.breath - before };
  },

  useSceneGourde: function () {
    var run = this.getRun();
    if (!run || !run.gourdeAvailable) return { ok: false, reason: _t("Gourde indisponible") };
    if (Number(run.breath || 0) >= 100) return { ok: false, reason: _t("Souffle déjà au maximum") };
    run.breath = Math.min(100, Number(run.breath || 0) + this.getGourdeAmount());
    // v3.304.0 : gorgées comptées (template.gourdeUses) — la dernière vide la gourde
    if (run.gourdeUses != null) {
      run.gourdeUses = Math.max(0, Number(run.gourdeUses) - 1);
      if (run.gourdeUses === 0) run.gourdeAvailable = false;
    }
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null };
  },

  /* v3.257.0 (C-3) : Autel de pierre tenu -> la gourde rend 40 Souffle au lieu de 25. */
  getGourdeAmount: function () {
    if (window.LivingMapManager && LivingMapManager.hasEffect("gourde_40")) {
      return Number(LivingMapManager.getEffectValue("gourdeBreath", 40));
    }
    return this.GOURDE_BREATH_AMOUNT;
  },

  /* v3.199.0 : Souffle épuisé -> fin du run par évacuation, même traitement que le plafond de
     blessures (moitié du butin). Deux raisons de ne PAS se contenter de refuser les options :
     un palier dont toutes les portes sont des obstacles trop chers laissait le joueur sans
     aucune action possible hors abandon (cul-de-sac latent, inatteignable tant que le Souffle
     était inerte, atteignable dès ce lot) ; et une seconde horloge de fin donne au Souffle un
     enjeu réel plutôt qu'un simple filtre d'options. */
  _exhaust: function () {
    var run = this.getRun();
    if (!run) return;
    run.exhausted = true;
    this._evacuate();
  },

  /* v3.199.0 : voies d'un obstacle que le Souffle courant permet encore de payer. La corde ne
     coûte rien : un run avec une corde en réserve n'est jamais bloqué sur un gabarit
     compatible. Utilisé par la vue ET par enterGate (détection de cul-de-sac). */
  affordableVoies: function (run, gabarit, slot) {
    var voies = SceneEngine.nodeVoies(gabarit, slot);
    var out = [];
    for (var i = 0; i < voies.length; i++) {
      if (Number(run.breath || 0) >= this._obstacleFactors(run, voies[i]).breathCost) out.push(voies[i]);
    }
    return out;
  },

  /* v3.198.0 : vrai si un soin d'autel/source aurait un effet ici (au moins une blessure
     legere). La vue s'en sert pour ne pas proposer une offrande qui ne rendrait rien. */
  canHealHere: function (run) {
    if (!run || !run.injuries) return false;
    var normalOk = this.autelHealsNormal();
    for (var i = 0; i < run.injuries.length; i++) {
      if (run.injuries[i].severity === "legere") return true;
      if (normalOk && run.injuries[i].severity === "normale") return true;
    }
    return false;
  },

  /* v3.257.0 (C-3) : Cercle des menhirs tenu -> l'autel (et la source) soignent aussi une
     blessure NORMALE. La grave reste hors de portée : seules les provisions l'effacent. */
  autelHealsNormal: function () {
    return !!(window.LivingMapManager && LivingMapManager.hasEffect("autel_normale"));
  },

  /* useSceneProvision() -> { ok, reason, severity }. v3.198.0 : les provisions etaient
     offertes en preparation depuis v3.120.0 mais AUCUN code ne les lisait — le mot n'existait
     que dans data/scene-templates.js. Elles soignent desormais la blessure la PLUS GRAVE, ce
     qui en fait la seule reponse a un echec en voie de puissance (autel et source ne retirent
     que les legeres). Utilisable a tout moment du run, comme la gourde. */
  useSceneProvision: function () {
    var run = this.getRun();
    if (!run || Number(run.provisionCharges || 0) <= 0) return { ok: false, reason: _t("Plus de provisions") };
    if (!run.injuries || !run.injuries.length) return { ok: false, reason: _t("Aucune blessure à soigner") };
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
     */
  enterGate: function (gateIndex) {
    var run = this.getRun();
    if (!run || run.status !== "gate") return { ok: false, reason: _t("Aucun palier à choisir") };
    var level = this.getCurrentLevel();
    var slot = level[gateIndex];
    if (!slot) return { ok: false, reason: _t("Porte invalide") };
    var template = SceneEngine.getTemplate(run.templateId);

    // v3.199.0 : franchir un palier coûte du Souffle (template.breathPerDepth, 0 par défaut).
    // Prélevé À L'ENTRÉE de la porte et non à la sortie : le joueur voit le coût s'appliquer
    // au moment où il s'engage, et un run repris depuis une sauvegarde ne le paie jamais deux
    // fois (l'entrée n'a lieu qu'une fois par palier, la sortie pouvait être rejouée).
    var stepCost = Number(template && template.breathPerDepth) || 0;
    if (stepCost > 0) {
      run.breath = Math.max(0, Number(run.breath || 0) - stepCost);
      if (run.breath <= 0) {
        this._exhaust();
        if (typeof saveGame === "function") saveGame();
        return { ok: true, reason: null, outcome: "epuisement" };
      }
    }

    if (slot.type === "mystere") this._revealMystery(run, slot);

    // v3.199.0 : cul-de-sac. Si la porte est un obstacle dont AUCUNE voie n'est payable et
    // qu'aucune corde n'est en réserve, le joueur n'aurait plus une seule action possible.
    // Le run se termine par épuisement plutôt que de le laisser face à un écran mort.
    if (slot.type === "obstacle") {
      var gab = SceneEngine.getNodeBank().obstacles[slot.gabaritId];
      var hasRope = Number(run.ropeCharges || 0) > 0 && gab && gab.ropeOption;
      if (gab && !hasRope && this.affordableVoies(run, gab, slot).length === 0) {
        this._exhaust();
        if (typeof saveGame === "function") saveGame();
        return { ok: true, reason: null, outcome: "epuisement" };
      }
    }

    run.currentGate = gateIndex;
    run.status = "node";
    run.pendingNode = { type: slot.type, gabaritId: slot.gabaritId || null, riskMod: slot.riskMod || null };
    if (slot.fullBreath) run.pendingNode.fullBreath = true; // v3.361.0 : source scriptée (le Veilleur, étape 16)

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

  /* ---------- Résolution d'un obstacle (nœud "check") ---------- */
  /* v3.195.0 : facteurs de difficulté/gain de l'option choisie (SCENE_NODES.optionProfiles —
     power/precision/endurance, générique à tous les gabarits) composés avec template.diffMult
     et l'échelle du héros. Centralisé ici, appelé par getObstacleEstimate ET resolveObstacle
     pour ne jamais désynchroniser l'affichage AVANT résolution du calcul RÉEL. */
  _obstacleFactors: function (run, optionKey) {
    var bank = SceneEngine.getNodeBank();
    // v3.198.0 : un canevas peut surcharger localement les profils d'option
    // (template.optionProfiles), sans imposer son calibrage aux quetes migrees.
    var template = SceneEngine.getTemplate(run.templateId);
    var profiles = (template && template.optionProfiles) || bank.optionProfiles || {};
    var profile = profiles[optionKey] || { diffMod: 1, lootMod: 1, breathCost: 0, injurySeverity: "normale" };
    return {
      diffMult: profile.diffMod * (template.diffMult || 1) * this.heroScale(run),
      lootMult: profile.lootMod,
      // v3.230.0 : Endurance du marcheur (pouvoir légendaire de bottes) — Souffle 15 % moins cher.
      breathCost: profile.breathCost
        * ((typeof hasLegendaryPower === "function" && hasLegendaryPower("leg_marcheur")) ? 0.85 : 1),
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
      return { ok: false, reason: _t("Aucun obstacle à résoudre") };
    }
    var template = SceneEngine.getTemplate(run.templateId);
    var gabarit = SceneEngine.getNodeBank().obstacles[run.pendingNode.gabaritId];
    if (!gabarit) return { ok: false, reason: _t("Obstacle introuvable") };
    var riskMod = run.pendingNode.riskMod || 1;

    var isRope = (optionKey === "corde");
    if (isRope && !(Number(run.ropeCharges || 0) > 0 && gabarit.ropeOption)) {
      return { ok: false, reason: _t("Approche à la corde indisponible ici") };
    }
    // v3.198.0 : une voie masquee par le noeud (slot.voies, template.optionsPerNode) est
    // refusee ici aussi, jamais seulement cachee dans la vue — meme garde-fou que partout
    // ailleurs dans ce fichier : on ne fait jamais confiance a l'ecran.
    if (!isRope) {
      var pendingSlot = (this.getCurrentLevel() || [])[run.currentGate] || run.pendingNode;
      if (SceneEngine.nodeVoies(gabarit, pendingSlot).indexOf(optionKey) === -1) {
        return { ok: false, reason: _t("Cette approche n'est pas praticable ici") };
      }
    }
    if (!isRope) {
      var precheckFactors = this._obstacleFactors(run, optionKey);
      if (Number(run.breath || 0) < precheckFactors.breathCost) {
        return { ok: false, reason: _t("Pas assez de Souffle pour cette approche") };
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
      if (!option) return { ok: false, reason: _t("Approche invalide") };
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
  /* Multiplicateur de butin des nœuds sans option (découverte). Gardé à 1 pour les appels
     existants depuis le retrait des intensités (v3.388.0). */
  _runLootMult: function (run) {
    return 1; // v3.388.0 : plus d'intensité ni de mutateur (Petites Aventures v1 retirées)
  },

  /* v3.195.0 : restauration de Souffle à un nœud "carotte" (autel accepté, source) — donne
     enfin un rôle actif à ces nœuds vis-à-vis du Souffle, pas seulement des blessures.
     Montant fixe modeste (20) : suffisant pour reprendre une option coûteuse, pas pour
     spammer indéfiniment la voie de puissance. */
  SOFT_HEAL_BREATH_AMOUNT: 15, // v3.199.0 : 20 -> 15 (idem, régime de Souffle resserré)

  resolveAutel: function (accept) {
    var run = this.getRun();
    if (!run || run.status !== "node" || !run.pendingNode || run.pendingNode.type !== "autel") {
      return { ok: false, reason: _t("Aucun autel à résoudre") };
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
      return { ok: false, reason: _t("Aucune découverte à résoudre") };
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
      return { ok: false, reason: _t("Aucune source à résoudre") };
    }
    // v3.198.0 : meme regle que l'autel — la source ne lave qu'une blessure legere.
    // v3.361.0 : une source scriptée « fullBreath » rend tout le Souffle et lave la pire blessure.
    var full = !!run.pendingNode.fullBreath;
    var healed = !!this._healOneInjury(run, full ? "grave" : "legere");
    run.breath = full ? 100 : Math.min(100, Number(run.breath || 0) + this.SOFT_HEAL_BREATH_AMOUNT);
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
    else {
      // v3.230.0 : Collectionneur (pouvoir légendaire d'anneau) — un exemplaire de plus par butin.
      if (amount > 0 && typeof hasLegendaryPower === "function" && hasLegendaryPower("leg_collectionneur")) amount += 1;
      SortieManager.addResource(template.lootResource, amount);
    }
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
    var depthMax = Number(template.depthMax || 1);
    if (run.depth >= depthMax) {
      run.status = "finale";
    } else {
      run.status = "gate";
    }
  },

  /* leaveNow() -> rentre volontairement, banque via SortieManager("success") — voir décision
     Seb 03/09/2026 : un retour volontaire est traité comme une mission réussie (loot 100%,
     XP forfaitaire), la profondeur atteinte n'influence QUE le loot déjà accumulé, jamais l'XP.
     v3.306.2 : exception — rentrer avant le premier palier (depth 0) ne donne aucune XP. */
  leaveNow: function () {
    var run = this.getRun();
    if (run && run.pa2) return { ok: false, reason: _t("Impossible de rentrer maintenant") }; // v3.381.0 : en v2, on rentre du camp ou du seuil
    if (!run || (run.status !== "gate" && run.status !== "preparation")) {
      return { ok: false, reason: _t("Impossible de rentrer maintenant") };
    }
    run.status = "completed";
    // v3.306.2 : sans aucun palier franchi, pas de mission accomplie -> "return" (butin gardé, 0 XP).
    var outcome = (run.depth > 0) ? "success" : "return";
    var summary = window.SortieManager ? SortieManager.end(outcome) : null;
    this._notifyLivingMap(run, "neutral"); // v3.256.0 : rentrer avant la fin ne libère rien et ne coûte rien
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, summary: summary };
  },

  _evacuate: function () {
    var run = this.getRun();
    run.status = "completed";
    this._refundPetiteAventureSlot(run); // v3.355.0 (D6)
    if (window.SortieManager) SortieManager.end("flee"); // 50% du loot, 0 XP (règle §4)
    this._notifyLivingMap(run, "fail"); // v3.256.0 (décision 4) : l'évacuation compte comme un échec
  },

  /* abandon() -> quitte l'expédition prématurément via la tab-bar/bouton retour (garde dans
     ui-root.js:switchTab). Même traitement que l'évacuation à 3 blessures : end("flee"),
     50% du loot conservé, 0 XP — cohérent avec "fuir" ailleurs dans le jeu (jamais de perte
     totale hors mort en combat). Idempotent : sans run actif, ne fait rien. */
  abandon: function () {
    var run = this.getRun();
    if (run && run.pa2 && window.Pa2Run) return Pa2Run.abandon(); // v3.381.0 (PA2-0)
    if (!run || run.status === "completed") return { ok: false, reason: _t("Aucune expédition en cours") };
    run.status = "completed";
    var summary = window.SortieManager ? SortieManager.end("flee") : null;
    this._notifyLivingMap(run, "fail"); // v3.256.0 (décision 4) : l'abandon compte comme un échec
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, summary: summary };
  },

  /* ---------- Chambre finale ---------- */
  /* resolveFinale(choiceId: "sur"|"risque") -> banque via SortieManager("success"). */
  resolveFinale: function (choiceId) {
    var run = this.getRun();
    if (!run || run.status !== "finale") return { ok: false, reason: _t("Chambre finale non atteinte") };
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
      return { ok: false, reason: _t("Choix invalide") };
    }

    // v3.122.0 (Lot S2a) : déblocage narratif permanent (bâtiment + flags), une seule fois,
    // au moment où la chambre finale est effectivement résolue (le run va jusqu'au bout).
    if (template.unlockOnSuccess) this._applyUnlock(template.unlockOnSuccess);

    // v3.298.0 (W-1b, D6) : un canevas de traversée pose le monde de résidence à l'arrivée.
    if (template.travelOnSuccess && window.WorldTravel) {
      WorldTravel.arrive(template.travelOnSuccess.worldId, template.travelOnSuccess.adventureIndex);
    }

    // v3.127.0 (Lot PA3) : bonus Sève d'Aeswyn garanti à la finale, quel que soit le choix de
    // coffre — AVANT le SortieManager.end("success") ci-dessous (déjà créditée directement via
    // WarehouseManager, pas affectée par le double-ou-rien ni par le "success" de la sortie).


    run.status = "completed";
    var summary = window.SortieManager ? SortieManager.end("success") : null;
    this._notifyLivingMap(run, "success"); // v3.256.0 : la chambre finale résolue libère le secteur
    if (window.AchievementManager) AchievementManager.onRunSuccess(); // v3.338.0 : « Un Périple », « Une traversée »
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
     généré à l'avance par startRun() : un simple scan des paliers futurs suffit, pas
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
      return { ok: false, reason: _t("Aucun combat à engager") };
    }
    var group = SceneEngine.getNodeBank().combatGroups && SceneEngine.getNodeBank().combatGroups[run.pendingNode.gabaritId];
    if (!group || !window.QuestEnemyManager || !window.WorldManager || !window.WORLDS) return { ok: false, reason: _t("Groupe d'ennemis introuvable") };

    run._combatGroupId = run.pendingNode.gabaritId;
    // v3.132.0 : taille de vague lue sur le canevas (template.combatWaveRange, défaut 6-10 historique) —
    // Petite Aventure calibrée à 4-6 (audit Forêt, sim Monte-Carlo : 12 + boss = pire cas jouable).
    var template = SceneEngine.getTemplate(run.templateId);
    var wr = (template && template.combatWaveRange) || [6, 10];
    run._combatWaveTarget = wr[0] + Math.floor(Math.random() * (wr[1] - wr[0] + 1));
    run._combatWaveKills = 0;
    // v3.300.0 (W-2) : template.finalBoss === false -> pas de boss d'aventure en fin de run (la traversée)
    run._combatIsFinalWave = (template && template.finalBoss === false) ? false : this._isLastCombatNodeOfRun(run);

    var spawned = this._spawnNextCombatEnemy(run, false);
    if (!spawned) return { ok: false, reason: _t("Impossible de générer l'ennemi") };

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

    /* v3.298.0 (W-1b, D6) : LE CANEVAS DÉCLARE SON MONDE. Avant, les combats d'un run
       sortaient du monde de résidence : résidant au Désert, la Petite Aventure de la Forêt
       aurait tiré des scarabées. Priorité : worldId du canevas, puis monde de la carte
       vivante du run, puis monde de résidence (canevas sans worldId, ex. expedition_faille). */
    var place = this._combatPlace(run);
    var currentWorld = place.world;
    var advIndex = place.adventureIndex;
    var currentAdventure = (currentWorld.adventures && currentWorld.adventures[advIndex]) || (currentWorld.adventures && currentWorld.adventures[0]);
    var enemyPool = (currentAdventure && currentAdventure.enemyPool) || [];
    var filterMatchesCurrentWorld = Array.isArray(group.enemyFilter) && group.enemyFilter.some(function (id) { return enemyPool.indexOf(id) !== -1; });

    var pseudoQuest = {
      worldId: currentWorld.id,
      adventureIndex: advIndex,
      enemyFilter: filterMatchesCurrentWorld ? group.enemyFilter : undefined,
      /* v3.285.0 (accord Seb) : un gabarit peut servir un GROUPE — « une meute de loups »
         est une meute, pas des loups à la file. Ces trois champs viennent de
         SCENE_NODES.combatGroups et sont lus par QuestEnemyManager.spawnFor, qui renvoie
         alors un tableau ; l'accesseur game.enemy l'accepte depuis le lot L-3. */
      group: group.group,
      groupHpMult: group.groupHpMult,
      groupGoldMult: group.groupGoldMult
    };
    /* v3.331.0 (suite du recalage, plan C) : un canevas règle la force de SES combats —
       combatPowerMult (dégâts des ennemis) et combatHpMult (PV, groupes compris). Absents : ×1. */
    var tplCombat = SceneEngine.getTemplate(run.templateId) || {};
    if (tplCombat.combatPowerMult) pseudoQuest.enemyPowerMult = tplCombat.combatPowerMult;
    if (tplCombat.combatHpMult) {
      pseudoQuest.enemyHpMult = tplCombat.combatHpMult;
      if (pseudoQuest.groupHpMult) pseudoQuest.groupHpMult = pseudoQuest.groupHpMult * tplCombat.combatHpMult;
    }
    var enemy = QuestEnemyManager.spawnFor(pseudoQuest, !!forceBoss);
    if (!enemy) return false;

    game.enemy = enemy;
    if (window.CombatEngine && typeof CombatEngine.prepareEnemy === "function") CombatEngine.prepareEnemy(enemy);
    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
    return true;
  },

  /* Monde et aventure des combats d'un run (voir _spawnNextCombatEnemy). L'aventure déclarée
     par le canevas fait foi ; sinon celle de résidence si c'est le même monde, sinon la 1re. */
  _combatPlace: function (run) {
    var template = SceneEngine.getTemplate(run.templateId) || {};
    var worldId = template.worldId || null;
    if (!worldId && run.livingMap && window.LIVING_MAPS && LIVING_MAPS[run.livingMap.mapId]) worldId = LIVING_MAPS[run.livingMap.mapId].worldId;
    var idx = worldId ? WORLDS.findIndex(function (w) { return w.id === worldId; }) : -1;
    if (idx === -1) idx = Number(WorldManager.worldIndex || 0);
    var world = WORLDS[idx] || WORLDS[0];
    var adv;
    if (typeof template.adventureIndex === "number") adv = template.adventureIndex;
    else adv = (idx === Number(WorldManager.worldIndex || 0)) ? Number(WorldManager.adventureIndex || 0) : 0;
    return { world: world, adventureIndex: adv };
  },

  /* v3.298.0 (W-1b) — JOURNAL SCRIPTÉ PAR PALIER. Un canevas peut déclarer journalByDepth :
     { 1: "texte", 3: { before: "…", after: "…" } } (paliers comptés à partir de 1). « before »
     s'affiche à l'arrivée sur le palier, « after » une fois le palier franchi (utile après un
     combat). Chaque ligne ne sort qu'une fois par run (run.journalShown, sauvegardé avec lui).
     Le moteur ne fait que rendre les lignes dues ; la vue les inscrit au journal. */
  takeJournalLines: function (run) {
    run = run || this.getRun();
    var template = run ? SceneEngine.getTemplate(run.templateId) : null;
    // v3.312.0 : lignes posées par le run lui-même (échos d'événement), rendues une fois
    var extra = [];
    if (run && Array.isArray(run.extraLines) && run.extraLines.length) { extra = run.extraLines; run.extraLines = []; }
    var entries = template && template.journalByDepth;
    if (!entries) return extra;
    if (!run.journalShown || typeof run.journalShown !== "object") run.journalShown = {};
    var out = extra.slice();
    var shown = run.journalShown;
    var take = function (key, text) { if (text && !shown[key]) { shown[key] = true; out.push(text); } };
    var cur = run.depth + 1;
    for (var d = 1; d <= cur; d++) {
      var e = entries[d];
      if (!e) continue;
      take("b" + d, typeof e === "string" ? e : e.before);
      if (d < cur || run.status === "finale") take("a" + d, typeof e === "string" ? null : e.after);
    }
    return out;
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

    /* v3.285.0 : une vague se compte en RENCONTRES, plus en têtes — et ça n'a demandé
       aucune garde ici. Quand un membre de groupe tombe alors qu'il en reste, combat-engine
       le retire du groupe et s'arrête là sans prévenir le run ; seule la mort du DERNIER
       membre traverse jusqu'ici. Une meute vaut donc un cran, comme un ennemi seul.
       Sans ce comptage, une meute de deux aurait vidé la vague deux fois plus vite, donc
       pour moitié moins cher. */
    run._combatWaveKills = Number(run._combatWaveKills || 0) + 1;

    if (run._combatWaveKills < Number(run._combatWaveTarget || 1)) {
      this._spawnNextCombatEnemy(run, false); // vague pas terminée : ennemi suivant
      if (typeof saveGame === "function") saveGame();
      return;
    }

    if (run._combatIsFinalWave) {
      // Dernier kill de la dernière vague du run : le boss de l'aventure apparaît.
      run._combatBossSpawned = true;
      addLog("👑 " + _t("Le silence, d'un coup. Quelque chose de plus lourd arrive."), "event"); // v3.197.0 (bible B §4.4)
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
    game.heroHp = 0; // v3.327.0 : Sang-froid retiré (décision T9)
    // v3.197.0 (bible B §4.4) ; v3.304.0 : un canevas peut déclarer sa ligne (deathLine), le Désert n'est pas la forêt
    var deathTpl = SceneEngine.getTemplate(run.templateId);
    addLog("💀 " + ((deathTpl && deathTpl.deathLine) ? _td(deathTpl.deathLine) : _t("Le parcours s'arrête là. Ce que tu portais reste dans la forêt. Retour au feu.")), "event");
    vibrate([80, 40, 80]);

    run.status = "completed";
    this._refundPetiteAventureSlot(run); // v3.355.0 (D6)
    this._notifyLivingMap(run, "fail"); // v3.256.0 (décision 4) : la mort compte comme un échec
    if (run.livingMapReport && run.livingMapReport.message && typeof showToast === "function") showToast(run.livingMapReport.message, 2600);
    game.justDied = true;
    if (typeof switchTab === "function") switchTab("campement");
    if (typeof saveGame === "function") saveGame();
  }
};

window.SceneRunManager = SceneRunManager;

/* v3.307.0 : raison affichable du verrou héros, ou null. Lu par les systèmes et les vues. */
var HERO_LOCK_REASON = _t("Ton héros est en expédition : termine-la d'abord."); // v3.370.0 : traduit à la définition (i18n D2)
function heroLockReason() {
  return (window.SceneRunManager && SceneRunManager.isHeroEngaged()) ? HERO_LOCK_REASON : null;
}
/* Garde d'une ligne : true (et toast) si l'action doit être refusée. */
function heroLockToast() {
  var r = heroLockReason();
  if (r) {
    // v3.336.0 (F-2) : le refus propose de reprendre l'expédition
    if (typeof showHowToToast === "function") showHowToToast("🧭 " + r, "heroLock");
    else if (typeof showToast === "function") showToast("🧭 " + r, 1800);
  }
  return !!r;
}
window.HERO_LOCK_REASON = HERO_LOCK_REASON;
window.heroLockReason = heroLockReason;
window.heroLockToast = heroLockToast;
