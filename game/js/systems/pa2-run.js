"use strict";
/* systems/pa2-run.js — v3.381.0 (Petites Aventures v2, lot PA2-0) : règles d'un run v2, sans écran.
   Conception Petites Aventures v2 v1.1. Un canevas mode "pa2" est délégué ici par
   SceneRunManager.startRun ; le run vit dans game.sceneRun (déjà sauvegardé et repris), avec
   run.pa2 = true. Statuts : pa2-prep (besace, pactes) -> pa2-map <-> pa2-node -> completed.
   Données : data/pa2-maps.js (tracés), data/pa2-content.js (contenu, réglages « banc »). */

var PA2_STATUS = { prep: "pa2-prep", map: "pa2-map", node: "pa2-node", trap: "pa2-trap", done: "completed" }; // v3.467.0 : arrêté sur un piège

var Pa2Run = {
  /* ---------- Outils ---------- */

  // Tirage unique du module : les bancs graines Math.random, rien d'autre à faire.
  rand: function () { return Math.random(); },
  _int: function (a, b) { return a + Math.floor(this.rand() * (b - a + 1)); },
  _pick: function (list) { return list[Math.floor(this.rand() * list.length)]; },
  _weighted: function (w) {
    var keys = Object.keys(w), total = 0, i;
    for (i = 0; i < keys.length; i++) total += Number(w[keys[i]] || 0);
    var r = this.rand() * total;
    for (i = 0; i < keys.length; i++) { r -= Number(w[keys[i]] || 0); if (r < 0) return keys[i]; }
    return keys[keys.length - 1];
  },
  _clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },
  _save: function () { if (typeof saveGame === "function") saveGame(); },

  isTemplate: function (template) { return !!(template && (template.mode === "pa2" || template.mode === "parcours")); }, // v3.389.0 : parcours
  isParcours: function (run) { return !!(run && run.parcours); },
  isPaTemplate: function (template) { return !!(template && template.mode === "pa2"); }, // une Petite Aventure (réserve de places)
  getRun: function () { var r = game.sceneRun; return (r && r.pa2) ? r : null; },
  getMap: function (run) { run = run || this.getRun() || {}; return run.map || PA2_MAPS[run.mapId] || null; }, // parcours : tracé dans le run
  node: function (key, run) { run = run || this.getRun(); return (run && run.nodes) ? run.nodes[key] || null : null; },
  hasItem: function (id, run) { run = run || this.getRun(); return !!run && run.bag.indexOf(id) >= 0; },
  hasRelic: function (id, run) { run = run || this.getRun(); return !!run && !!run.relics && run.relics.indexOf(id) >= 0; }, // v3.469.5 : run sans reliques (murs lus hors run)
  hasPact: function (id, run) { run = run || this.getRun(); return !!run && run.pacts.indexOf(id) >= 0; },
  ring: function (run) {
    run = run || this.getRun();
    var r = PA2_RINGS[run.ring] || PA2_RINGS.sentier, g = this.gisantsMult(run);
    return g === 1 ? r : { ring: r.ring, label: r.label, diffMult: r.diffMult * g, foeMult: r.foeMult * g, lootMult: r.lootMult };
  },
  /* v3.454.0 (Crypte, CR9) : les gisants réveillés au départ, et « Le réveil » (couloir raté du jour)
     rendent le secteur plus dur. Lu sur la carte vivante (gisants.wakeMult, hostileMult). */
  gisantsMult: function (run) {
    var lm = run && run.livingMap, map = lm && window.LIVING_MAPS ? LIVING_MAPS[lm.mapId] : null, g = map && map.gisants;
    if (map && map.veins) { // v3.489.0 (Montagne, MT9) : la chaleur du secteur, puis La coulée du jour
      var LMm = window.LivingMapManager, v = map.veins;
      var mv = 1 + Number(v.heatStep || 0) * (LMm && LMm.heatOf ? LMm.heatOf(lm.mapId, lm.sectorId) : 0);
      if (LMm && LMm.isHostile && LMm.isHostile(lm.mapId, lm.sectorId)) mv *= Number(v.hostileMult || 1);
      return mv;
    }
    if (!g) return 1;
    var m = lm.wake ? Number(g.wakeMult || 1) : 1;
    if (window.LivingMapManager && LivingMapManager.isHostile && LivingMapManager.isHostile(lm.mapId, lm.sectorId)) m *= Number(g.hostileMult || 1);
    return m;
  },
  /* v3.386.0 : réglage propre au tracé (tune: { foeMult, lootMult }), pour qu'une carte longue pèse autant qu'une courte. */
  // v3.469.0 (PG-B1) : condition du run ; condFx(run, clé) lit son réglage (0 / faux sans condition).
  _drawCondition: function (worldId) {
    var list = Object.keys((window.PA2_CONDITIONS || {})[worldId] || {});
    if (!list.length || this.rand() < Number((PA2_CONDITION_RULES || {}).calmPct || 0)) return "calme";
    return this._pick(list);
  },
  condition: function (run) {
    run = run || this.getRun();
    if (!run || !run.cond || this.isParcours(run)) return null;
    if (run.cond === "calme") return PA2_CONDITION_CALM;
    var c = ((window.PA2_CONDITIONS || {})[run.worldId] || {})[run.cond];
    return c ? c : null;
  },
  condFx: function (run, key) { var c = this.condition(run); return c && c.fx ? c.fx[key] : undefined; },
  tune: function (run, key) { var m = this.getMap(run), t = m && m.tune; return Number((t && t[key]) || 1); },
  /* Profondeur des jets ramenée à l'échelle de la carte courte (destination en 9) : même courbe sur une carte longue. */
  _depth: function (n, run) { return this.isParcours(run || this.getRun()) ? n.row : n.row * 9 / this.rows(this.getMap(run)).dest; },
  // v3.387.0 (PA2-5) : règles, lieux et objets propres à un monde (soif du Désert, oasis, Outre).
  worldRule: function (run, key) { var r = window.PA2_WORLD_RULES && PA2_WORLD_RULES[(run || this.getRun()).worldId]; return r ? r[key] : undefined; },
  place: function (run, key) { var w = window.PA2_PLACES_BY_WORLD && PA2_PLACES_BY_WORLD[(run || this.getRun()).worldId]; return (w && w[key]) || PA2_PLACES[key]; },
  itemInWorld: function (itemId, run) { var it = PA2_ITEMS[itemId]; return !!it && (!it.worlds || it.worlds.indexOf((run || this.getRun()).worldId) >= 0); },
  lootMult: function (run) { return this.ring(run).lootMult * this.tune(run, "lootMult"); },
  // v3.385.0 (PA2-4, E1) : les rangées du camp, du seuil et des destinations viennent du tracé
  // (map.rows), pour les cartes longues. Sans rows : 3 / 7 / 9, le tracé court de foret_1.
  rows: function (map) {
    var r = (map && map.rows) || {};
    return { camp: r.camp != null ? r.camp : 3, seuil: r.seuil != null ? r.seuil : 7, dest: r.dest != null ? r.dest : 9 };
  },
  actOf: function (row, map) {
    var r = this.rows(map || this.getMap());
    return row <= r.camp ? 1 : (row <= r.seuil ? 2 : 3);
  },
  isDest: function (n, run) { return !!n && n.row === this.rows(this.getMap(run)).dest; },

  /* ---------- Coffre d'expédition (Q8) ---------- */

  ensureChest: function () {
    if (!game.expeditionChest || typeof game.expeditionChest !== "object") game.expeditionChest = { unlocked: {} };
    if (!game.expeditionChest.unlocked || typeof game.expeditionChest.unlocked !== "object") game.expeditionChest.unlocked = {};
    // v3.384.0 (PA2-2, D3) : trophées, dans le coffre déjà sauvegardé en entier (aucune ligne de save-system).
    if (!game.expeditionChest.stats || typeof game.expeditionChest.stats !== "object") game.expeditionChest.stats = { runs: 0, byWorld: {}, bestPacts: 0 };
    return game.expeditionChest;
  },
  // Trophées d'un monde : réussites et destinations atteintes (base des futurs Hauts faits, Q12).
  trophies: function (worldId) {
    var st = this.ensureChest().stats;
    if (!st.byWorld[worldId]) st.byWorld[worldId] = { success: 0, dests: {} };
    return st.byWorld[worldId];
  },
  _recordTrophy: function (run, end) {
    var st = this.ensureChest().stats;
    st.runs += 1;
    if (end.how !== "dest" || !end.dest) return;
    var t = this.trophies(run.worldId);
    t.success += 1;
    t.dests[end.dest] = (t.dests[end.dest] || 0) + 1;
    st.bestPacts = Math.max(Number(st.bestPacts || 0), run.pacts.length);
  },

  /* ---------- Ce que l'ancien mode comptait (PA2-2, D1 et D2) ---------- */

  // D1 : la meute abattue compte comme des victoires (compteur, Bestiaire, quêtes « tuer N »).
  _creditKills: function (n, foe) {
    var count = n.type === "boss" ? 1 : Math.max(1, Number(n.pack || 1)), id = foe && foe.id;
    game.totalKills = Number(game.totalKills || 0) + count;
    if (id) { game.killCounts = game.killCounts || {}; game.killCounts[id] = (game.killCounts[id] || 0) + count; }
  },
  // D2 : le gardien lâche un objet comme l'ancien boss final (50 % + bonus), dans le butin de sortie.
  _guardianDrop: function () {
    if (!window.LootSystem || typeof LootSystem.rollDrop !== "function") return null;
    var pct = 50 + Number(game.equipDropChancePct || 0);
    if (this.rand() * 100 >= pct) return null;
    var drop = LootSystem.rollDrop();
    if (!drop) return null;
    var ok = window.CombatEngine && typeof CombatEngine.grantDrop === "function" ? CombatEngine.grantDrop(drop)
      : (window.SortieManager && SortieManager.isActive() ? (SortieManager.addItem(drop), true) : false);
    return ok ? drop : null;
  },
  _log: function (text) { if (typeof addLog === "function") addLog(text, "event"); },

  /* ---------- Accroches : suites différées (V19, PA2-4 E2) ---------- */

  _hook: function (run) { return run && run.hookId ? PA2_HOOKS[run.hookId] || null : null; },
  // Branche choisie à la rencontre (null avant, ou si la rencontre n'a pas eu lieu).
  hookBranch: function (run) { return run.flags.hookBranch || null; },
  // Or des destinations : Maddoc passé en prend une part, le feu nourri en ajoute.
  destGoldMult: function (run) {
    var h = this._hook(run), b = this.hookBranch(run);
    if (!h || !h.destGold || !b || h.destGold[b] == null) return 1;
    return Number(h.destGold[b]);
  },
  // Pierre marquée : +1 cran partout, combats plus durs (la marque pique, mais elle paie).
  _marked: function (run) { var h = this._hook(run); return !!(h && h.mark && this.hookBranch(run) === h.mark.branch); },
  // Ligne d'écho posée sur un nœud : le joueur fait le lien seul (bible B §5.4).
  _echo: function (run, n) {
    var h = this._hook(run), b = this.hookBranch(run);
    if (!h || !h.echo || !b) return;
    if (h.mark && b === h.mark.branch && !run.flags.markEcho && h.echo.mark) { n.echo = h.echo.mark; run.flags.markEcho = true; return; }
    if (this.isDest(n, run) && h.echo.dest && h.destGold && h.destGold[b] != null) n.echo = h.echo.dest;
  },
  isUnlocked: function (itemId) {
    var it = PA2_ITEMS[itemId];
    return !!it && (!it.unlock || !!this.ensureChest().unlocked[itemId]);
  },

  /* ---------- Référence de niveau (Q3) ---------- */

  _worldIndex: function (worldId) {
    if (!window.WORLDS) return 0;
    for (var i = 0; i < WORLDS.length; i++) if (WORLDS[i].id === worldId) return i;
    return 0;
  },
  // Tranche du niveau, jamais sous le monde de la carte (plancher).
  levelBand: function (level, worldId) {
    var bands = PA2_LEVEL_BANDS, band = bands[0], i;
    for (i = 0; i < bands.length; i++) if (level >= bands[i].minLevel) band = bands[i];
    if (this._worldIndex(band.worldId) < this._worldIndex(worldId)) {
      for (i = 0; i < bands.length; i++) if (bands[i].worldId === worldId) return bands[i];
      return { minLevel: level, worldId: worldId, adventureIndex: 0, obstacleScale: band.obstacleScale };
    }
    return band;
  },
  // Ennemi de référence de la tranche (monde + aventure), sans toucher à game.enemy.
  _spawn: function (run, foeId, boss, band) {
    if (!window.QuestEnemyManager) return null;
    band = band || run.band;
    var q = { worldId: band.worldId, adventureIndex: band.adventureIndex };
    if (!boss && foeId) q.enemyFilter = [foeId];
    // v3.423.0 : l'ajustement du monde (D) est coupé ici, l'aventure applique le sien (heroScale)
    var W = window.WorldManager, was = W ? W._heroScaleOff : false;
    if (W) W._heroScaleOff = true;
    var e;
    try { e = QuestEnemyManager.spawnFor(q, !!boss); } finally { if (W) W._heroScaleOff = was; }
    return Array.isArray(e) ? e[0] : e;
  },

  /* v3.423.0 (chantier Difficulté, A) : ajustement à la force réelle du héros, figé au départ
     du run (un objet changé en route ne le refait pas). { hp, power, obstacle }. Un run d'une
     ancienne sauvegarde le calcule au premier besoin. */
  heroScale: function (run) {
    run = run || this.getRun();
    if (!run) return { hp: 1, power: 1, obstacle: 1 };
    if (run.heroScale && typeof run.heroScale.hp === "number") return run.heroScale;
    var cfg = window.PA2_HERO_SCALING, key = run.band && run.band.heroRef;
    var hs = (cfg && key && window.CombatForecast && typeof CombatForecast.getHeroScale === "function")
      ? CombatForecast.getHeroScale(key, cfg) : { hp: 1, power: 1 };
    var obs = cfg ? Math.pow(Math.sqrt(hs.hp * hs.power), Number(cfg.obstacleExp || 0)) : 1;
    run.heroScale = { hp: hs.hp, power: hs.power, obstacle: obs };
    return run.heroScale;
  },

  // Tranche qui paie (C3, PA2-3) : l'or de référence ne dépasse jamais le monde de la carte.
  goldBand: function (run) {
    var b = run.band, last = null;
    if (this._worldIndex(b.worldId) <= this._worldIndex(run.worldId)) return b;
    PA2_LEVEL_BANDS.forEach(function (x) { if (x.worldId === run.worldId) last = x; });
    return last || b;
  },

  // E3 (PA2-4) : jamais la même accroche deux fois de suite (dernière retenue dans le coffre).
  _drawHook: function (hooks) {
    // v3.387.0 (F3) : une accroche liée à l'Histoire n'est tirée qu'une fois par partie, quand l'étape le permet, et avant les autres.
    hooks = hooks.filter(function (h) {
      var d = PA2_HOOKS[h];
      if (!d || !d.storyFlag) return true;
      var ep = game.explorationProgression || {};
      return !ep[d.storyFlag.key] && (typeof d.eligible !== "function" || d.eligible());
    });
    if (!hooks.length) return null;
    var first = hooks.filter(function (h) { return PA2_HOOKS[h].priority; });
    if (first.length) { this.ensureChest().stats.lastHook = first[0]; return first[0]; }
    var st = this.ensureChest().stats, pool = hooks.filter(function (h) { return h !== st.lastHook; });
    var id = this._pick(pool.length ? pool : hooks);
    st.lastHook = id;
    return id;
  },

  /* ---------- Démarrage (appelé par SceneRunManager.startRun) ---------- */

  start: function (templateId, opts) {
    var template = SceneEngine.getTemplate(templateId);
    if (template.mode === "parcours") return this._startParcours(template, opts);
    var worldId = template.worldId || "forest";
    if (!SceneRunManager.canStartPetiteAventureToday() && !SceneRunManager.isStoryPaFree(worldId, opts && opts.livingMap)) { // v3.429.23
      return { ok: false, reason: SceneRunManager.petiteAventureWaitLabel(), run: null };
    }
    var maps = (window.PA2_MAPS_BY_WORLD && PA2_MAPS_BY_WORLD[worldId]) || [];
    if (!maps.length) return { ok: false, reason: _t("Expédition introuvable"), run: null };
    var ringId = "sentier";
    if (opts && opts.livingMap && window.LivingMapManager) {
      var def = LivingMapManager.getSectorDef(opts.livingMap.mapId, opts.livingMap.sectorId);
      if (def && PA2_RINGS[LivingMapManager.getIntensity(def)]) ringId = LivingMapManager.getIntensity(def);
    }
    var hooks = (window.PA2_HOOKS_BY_WORLD && PA2_HOOKS_BY_WORLD[worldId]) || [];
    var level = Math.max(1, Number(game.heroLevel || 1));
    var run = {
      id: "pa2_" + Date.now() + "_" + Math.floor(this.rand() * 100000),
      templateId: templateId,
      pa2: true,
      status: PA2_STATUS.prep,
      worldId: worldId,
      mapId: this._pick(maps),
      hookId: this._drawHook(hooks),
      cond: this._drawCondition(worldId), // v3.469.0 : condition du run, annoncée sur la préparation
      ring: ringId,
      level: level,
      band: this.levelBand(level, worldId),
      startedAt: Date.now(),
      heroSnapshot: SceneRunManager.buildHeroSnapshot(),
      bag: [], pacts: [], stock: {}, taken: {},
      nodes: null, at: null, path: [],
      breath: PA2_RULES.breathStart, wounds: 0,
      relics: [], flags: {}, reveal: {},
      fioleUsed: false, altarFreeUsed: false,
      refGold: 1, loot: 0, rareFound: 0,
      livingMap: (opts && opts.livingMap) ? { mapId: opts.livingMap.mapId, sectorId: opts.livingMap.sectorId, wake: !!opts.livingMap.wake } : null,
      livingMapReport: null,
      lastResult: null, end: null
    };
    game.sceneRun = run;
    this.heroScale(run); // v3.423.0 (A) : figé au départ
    this._save();
    return { ok: true, reason: null, run: run };
  },

  /* ---------- Parcours (v3.389.0, chantier P) : quêtes et étapes d'Histoire en ligne droite ---------- */

  /* Tracé calculé depuis template.parcours.steps : un nœud par étape, en lacet vers le nord.
     Une étape : { type, gabaritId?, foe?, pack?, act?, fullBreath?, text? }. Sans gabaritId,
     l'obstacle est tiré dans template.pools.obstacle. image : illustration de fond (facultative). */
  _parcoursMap: function (template) {
    var pc = template.parcours, steps = pc.steps, bg = pc.image && window.PA2_PARCOURS_IMAGES ? PA2_PARCOURS_IMAGES[pc.image] : null;
    var track = bg && bg.tracks[pc.track || Object.keys(bg.tracks)[0]];
    var W = bg ? bg.width : 848, H = bg ? bg.height : 200 + steps.length * 190, nodes = {}, links = {};
    // Fond illustré : points posés sur le chemin peint. Sans fond : lacet calculé sur le parchemin.
    nodes.S = bg ? { row: -1, x: bg.start[0], y: bg.start[1], type: "depart" } : { row: -1, x: 424, y: H - 90, type: "depart" };
    var prev = "S";
    steps.forEach(function (st, i) {
      var key = "P" + i, pt = track && track[pc.points ? pc.points[i] : i];
      nodes[key] = pt ? { row: i, x: pt[0], y: pt[1], type: st.type, act: st.act || 1 }
        : { row: i, x: Math.round(424 + 190 * Math.sin((i + 1) * 1.25)), y: Math.round(H - 90 - (i + 1) * 190), type: st.type, act: st.act || 1 };
      links[prev] = [key];
      prev = key;
    });
    return { id: "parcours_" + template.id, worldId: template.worldId || "forest", image: bg ? bg.image : null,
      width: W, height: H, start: "S", rows: { camp: 99, seuil: 99, dest: steps.length - 1 }, nodes: nodes, links: links };
  },
  _startParcours: function (template, opts) {
    var worldId = template.worldId || "forest", level = Math.max(1, Number(game.heroLevel || 1));
    var run = {
      id: "par_" + Date.now() + "_" + Math.floor(this.rand() * 100000),
      templateId: template.id, pa2: true, parcours: true,
      status: PA2_STATUS.prep, worldId: worldId, mapId: null, map: this._parcoursMap(template), hookId: null,
      ring: "sentier", level: level, band: this.levelBand(level, worldId),
      bagSize: Number(template.parcours.bag || 0),
      startedAt: Date.now(), heroSnapshot: SceneRunManager.buildHeroSnapshot(),
      bag: [], pacts: [], stock: {}, taken: {}, nodes: null, at: null, path: [],
      breath: PA2_RULES.breathStart, wounds: 0, relics: [], flags: {}, reveal: {},
      fioleUsed: false, altarFreeUsed: false, refGold: 1, loot: 0, rareFound: 0,
      livingMap: (opts && opts.livingMap) ? { mapId: opts.livingMap.mapId, sectorId: opts.livingMap.sectorId } : null,
      livingMapReport: null, lastResult: null, end: null
    };
    game.sceneRun = run;
    this.heroScale(run); // v3.423.0 (A) : figé au départ
    if (!run.bagSize) { // rien à préparer : on part tout de suite
      var d = this.depart();
      if (d && d.ok === false) { game.sceneRun = null; return { ok: false, reason: d.reason, run: null }; }
    }
    this._save();
    return { ok: true, reason: null, run: run };
  },
  bagSize: function (run) { run = run || this.getRun(); return run && run.bagSize != null ? run.bagSize : PA2_BAG_SIZE; },
  // Coût d'entrée du canevas (Petite ration, Ration moyenne), pris au départ.
  _payEntry: function (run) {
    var t = SceneEngine.getTemplate(run.templateId), c = t && t.entryCost;
    if (!c || !window.WarehouseManager) return { ok: true };
    var amt = Number(c.amount || 0);
    if (WarehouseManager.getAmount(c.resourceId) < amt) {
      var def = (window.WAREHOUSE_RESOURCES || {})[c.resourceId];
      return { ok: false, reason: _t("Pas assez de {x}", { x: def && def.name ? _td(def.name) : c.resourceId }) };
    }
    WarehouseManager.removeResource(c.resourceId, amt);
    return { ok: true };
  },
  // Fin d'un parcours : déblocage, voyage, carte vivante, Hauts faits (comme la chambre finale v1).
  _finishParcours: function (run) {
    var t = SceneEngine.getTemplate(run.templateId) || {};
    var res = this._parcoursResource(run);
    if (res) { this._creditResource(res, Number(t.lootRanges.finalSafe[0] || 0)); run.loot += Number(t.lootRanges.finalSafe[0] || 0); } // le bonus d'arrivée de la v1
    if (t.unlockOnSuccess) SceneRunManager._applyUnlock(t.unlockOnSuccess);
    if (t.travelOnSuccess && window.WorldTravel) WorldTravel.arrive(t.travelOnSuccess.worldId, t.travelOnSuccess.adventureIndex);
    return this.finish("parcours");
  },

  /* ---------- Préparation : besace (V11, Q5) et pactes (V14) ---------- */

  bagUsed: function (run) {
    run = run || this.getRun();
    return run.bag.reduce(function (s, id) { return s + Number((PA2_ITEMS[id] || {}).size || 0); }, 0);
  },
  _countInBag: function (run, id) { return run.bag.filter(function (x) { return x === id; }).length; },

  // canAdd(id) -> { ok, reason } : place, coffre, stock de l'Entrepôt, objet unique.
  canAdd: function (itemId) {
    var run = this.getRun(), it = PA2_ITEMS[itemId];
    if (!run || run.status !== PA2_STATUS.prep || !it) return { ok: false, reason: _t("Choix impossible") };
    if (!this.itemInWorld(itemId, run)) return { ok: false, reason: _t("Pas dans ce monde.") };
    if (!this.isUnlocked(itemId)) return { ok: false, reason: _td(it.lockedHint || "") };
    if (!it.uses && run.bag.indexOf(itemId) >= 0) return { ok: false, reason: _t("Déjà dans la besace.") };
    if (this.bagUsed(run) + it.size > this.bagSize(run)) return { ok: false, reason: _t("La besace est pleine.") };
    if (it.resource && window.WarehouseManager && this._countInBag(run, itemId) >= WarehouseManager.getAmount(it.resource)) {
      return { ok: false, reason: _t("Plus en réserve à l'Entrepôt.") };
    }
    return { ok: true, reason: null };
  },
  addItem: function (itemId) {
    var c = this.canAdd(itemId);
    if (!c.ok) return c;
    this.getRun().bag.push(itemId);
    this._save();
    return { ok: true, reason: null };
  },
  removeItem: function (index) {
    var run = this.getRun();
    if (!run || run.status !== PA2_STATUS.prep || index < 0 || index >= run.bag.length) return { ok: false, reason: _t("Choix impossible") };
    run.bag.splice(index, 1);
    this._save();
    return { ok: true, reason: null };
  },
  togglePact: function (pactId) {
    var run = this.getRun();
    if (!run || run.status !== PA2_STATUS.prep || !PA2_PACTS[pactId]) return { ok: false, reason: _t("Choix impossible") };
    var i = run.pacts.indexOf(pactId);
    if (i >= 0) run.pacts.splice(i, 1); else run.pacts.push(pactId);
    this._save();
    return { ok: true, reason: null };
  },
  pactMult: function (run) {
    run = run || this.getRun();
    return 1 + run.pacts.reduce(function (s, id) { return s + Number((PA2_PACTS[id] || {}).bonus || 0); }, 0);
  },

  // depart() : prélève les vivres, tire la carte, prend la place et ouvre la sortie.
  depart: function () {
    var run = this.getRun();
    if (!run || run.status !== PA2_STATUS.prep) return { ok: false, reason: _t("Choix impossible") };
    var par = this.isParcours(run);
    var storyFree = !par && SceneRunManager.isStoryPaFree(run.worldId, run.livingMap); // v3.429.23 : offerte par l'Histoire
    if (!par && !storyFree && !SceneRunManager.canStartPetiteAventureToday()) return { ok: false, reason: SceneRunManager.petiteAventureWaitLabel() };
    if (!(Number(game.heroHp || 0) > 0)) return { ok: false, reason: _t("Ton héros est à terre : soigne-le au Campement avant de partir.") };
    var taken = {}, self = this, fail = null;
    run.bag.forEach(function (id) {
      var it = PA2_ITEMS[id];
      if (fail || !it.resource) return;
      if (window.WarehouseManager && WarehouseManager.removeResource(it.resource, 1)) taken[it.resource] = (taken[it.resource] || 0) + 1;
      else fail = it.resource;
    });
    if (fail) {
      Object.keys(taken).forEach(function (k) { WarehouseManager.refundResource(k, taken[k]); });
      return { ok: false, reason: _t("Plus en réserve à l'Entrepôt.") };
    }
    if (par) { // parcours : son coût d'entrée, après la besace (tout-ou-rien)
      var pe = this._payEntry(run);
      if (!pe.ok) { Object.keys(taken).forEach(function (k) { WarehouseManager.refundResource(k, taken[k]); }); return pe; }
    }
    run.taken = taken;
    run.stock = {};
    var gUses = this.worldRule(run, "gourdeUses");
    run.bag.forEach(function (id) { var it = PA2_ITEMS[id]; if (it.uses) run.stock[id] = (run.stock[id] || 0) + (id === "gourde" && gUses ? gUses : it.uses); });
    // Q11 : Seconde gorgée (Mémoire) +1 gorgée, Gué tenu +1 corde.
    if (run.stock.gourde && window.MemoryManager && MemoryManager.has("seconde_gorgee")) run.stock.gourde += 1;
    if (run.stock.craie && window.LivingMapManager && LivingMapManager.hasEffect("craie_plus")) run.stock.craie += 1; // v3.429.0 : la rue qui tourne tenue
    if (run.stock.craie && window.MemoryManager && MemoryManager.has("craie_epaisse")) run.stock.craie += 1; // v3.453.0 : Craie épaisse (Mémoire 10)
    if (this.condFx(run, "chalkBonus")) run.stock.craie = Number(run.stock.craie || 0) + Number(this.condFx(run, "chalkBonus")); // v3.469.0
    if (run.stock.corde && window.LivingMapManager && LivingMapManager.hasEffect("corde_plus")) {
      run.stock.corde += Number(LivingMapManager.getEffectValue("ropeBonus", 1));
    }
    if (run.stock.pierre_froide && window.MemoryManager && MemoryManager.has("pierre_profonde")) run.stock.pierre_froide += Number(MemoryManager.V("pierre_profonde_uses")); // v3.489.0 : Pierre profonde (Mémoire 18)
    var ref = self._spawn(run, null, false, self.goldBand(run));
    run.refGold = Math.max(1, Number((ref && ref.goldReward) || 1));
    run.nodes = this.generate(run);
    run.cuts = this._placeCuts(run);   // v3.468.0 : sentiers coupés, avant les pièges
    run.traps = this._placeTraps(run); // v3.467.0 : pièges sur les sentiers
    run.fx = {};
    run.at = this.getMap(run).start;
    run.path = [];
    // v3.489.0 (Montagne, MT10) : la ligne de lave part derrière le départ ; elle avance à chaque pas
    if (this.worldRule(run, "lava") && !par) { run.lavaRow = this.node(run.at, run).row - Number(PA2_RULES.lavaStartBehind || 1) + Number(this.condFx(run, "lavaStart") || 0); run.lavaSteps = 0; }
    if (!par && !storyFree) { SceneRunManager._consumePetiteAventureSlot(); run.paSlotDay = SceneRunManager._today(); } // offerte : pas de place prise, rien à rendre en cas d'échec
    run.storyFree = storyFree;
    if (window.SortieManager) SortieManager.start("scene");
    run.status = PA2_STATUS.map;
    this._save();
    return { ok: true, reason: null };
  },

  /* ---------- Génération : contenu tiré sur le tracé fixe (V4) ---------- */

  generate: function (run) {
    var map = this.getMap(run), nodes = {}, free = [], self = this;
    Object.keys(map.nodes).forEach(function (key) {
      var d = map.nodes[key];
      var n = { key: key, row: d.row, act: d.act || self.actOf(d.row, map), type: d.type || null, done: false };
      nodes[key] = n;
      if (!n.type) free.push(n);
    });
    free.forEach(function (n) {
      n.type = (n.row === 0) ? self._pick(["obstacle", "combat"]) : self._weighted(PA2_NODE_WEIGHTS[n.act]);
    });
    // La rencontre d'abord (acte I), puis les garanties par acte : un combat et une trouvaille,
    // une source à l'acte II. Un nœud garanti n'est jamais repris par la garantie suivante.
    var locked = {};
    if (run.hookId) {
      var campRow = self.rows(map).camp;
      var early = free.filter(function (n) { return n.row >= 1 && n.row < campRow; });
      if (early.length) { var ev = self._pick(early); ev.type = "evenement"; locked[ev.key] = true; }
    }
    var ensure = function (act, type) {
      var pool = free.filter(function (n) { return n.act === act && n.row !== 0 && !locked[n.key]; });
      var has = pool.filter(function (n) { return n.type === type; });
      var chosen = has.length ? has[0] : (pool.length ? self._pick(pool) : null);
      if (!chosen) return;
      chosen.type = type;
      locked[chosen.key] = true;
    };
    [1, 2, 3].forEach(function (a) { ensure(a, "combat"); ensure(a, "trouvaille"); });
    ensure(2, "source");
    // v3.489.0 (Montagne, MT10) : une veine du chemin par acte, et des cases qui brûlent déjà
    if (this.worldRule(run, "lava") && !this.isParcours(run)) {
      [1, 2, 3].forEach(function (a) { ensure(a, "veine"); });
      free.forEach(function (n) { if (n.row >= 1 && n.type !== "veine" && self.rand() < Number(PA2_RULES.burningPct || 0)) n.burning = true; });
    }
    if (this.isParcours(run)) this._parcoursSteps(run, nodes);
    return nodes;
  },
  // Étapes d'un parcours : gabarit, ennemi, source pleine et texte, posés depuis le canevas.
  _parcoursSteps: function (run, nodes) {
    var t = SceneEngine.getTemplate(run.templateId), pool = (t.pools && t.pools.obstacle) || PA2_OBSTACLES[run.worldId] || PA2_OBSTACLES.forest, self = this;
    t.parcours.steps.forEach(function (st, i) {
      var n = nodes["P" + i];
      if (st.type === "obstacle") n.gabaritId = st.gabaritId || self._pick(pool);
      if (st.type === "combat") { n.foeId = st.foe; n.pack = Number(st.pack || 1); }
      if (st.fullBreath) n.fullBreath = true;
      if (st.text) n.narr = st.text;
      if (st.after) n.after = st.after;       // texte après le combat
      if (st.foeMult) n.foeMult = st.foeMult; // force propre à l'étape (la nuée de la traversée)
    });
  },

  /* ---------- Carte : visibilité (V7) et déplacement ---------- */

  // isVisible(key) : le TYPE du nœud est connu (lumière, repères, actes révélés, déjà parcouru).
  isVisible: function (key, run) {
    run = run || this.getRun();
    var n = this.node(key, run), here = this.node(run.at, run);
    if (!n || !here) return false;
    if (this.isParcours(run)) return true; // un parcours se voit en entier
    if (this.hasItem("veilleurs", run) || this.hasRelic("oeil", run)) return true;
    if (this.isDest(n, run) || n.type === "camp" || n.type === "seuil" || n.type === "depart") return true;
    if (key === run.at || this._walked(run, key)) return true;
    if (run.reveal[n.act]) return true;
    var sight = this.worldRule(run, "sightRows"); // v3.454.0 (Crypte) : l'obscurité
    var reach = (sight != null ? sight : PA2_RULES.sightRows) + (this.hasItem("torche", run) ? 1 : 0)
      + (Number(run.lanternLeft || 0) > 0 ? PA2_RULES.lanternRows : 0); // la Lanterne allumée
    if (this.fxLeft(run, "aveugle") > 0 && !this.hasItem("torche", run) && !(Number(run.lanternLeft || 0) > 0)) reach = Math.max(1, reach - 1); // v3.467.0 : Aveuglé
    if (this.condFx(run, "sight")) reach = Math.max(1, reach + Number(this.condFx(run, "sight"))); // v3.469.0 : brouillard, pleine lune…
    return n.row > here.row && n.row <= here.row + reach;
  },
  // isShown(key) : le nœud apparaît sur la carte (V7) — parcouru, repère, ou visible devant soi.
  isShown: function (key, run) {
    run = run || this.getRun();
    var n = this.node(key, run), here = this.node(run.at, run);
    if (!n || !here) return false;
    if (key === run.at || this._walked(run, key) || n.type === "depart" || this.isParcours(run)) return true;
    if (this.isDest(n, run) || n.type === "camp" || n.type === "seuil") return true;
    return n.row > here.row && this.isVisible(key, run);
  },
  _walked: function (run, key) { return run.path.some(function (e) { return e[1] === key; }); },
  /* v3.489.0 (Montagne) : brûlures d'une case (0 : sûre). Case brûlante : 1 ; sous la lave : 1 à 3 selon la
     profondeur. Le camp, le seuil, le départ et les destinations ne brûlent jamais. */
  burnLevel: function (key, run) {
    run = run || this.getRun();
    var n = this.node(key, run);
    if (!n || !this.worldRule(run, "lava") || n.type === "camp" || n.type === "seuil" || n.type === "depart" || this.isDest(n, run)) return 0;
    var lava = run.lavaRow != null && n.row <= run.lavaRow ? Math.min(3, run.lavaRow - n.row + 1) : 0;
    return Math.max(lava, n.burning ? 1 : 0);
  },
  burnCost: function (level, run) {
    if (!level) return 0;
    var c = level * Number(PA2_RULES.burnBreath || 0) - (this.hasRelic("obsidienne", run) ? Number(PA2_RULES.obsidienneBurn || 0) : 0);
    if (this.hasItem("eclat_trieur", run)) c = Math.ceil(c / 2);
    return Math.max(0, c);
  },
  // Le pas fait avancer la lave (Galet de la source : un pas sur deux) ; au camp et au seuil, on la distance.
  _advanceLava: function (run, n) {
    if (run.lavaRow == null) return;
    run.lavaSteps = Number(run.lavaSteps || 0) + 1;
    if (!this.hasItem("galet_source", run) || run.lavaSteps % Number(PA2_RULES.galetEvery || 2) === 0) run.lavaRow += 1;
    if (n && (n.type === "camp" || n.type === "seuil")) run.lavaRow = Math.min(run.lavaRow, n.row - Number(PA2_RULES.lavaStartBehind || 1));
  },
  // Entrer sur une case qui brûle : la Pierre froide d'abord, sinon du Souffle.
  _burn: function (run, key) {
    run.burnNote = null;
    var lv = this.burnLevel(key, run);
    if (!lv) return;
    if (Number(run.stock.pierre_froide || 0) > 0) {
      run.stock.pierre_froide -= 1;
      run.burnNote = _t("Le sol brûle. Tu poses la Pierre froide, et tu passes.");
    } else {
      var cost = this.burnCost(lv, run);
      run.breath = Math.max(0, run.breath - cost);
      run.burnNote = _t("Le sol brûle sous tes pieds : −{n} Souffle.", { n: cost });
    }
    this._log("🔥 " + run.burnNote);
  },
  openMoves: function () {
    var run = this.getRun();
    if (!run || run.status !== PA2_STATUS.map) return [];
    return (this.links(run)[run.at] || []).slice();
  },

  /* v3.429.0 (Ruines, U-6) — LES MURS BOUGENT. Le tracé du run : celui de la carte, sauf les
     nœuds dont un mur a bougé (run.walls[nœud] = sorties du moment). */
  links: function (run) {
    run = run || this.getRun();
    var base = (this.getMap(run) || {}).links || {};
    if (!run || (!run.walls && !run.cuts)) return base;
    var out = {}, cuts = run.cuts || {};
    Object.keys(base).forEach(function (k) {
      out[k] = (run.walls && run.walls[k]) || base[k];
      if (run.cuts) out[k] = out[k].filter(function (b) { return !cuts[k + ">" + b]; }); // v3.468.0 : sentiers coupés
    });
    return out;
  },

  /* Après un pas : une chance qu'une bascule de la carte (map.shifts) joue DEVANT le héros.
     La Craie (2 traits) l'empêche si le nœud est à portée de vue (PA2_RULES.wallChalkRows). */
  _shiftWalls: function (run) {
    var map = this.getMap(run), here = this.node(run.at, run), self = this;
    if (!map || !map.shifts || !here || this.isParcours(run) || this.hasRelic("fil", run)) return null; // v3.469.5 : Fil d'Edda
    if (this.rand() >= Number(PA2_RULES.wallShiftPct || 0) * Number(this.condFx(run, "wallShiftMult") || 1)) return null; // v3.469.0 : les murs s'agitent
    var cand = map.shifts.filter(function (sh) { var n = map.nodes[sh.from]; return n && n.row > here.row && !self._walked(run, sh.from); });
    if (!cand.length) return null;
    var sh = this._pick(cand), from = map.nodes[sh.from];
    if (!run.walls) run.walls = {};
    var cur = run.walls[sh.from] || map.links[sh.from] || [];
    var next = cur.join() === sh.a.join() ? sh.b : sh.a;
    var closed = cur.filter(function (k) { return next.indexOf(k) < 0; }), opened = next.filter(function (k) { return cur.indexOf(k) < 0; });
    if (Number(run.stock.craie || 0) > 0 && (this.hasItem("craie", run) || this.condFx(run, "chalkBonus")) && from.row - here.row <= Number(PA2_RULES.wallChalkRows || 2)) {
      run.stock.craie -= 1;
      run.wallNote = _t("Un mur a voulu bouger devant toi. Le trait de craie a tenu.");
      this._log("🖍️ " + run.wallNote);
      return { chalk: true, from: sh.from };
    }
    run.walls[sh.from] = next.slice();
    run.wallNote = opened.length ? _t("Un mur a bougé devant toi : un passage s'est fermé, un autre s'est ouvert.") : _t("Un mur a bougé devant toi : un passage s'est fermé.");
    this._log("🧱 " + run.wallNote);
    return { from: sh.from, closed: closed, opened: opened };
  },

  moveTo: function (key) {
    var run = this.getRun();
    if (this.openMoves().indexOf(key) < 0) return { ok: false, reason: _t("Ce chemin n'est pas praticable d'ici.") };
    // v3.467.0 (Pièges) : un sentier piégé arrête le héros au milieu, avant le pas
    var tk = run.at + ">" + key, tr = run.traps && run.traps[tk];
    if (tr && !tr.done) {
      run.trap = { key: tk, from: run.at, to: key, unseen: !this.isTrapShown(tk, run), result: null };
      tr.seen = true;
      run.status = PA2_STATUS.trap;
      run.lastResult = null;
      this._save();
      return { ok: true, reason: null, trap: true };
    }
    return this._step(run, key, false);
  },
  // Le pas lui-même : Souffle de marche, effets en cours (sauf le pas du piège), nœud préparé.
  _step: function (run, key, fromTrap) {
    run.fxNote = null;
    run.path.push([run.at, key]);
    run.at = key;
    var step = (this.hasPact("lourd", run) ? PA2_RULES.heavyStep : 0) + (this.hasRelic("ronce", run) ? PA2_RULES.ronceStep : 0)
      + Number(this.worldRule(run, "stepBreath") || 0) // v3.387.0 : la soif du Désert
      + Number(this.condFx(run, "stepBreath") || 0) // v3.469.0 : canicule, nuit fraîche, courants d'air
      - (this.hasItem("ecaille", run) ? PA2_RULES.ecailleStep : 0) // v3.469.4 : Écaille du Ver
      - (this.hasRelic("perle", run) ? PA2_RULES.perleStep : 0); // v3.469.5 : Perle de rosée
    step = Math.max(0, step);
    if (step) run.breath = Math.max(0, run.breath - step);
    if (this.hasRelic("braise", run)) this._heal(game.heroMaxHp * PA2_RULES.braiseHealPct);
    if (!fromTrap && !this._tickFx(run)) return { ok: true, reason: null, ko: true }; // le Venin peut achever
    this._advanceLava(run, this.node(key, run)); // v3.489.0 (Montagne) : la lave avance, puis le sol brûle peut-être
    this._burn(run, key);
    this._prepareNode(run, this.node(key, run));
    run.wallNote = null;
    this._shiftWalls(run); // v3.429.0 (Ruines) : les murs bougent
    if (Number(run.lanternLeft || 0) > 0) run.lanternLeft -= 1; // v3.454.0 : la mèche brûle à chaque pas
    run.status = PA2_STATUS.node;
    run.lastResult = null;
    this._save();
    return { ok: true, reason: null, node: this.node(key, run) };
  },

  /* v3.422.0 (point ouvert 4.2, option A de Seb) : une Petite Aventure lancée depuis un
     secteur de carte vivante tire ses obstacles d'abord dans le pool du secteur
     (living-maps.js, content.pools.obstacle) : 3 fois sur 4, le reste dans le pool du monde
     pour la variété. Calculé à la volée : rien de nouveau dans la sauvegarde. */
  SECTOR_OBSTACLE_SHARE: 0.75,
  _sectorObstacles: function (run) {
    var lm = run && run.livingMap;
    if (!lm || !window.LivingMapManager || typeof LivingMapManager.getContentFor !== "function") return [];
    var c = LivingMapManager.getContentFor(lm.mapId, lm.sectorId);
    var bank = SceneEngine.getNodeBank().obstacles || {};
    return ((c && c.pools && c.pools.obstacle) || []).filter(function (id) { return !!bank[id]; });
  },
  _obstaclePool: function (run) {
    var own = this._sectorObstacles(run);
    if (own.length && this.rand() < this.SECTOR_OBSTACLE_SHARE) return own;
    return PA2_OBSTACLES[run.worldId] || PA2_OBSTACLES.forest;
  },

  _prepareNode: function (run, n) {
    var t = n.type;
    if (t === "obstacle" || t === "tertre") {
      var gid = n.gabaritId || ((t === "tertre") ? ((PA2_OBSTACLE_TERTRE.byWorld || {})[run.worldId] || PA2_OBSTACLE_TERTRE.gabaritId) : this._pick(this._obstaclePool(run)));
      var gab = SceneEngine.getNodeBank().obstacles[gid];
      var base = (t === "tertre") ? PA2_OBSTACLE_TERTRE.baseDifficulty : Number(gab.baseDifficulty || 4);
      n.gabaritId = gid;
      n.diff = SceneCheckSystem.depthDifficulty(base, this._depth(n, run)) * this.ring(run).diffMult * Number(run.band.obstacleScale || 1) * this.heroScale(run).obstacle;
    } else if (t === "combat") {
      var hook = run.hookId ? PA2_HOOKS[run.hookId] : null;
      if (n.foeId && this.isParcours(run)) {
        // parcours : l'ennemi est celui de l'étape
      } else if (hook && hook.revenge && run.flags.vole && n.act >= 2 && !run.flags.revenge) {
        run.flags.revenge = true; n.revenge = true; n.foeId = hook.revenge.foe; n.pack = 1;
      } else {
        n.foeId = this._pick(((PA2_FOES[run.worldId] || PA2_FOES.forest)[n.act]));
        n.pack = PA2_ACTS[n.act].pack;
        // L'homme du gouffre aidé : au premier combat de l'acte II ou III, une pierre depuis les fourrés.
        if (hook && hook.assist && this.hookBranch(run) && hook.assist.branches.indexOf(this.hookBranch(run)) >= 0 && n.act >= 2 && !run.flags.assisted) {
          run.flags.assisted = true; n.assist = true; n.pack = Math.max(1, n.pack - 1); n.echo = hook.echo.assist;
        }
      }
      if (run.fx && run.fx.alarme) { n.pack = Number(n.pack || 1) + 1; n.alarm = true; delete run.fx.alarme; } // v3.467.0 : l'Alarme
      if (this.condFx(run, "firstCombatExtra") && !this.isParcours(run) && !run.flags["firstCombat" + n.act]) { // v3.469.0 : nuit fraîche, dormeurs
        run.flags["firstCombat" + n.act] = true; n.pack = Number(n.pack || 1) + Number(this.condFx(run, "firstCombatExtra")); n.condExtra = true;
      }
      n.diff = SceneCheckSystem.depthDifficulty(5, this._depth(n, run)) * this.ring(run).diffMult * Number(run.band.obstacleScale || 1) * this.heroScale(run).obstacle;
    } else if (t === "boss") {
      n.pack = 1;
    } else if (t === "trouvaille") {
      n.draw = this.drawRelics(run, Math.max(this.hasItem("carte", run) ? 2 : 1, Number(this.condFx(run, "relicDraw") || 1))); // v3.469.0 : braconniers
    }
    if (!n.echo) this._echo(run, n);
  },

  /* ---------- PV, Souffle, butin ---------- */

  _heal: function (amount) {
    var before = Number(game.heroHp || 0);
    game.heroHp = Math.min(game.heroMaxHp, before + Math.round(amount));
    return game.heroHp - before;
  },
  // _hurt : applique les dégâts ; KO -> Fiole noire, sinon fin du run. Renvoie false si le run s'arrête.
  _hurt: function (run, amount) {
    game.heroHp = Math.max(0, Number(game.heroHp || 0) - Math.max(1, Math.round(amount)));
    if (game.heroHp > 0) return true;
    if (this.hasItem("fiole", run) && !run.fioleUsed) {
      run.fioleUsed = true;
      game.heroHp = Math.max(1, Math.round(game.heroMaxHp * PA2_RULES.fioleHpPct));
      return true;
    }
    this.finish("ko");
    return false;
  },
  _gold: function (run, amount) {
    var v = Math.max(0, Math.round(amount * (this.hasRelic("ronce", run) ? PA2_RULES.ronceLoot : 1)));
    if (v <= 0) return 0;
    var res = this._parcoursResource(run);
    if (res) { // quête de déblocage : son butin est une ressource (bois, blé…), barème de la v1
      var n = this.node(run.at, run), t = SceneEngine.getTemplate(run.templateId), r = t.lootRanges.obstacleSuccess;
      var units = Math.max(1, Math.round(v / (run.refGold * PA2_GOLD.obstacle) * (r[0] + r[1]) / 2 * SceneCheckSystem.depthLootMultiplier(n ? n.row : 0)));
      this._creditResource(res, units);
      run.loot += units; // le compteur du run suit la ressource de la quête
      return units;
    }
    run.loot += v;
    if (window.SortieManager) SortieManager.addGold(v);
    return v;
  },
  // Ressource de butin d'un parcours (template.lootResource autre que l'or), ou null.
  _parcoursResource: function (run) {
    if (!this.isParcours(run)) return null;
    var t = SceneEngine.getTemplate(run.templateId);
    return (t && t.lootResource && t.lootResource !== "gold" && t.lootRanges) ? t.lootResource : null;
  },
  _creditResource: function (res, units) {
    if (typeof hasLegendaryPower === "function" && hasLegendaryPower("leg_collectionneur")) units += 1; // Collectionneur, comme en v1
    if (window.SortieManager) SortieManager.addResource(res, units);
  },
  _pay: function (run, amount) {
    var s = window.SortieManager ? SortieManager.ensure() : null;
    run.loot = Math.max(0, run.loot - amount);
    if (s) s.loot.gold = Math.max(0, Number(s.loot.gold || 0) - amount);
  },
  _done: function (run, n, result) {
    n.done = true;
    run.lastResult = result || null;
    if (run.status !== PA2_STATUS.done) run.status = PA2_STATUS.map;
    if (this.isParcours(run) && run.status !== PA2_STATUS.done && this.isDest(n, run)) this._finishParcours(run);
    this._save();
    return { ok: true, reason: null, result: result || null };
  },
  _current: function (types) {
    var run = this.getRun();
    if (!run || run.status !== PA2_STATUS.node) return null;
    var n = this.node(run.at, run);
    if (!n || n.done || (types && types.indexOf(n.type) < 0)) return null;
    return n;
  },

  // Objets de besace utilisables à tout moment du run (rations, gourde).
  useItem: function (itemId) {
    var run = this.getRun(), it = PA2_ITEMS[itemId];
    if (!run || (run.status !== PA2_STATUS.map && run.status !== PA2_STATUS.node && run.status !== PA2_STATUS.trap) || !it || !(run.stock[itemId] > 0)) {
      return { ok: false, reason: _t("Choix impossible") };
    }
    if (it.light) { // v3.454.0 (Crypte) : allumer la Lanterne ; Mèche longue (Mémoire 14) +2 pas
      if (Number(run.lanternLeft || 0) > 0) return { ok: false, reason: _t("La Lanterne est déjà allumée.") };
      run.lanternLeft = Math.max(1, PA2_RULES.lanternSteps + Number(this.condFx(run, "lanternSteps") || 0)) + ((window.MemoryManager && MemoryManager.has("meche_longue")) ? 2 : 0) // v3.469.0 : mèches humides
        + (this.hasRelic("meche", run) ? PA2_RULES.mecheSteps : 0) // v3.469.5 : Mèche de Sarkel
        + ((window.LivingMapManager && LivingMapManager.hasEffect("lanterne_plus")) ? 1 : 0); // l'obélisque tenu
    } else if (it.breath) {
      if (run.breath >= 100) return { ok: false, reason: _t("Ton Souffle est déjà plein.") };
      var amt = it.breath;
      if (itemId === "gourde" && window.LivingMapManager && LivingMapManager.hasEffect("gourde_40")) amt = Number(LivingMapManager.getEffectValue("gourdeBreath", 40));
      amt = this.drinkAmount(itemId, amt);
      run.breath = Math.min(100, run.breath + amt);
    } else {
      if (it.uses && !it.healPct) return { ok: false, reason: _t("Choix impossible") }; // corde, trousse, craie : pas à boire
      if (game.heroHp >= game.heroMaxHp && !(it.healsWound && run.wounds > 0) && !(this.fxLeft(run, "venin") > 0)) return { ok: false, reason: _t("Tu es en pleine forme.") };
      this._heal(game.heroMaxHp * Number(it.healPct || 0));
      if (run.fx) delete run.fx.venin; // v3.467.0 : une ration lève le Venin
      if (it.healsWound && run.wounds > 0) run.wounds -= 1;
    }
    run.stock[itemId] -= 1;
    this._save();
    return { ok: true, reason: null };
  },
  // v3.387.0 (F2) : l'Outre, comme en v1 : puits sec tenu +15, puis Outre de cuir (Mémoire) ×1,5.
  drinkAmount: function (itemId, amt) {
    var it = PA2_ITEMS[itemId];
    if (amt == null) amt = Number(it.breath || 0);
    if (it.bonusEffect && window.LivingMapManager && LivingMapManager.hasEffect(it.bonusEffect)) amt += Number(LivingMapManager.getEffectValue("outreBreathBonus", 15));
    if (itemId === "outre" && window.MemoryManager && MemoryManager.has("outre_cuir")) amt = Math.floor(amt * 1.5);
    return amt;
  },
  _rationInStock: function (run) {
    var ids = ["petite_ration", "ration", "grande_ration"];
    for (var i = 0; i < ids.length; i++) if (run.stock[ids[i]] > 0) return ids[i];
    return null;
  },

  /* ---------- Jets : quatre crans et un dé (V16) ---------- */

  // Seuil du dé (2 à 6) à partir de la chance du moteur de scène, bonus et blessures compris.
  dieThreshold: function (chancePct, bonusSteps, wounds) {
    var t = Math.round(7 - 6 * Number(chancePct || 0) / 100);
    return this._clamp(t - Number(bonusSteps || 0) + Number(wounds || 0), 2, 6);
  },
  cranOf: function (thr) { return thr <= 2 ? "sur" : (thr === 3 ? "probable" : (thr >= 6 ? "desespere" : "risque")); },
  roll: function (thr) {
    var r = this._int(1, 6);
    return { roll: r, kind: r >= thr ? "ok" : (r === thr - 1 ? "mid" : "ko") };
  },
  _check: function (run, stat, diff, bonusSteps) {
    var val = Number(run.heroSnapshot[stat] || 0);
    var chance = SceneCheckSystem.successChance(val, diff);
    var bonus = Number(bonusSteps || 0) + (this._marked(run) ? 1 : 0);
    var thr = this.dieThreshold(chance, bonus, run.wounds);
    return { stat: stat, statValue: val, difficulty: Math.round(diff), chance: chance, thr: thr, cran: this.cranOf(thr), bonus: bonus };
  },
  _profiles: function (run) {
    var t = SceneEngine.getTemplate(run.templateId);
    return (t && t.optionProfiles) || SceneEngine.getNodeBank().optionProfiles;
  },

  /* ---------- Pièges (v3.467.0, conception PG-A à PG-G) ---------- */

  fxLeft: function (run, id) { var f = (run || this.getRun() || {}).fx; return f ? Number(f[id] || 0) : 0; },
  _walkedLink: function (run, key) { return run.path.some(function (e) { return e[0] + ">" + e[1] === key; }); },

  /* Pose au départ : PA2_TRAP_RULES.perAct pièges par acte selon l'anneau, sur des sentiers dont le
     point de départ a au moins deux sorties, et jamais toutes ; pas sur un point dont un mur bouge. */
  _placeTraps: function (run) {
    var map = this.getMap(run), traps = {}, self = this;
    if (!map || !map.links || this.isParcours(run)) return traps;
    var pa = (PA2_TRAP_RULES.perAct || {})[run.ring], per = pa != null ? Number(pa) : 1, moving = {};
    if (per > 0) per += Number(this.condFx(run, "trapsPerAct") || 0); // v3.469.0 : braconniers, pillards, guetteurs, veillée
    (map.shifts || []).forEach(function (sh) { moving[sh.from] = true; });
    var byAct = { 1: [], 2: [], 3: [] }, used = {}, links = this.links(run); // v3.468.0 : sans les sentiers coupés
    Object.keys(links).forEach(function (a) {
      var exits = links[a] || [];
      if (exits.length < 2 || moving[a]) return;
      exits.forEach(function (b) { var n = run.nodes[b]; if (n && byAct[n.act]) byAct[n.act].push([a, b]); });
    });
    var weights = PA2_TRAP_WEIGHTS[run.worldId] || PA2_TRAP_WEIGHTS.forest, dark = !!this.worldRule(run, "trapsHidden");
    if (this.condFx(run, "alarmWeight")) { weights = JSON.parse(JSON.stringify(weights)); weights.alarme *= Number(this.condFx(run, "alarmWeight")); }
    [1, 2, 3].forEach(function (act) {
      var pool = byAct[act].slice(), placed = 0;
      while (pool.length && placed < per) {
        var l = pool.splice(Math.floor(self.rand() * pool.length), 1)[0];
        if ((used[l[0]] || 0) >= links[l[0]].length - 1) continue; // une sortie reste libre
        used[l[0]] = (used[l[0]] || 0) + 1;
        var hidden = dark || self.rand() < Number(PA2_TRAP_RULES.hiddenPct || 0); // v3.467.1 : une part cachée
        traps[l[0] + ">" + l[1]] = { fx: self._weighted(weights), hidden: hidden, seen: false, done: false };
        placed++;
      }
    });
    return traps;
  },
  /* v3.468.0 (PG-A1) : 3 à 5 sentiers coupés au départ. Un point garde une sortie, les trois
     destinations restent accessibles ; jamais au départ d'un point dont un mur bouge (Ruines). */
  _placeCuts: function (run) {
    var map = this.getMap(run), cuts = {}, self = this, R = PA2_CUT_RULES;
    var kinds = Object.keys((window.PA2_CUTS || {})[run.worldId] || {});
    if (!map || !map.links || this.isParcours(run) || !kinds.length) return cuts;
    var moving = {};
    (map.shifts || []).forEach(function (sh) { moving[sh.from] = true; });
    var pool = [];
    Object.keys(map.links).forEach(function (a) { if (!moving[a]) map.links[a].forEach(function (b) { pool.push(a + ">" + b); }); });
    var extra = Number(this.condFx(run, "extraCuts") || 0); // v3.469.0 : orage, bâtisseurs
    var want = this._int(R.min, R.max) + (R.max > 0 ? extra : 0), dests = Object.keys(run.nodes).filter(function (k) { return self.isDest(run.nodes[k], run); });
    while (pool.length && Object.keys(cuts).length < want) {
      var key = pool.splice(Math.floor(this.rand() * pool.length), 1)[0], a = key.split(">")[0];
      var left = map.links[a].filter(function (b) { return !cuts[a + ">" + b]; });
      if (left.length < 2) continue; // le point garde une sortie
      cuts[key] = this._pick(kinds);
      if (!this._destsReachable(map, cuts, dests)) delete cuts[key];
    }
    return cuts;
  },
  _destsReachable: function (map, cuts, dests) {
    var seen = {}, todo = [map.start];
    seen[map.start] = true;
    while (todo.length) {
      var a = todo.pop();
      (map.links[a] || []).forEach(function (b) { if (!cuts[a + ">" + b] && !seen[b]) { seen[b] = true; todo.push(b); } });
    }
    return dests.every(function (d) { return seen[d]; });
  },
  // Un sentier coupé se voit dès qu'il est dans la vue, même dans le noir (PG-A1b).
  isCutShown: function (key, run) {
    run = run || this.getRun();
    if (!run || !run.cuts || !run.cuts[key]) return false;
    var p = key.split(">"), here = this.node(run.at, run), to = this.node(p[1], run);
    if (!here || !to) return false;
    if (p[0] === run.at) return true;
    return to.row > here.row && this.isShown(p[0], run) && this.isVisible(p[1], run);
  },
  cutDef: function (key, run) {
    run = run || this.getRun();
    var id = run && run.cuts ? run.cuts[key] : null, w = (window.PA2_CUTS || {})[run && run.worldId];
    return id && w && w[id] ? w[id] : null;
  },
  // Le piège se voit si son sentier est dans la vue (départ visible, arrivée visible devant soi).
  // Caché (v3.467.1) : à la Lanterne allumée, à la torche sur un sentier qu'on peut prendre, ou une fois découvert.
  isTrapShown: function (key, run) {
    run = run || this.getRun();
    var t = run && run.traps ? run.traps[key] : null;
    if (!t || t.done || this._walkedLink(run, key)) return false;
    var p = key.split(">"), here = this.node(run.at, run), to = this.node(p[1], run);
    if (!here || !to) return false;
    var all = this.hasItem("veilleurs", run) || this.hasRelic("oeil", run);
    var hidden = t.hidden != null ? t.hidden : !!this.worldRule(run, "trapsHidden"); // run de la v3.467.0 : seule la Crypte cache
    if (this.hasItem("pierre_puits", run)) hidden = false; // v3.469.4 : Pierre du puits, toute la vue
    if (hidden && !t.seen && !all && !(Number(run.lanternLeft || 0) > 0)) return p[0] === run.at && (this.hasItem("torche", run) || !!this.condFx(run, "trapsNear"));
    if (p[0] === run.at) return true;
    return to.row > here.row && this.isShown(p[0], run) && this.isVisible(p[1], run);
  },
  trapAt: function (run) { run = run || this.getRun(); return run && run.trap ? run.trap : null; },
  trapDef: function (run) {
    run = run || this.getRun();
    var tr = this.trapAt(run), t = tr && run.traps ? run.traps[tr.key] : null;
    if (!t) return null;
    var w = PA2_TRAPS[run.worldId] || PA2_TRAPS.forest;
    return { fx: t.fx, fxDef: PA2_TRAP_FX[t.fx], name: w[t.fx].name, line: w[t.fx].line };
  },
  _trapCheck: function (run) {
    var tr = this.trapAt(run), to = tr ? this.node(tr.to, run) : null;
    if (!to) return null;
    var diff = SceneCheckSystem.depthDifficulty(PA2_TRAP_RULES.baseDifficulty, this._depth(to, run)) * this.ring(run).diffMult
      * Number(run.band.obstacleScale || 1) * this.heroScale(run).obstacle;
    return this._check(run, "precision", diff, (this.hasItem("pierre_gardien", run) ? 1 : 0) + (this.hasRelic("clou", run) ? 1 : 0)); // v3.469.4 ; v3.469.5 : Clou de bâtisseur
  },
  trapOptions: function () {
    var run = this.getRun();
    if (!run || run.status !== PA2_STATUS.trap || !run.trap || run.trap.result) return null;
    var ck = this._trapCheck(run), back = PA2_TRAP_RULES.backBreath;
    return { disarm: ck, kit: Number(run.stock.trousse || 0), back: { cost: back, affordable: run.breath >= back } };
  },
  /* Désamorcer (dé de précision, sans Souffle ; de justesse −10 ; raté : l'effet et une blessure), trousse (assuré), subir, rebrousser. */
  resolveTrap: function (choice) {
    var run = this.getRun(), opts = this.trapOptions();
    if (!opts) return { ok: false, reason: _t("Choix impossible") };
    var t = run.traps[run.trap.key], res;
    if (choice === "rebrousser") {
      if (!opts.back.affordable) return { ok: false, reason: _t("Pas assez de Souffle pour cette approche") };
      run.breath -= opts.back.cost;
      run.trap = null;
      run.status = PA2_STATUS.map;
      run.lastResult = { kind: "back" };
      this._save();
      return { ok: true, reason: null, result: run.lastResult };
    }
    if (choice === "trousse") {
      if (!(opts.kit > 0)) return { ok: false, reason: _t("Choix impossible") };
      run.stock.trousse -= 1;
      res = { kind: "ok", kit: true };
    } else if (choice === "desamorcer") {
      res = this.roll(opts.disarm.thr);
      res.thr = opts.disarm.thr; res.cran = opts.disarm.cran;
      if (res.kind === "mid") run.breath = Math.max(0, run.breath - PA2_TRAP_RULES.midBreath);
    } else if (choice === "subir") {
      res = { kind: "endure" };
    } else return { ok: false, reason: _t("Choix impossible") };
    res.choice = choice; res.fx = t.fx;
    if (res.kind === "ko" || res.kind === "endure") this._applyTrapFx(run, t.fx, res);
    if (res.kind === "ko") { run.wounds += 1; res.wound = true; } // v3.467.2 (PG-D3) : raté, c'est pire que subir
    t.done = true;
    run.trap.result = res;
    this._save();
    return { ok: true, reason: null, result: res };
  },
  _applyTrapFx: function (run, fx, res) {
    if (!run.fx) run.fx = {};
    var def = PA2_TRAP_FX[fx];
    if (fx === "alarme") { if (!this.hasRelic("cloche", run)) run.fx.alarme = 1; else res.muted = true; } // v3.469.5 : Cloche muette
    else if (fx === "besace") {
      var pool = [];
      Object.keys(run.stock || {}).forEach(function (id) { if (run.stock[id] > 0) pool.push(id); });
      run.bag.forEach(function (id) { if (!PA2_ITEMS[id].uses && pool.indexOf(id) < 0) pool.push(id); }); // objets sans charges
      var lost = pool.length ? this._pick(pool) : null;
      if (lost && PA2_ITEMS[lost].uses) run.stock[lost] -= 1;
      else if (lost) run.bag.splice(run.bag.indexOf(lost), 1);
      res.lost = lost;
    } else run.fx[fx] = Math.max(this.fxLeft(run, fx), this.hasItem("cierge", run) ? PA2_RULES.ciergeSteps : Number(def.steps || 0)); // v3.469.4 : Cierge
  },
  // Après le piège : le pas reprend jusqu'au point visé (le pas du piège ne compte pas pour les effets).
  trapContinue: function () {
    var run = this.getRun();
    if (!run || run.status !== PA2_STATUS.trap || !run.trap || !run.trap.result) return { ok: false, reason: _t("Choix impossible") };
    var to = run.trap.to;
    run.trap = null;
    return this._step(run, to, true);
  },
  // Effets qui durent, à chaque pas : Venin (PV), Entrave (Souffle), Aveuglé (compte seulement).
  _tickFx: function (run) {
    var fx = run.fx, R = PA2_TRAP_RULES;
    if (!fx) return true;
    if (fx.entrave > 0) { run.breath = Math.max(0, run.breath - R.entraveBreath); fx.entrave -= 1; }
    if (fx.aveugle > 0) fx.aveugle -= 1;
    if (fx.venin > 0) {
      fx.venin -= 1;
      var dmg = Math.max(1, Math.round(game.heroMaxHp * R.veninPct));
      run.fxNote = _t("Le venin te brûle : −{d} PV.", { d: dmg });
      if (!this._hurt(run, dmg)) return false;
    }
    return true;
  },

  /* ---------- Obstacle (et tertre) ---------- */

  obstacleOptions: function () {
    var n = this._current(["obstacle", "tertre"]);
    if (!n) return [];
    var run = this.getRun(), gab = SceneEngine.getNodeBank().obstacles[n.gabaritId], prof = this._profiles(run), self = this;
    return ["power", "precision", "endurance"].filter(function (v) { return gab.options[v]; }).map(function (v) {
      var p = prof[v] || { diffMod: 1, lootMod: 1, breathCost: 0 };
      var bonus = 0;
      if (v === "power") bonus += (self.hasRelic("pierre", run) ? 1 : 0) + (self.hasRelic("fleche", run) ? 1 : 0) + (self.hasItem("bois", run) ? 1 : 0) + (self.hasItem("eclat_trieur", run) ? 1 : 0); // v3.489.0
      bonus += Number(self.condFx(run, "obstacleBonus") || 0); // v3.469.0 : poussière de chantier
      if (v === "endurance" && self.hasItem("ecaille", run)) bonus += 1;        // v3.469.4 : Écaille du Ver
      if (v === "precision" && self.hasItem("pierre_gardien", run)) bonus += 1; // v3.469.4 : Pierre taillée du gardien
      if (self.hasRelic("marteau", run)) bonus += 1; // v3.469.5 : Marteau du Contremaître
      var ck = self._check(run, gab.options[v].stat, n.diff * p.diffMod, bonus);
      var cost = Number(p.breathCost || 0) + (self.hasItem("armure", run) ? PA2_RULES.armorBreath : 0);
      // v3.391.0 : Endurance du marcheur (pouvoir légendaire), câblée en v1 seulement jusque-là
      if (typeof hasLegendaryPower === "function" && hasLegendaryPower("leg_marcheur")) cost = Math.round(cost * 0.85);
      if (v === "precision" && self.hasRelic("plume", run)) cost = 0;
      ck.voie = v; ck.label = gab.options[v].label; ck.cost = cost; ck.lootMod = p.lootMod;
      ck.rope = (v === "precision" && run.stock.corde > 0);
      ck.affordable = run.breath >= cost;
      return ck;
    });
  },
  canBruteForce: function () {
    var opts = this.obstacleOptions();
    return opts.length > 0 && opts.every(function (o) { return !o.affordable && !o.rope; });
  },

  resolveObstacle: function (voie, useRope) {
    var n = this._current(["obstacle", "tertre"]);
    if (!n) return { ok: false, reason: _t("Choix impossible") };
    var run = this.getRun(), opt = null;
    this.obstacleOptions().forEach(function (o) { if (o.voie === voie) opt = o; });
    if (!opt) return { ok: false, reason: _t("Choix impossible") };
    if (useRope && !opt.rope) return { ok: false, reason: _t("Choix impossible") };
    if (!useRope && !opt.affordable) return { ok: false, reason: _t("Pas assez de Souffle pour cette approche") };
    var res;
    if (useRope) { run.stock.corde -= 1; res = { roll: 6, kind: "ok", rope: true }; }
    else { run.breath = Math.max(0, run.breath - opt.cost); res = this.roll(opt.thr); }
    res.voie = voie; res.thr = opt.thr; res.cran = opt.cran;
    var base = run.refGold * PA2_GOLD.obstacle * Number(opt.lootMod || 1) * this.lootMult(run) * Number(this.condFx(run, "obstacleGold") || 1); // v3.469.0 : vent de sable
    if (res.kind === "ok") res.gain = this._gold(run, base);
    if (res.kind === "mid") { res.gain = this._gold(run, base * PA2_GOLD.obstacleMid); run.breath = Math.max(0, run.breath - PA2_RULES.mistBreath); }
    if (res.kind === "ko") {
      run.wounds += 1;
      res.dmg = Math.round(game.heroMaxHp * PA2_ACTS[n.act].failPct);
      if (!this._hurt(run, res.dmg)) return { ok: true, reason: null, result: res };
    }
    if (n.type === "tertre") {
      res.opened = res.kind !== "ko";
      if (res.opened) {
        res.chestGain = this._gold(run, run.refGold * PA2_GOLD.tertre * this.lootMult(run) * this.destGoldMult(run));
        var extra = this.drawRelics(run, 1)[0];
        if (extra) { run.relics.push(extra); res.relic = extra; }
      }
      run.flags.tertreOpened = res.opened;
      n.done = true; run.lastResult = res;
      this.finish("dest");
      return { ok: true, reason: null, result: res };
    }
    return this._done(run, n, res);
  },

  // Plus assez de Souffle pour aucune voie : on passe quand même, mais ça fait mal.
  bruteForce: function () {
    // v3.384.0 : aussi au Tertre (sans Souffle ni corde, on y restait bloqué) : on passe, le sceau tient.
    var n = this._current(["obstacle", "tertre"]);
    if (!n || !this.canBruteForce()) return { ok: false, reason: _t("Choix impossible") };
    var run = this.getRun(), dmg = Math.round(game.heroMaxHp * PA2_RULES.bruteForcePct);
    var res = { kind: "brute", dmg: dmg };
    if (!this._hurt(run, dmg)) return { ok: true, reason: null, result: res };
    if (n.type === "tertre") {
      res.opened = false; run.flags.tertreOpened = false;
      n.done = true; run.lastResult = res;
      this.finish("dest");
      return { ok: true, reason: null, result: res };
    }
    return this._done(run, n, res);
  },

  /* ---------- Combat résolu (Q2 : CombatForecast, héros seul, sans compagnons ni potions) ---------- */

  _foe: function (run, n) {
    var boss = n.type === "boss";
    // v3.383.0 (PA2-3) : le gardien n'est plus le boss d'aventure de la tranche (Sphinx au Désert,
    // imbattable seul) mais un ennemi d'acte III renforcé, calé au banc sur toutes les tranches.
    var guard = boss && window.PA2_GUARDIAN ? PA2_GUARDIAN[run.worldId] : null;
    var e = guard ? this._spawn(run, guard.foe, false) : this._spawn(run, boss ? null : n.foeId, boss);
    if (!e) return null;
    // Le gardien a ses propres multiplicateurs : régler les actes ne le touche pas.
    var rf = this.ring(run).foeMult; // v3.469.6 (Périple, choix Seb) : le gardien ne prend que la moitié du renfort de l'anneau
    if (guard) rf = 1 + (rf - 1) * Number(PA2_RULES.guardRingShare != null ? PA2_RULES.guardRingShare : 1);
    var mult = (guard ? 1 : PA2_ACTS[boss ? 3 : n.act].foeMult * this.tune(run, "foeMult") * Number(n.foeMult || 1)) * rf * Number(run.band.foeScale || 1);
    e = JSON.parse(JSON.stringify(e));
    var hs = this.heroScale(run); // v3.423.0 (A)
    e.maxHp = Math.max(1, Math.round(Number(e.maxHp || 1) * mult * (guard ? guard.hpMult : 1) * hs.hp));
    e.hp = e.maxHp;
    if (e.stats) e.stats.power = Math.max(1, Math.round(Number(e.stats.power || 1) * mult * (guard ? guard.powMult : 1) * hs.power));
    return e;
  },
  _dmgMult: function (run, n, apId) {
    var R = PA2_RULES, m = PA2_APPROACHES[apId].dmg;
    if (n.revenge) m *= R.revengeMult;
    if (this.hasPact("enrage", run) && (n.type === "boss" || n.act === 3)) m *= R.enrageMult;
    if (this.hasItem("torche", run)) m *= R.torchDmgMult;
    m *= Number(this.condFx(run, "combatDmg") || 1); // v3.469.0 : pleine lune
    if (this.hasRelic("marteau", run)) m *= R.marteauDmg; // v3.469.5 : Marteau du Contremaître
    if (this.hasItem("armure", run)) m *= R.armorDmgMult;
    if (this.hasRelic("dent", run)) m *= R.dentMult;
    if (this.hasRelic("fleche", run)) m *= R.flecheMult;
    if (apId === "charger" && this.hasItem("bois", run)) m *= R.boisChargeMult;
    if (apId === "tenir" && this.hasItem("epee_gisant", run)) m *= R.epeeTenirMult; // v3.469.4 : Épée du gisant
    if (this._marked(run)) m *= Number(this._hook(run).mark.dmgMult || 1);
    return m;
  },
  // Estimation affichée AVANT le choix = celle appliquée (au tirage de ±15 % près).
  combatEstimate: function (apId) {
    var n = this._current(["combat", "boss"]);
    return n ? this._estimate(this.getRun(), n, apId) : null;
  },
  // Estimation du gardien depuis le seuil (C1, PA2-3) : on choisit sa destination en connaissance de cause.
  guardianPreview: function () {
    var run = this.getRun(), map = run ? this.getMap(run) : null, self = this;
    if (!run || !map || !run.nodes) return null;
    var key = Object.keys(run.nodes).filter(function (k) { return run.nodes[k].type === "boss"; })[0];
    if (!key) return null;
    var n = { key: key, type: "boss", act: 3, row: 9, pack: 1 };
    return { charger: self._estimate(run, n, "charger"), tenir: self._estimate(run, n, "tenir") };
  },
  _estimate: function (run, n, apId) {
    if (!run || !n || !PA2_APPROACHES[apId]) return null;
    var e = this._foe(run, n);
    var heroDmg = CombatForecast.getHeroDamagePerRound();
    var foeDmg = CombatForecast.getEnemyDamagePerRound(e);
    var net = heroDmg - CombatForecast.getHealThreshold(e);
    var rounds = net > 0 ? Math.ceil(e.maxHp / net) : Infinity;
    var unwinnable = !(rounds <= PA2_RULES.maxRounds);
    var pack = Number(n.pack || 1);
    var hpLoss = unwinnable ? Number(game.heroHp || 0) : Math.round(rounds * foeDmg * pack * this._dmgMult(run, n, apId));
    var gold = (n.type === "boss")
      ? run.refGold * PA2_GOLD.boss * this.lootMult(run) * this.destGoldMult(run)
      : run.refGold * PA2_GOLD.combat * pack * PA2_APPROACHES[apId].loot * this.lootMult(run); // C3 : or de la carte
    return {
      approach: apId, foe: e.id, foeName: e.name, rounds: unwinnable ? null : rounds * pack, unwinnable: unwinnable,
      hpLoss: hpLoss, verdict: this.verdictOf(hpLoss), gold: Math.round(gold * (this.hasRelic("ronce", run) ? PA2_RULES.ronceLoot : 1))
    };
  },
  verdictOf: function (hpLoss) {
    var max = Number(game.heroMaxHp || 1);
    if (hpLoss >= Number(game.heroHp || 0)) return "mortel";
    var p = hpLoss / max;
    return p < 0.12 ? "leger" : (p < 0.22 ? "rude" : (p < 0.38 ? "severe" : "brutal"));
  },
  combatPreview: function () {
    var run = this.getRun(), n = this._current(["combat", "boss"]);
    if (!n) return null;
    var out = { boss: n.type === "boss", revenge: !!n.revenge, foeId: n.foeId || null, charger: this.combatEstimate("charger"), tenir: this.combatEstimate("tenir") };
    if (!out.boss) {
      out.ruse = this._check(run, "precision", n.diff, this.ruseBonus(run)); // v3.469.0 : brouillard ; v3.469.5 : reliques
      out.ruseBlocked = !!n.alarm; // v3.467.0 : l'Alarme a sonné
      out.flee = { cost: PA2_RULES.fleeBreath, affordable: run.breath >= PA2_RULES.fleeBreath };
    }
    return out;
  },

  fight: function (apId, surprised) {
    var n = this._current(["combat", "boss"]);
    var est = this.combatEstimate(apId);
    if (!n || !est) return { ok: false, reason: _t("Choix impossible") };
    var run = this.getRun(), spread = PA2_RULES.damageSpread;
    var total = est.unwinnable ? est.hpLoss : est.hpLoss * (1 - spread + this.rand() * 2 * spread) * (surprised ? PA2_RULES.surprisedMult : 1);
    var parts = splitDamage(total, PA2_APPROACHES[apId].rounds);
    var res = { approach: apId, surprised: !!surprised, parts: parts, dmg: parts.reduce(function (a, b) { return a + b; }, 0) };
    if (!this._hurt(run, res.dmg)) { res.ko = true; return { ok: true, reason: null, result: res }; }
    res.gain = this._gold(run, est.gold / (this.hasRelic("ronce", run) ? PA2_RULES.ronceLoot : 1));
    if (window.SortieManager) SortieManager.noteKill(n.type === "boss");
    this._creditKills(n, { id: est.foe });
    if (n.type === "boss") {
      var drop = this._guardianDrop();
      if (drop) { res.drop = { name: drop.name, rarity: drop.rarity }; this._log("🎁 " + _t("Objet trouvé : {x} ({r})", { x: _td(drop.name), r: _td((window.RARITY_LABELS || {})[drop.rarity] || drop.rarity) }) + " — " + _t("dans le butin de sortie")); }
      run.flags.bossDown = true;
      n.done = true; run.lastResult = res;
      this.finish("dest");
      return { ok: true, reason: null, result: res };
    }
    return this._done(run, n, res);
  },

  /* v3.454.0 (Crypte, CR10) : le gardien dort. Faire le tour : la destination est atteinte, sans combat,
     sans l'or du gardien ni son objet. */
  canPassGuardian: function () {
    var n = this._current(["boss"]), run = this.getRun();
    var g = n && window.PA2_GUARDIAN ? PA2_GUARDIAN[run.worldId] : null;
    return !!(g && (g.sleeps || (g.sorts && !this.cutCount(run)))); // v3.489.0 (Montagne) : rien taillé, le trieur laisse passer
  },
  guardianSorts: function (run) { run = run || this.getRun(); var g = run && window.PA2_GUARDIAN ? PA2_GUARDIAN[run.worldId] : null; return !!(g && g.sorts); },

  /* ---------- v3.489.0 (Montagne, MT10) : les veines du chemin ---------- */
  cutCount: function (run) { run = run || this.getRun(); return Number((run && run.flags && run.flags.veinsCut) || 0); },
  veinAsh: function (run) {
    var r = PA2_RULES.veinAsh || [1, 1];
    return { min: r[0] + Number(this.condFx(run, "veinAsh") || 0) + (this.hasRelic("braise_vive", run) ? 1 : 0),
      max: r[1] + Number(this.condFx(run, "veinAsh") || 0) + (this.hasRelic("braise_vive", run) ? 1 : 0) };
  },
  cutVein: function (take) {
    var n = this._current(["veine"]), run = this.getRun();
    if (!n) return { ok: false, reason: _t("Choix impossible") };
    if (!take) return this._done(run, n, { kind: "vein", take: false });
    var a = this.veinAsh(run), ash = this._creditRare(run, this._int(a.min, a.max));
    run.flags.veinsCut = this.cutCount(run) + 1;
    if (run.lavaRow != null) run.lavaRow += 1 + (this.hasRelic("braise_vive", run) ? 1 : 0);
    var res = { kind: "vein", take: true, ash: ash };
    if (this.hasRelic("soufflet", run)) { res.breath = Number(PA2_RULES.soufflet || 0); run.breath = Math.min(100, run.breath + res.breath); }
    this._log("🪨 " + _t("Tu tailles la veine : +{n} {x}. La lave avance.", { n: ash, x: this._rareName(run) }));
    return this._done(run, n, res);
  },
  passGuardian: function () {
    if (!this.canPassGuardian()) return { ok: false, reason: _t("Choix impossible") };
    var run = this.getRun(), n = this._current(["boss"]);
    run.flags.guardianPassed = true;
    n.done = true; run.lastResult = { passed: true };
    this.finish("dest");
    return { ok: true, reason: null, result: run.lastResult };
  },

  // Crans de la Ruse : Flèche du veneur, brouillard, Œil de scarabée, Cloche muette (deux).
  ruseBonus: function (run) {
    return (this.hasRelic("fleche", run) ? 1 : 0) + Number(this.condFx(run, "ruseBonus") || 0)
      + (this.hasRelic("scarabee", run) ? 1 : 0) + (this.hasRelic("cloche", run) ? 2 : 0);
  },
  ruse: function () {
    var n = this._current(["combat"]);
    if (!n) return { ok: false, reason: _t("Choix impossible") };
    if (n.alarm) return { ok: false, reason: _t("L'alarme a sonné : ils t'attendent.") };
    var run = this.getRun(), ck = this._check(run, "precision", n.diff, this.ruseBonus(run));
    var res = this.roll(ck.thr);
    res.thr = ck.thr; res.cran = ck.cran; res.ruse = true;
    if (res.kind === "ko") { res.surprised = true; run.lastResult = res; this._save(); return { ok: true, reason: null, result: res }; }
    var est = this.combatEstimate("tenir");
    var share = res.kind === "ok" ? PA2_GOLD.ruse : PA2_GOLD.ruseMid;
    if (res.kind === "mid") run.breath = Math.max(0, run.breath - PA2_RULES.ruseMidBreath);
    res.gain = this._gold(run, est.gold * share / (this.hasRelic("ronce", run) ? PA2_RULES.ronceLoot : 1));
    return this._done(run, n, res);
  },

  flee: function () {
    var n = this._current(["combat"]), run = this.getRun();
    if (!n) return { ok: false, reason: _t("Choix impossible") };
    if (run.breath < PA2_RULES.fleeBreath) return { ok: false, reason: _t("Pas assez de Souffle pour cette approche") };
    run.breath -= PA2_RULES.fleeBreath;
    return this._done(run, n, { kind: "flee" });
  },

  /* ---------- Source, autel, trouvaille ---------- */

  sourceAmount: function (run) {
    run = run || this.getRun();
    var R = PA2_RULES, amt = this.hasPact("tarie", run) ? R.sourceDry : R.sourceAmount;
    if (this.hasRelic("seve", run)) amt *= 2;
    amt *= Number(this.condFx(run, "sourceMult") || 1); // v3.469.0 : orage, canicule, mèches humides
    if (this.hasRelic("dune", run)) amt = Math.round(amt * PA2_RULES.duneSource); // v3.469.5 : Cœur de dune
    if (this.hasItem("veilleurs", run)) amt += R.sourceLantern;
    return amt;
  },
  drink: function () {
    var n = this._current(["source"]);
    if (!n) return { ok: false, reason: _t("Choix impossible") };
    var run = this.getRun(), amt = this.sourceAmount(run);
    var healed = this._heal(game.heroMaxHp * amt / 100);
    if (n.fullBreath) amt = Math.max(amt, 100 - run.breath); // parcours : la source qui rend tout le Souffle
    run.breath = Math.min(100, run.breath + amt);
    return this._done(run, n, { kind: "source", amount: amt, healed: healed });
  },

  altarCost: function (run) {
    run = run || this.getRun();
    if (this._altarFree(run)) return 0;
    return Math.max(PA2_RULES.altarMinCost, Math.round(run.loot * PA2_RULES.altarCostPct));
  },
  // Q11 : Cercle des menhirs / Stèles tenus -> l'autel est gratuit une fois par run.
  _altarFree: function (run) {
    if (this.condFx(run, "altarFree") || this.hasRelic("cendre", run)) return true; // v3.469.0 : bâtisseurs, veillée ; v3.469.5 : Cendre de veilleur
    return !run.altarFreeUsed && !!window.LivingMapManager && LivingMapManager.hasEffect("autel_normale");
  },
  altar: function (accept) {
    var n = this._current(["autel"]);
    if (!n) return { ok: false, reason: _t("Choix impossible") };
    var run = this.getRun();
    if (!accept) return this._done(run, n, { kind: "autel", accepted: false });
    var free = this._altarFree(run), cost = this.altarCost(run);
    if (!free && run.loot < cost) return { ok: false, reason: _t("Pas assez d'or.") };
    if (free) run.altarFreeUsed = true; else this._pay(run, cost);
    if (run.wounds > 0) run.wounds -= 1;
    if (run.fx) delete run.fx.venin; // v3.467.0 : l'autel lève le Venin
    var healed = this._heal(game.heroMaxHp * PA2_RULES.altarHealPct * (this.hasRelic("cendre", run) ? PA2_RULES.cendreHeal : 1)); // v3.469.5
    return this._done(run, n, { kind: "autel", accepted: true, cost: free ? 0 : cost, healed: healed });
  },

  drawRelics: function (run, count) {
    var pool = Object.keys(PA2_RELICS).filter(function (id) { var r = PA2_RELICS[id]; return !r.eventOnly && (!r.world || r.world === run.worldId) && run.relics.indexOf(id) < 0; }); // v3.469.5 : reliques du monde
    var out = [], self = this;
    while (out.length < count && pool.length) {
      var want = this._weighted(PA2_RELIC_RARITY_WEIGHTS);
      var cand = pool.filter(function (id) { return PA2_RELICS[id].rar === want; });
      if (!cand.length) cand = pool;
      var id = self._pick(cand);
      out.push(id);
      pool.splice(pool.indexOf(id), 1);
    }
    return out;
  },
  takeRelic: function (relicId) {
    var n = this._current(["trouvaille"]);
    if (!n) return { ok: false, reason: _t("Choix impossible") };
    var run = this.getRun();
    var id = relicId || (n.draw || [])[0];
    if (!id || (n.draw || []).indexOf(id) < 0) return { ok: false, reason: _t("Choix impossible") };
    run.relics.push(id);
    var res = { kind: "trouvaille", relic: id, rare: 0 };
    var rare = PA2_RARE[run.worldId];
    if (rare && this.rand() * 100 < rare.findChancePct) res.rare = this._creditRare(run, 1);
    return this._done(run, n, res);
  },
  _rareName: function (run) {
    var rare = PA2_RARE[run.worldId], res = rare && window.WAREHOUSE_RESOURCES ? WAREHOUSE_RESOURCES[rare.resourceId] : null;
    return res ? _td(res.name) : "";
  },
  _creditRare: function (run, amount) {
    var rare = PA2_RARE[run.worldId];
    if (!rare || amount <= 0 || !window.WarehouseManager) return 0;
    WarehouseManager.addResource(rare.resourceId, amount); // jamais perdue (comme en v1)
    run.rareFound += amount;
    return amount;
  },

  /* ---------- Rencontre chaînée (V19) ---------- */

  eventChoice: function (branch) {
    var n = this._current(["evenement"]);
    var run = this.getRun(), hook = run && run.hookId ? PA2_HOOKS[run.hookId] : null;
    if (!n || !hook || !hook.event.branches[branch]) return { ok: false, reason: _t("Choix impossible") };
    var res = { kind: "evenement", branch: branch };
    if (hook.id !== "chasseur") return this._hookChoice(run, n, hook, branch, res);
    run.flags.hookBranch = branch;
    if (branch === "ration") {
      var rid = this._rationInStock(run);
      if (!rid) return { ok: false, reason: _t("Tu n'as plus de ration.") };
      run.stock[rid] -= 1; run.flags.sauve = true;
    } else if (branch === "mains") {
      run.flags.sauve = true;
      res.dmg = Math.round(game.heroMaxHp * PA2_RULES.eventHandsPct);
      if (!this._hurt(run, res.dmg)) return { ok: true, reason: null, result: res };
    } else if (branch === "arc") {
      run.flags.vole = true;
      res.gain = this._gold(run, run.refGold * PA2_GOLD.event * this.lootMult(run));
    }
    return this._done(run, n, res);
  },

  // Accroches décrites par les données (PA2-4) : coût de la branche, gain, puis la suite est lue ailleurs.
  // Branches de la rencontre en cours, dans l'ordre des données, avec leur disponibilité (écrans, bancs).
  hookBranches: function () {
    var run = this.getRun(), hook = this._hook(run), self = this;
    return hook ? Object.keys(hook.event.branches).map(function (id) { return { id: id, ok: self.canHookBranch(id).ok }; }) : [];
  },
  canHookBranch: function (branch) {
    var run = this.getRun(), hook = this._hook(run), b = hook && hook.event.branches[branch];
    if (!b) return { ok: false, reason: _t("Choix impossible") };
    var c = b.cost || {};
    if (c.stock && !(run.stock[c.stock] > 0)) return { ok: false, reason: _t("Tu n'en as plus dans ta besace.") };
    if (c.ration && !this._rationInStock(run)) return { ok: false, reason: _t("Tu n'as plus de ration.") };
    if (c.breath && run.breath < c.breath) return { ok: false, reason: _t("Pas assez de Souffle pour cette approche") };
    return { ok: true, reason: null };
  },
  _hookChoice: function (run, n, hook, branch, res) {
    var ok = this.canHookBranch(branch);
    if (!ok.ok) return ok;
    var b = hook.event.branches[branch], c = b.cost || {};
    if (c.stock) run.stock[c.stock] -= 1;
    if (c.ration) run.stock[this._rationInStock(run)] -= 1;
    if (c.breath) run.breath = Math.max(0, run.breath - c.breath);
    if (b.gainBreath) run.breath = Math.min(100, run.breath + b.gainBreath);
    run.flags.hookBranch = branch;
    if (hook.storyFlag) { // v3.387.0 : Maddoc, noté pour la partie (étapes du Désert, storyMaddocMet)
      if (!game.explorationProgression) game.explorationProgression = {};
      game.explorationProgression[hook.storyFlag.key] = hook.storyFlag.values[branch] || branch;
    }
    return this._done(run, n, res);
  },

  /* ---------- Camp et seuil (V5) ---------- */

  campGiftDue: function (run) {
    var hook = this._hook(run), g = hook && hook.campGift;
    if (!g || run.flags.campGift || run.relics.indexOf(g.relic) >= 0) return false;
    if (hook.id === "chasseur") return !!run.flags.sauve; // runs d'avant la v3.385.0 : pas de hookBranch
    return g.branches ? g.branches.indexOf(this.hookBranch(run)) >= 0 : false;
  },
  placeAction: function (action) {
    var n = this._current(["camp", "seuil"]);
    if (!n) return { ok: false, reason: _t("Choix impossible") };
    var run = this.getRun(), R = PA2_RULES, camp = n.type === "camp";
    var res = { kind: n.type, action: action };
    // La suite de la rencontre : le chasseur sauvé attend au camp, quel que soit le choix.
    var hook = run.hookId ? PA2_HOOKS[run.hookId] : null;
    // v3.385.0 : la condition vient des données (chasseur sauvé, feu passé…), jamais un doublon.
    if (camp && this.campGiftDue(run)) {
      run.flags.campGift = true;
      run.relics.push(hook.campGift.relic);
      res.gift = hook.campGift.relic;
    }
    if (action === "rest") {
      var pct = (camp ? R.campRestPct : R.seuilRestPct) * (this.hasItem("natte", run) ? R.natteRestMult : 1); // v3.469.4 : Natte de caravane
      res.healed = this._heal(game.heroMaxHp * pct);
      run.breath = Math.min(100, run.breath + Math.round(pct * 100));
      if (run.fx) delete run.fx.entrave; // v3.467.0 : le repos lève l'Entrave
    } else if (action === "cook") {
      var rid = this._rationInStock(run);
      if (!rid) return { ok: false, reason: _t("Tu n'as plus de ration.") };
      run.stock[rid] -= 1;
      res.healed = this._heal(game.heroMaxHp * R.cookPct);
      if (run.wounds > 0) run.wounds -= 1;
      if (run.fx) { delete run.fx.entrave; delete run.fx.venin; } // v3.467.0 : un repas au feu, ration comprise
    } else if (action === "listen") {
      run.reveal[camp ? 2 : 3] = true;
    } else if (action === "home") {
      n.done = true; run.lastResult = res;
      this.finish("home");
      return { ok: true, reason: null, result: res };
    } else {
      return { ok: false, reason: _t("Choix impossible") };
    }
    return this._done(run, n, res);
  },

  /* ---------- Destination sans combat ---------- */

  clairiere: function () {
    var n = this._current(["clairiere"]);
    if (!n) return { ok: false, reason: _t("Choix impossible") };
    var run = this.getRun();
    var share = run.flags.sauve ? PA2_GOLD.clairiereSauve : PA2_GOLD.clairiere;
    var res = { kind: "clairiere", gain: this._gold(run, run.refGold * share * this.lootMult(run) * this.destGoldMult(run)) };
    n.done = true; run.lastResult = res;
    this.finish("dest");
    return { ok: true, reason: null, result: res };
  },

  /* ---------- Fin du run ---------- */

  // finish(how) : "dest" (destination atteinte), "home" (rentré du camp ou du seuil), "ko".
  finish: function (how) {
    var run = this.getRun();
    if (!run || run.status === PA2_STATUS.done) return null;
    var dest = this.node(run.at, run), end = { how: how, dest: null, chest: null, rare: 0, mult: 1 };
    var par = this.isParcours(run);
    if (how === "dest" && dest && !par) {
      end.dest = dest.type;
      var rare = PA2_RARE[run.worldId];
      var amt = rare ? Number(rare.dest[this.ring(run).ring] || 0) : 0;
      if (window.MemoryManager && MemoryManager.has("recolte")) amt += 1; // Récolte (Q11)
      if (window.MemoryManager && MemoryManager.has(PA2_MEMORY_DEST_RARE[run.worldId])) amt += 1; // v3.453.0 : Pierre de plus, Cire chaude (Mémoire 10, 14)
      var lmap = run.livingMap && run.livingMap.wake && window.LIVING_MAPS && LIVING_MAPS[run.livingMap.mapId];
      if (lmap && lmap.gisants) amt += Number(lmap.gisants.wakeRare || 0); // v3.454.0 (Crypte) : gisants réveillés, plus de Cire
      if (lmap && lmap.veins) amt += Number(lmap.veins.cutRare || 0);      // v3.489.0 (Montagne) : la veine du secteur taillée
      amt += Number(this.condFx(run, "rareDest") || 0); // v3.469.0 : les dormeurs remuent
      var hk = this._hook(run);
      if (hk && hk.destRare && hk.destRare[this.hookBranch(run)]) amt += Number(hk.destRare[this.hookBranch(run)]); // le feu nourri
      end.rare = this._creditRare(run, amt);
      var chestItem = (PA2_CHEST_REWARDS[run.worldId] || {})[dest.type];
      // v3.387.0 : le drapeau de l'Histoire (étape « L'outre ») est posé à une destination atteinte, comme la chambre finale en v1.
      var tpl = window.SceneEngine ? SceneEngine.getTemplate(run.templateId) : null;
      if (tpl && tpl.successFlag) { if (!game.explorationProgression) game.explorationProgression = {}; game.explorationProgression[tpl.successFlag] = true; }
      if (chestItem && (dest.type !== "boss" || run.flags.bossDown)) {
        var chest = this.ensureChest();
        end.chest = { item: chestItem, isNew: !chest.unlocked[chestItem] };
        chest.unlocked[chestItem] = true;
      }
    }
    // Multiplicateur final de l'or : pactes, Carte du braconnier, Fiole noire.
    var mult = this.pactMult(run) * Number(this.condFx(run, "lootMult") || 1) * (this.hasRelic("dune", run) ? PA2_RULES.duneLoot : 1); // v3.469.0 ; v3.469.5 : Cœur de dune
    if (this.hasItem("carte", run)) mult *= PA2_RULES.carteLoot;
    if (run.fioleUsed) mult *= PA2_RULES.fioleLoot;
    end.mult = mult;
    var s = window.SortieManager ? SortieManager.ensure() : null;
    if (s && s.active) s.loot.gold = Math.floor(Number(s.loot.gold || 0) * mult);
    // Vivres non consommés : rendus à l'Entrepôt, quelle que soit l'issue (Q5).
    this._refundStock(run);
    run.status = PA2_STATUS.done;
    run.end = end;
    var outcome = how === "ko" ? (this.hasPact("retour", run) ? "death" : "flee") : "success";
    if (how === "ko") {
      // v3.482.0 (RE-5) : la place n'est rendue que si le run n'a rien trouvé (D6 sans boucle de trouvailles)
      if (!par && !(run.rareFound > 0)) SceneRunManager._refundPetiteAventureSlot(run);
      else if (!par) this._log("🎒 " + _t("Tu as rapporté des trouvailles : la place de la réserve reste dépensée."));
      game.justDied = true; // comme une mort en v1 : bandeau du Campement
      this._log("💀 " + _t("On te ramène. Une part de ce que tu portais reste en route."));
    } else if (how === "home") this._log("🔥 " + _t("Retour au feu avant la nuit profonde. Le butin est sauf."));
    else if (how === "parcours") this._log("🏁 " + _t("{t} : parcours terminé.", { t: _td((SceneEngine.getTemplate(run.templateId) || {}).title || "") }));
    else if (dest) this._log("🏁 " + _t("Petite Aventure : {d} atteint.", { d: _td(((PA2_DESTS[run.worldId] || PA2_DESTS.forest)[dest.type] || {}).name || "") }));
    if (end.rare > 0 || run.rareFound > 0) this._log("✨ " + _t("Trouvaille : +{n} {x}", { n: run.rareFound, x: this._rareName(run) }));
    if (end.chest && end.chest.isNew) this._log("🧰 " + _t("Coffre d'expédition : {x}", { x: _td((PA2_ITEMS[end.chest.item] || {}).name || "") }));
    end.summary = window.SortieManager ? SortieManager.end(outcome) : null;
    SceneRunManager._notifyLivingMap(run, (how === "dest" || how === "parcours") ? "success" : (how === "ko" ? "fail" : "neutral"));
    // Q12 : « Un Périple » ; v3.384.0 : compté pour le monde de la carte jouée, pas celui où réside le héros.
    if (how === "dest" && window.AchievementManager) AchievementManager.onRunSuccess(run.worldId);
    if (how === "parcours" && window.AchievementManager) AchievementManager.onRunSuccess(); // comme la chambre finale v1 : monde de résidence
    if (!par) this._recordTrophy(run, end);
    this._save();
    return end;
  },
  _refundStock: function (run) {
    if (!window.WarehouseManager) return;
    Object.keys(run.stock || {}).forEach(function (id) {
      var it = PA2_ITEMS[id], left = Number(run.stock[id] || 0);
      if (it && it.resource && left > 0) WarehouseManager.refundResource(it.resource, left);
      run.stock[id] = 0;
    });
  },

  // abandon() : renoncer en préparation ne coûte rien ; en route, c'est une fuite (50 %).
  abandon: function () {
    var run = this.getRun();
    if (!run || run.status === PA2_STATUS.done) return { ok: false, reason: _t("Aucune expédition en cours") };
    if (run.status === PA2_STATUS.prep) {
      run.status = PA2_STATUS.done;
      run.end = { how: "cancel" };
      this._save();
      return { ok: true, reason: null, summary: null };
    }
    this._refundStock(run);
    run.status = PA2_STATUS.done;
    run.end = { how: "abandon" };
    var summary = window.SortieManager ? SortieManager.end("flee") : null;
    SceneRunManager._notifyLivingMap(run, "fail");
    this._save();
    return { ok: true, reason: null, summary: summary };
  }
};

window.PA2_STATUS = PA2_STATUS;
window.Pa2Run = Pa2Run;
