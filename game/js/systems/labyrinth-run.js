"use strict";
/* systems/labyrinth-run.js — v3.434.0 (Ruines, RU12) : le Labyrinthe aux leviers.
   Un run de plus dans game.sceneRun (déjà sauvegardé, repris au démarrage), marqué lab: true :
   étages générés, déplacement libre dans le noir, leviers et pans tournants, le Contremaître qui
   traque, descendre ou remonter avec le sac (SortieManager). Combats résolus comme les Petites
   Aventures (CombatForecast, héros seul). Réserve à part : explorationProgression.labyrinth. */

var LAB_STATUS = { map: "lab-map", done: "completed" };

var LabyrinthRun = {
  getRun: function () { var r = game.sceneRun; return (r && r.lab) ? r : null; },
  cfg: function () { return LABYRINTH_CONFIG; },
  _save: function () { if (typeof saveGame === "function") saveGame(); },
  _log: function (t) { if (typeof addLog === "function") addLog(t, "event"); },

  /* ---------- Ouverture et réserve (même horloge que les Petites Aventures, compteur à part) ---------- */

  isUnlocked: function () {
    return !!(window.StoryQuestManager && StoryQuestManager.isStepReached(this.cfg().requiresStoryStep));
  },
  _state: function () {
    if (!game.explorationProgression) game.explorationProgression = {};
    var s = game.explorationProgression.labyrinth;
    if (!s || typeof s !== "object") s = game.explorationProgression.labyrinth = { spent: 0, since: null, best: 0, runs: 0 };
    var now = Date.now(), ms = this.cfg().rechargeMs;
    if (s.spent > 0) {
      if (typeof s.since !== "number" || s.since > now) s.since = now;
      var k = Math.floor((now - s.since) / ms);
      if (k > 0) { var back = Math.min(k, s.spent); s.spent -= back; s.since += back * ms; }
    }
    if (!(s.spent > 0)) { s.spent = 0; s.since = null; }
    return s;
  },
  reserveLeft: function () { return Math.max(0, this.cfg().reserve - this._state().spent); },
  nextInMs: function () { var s = this._state(); return (this.reserveLeft() > 0 || typeof s.since !== "number") ? 0 : Math.max(0, s.since + this.cfg().rechargeMs - Date.now()); },
  bestFloor: function () { return Number(this._state().best || 0); },

  /* ---------- Départ ---------- */

  canStart: function () {
    var c = this.cfg(), cost = c.entryCost;
    if (!this.isUnlocked()) return { ok: false, reason: _t("Le labyrinthe s'ouvre après l'étape 10 des Ruines") };
    if (window.SceneRunManager && SceneRunManager.isRunActive()) return { ok: false, reason: _t("Une expédition est déjà en cours") };
    if (this.reserveLeft() <= 0) return { ok: false, reason: _t("Prochaine descente dans {d}", { d: SceneRunManager.formatPetiteAventureWait(this.nextInMs()) }) };
    if (cost && WarehouseManager.getAmount(cost.resourceId) < cost.amount) {
      var res = (window.WAREHOUSE_RESOURCES || {})[cost.resourceId];
      return { ok: false, reason: _t("Il faut {n} {x}", { n: cost.amount, x: _td(res ? res.name : cost.resourceId) }) };
    }
    return { ok: true, reason: null };
  },
  start: function () {
    var can = this.canStart();
    if (!can.ok) return can;
    var c = this.cfg(), s = this._state();
    if (c.entryCost) WarehouseManager.removeResource(c.entryCost.resourceId, c.entryCost.amount);
    if (!(s.spent > 0)) s.since = Date.now();
    s.spent += 1; s.runs = Number(s.runs || 0) + 1;
    game.sceneRun = { lab: true, templateId: "labyrinthe", worldId: c.worldId, status: LAB_STATUS.map, startedAt: Date.now(), bestBefore: Number(s.best || 0), stats: {},
      floor: 0, breath: c.breathStart, stones: 0, gold: 0, heroScale: null, end: null, note: null };
    if (window.SortieManager) SortieManager.start("scene");
    this._nextFloor(this.getRun());
    this._log("🗝️ " + _t("Tu descends dans le labyrinthe sous la ville."));
    this._save();
    return { ok: true, reason: null };
  },

  /* ---------- Génération d'un étage ---------- */

  _rnd: function (n) { return Math.floor(Math.random() * n); },
  _pick: function (a) { return a[this._rnd(a.length)]; },
  key: function (c, r) { return c + "," + r; },
  cr: function (k) { var p = k.split(","); return [+p[0], +p[1]]; },
  door: function (a, b) { return a < b ? a + "|" + b : b + "|" + a; },
  nbrs: function (F, k) {
    var p = this.cr(k), o = [], self = this;
    [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(function (d) { var c = p[0] + d[0], r = p[1] + d[1]; if (c >= 0 && c < F.w && r >= 0 && r < F.h) o.push(self.key(c, r)); });
    return o;
  },
  rooms: function (F) { var a = []; for (var c = 0; c < F.w; c++) for (var r = 0; r < F.h; r++) a.push(this.key(c, r)); return a; },
  _bfs: function (F, s, ok) {
    var d = {}, q = [s], self = this; d[s] = 0;
    while (q.length) { var k = q.shift(); this.nbrs(F, k).forEach(function (m) { if (ok(self.door(k, m), m) && d[m] == null) { d[m] = d[k] + 1; q.push(m); } }); }
    return d;
  },
  pathTo: function (F, s, e, ok) {
    var prev = {}, q = [s], self = this; prev[s] = null;
    while (q.length) { var k = q.shift(); if (k === e) break; this.nbrs(F, k).forEach(function (m) { if (ok(self.door(k, m), m) && !(m in prev)) { prev[m] = k; q.push(m); } }); }
    if (!(e in prev)) return null;
    var p = [], c = e; while (c) { p.unshift(c); c = prev[c]; }
    return p;
  },
  isOpen: function (F, d, bits) {
    for (var i = 0; i < F.pivots.length; i++) { if (F.pivots[i].a === d) return !((bits >> i) & 1); if (F.pivots[i].b === d) return !!((bits >> i) & 1); }
    return !!F.open[d];
  },
  pivotOf: function (F, d) { for (var i = 0; i < F.pivots.length; i++) if (F.pivots[i].a === d || F.pivots[i].b === d) return i; return -1; },
  /* Le plus court chemin (pas et tirages) jusqu'à l'escalier, état des pans compris ; null si impossible. */
  solve: function (F) {
    var seen = {}, q = [{ k: F.start, bits: 0, steps: 0, pulls: 0 }], self = this; seen[F.start + "#0"] = 1;
    while (q.length) {
      var s = q.shift(); if (s.k === F.stairs) return s;
      var mv = [];
      this.nbrs(F, s.k).forEach(function (m) { if (self.isOpen(F, self.door(s.k, m), s.bits)) mv.push({ k: m, bits: s.bits, steps: s.steps + 1, pulls: s.pulls }); });
      F.levers.forEach(function (lk, li) { if (lk === s.k) mv.push({ k: s.k, bits: s.bits ^ F.map[li], steps: s.steps, pulls: s.pulls + 1 }); });
      mv.forEach(function (m) { var id = m.k + "#" + m.bits; if (!seen[id]) { seen[id] = 1; q.push(m); } });
    }
    return null;
  },
  /* Un étage : labyrinthe parfait, portes-pans sur le chemin de l'escalier, boucles par zone,
     deux leviers (un gardé) ; on ne garde qu'un tirage jouable (solveur). */
  genFloor: function (n) {
    var c = this.cfg(), w = Math.min(c.sizeMax.w, c.sizeBase.w + Math.floor((n - 1) / 3)), h = Math.min(c.sizeMax.h, c.sizeBase.h + Math.floor((n - 1) / 2));
    var gates = n >= 2 ? c.gatesFrom2 : 1, decoys = n >= c.decoyFrom ? 1 : 0;
    for (var t = 0; t < 4000; t++) { var F = this._tryFloor(n, w, h, gates, decoys); if (F) return F; }
    return null;
  },
  _tryFloor: function (n, w, h, nGates, nDecoys) {
    var c = this.cfg(), self = this, F = { n: n, w: w, h: h, open: {}, pivots: [], levers: [], map: [] };
    var start = this.key(Math.floor(w / 2), 0), seen = {}, stack = [start]; seen[start] = 1;
    while (stack.length) {
      var cur = stack[stack.length - 1], cand = this.nbrs(F, cur).filter(function (x) { return !seen[x]; });
      if (!cand.length) { stack.pop(); continue; }
      var nx = this._pick(cand); F.open[this.door(cur, nx)] = 1; seen[nx] = 1; stack.push(nx);
    }
    var dist = this._bfs(F, start, function (d) { return F.open[d]; }), stairs = null;
    var target = Math.min(c.stairsDist.base + c.stairsDist.perFloor * n, c.stairsDist.max);
    Object.keys(dist).forEach(function (k) { if (self.cr(k)[1] >= h - 2 && (!stairs || Math.abs(dist[k] - target) < Math.abs(dist[stairs] - target))) stairs = k; });
    var path = this.pathTo(F, start, stairs, function (d) { return F.open[d]; });
    if (!path || path.length < 8) return null;
    var gates = [];
    for (var g = 1; g <= nGates; g++) { var i = Math.floor(path.length * g / (nGates + 1)); gates.push(this.door(path[i - 1], path[i])); }
    gates.forEach(function (d) { delete F.open[d]; });
    var zone = this._zones(F, path, gates);
    this.rooms(F).forEach(function (k) { self.nbrs(F, k).forEach(function (m) { var d = self.door(k, m); if (!F.open[d] && gates.indexOf(d) < 0 && zone[k] === zone[m] && Math.random() < c.loopPct) F.open[d] = 1; }); });
    var used = {};
    gates.forEach(function (gd, gi) {
      var zIn = Object.keys(F.open).filter(function (d) { var p = d.split("|"); return zone[p[0]] === gi && !used[d]; });
      if (!zIn.length) return; var a = self._pick(zIn); used[a] = 1; F.pivots.push({ a: a, b: gd });
    });
    if (F.pivots.length < nGates) return null;
    for (var dc = 0; dc < nDecoys; dc++) {
      var a2 = this._pick(Object.keys(F.open).filter(function (d) { return !used[d]; })), p0 = a2.split("|")[0];
      var shut = this.nbrs(F, p0).map(function (m) { return self.door(p0, m); }).filter(function (d) { return !F.open[d] && gates.indexOf(d) < 0 && zone[d.split("|")[0]] === zone[d.split("|")[1]]; });
      if (shut.length) { used[a2] = 1; F.pivots.push({ a: a2, b: this._pick(shut) }); }
    }
    F.pivots.forEach(function (p) { delete F.open[p.a]; delete F.open[p.b]; });
    var deg = {}; this.rooms(F).forEach(function (k) { deg[k] = self.nbrs(F, k).filter(function (m) { return F.open[self.door(k, m)]; }).length; });
    var spots = {};
    [0, Math.min(1, nGates - 1)].forEach(function (z) {
      var inZ = self.rooms(F).filter(function (k) { return zone[k] <= z && k !== start && k !== stairs && !spots[k]; }), ends = inZ.filter(function (k) { return deg[k] <= 1; });
      var k2 = self._pick(ends.length ? ends : inZ); if (k2) { spots[k2] = 1; F.levers.push(k2); }
    });
    if (F.levers.length < 2) return null;
    var P = F.pivots.length, all = 0;
    F.map = F.levers.map(function () { var m = 1 << self._rnd(P); if (Math.random() < 0.6) m |= 1 << self._rnd(P); return m; });
    F.map.forEach(function (m) { all |= m; });
    if (all !== (1 << P) - 1) return null;
    F.start = start; F.stairs = stairs; F.guarded = this._rnd(2);
    var sol = this.solve(F);
    if (!sol || sol.pulls < nGates) return null;
    if (sol.steps * c.step + sol.pulls * c.pull > c.costMaxBase + c.costMaxPerGate * nGates) return null;
    F.best = { steps: sol.steps, pulls: sol.pulls };
    var free = this.rooms(F).filter(function (k) { return k !== start && k !== stairs && !spots[k] && deg[k] <= 1; });
    for (var s2 = free.length - 1; s2 > 0; s2--) { var j = this._rnd(s2 + 1), tmp = free[s2]; free[s2] = free[j]; free[j] = tmp; }
    F.spring = free[0] || null; F.chest = free[1] || null;
    F.boss = n % c.bossEvery === 0;
    return F;
  },
  /* Zones séparées par les portes du chemin, numérotées dans l'ordre du chemin (0 = départ). */
  _zones: function (F, path, gates) {
    var comp = {}, id = 0, self = this;
    this.rooms(F).forEach(function (k) {
      if (comp[k] != null) return; var q = [k]; comp[k] = id;
      while (q.length) { var x = q.shift(); self.nbrs(F, x).forEach(function (m) { if (F.open[self.door(x, m)] && comp[m] == null) { comp[m] = id; q.push(m); } }); }
      id++;
    });
    var remap = {}; remap[comp[path[0]]] = 0;
    gates.forEach(function (gd, gi) { var after = gd.split("|").filter(function (k) { return remap[comp[k]] == null; })[0]; if (after) remap[comp[after]] = gi + 1; });
    var z = {}; this.rooms(F).forEach(function (k) { z[k] = remap[comp[k]] != null ? remap[comp[k]] : 99; });
    return z;
  },
  _nextFloor: function (run) {
    var c = this.cfg();
    run.floor += 1;
    var F = null; while (!F) F = this.genFloor(run.floor);   // très rare : on relance
    run.F = F; run.bits = 0; run.at = F.start; run.seen = {}; run.seen[F.start] = 1;
    run.knownPiv = {}; run.newPiv = {}; run.pulled = {}; run.guardUp = true;
    run.springUsed = false; run.chestTaken = false; run.bossDown = !F.boss;
    if (run.floor > 1) run.breath = Math.min(c.breathStart, run.breath + c.breathFloor);
    run.foe = run.floor >= c.foeFrom ? { at: this._farthest(run, F.start), stun: 3, tick: 0, every: run.floor >= c.foeFastFrom ? c.foeEveryFast : c.foeEvery } : null;
    run.note = { text: LABYRINTH_TEXTS.floorLines[(run.floor - 1) % LABYRINTH_TEXTS.floorLines.length], data: true };
    this._look(run);
    var st = this._state(); if (run.floor > Number(st.best || 0)) st.best = run.floor;
  },
  _farthest: function (run, s) {
    var F = run.F, self = this, d = this._bfs(F, s, function (dd) { return F.open[dd] || self.pivotOf(F, dd) >= 0; }), far = s;
    Object.keys(d).forEach(function (k) { if (d[k] > d[far]) far = k; });
    return far;
  },

  /* ---------- Ce que voit le héros ---------- */

  openNow: function (run, d) { return this.isOpen(run.F, d, run.bits); },
  isLit: function (run, k) { return k === run.at || (this.nbrs(run.F, run.at).indexOf(k) >= 0 && this.openNow(run, this.door(run.at, k))); },
  canMove: function (run, k) { return run.status === LAB_STATUS.map && this.nbrs(run.F, run.at).indexOf(k) >= 0 && this.openNow(run, this.door(run.at, k)); },
  /* La torche montre les pans voisins : Edda les note. */
  _look: function (run) {
    var self = this;
    this.nbrs(run.F, run.at).forEach(function (m) { var pv = self.pivotOf(run.F, self.door(run.at, m)); if (pv >= 0) run.knownPiv[pv] = 1; });
  },
  leverAt: function (run, k) { return run.F.levers.indexOf(k); },
  /* Chemin dessiné jusqu'à une salle déjà vue (marche guidée par la carte d'Edda), ou null. */
  walkPath: function (k) {
    var run = this.getRun(), self = this;
    if (!run || !run.seen[k] || k === run.at) return null;
    var p = this.pathTo(run.F, run.at, k, function (d, m) { return self.openNow(run, d) && (run.seen[m] || m === k); });
    return p ? p.slice(1) : null;
  },

  /* ---------- Un pas ---------- */
  /* move(k, passing) -> { ok, event } ; event : "lever", "stairs", "spring", "chest", "caught", "end" ou null.
     passing : la marche guidée traverse une salle déjà vue sans y rouvrir le levier. */
  move: function (k, passing) {
    var run = this.getRun(), c = this.cfg();
    if (!run || run.pending || !this.canMove(run, k)) return { ok: false, event: null };
    var was = !!run.seen[k];
    run.at = k; run.seen[k] = 1; run.newPiv = {}; this._look(run);
    run.breath = Math.max(0, run.breath - c.step);
    var ev = null;
    if (this._foeTurn(run)) ev = "caught";
    if (run.status !== LAB_STATUS.map) { this._save(); return { ok: true, event: "end" }; }
    if (!ev && run.breath <= 0) { this.finish("souffle"); return { ok: true, event: "end" }; }
    var F = run.F;
    if (!ev && !(passing && was)) {
      if (k === F.stairs) ev = "stairs";
      else if (this.leverAt(run, k) >= 0) ev = "lever";
      else if (k === F.spring && !run.springUsed) { ev = "spring"; this._spring(run); }
      else if (k === F.chest && !run.chestTaken) { ev = "chest"; this._chest(run); }
    }
    if (!ev || ev === "caught") { if (ev !== "caught") run.note = { text: this.foeHint(run) || _t("Tu avances. Souffle −{n}.", { n: c.step }), alert: /tout près/.test(this.foeHint(run)) }; }
    this._save();
    return { ok: true, event: ev };
  },
  _spring: function (run) {
    var c = this.cfg(); run.springUsed = true;
    run.breath = Math.min(c.breathStart, run.breath + c.springBreath);
    game.heroHp = Math.min(game.heroMaxHp, Number(game.heroHp || 0) + Math.round(game.heroMaxHp * c.springHealPct));
    run.note = { text: _t("Une source, sous une dalle fendue. Souffle +{n}, PV +{p} %.", { n: c.springBreath, p: Math.round(c.springHealPct * 100) }) };
  },
  _chest: function (run) {
    var c = this.cfg(), s = c.chestStones + Math.floor(run.floor / 2) * c.chestStonesPerTwoFloors, g = c.chestGoldPerFloor * run.floor;
    run.chestTaken = true; this._gain(run, s, g);
    run.note = { text: _t("Un coffre oublié : +{s} Pierres errantes, +{g} or.", { s: s, g: g }) };
  },
  _gain: function (run, stones, gold) {
    run.stones += stones; run.gold += gold;
    if (window.SortieManager) { if (stones) SortieManager.addResource(this.cfg().stoneResource, stones); if (gold) SortieManager.addGold(gold); }
  },

  /* ---------- Le Contremaître ---------- */

  _foeTurn: function (run) {
    var f = run.foe, self = this; if (!f) return false;
    if (f.stun > 0) { f.stun--; return false; }
    f.tick++;
    if (f.at !== run.at && f.tick % f.every === 0) {         // le héros entré dans sa salle est pris sur place
      var d = this._bfs(run.F, run.at, function (dd) { return self.openNow(run, dd); });
      if (d[f.at] != null) {
        var best = null;
        this.nbrs(run.F, f.at).forEach(function (m) { if (self.openNow(run, self.door(f.at, m)) && d[m] != null && (best === null || d[m] < d[best])) best = m; });
        if (best) f.at = best;
      }
    }
    if (f.at !== run.at) return false;
    // v3.436.0 : il te rattrape ; le joueur choisit (Charger, Tenir, Fuir) avant de repartir
    run.pending = { kind: "foe" }; this._stat(run, "caught");
    run.note = { text: _t("Le Contremaître te rattrape."), alert: true };
    return true;
  },
  foeDist: function (run) {
    var f = run && run.foe, self = this; if (!f || f.stun > 0) return null;
    var d = this._bfs(run.F, run.at, function (dd) { return self.openNow(run, dd); })[f.at];
    return d == null ? -1 : d;
  },
  foeHint: function (run) {
    var d = this.foeDist(run); if (d == null) return "";
    if (d < 0) return _t("Des pas de pierre, quelque part. Un mur vous sépare.");
    if (d <= 2) return _t("Des pas de pierre, tout près — {dir}.", { dir: this.dirLabel(run.at, run.foe.at) });
    if (d <= 4) return _t("Des pas de pierre, {dir}.", { dir: this.dirLabel(run.at, run.foe.at) });
    return "";
  },
  dirLabel: function (a, b) {
    var p = this.cr(a), q = this.cr(b), dx = q[0] - p[0], dy = q[1] - p[1];
    var ns = dy > 0 ? "n" : (dy < 0 ? "s" : ""), ew = dx > 0 ? "e" : (dx < 0 ? "o" : "");
    var L = { n: _t("vers le nord"), s: _t("vers le sud"), e: _t("vers l'est"), o: _t("vers l'ouest"), ne: _t("vers le nord-est"), no: _t("vers le nord-ouest"), se: _t("vers le sud-est"), so: _t("vers le sud-ouest") };
    return L[ns + ew] || _t("ici");
  },

  /* ---------- Combats résolus (comme les Petites Aventures : CombatForecast, héros seul) ---------- */

  heroScale: function (run) {
    if (run.heroScale && typeof run.heroScale.hp === "number") return run.heroScale;
    var cfg = window.PA2_HERO_SCALING, key = (window.WORLD_HERO_SCALING && WORLD_HERO_SCALING.refByWorld.ruins || [])[1];
    var hs = (cfg && key && window.CombatForecast && typeof CombatForecast.getHeroScale === "function") ? CombatForecast.getHeroScale(key, cfg) : { hp: 1, power: 1 };
    run.heroScale = { hp: hs.hp, power: hs.power };
    return run.heroScale;
  },
  _spawn: function (foeId, boss) {
    var c = this.cfg(), q = { worldId: c.worldId, adventureIndex: c.adventureIndex };
    if (!boss && foeId) q.enemyFilter = [foeId];
    var W = window.WorldManager, was = W ? W._heroScaleOff : false, e;
    if (W) W._heroScaleOff = true;
    try { e = QuestEnemyManager.spawnFor(q, !!boss); } finally { if (W) W._heroScaleOff = was; }
    e = Array.isArray(e) ? e[0] : e;
    return e ? JSON.parse(JSON.stringify(e)) : null;
  },
  /* L'adversaire d'un combat : kind = "guard" (garde d'un levier), "foe" (le Contremaître), "boss" (le Gardien). */
  _enemy: function (run, kind) {
    var c = this.cfg(), e, hpM = 1, powM = 1;
    if (kind === "foe" && window.EliteManager) {
      e = EliteManager.build(c.foeEliteId, EliteManager.scaleFor(this._worldIdx(), c.adventureIndex), { noMilestone: true });
      e = e ? JSON.parse(JSON.stringify(e)) : null; hpM = c.foeHpMult; powM = c.foePowMult;
    } else if (kind === "boss") {
      e = this._spawn(c.bossFoe, false); hpM = c.bossHpMult; powM = c.bossPowMult;
      if (e) e.name = c.bossName;
    } else {
      var gf = run.guardFoe || c.guardFoes[0];
      e = this._spawn(gf, false);
      hpM = powM = c.guardMult * (1 + c.guardPerFloor * (run.floor - 1)) * Math.sqrt(Number((c.guardFoeMult || {})[gf] || 1));
    }
    if (!e) return null;
    var hs = this.heroScale(run);
    e.maxHp = Math.max(1, Math.round(Number(e.maxHp || 1) * hpM * hs.hp)); e.hp = e.maxHp;
    if (e.stats) e.stats.power = Math.max(1, Math.round(Number(e.stats.power || 1) * powM * hs.power));
    return e;
  },
  _worldIdx: function () { var id = this.cfg().worldId; for (var i = 0; i < (window.WORLDS || []).length; i++) if (WORLDS[i].id === id) return i; return 2; },
  _stat: function (run, k) { run.stats = run.stats || {}; run.stats[k] = Number(run.stats[k] || 0) + 1; },
  /* L'or de référence d'un combat : celui d'un squelette des Ruines (comme l'or de carte des Petites Aventures). */
  _refGold: function (run) {
    if (!run.refGold) { var e = this._spawn("skeleton", false); run.refGold = Math.max(1, Number((e && e.goldReward) || 1)); }
    return run.refGold;
  },
  /* Estimation affichée avant le choix = celle appliquée (au tirage de ±15 % près). apId : "charger" ou "tenir". */
  estimate: function (kind, apId) {
    var run = this.getRun(); if (!run) return null;
    var e = this._enemy(run, kind); if (!e) return null;
    var ap = PA2_APPROACHES[apId || "tenir"] || PA2_APPROACHES.tenir, c = this.cfg();
    var heroDmg = CombatForecast.getHeroDamagePerRound(), foeDmg = CombatForecast.getEnemyDamagePerRound(e);
    var net = heroDmg - CombatForecast.getHealThreshold(e), rounds = net > 0 ? Math.ceil(e.maxHp / net) : Infinity;
    var unwinnable = !(rounds <= PA2_RULES.maxRounds), pack = kind === "guard" ? c.guardPack : 1;
    var hpLoss = unwinnable ? Number(game.heroHp || 0) : Math.max(1, Math.round(rounds * foeDmg * pack * Number(ap.dmg || 1)));
    var gold = Math.round(this._refGold(run) * Number((c.combatGold || {})[kind] || 1.7) * pack * Number(ap.loot || 1));
    return { kind: kind, approach: ap.id, foeName: e.name, foeImage: e.image || null, pack: pack, hpLoss: hpLoss, unwinnable: unwinnable, gold: gold,
      rounds: Number(ap.rounds || 3), verdict: window.Pa2Run ? Pa2Run.verdictOf(hpLoss) : "" };
  },
  /* Applique les dégâts d'un combat ; false si le héros tombe (le run s'arrête). */
  _hit: function (run, est) {
    var spread = PA2_RULES.damageSpread;
    var dmg = est.unwinnable ? est.hpLoss : Math.max(1, Math.round(est.hpLoss * (1 - spread + Math.random() * 2 * spread)));
    est.hpLoss = dmg;
    game.heroHp = Math.max(0, Number(game.heroHp || 0) - dmg);
    if (game.heroHp > 0) return true;
    this.finish("ko");
    return false;
  },
  /* Le combat en attente (garde, Contremaître, Gardien) : { kind, li?, surprised? } ou null. */
  pendingFight: function () { var run = this.getRun(); return run && run.status === LAB_STATUS.map ? (run.pending || null) : null; },
  /* Ouvre un combat : la garde d'un levier, ou le Gardien à l'escalier. */
  engage: function (kind, li) {
    var run = this.getRun(); if (!run || run.status !== LAB_STATUS.map) return { ok: false };
    if (kind === "guard" && !(li === run.F.guarded && run.guardUp && this.leverAt(run, run.at) === li)) return { ok: false };
    if (kind === "guard") this.leverInfo(li);   // tire la garde si ce n'est pas fait
    if (kind === "boss" && (run.bossDown || run.at !== run.F.stairs)) return { ok: false };
    run.pending = { kind: kind, li: li == null ? null : li }; this._save();
    return { ok: true };
  },
  /* fight(apId) : résout le combat en attente, en 2 (Charger) ou 3 (Tenir) échanges.
     -> { ok, result: { approach, parts[], dmg, gain, ko, kind } } */
  fight: function (apId) {
    var run = this.getRun(), p = run && run.pending, c = this.cfg();
    if (!p || !PA2_APPROACHES[apId]) return { ok: false };
    var est = this.estimate(p.kind, apId);
    if (p.surprised) est.hpLoss = Math.round(est.hpLoss * PA2_RULES.surprisedMult);
    var res = { kind: p.kind, approach: apId, surprised: !!p.surprised, li: p.li };
    run.pending = null;
    if (!this._hit(run, est)) { res.ko = true; res.dmg = est.hpLoss; res.parts = this._parts(est.hpLoss, est.rounds); this._save(); return { ok: true, result: res }; }
    res.dmg = est.hpLoss; res.parts = this._parts(est.hpLoss, est.rounds);
    res.gain = est.gold; this._gain(run, 0, est.gold); this._stat(run, "fights");
    if (window.SortieManager) SortieManager.noteKill(p.kind === "boss");
    if (p.kind === "guard") { run.guardUp = false; run.guardFoe = null; run.note = { text: _t("Combat de garde gagné : PV −{n}.", { n: res.dmg }) }; }
    else if (p.kind === "foe") { run.foe.stun = c.foeStun; run.foe.at = this._farthest(run, run.at); run.note = { text: _t("Le Contremaître recule dans le noir… pour l'instant. PV −{n}.", { n: res.dmg }), alert: true }; }
    else { run.bossDown = true; this._gain(run, c.bossStones, 0); res.stones = c.bossStones; run.note = { text: _t("Le Gardien s'effondre en marches. +{n} Pierres errantes.", { n: c.bossStones }) }; }
    this._save();
    return { ok: true, result: res };
  },
  _parts: function (total, rounds) {
    var shares = rounds === 2 ? [0.6, 0.4] : [0.45, 0.35, 0.2];
    return shares.map(function (sh) { return Math.max(1, Math.round(total * sh)); });
  },
  /* La ruse (garde d'un levier) : réussie, on tire sans combattre ; ratée, du Souffle en moins et la garde frappe la première. */
  ruseChance: function (run) { var c = this.cfg(); run = run || this.getRun(); return Math.max(c.ruseMin, c.ruseBase - c.rusePerFloor * ((run ? run.floor : 1) - 1)); },
  ruse: function () {
    var run = this.getRun(), p = run && run.pending, c = this.cfg();
    if (!p || p.kind !== "guard" || p.surprised) return { ok: false };
    if (Math.random() < this.ruseChance(run)) {
      run.pending = null; run.guardUp = false; run.guardFoe = null; this._stat(run, "ruses");
      run.note = { text: _t("Ils ne t'ont jamais vu. Le levier est libre.") }; this._save();
      return { ok: true, success: true };
    }
    run.breath = Math.max(0, run.breath - c.ruseBreath); p.surprised = true;
    run.note = { text: _t("Repéré ! Souffle −{n}. Ils frappent les premiers.", { n: c.ruseBreath }), alert: true };
    if (run.breath <= 0) this.finish("souffle");
    this._save();
    return { ok: true, success: false };
  },
  /* Fuir le Contremaître : du Souffle en moins, il te perd dans le noir. */
  flee: function () {
    var run = this.getRun(), p = run && run.pending, c = this.cfg();
    if (!p || p.kind !== "foe") return { ok: false };
    run.pending = null; run.breath = Math.max(0, run.breath - c.fleeBreath);
    run.foe.stun = Math.max(2, Math.floor(c.foeStun / 2)); run.foe.at = this._farthest(run, run.at); this._stat(run, "fled");
    run.note = { text: _t("Tu cours dans le noir. Il te perd. Souffle −{n}.", { n: c.fleeBreath }) };
    if (run.breath <= 0) this.finish("souffle");
    this._save();
    return { ok: true };
  },

  /* ---------- Leviers ---------- */

  leverInfo: function (li) {
    var run = this.getRun(); if (!run) return null;
    if (li === run.F.guarded && run.guardUp && !run.guardFoe) run.guardFoe = this._pick(this.cfg().guardFoes);
    return { guarded: li === run.F.guarded && run.guardUp, pulled: Number(run.pulled[li] || 0), estimate: (li === run.F.guarded && run.guardUp) ? this.estimate("guard") : null,
      guardLine: LABYRINTH_TEXTS.guardLines[Math.max(0, this.cfg().guardFoes.indexOf(run.guardFoe))] };
  },
  fightGuard: function (li, apId) {   // raccourci (bancs, harnais) : engager puis combattre
    if (!this.engage("guard", li).ok) return { ok: false };
    var r = this.fight(apId || "tenir");
    return { ok: r.ok, ko: !!(r.result && r.result.ko), hpLoss: r.result ? r.result.dmg : 0 };
  },
  pull: function (li) {
    var run = this.getRun(), c = this.cfg();
    if (!run || this.leverAt(run, run.at) !== li || (li === run.F.guarded && run.guardUp)) return { ok: false };
    if (run.breath < c.pull) { run.note = { text: _t("Plus assez de Souffle pour tirer."), alert: true }; return { ok: false }; }
    var m = run.F.map[li], far = 0, turned = 0;
    run.bits ^= m; run.breath -= c.pull; run.newPiv = {};
    run.pulled[li] = Number(run.pulled[li] || 0) + 1;
    run.F.pivots.forEach(function (p, i) { if (!((m >> i) & 1)) return; turned++; if (!run.knownPiv[i]) far++; run.knownPiv[i] = 1; run.newPiv[i] = 1; });
    this._look(run);
    run.note = { text: (turned > 1 ? _t("Le levier grince. {n} pans tournent", { n: turned }) : _t("Le levier grince. Un pan tourne"))
      + (far ? (far > 1 ? _t(", dont {n} au loin", { n: far }) : _t(", dont un au loin")) : "") + ". " + _t("Edda le note sur sa carte, en violet. Souffle −{n}.", { n: c.pull }) };
    if (run.breath <= 0) this.finish("souffle");
    this._save();
    return { ok: true, mask: m };
  },

  /* ---------- L'escalier : le Gardien, puis descendre ou remonter ---------- */

  stairsGain: function (run) { var c = this.cfg(); return { stones: c.stairsStones + c.stairsStonesPerFloor * run.floor, gold: c.stairsGoldPerFloor * run.floor }; },
  fightBoss: function (apId) {   // raccourci (bancs, harnais)
    if (!this.engage("boss").ok) return { ok: false };
    var r = this.fight(apId || "tenir");
    return { ok: r.ok, ko: !!(r.result && r.result.ko), hpLoss: r.result ? r.result.dmg : 0 };
  },
  /* Franchir l'escalier : le gain de l'étage, une seule fois ; puis descendre ou remonter. */
  claimStairs: function () {
    var run = this.getRun(); if (!run || run.at !== run.F.stairs || !run.bossDown) return null;
    if (run.claimed === run.floor) return null;
    var g = this.stairsGain(run); run.claimed = run.floor; this._gain(run, g.stones, g.gold); this._stat(run, "floors"); this._save();
    return g;
  },
  descend: function () {
    var run = this.getRun(); if (!run || run.claimed !== run.floor) return { ok: false };
    this._nextFloor(run); this._save();
    return { ok: true };
  },

  /* ---------- Fin ---------- */
  /* how : "remonte" (tout le sac), "ko" ou "souffle" (la moitié : règle de fuite), "abandon" (la moitié). */
  finish: function (how) {
    var run = this.getRun(); if (!run || run.status === LAB_STATUS.done) return null;
    run.status = LAB_STATUS.done;
    var summary = window.SortieManager ? SortieManager.end(how === "remonte" ? "success" : "flee") : null;
    run.end = { how: how, floor: run.floor, summary: summary, record: run.floor > Number(run.bestBefore || 0), stats: run.stats || {} };
    if (how === "ko" || how === "souffle") {
      // Comme une Petite Aventure (D6) : un échec subi rend la descente ; tombé = bandeau du Campement
      var st = this._state(); if (st.spent > 0) st.spent -= 1; if (!(st.spent > 0)) st.since = null;
      if (how === "ko") game.justDied = true;
      this._log("💀 " + _t("Edda te ramène à la surface. La moitié du sac reste en bas."));
    } else this._log("🗝️ " + _t("Labyrinthe : remonté de l'étage {n}.", { n: run.floor }));
    this._save();
    return run.end;
  },
  abandon: function () { return this.finish("abandon"); }
};

window.LabyrinthRun = LabyrinthRun;
window.LAB_STATUS = LAB_STATUS;
