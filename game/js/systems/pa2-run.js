"use strict";
/* systems/pa2-run.js — v3.381.0 (Petites Aventures v2, lot PA2-0) : règles d'un run v2, sans écran.
   Conception Petites Aventures v2 v1.1. Un canevas mode "pa2" est délégué ici par
   SceneRunManager.startRun ; le run vit dans game.sceneRun (déjà sauvegardé et repris), avec
   run.pa2 = true. Statuts : pa2-prep (besace, pactes) -> pa2-map <-> pa2-node -> completed.
   Données : data/pa2-maps.js (tracés), data/pa2-content.js (contenu, réglages « banc »). */

var PA2_STATUS = { prep: "pa2-prep", map: "pa2-map", node: "pa2-node", done: "completed" };

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
  hasRelic: function (id, run) { run = run || this.getRun(); return !!run && run.relics.indexOf(id) >= 0; },
  hasPact: function (id, run) { run = run || this.getRun(); return !!run && run.pacts.indexOf(id) >= 0; },
  ring: function (run) { return PA2_RINGS[(run || this.getRun()).ring] || PA2_RINGS.sentier; },
  /* v3.386.0 : réglage propre au tracé (tune: { foeMult, lootMult }), pour qu'une carte longue pèse autant qu'une courte. */
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
    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("kills", count);
      if (n.type === "boss") QuestManager.track("bossKills", 1);
      var type = typeof getPlayerDamageType === "function" ? getPlayerDamageType() : null;
      if (type === "sword") QuestManager.track("swordKills", count);
      else if (type === "bow") QuestManager.track("bowKills", count);
      else if (type === "magic") QuestManager.track("magicKills", count);
    }
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
    if (!SceneRunManager.canStartPetiteAventureToday()) {
      return { ok: false, reason: SceneRunManager.petiteAventureWaitLabel(), run: null };
    }
    var worldId = template.worldId || "forest";
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
      livingMap: (opts && opts.livingMap) ? { mapId: opts.livingMap.mapId, sectorId: opts.livingMap.sectorId } : null,
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
    if (!par && !SceneRunManager.canStartPetiteAventureToday()) return { ok: false, reason: SceneRunManager.petiteAventureWaitLabel() };
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
    if (run.stock.corde && window.LivingMapManager && LivingMapManager.hasEffect("corde_plus")) {
      run.stock.corde += Number(LivingMapManager.getEffectValue("ropeBonus", 1));
    }
    var ref = self._spawn(run, null, false, self.goldBand(run));
    run.refGold = Math.max(1, Number((ref && ref.goldReward) || 1));
    run.nodes = this.generate(run);
    run.at = this.getMap(run).start;
    run.path = [];
    if (!par) { SceneRunManager._consumePetiteAventureSlot(); run.paSlotDay = SceneRunManager._today(); }
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
    var reach = PA2_RULES.sightRows + (this.hasItem("torche", run) ? 1 : 0);
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
    if (!run || !run.walls) return base;
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = run.walls[k] || base[k]; });
    return out;
  },

  /* Après un pas : une chance qu'une bascule de la carte (map.shifts) joue DEVANT le héros.
     La Craie (2 traits) l'empêche si le nœud est à portée de vue (PA2_RULES.wallChalkRows). */
  _shiftWalls: function (run) {
    var map = this.getMap(run), here = this.node(run.at, run), self = this;
    if (!map || !map.shifts || !here || this.isParcours(run)) return null;
    if (this.rand() >= Number(PA2_RULES.wallShiftPct || 0)) return null;
    var cand = map.shifts.filter(function (sh) { var n = map.nodes[sh.from]; return n && n.row > here.row && !self._walked(run, sh.from); });
    if (!cand.length) return null;
    var sh = this._pick(cand), from = map.nodes[sh.from];
    if (!run.walls) run.walls = {};
    var cur = run.walls[sh.from] || map.links[sh.from] || [];
    var next = cur.join() === sh.a.join() ? sh.b : sh.a;
    var closed = cur.filter(function (k) { return next.indexOf(k) < 0; }), opened = next.filter(function (k) { return cur.indexOf(k) < 0; });
    if (Number(run.stock.craie || 0) > 0 && this.hasItem("craie", run) && from.row - here.row <= Number(PA2_RULES.wallChalkRows || 2)) {
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
    run.path.push([run.at, key]);
    run.at = key;
    var step = (this.hasPact("lourd", run) ? PA2_RULES.heavyStep : 0) + (this.hasRelic("ronce", run) ? PA2_RULES.ronceStep : 0)
      + Number(this.worldRule(run, "stepBreath") || 0); // v3.387.0 : la soif du Désert
    if (step) run.breath = Math.max(0, run.breath - step);
    if (this.hasRelic("braise", run)) this._heal(game.heroMaxHp * PA2_RULES.braiseHealPct);
    this._prepareNode(run, this.node(key, run));
    run.wallNote = null;
    this._shiftWalls(run); // v3.429.0 (Ruines) : les murs bougent
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
      n.diff = SceneCheckSystem.depthDifficulty(5, this._depth(n, run)) * this.ring(run).diffMult * Number(run.band.obstacleScale || 1) * this.heroScale(run).obstacle;
    } else if (t === "boss") {
      n.pack = 1;
    } else if (t === "trouvaille") {
      n.draw = this.drawRelics(run, this.hasItem("carte", run) ? 2 : 1);
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
    if (!run || (run.status !== PA2_STATUS.map && run.status !== PA2_STATUS.node) || !it || !(run.stock[itemId] > 0)) {
      return { ok: false, reason: _t("Choix impossible") };
    }
    if (it.breath) {
      if (run.breath >= 100) return { ok: false, reason: _t("Ton Souffle est déjà plein.") };
      var amt = it.breath;
      if (itemId === "gourde" && window.LivingMapManager && LivingMapManager.hasEffect("gourde_40")) amt = Number(LivingMapManager.getEffectValue("gourdeBreath", 40));
      amt = this.drinkAmount(itemId, amt);
      run.breath = Math.min(100, run.breath + amt);
    } else {
      if (game.heroHp >= game.heroMaxHp && !(it.healsWound && run.wounds > 0)) return { ok: false, reason: _t("Tu es en pleine forme.") };
      this._heal(game.heroMaxHp * Number(it.healPct || 0));
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

  /* ---------- Obstacle (et tertre) ---------- */

  obstacleOptions: function () {
    var n = this._current(["obstacle", "tertre"]);
    if (!n) return [];
    var run = this.getRun(), gab = SceneEngine.getNodeBank().obstacles[n.gabaritId], prof = this._profiles(run), self = this;
    return ["power", "precision", "endurance"].filter(function (v) { return gab.options[v]; }).map(function (v) {
      var p = prof[v] || { diffMod: 1, lootMod: 1, breathCost: 0 };
      var bonus = 0;
      if (v === "power") bonus += (self.hasRelic("pierre", run) ? 1 : 0) + (self.hasRelic("fleche", run) ? 1 : 0) + (self.hasItem("bois", run) ? 1 : 0);
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
    var base = run.refGold * PA2_GOLD.obstacle * Number(opt.lootMod || 1) * this.lootMult(run);
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
    var mult = (guard ? 1 : PA2_ACTS[boss ? 3 : n.act].foeMult * this.tune(run, "foeMult") * Number(n.foeMult || 1)) * this.ring(run).foeMult * Number(run.band.foeScale || 1);
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
    if (this.hasItem("armure", run)) m *= R.armorDmgMult;
    if (this.hasRelic("dent", run)) m *= R.dentMult;
    if (this.hasRelic("fleche", run)) m *= R.flecheMult;
    if (apId === "charger" && this.hasItem("bois", run)) m *= R.boisChargeMult;
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
      out.ruse = this._check(run, "precision", n.diff, this.hasRelic("fleche", run) ? 1 : 0);
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
    var shares = PA2_APPROACHES[apId].rounds === 2 ? [0.6, 0.4] : [0.45, 0.35, 0.2];
    var parts = shares.map(function (s) { return Math.max(1, Math.round(total * s)); });
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

  ruse: function () {
    var n = this._current(["combat"]);
    if (!n) return { ok: false, reason: _t("Choix impossible") };
    var run = this.getRun(), ck = this._check(run, "precision", n.diff, this.hasRelic("fleche", run) ? 1 : 0);
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
    var healed = this._heal(game.heroMaxHp * PA2_RULES.altarHealPct);
    return this._done(run, n, { kind: "autel", accepted: true, cost: free ? 0 : cost, healed: healed });
  },

  drawRelics: function (run, count) {
    var pool = Object.keys(PA2_RELICS).filter(function (id) { return !PA2_RELICS[id].eventOnly && run.relics.indexOf(id) < 0; });
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
      var pct = camp ? R.campRestPct : R.seuilRestPct;
      res.healed = this._heal(game.heroMaxHp * pct);
      run.breath = Math.min(100, run.breath + Math.round(pct * 100));
    } else if (action === "cook") {
      var rid = this._rationInStock(run);
      if (!rid) return { ok: false, reason: _t("Tu n'as plus de ration.") };
      run.stock[rid] -= 1;
      res.healed = this._heal(game.heroMaxHp * R.cookPct);
      if (run.wounds > 0) run.wounds -= 1;
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
    var mult = this.pactMult(run);
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
      if (!par) SceneRunManager._refundPetiteAventureSlot(run);
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
