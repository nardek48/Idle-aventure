"use strict";
/* systems/patrol-system.js — v3.334.0 (Évolutions, lot P-1) : patrouilles de compagnons.
   Conception « Évolutions » v1.0 §4, décisions P1 à P9 (Seb, 24/09/2026). Données :
   data/patrols.js. Chiffres : sim/patrouille-bench.js.

   RÈGLES :
   - P2 : un compagnon en patrouille quitte le groupe (CompanionManager.partyIds le filtre).
     Rappel à tout moment : butin au prorata du temps écoulé, pas de récit.
   - P4 : destinations = secteurs LIBÉRÉS de la carte vivante du monde courant. Une patrouille
     en cours garde son secteur même s'il est recouvert entre-temps (pas d'effet sur le
     Recouvrement en v1).
   - Butin TIRÉ AU DÉPART, révélé au retour : recharger la page ne relance rien.
   - Horloge murale (endsAt contre Date.now), comme le chantier du Village : rien à
     rattraper au retour, aucune ligne dans ResumeManager.
   - P7 : aucun échec. Le butin passe par WarehouseManager (plafond E1 : ce qui dépasse est
     perdu et affiché).

   PERSISTANCE : game.patrols = { <companionId>: { mapId, sectorId, hours, startedAt, endsAt,
   loot: { <res>: n }, gold, story: { rare, index } } }, aux quatre points de save-system.js.
   Conservé à la reprise (comme les compagnons). */

var PatrolManager = {

  ensure: function () {
    if (!game.patrols || typeof game.patrols !== "object" || Array.isArray(game.patrols)) game.patrols = {};
    return game.patrols;
  },

  /* P9 : ouvert dès le premier compagnon. */
  isUnlocked: function () {
    return !!(window.CompanionManager && CompanionManager.unlockedIds().length);
  },

  get: function (companionId) { return this.ensure()[companionId] || null; },

  isOnPatrol: function (companionId) { return !!this.get(companionId); },

  isBack: function (companionId) {
    var p = this.get(companionId);
    return !!(p && Date.now() >= p.endsAt);
  },

  /* ---------- Destinations (P4) ---------- */

  currentMapId: function () {
    var w = (window.WORLDS && window.WorldManager) ? WORLDS[Number(WorldManager.worldIndex || 0)] : null;
    return (w && window.LIVING_MAPS && LIVING_MAPS[w.id]) ? w.id : null;
  },

  getSectorDef: function (mapId, sectorId) {
    var map = window.LIVING_MAPS ? LIVING_MAPS[mapId] : null;
    if (!map) return null;
    for (var i = 0; i < map.sectors.length; i++) if (map.sectors[i].id === sectorId) return map.sectors[i];
    return null;
  },

  getDestinations: function () {
    var mapId = this.currentMapId();
    if (!mapId || !window.LivingMapManager) return [];
    var self = this;
    return LIVING_MAPS[mapId].sectors.filter(function (s) {
      return LivingMapManager.isLiberated(mapId, s.id);
    }).map(function (s) {
      var res = self.sectorResources(mapId, s.id);
      return { mapId: mapId, sectorId: s.id, name: s.name, ring: s.ring, main: res[0], second: res[1] };
    });
  },

  sectorResources: function (mapId, sectorId) {
    var t = (window.PATROL_SECTORS && PATROL_SECTORS[mapId]) || {};
    return t[sectorId] || ["bois", "pierre"];
  },

  /* ---------- Rendement ---------- */

  /* Estimation sans hasard (aperçu avant le départ) : { main, second, gold } par ressource. */
  estimate: function (companionId, mapId, sectorId, hours) {
    var rate = (window.PATROL_RATES && PATROL_RATES[mapId]) || { matPerHour: 0, goldPerHour: 0 };
    var def = this.getSectorDef(mapId, sectorId);
    var ring = def ? (PATROL_RING_MULT[def.ring] || 1) : 1;
    var st = window.CompanionManager ? CompanionManager.state(companionId) : null;
    var upg = 1 + PATROL_UPGRADE_BONUS * Number((st && st.upgrades) || 0);
    var mat = rate.matPerHour * hours * ring * upg;
    var res = this.sectorResources(mapId, sectorId);
    var out = { loot: {}, gold: Math.floor(rate.goldPerHour * hours * upg) };
    out.loot[res[0]] = Math.floor(mat * PATROL_SPLIT.main);
    out.loot[res[1]] = (out.loot[res[1]] || 0) + Math.floor(mat * PATROL_SPLIT.second);
    return out;
  },

  _jitter: function (n, rng) {
    var r = 1 - PATROL_JITTER + 2 * PATROL_JITTER * rng();
    return Math.max(0, Math.floor(n * r));
  },

  /* Tirage au départ : butin, ingrédients de rations (rare), récit. rng injectable (harnais). */
  roll: function (companionId, mapId, sectorId, hours, rng) {
    rng = rng || Math.random;
    var est = this.estimate(companionId, mapId, sectorId, hours);
    var self = this, loot = {};
    Object.keys(est.loot).forEach(function (k) { loot[k] = self._jitter(est.loot[k], rng); });
    if (rng() < Math.min(0.9, PATROL_RATION_CHANCE_PER_H * hours)) {
      var extra = (PATROL_RATION_LOOT && PATROL_RATION_LOOT[mapId]) || {};
      Object.keys(extra).forEach(function (k) { loot[k] = (loot[k] || 0) + extra[k]; });
    }
    var rareChance = PATROL_RARE_PER_H * hours + (hours >= 8 ? PATROL_RARE_NIGHT_BONUS : 0);
    var rare = rng() < rareChance;
    var pool = this._storyPool(companionId, mapId);
    var list = rare ? pool.rare : pool.common;
    return { loot: loot, gold: this._jitter(est.gold, rng), story: { rare: rare && list.length > 0, index: list.length ? Math.floor(rng() * list.length) : 0 } };
  },

  _storyPool: function (companionId, mapId) {
    var c = (window.PATROL_STORIES && PATROL_STORIES[companionId]) || {};
    var w = c[mapId] || c.forest || {};
    return { common: w.common || [], rare: w.rare || [] };
  },

  storyText: function (companionId, p) {
    if (!p || !p.story) return "";
    var pool = this._storyPool(companionId, p.mapId);
    var list = p.story.rare ? pool.rare : pool.common;
    var txt = list[p.story.index] || list[0] || "";
    var def = this.getSectorDef(p.mapId, p.sectorId);
    return txt.replace(/\{secteur\}/g, def ? def.name : "");
  },

  /* ---------- Actions ---------- */

  canStart: function (companionId) {
    if (!window.CompanionManager || !CompanionManager.isUnlocked(companionId)) return "Compagnon indisponible";
    if (this.isOnPatrol(companionId)) return "Déjà en patrouille";
    if (window.heroLockReason && heroLockReason()) return heroLockReason();
    if (game.activeTab === "combat") return "Pas pendant un combat";
    return null;
  },

  start: function (companionId, sectorId, hours, rng) {
    var why = this.canStart(companionId);
    if (why) { if (typeof showToast === "function") showToast(why, 1400); return false; }
    if (PATROL_DURATIONS_H.indexOf(Number(hours)) === -1) return false;
    var dest = this.getDestinations().filter(function (d) { return d.sectorId === sectorId; })[0];
    if (!dest) { if (typeof showToast === "function") showToast("Secteur à libérer d'abord", 1400); return false; }

    var now = Date.now();
    var r = this.roll(companionId, dest.mapId, sectorId, Number(hours), rng);
    this.ensure()[companionId] = {
      mapId: dest.mapId, sectorId: sectorId, hours: Number(hours),
      startedAt: now, endsAt: now + Number(hours) * 3600e3,
      loot: r.loot, gold: r.gold, story: r.story
    };
    if (window.AchievementManager) AchievementManager.onPatrolStarted(); // v3.338.0 : « Le camp est vide »
    var def = getCompanionDef(companionId);
    if (typeof addLog === "function") addLog("🧭 " + (def ? def.name : companionId) + " part en patrouille : " + dest.name + " (" + hours + " h).", "event");
    this._refresh();
    return true;
  },

  /* Patrouilles rentrées, butin pas encore pris (fil rouge, écran de retour). */
  getReturned: function () {
    var all = this.ensure(), now = Date.now(), self = this, out = [];
    Object.keys(all).forEach(function (id) {
      var p = all[id];
      if (!p || now < p.endsAt) return;
      var def = window.getCompanionDef ? getCompanionDef(id) : null;
      var sec = self.getSectorDef(p.mapId, p.sectorId);
      out.push({ companionId: id, companionName: def ? def.name : id, feminine: !!(PATROL_COMPANION_FEMININE[id]),
        sectorName: sec ? sec.name : p.sectorId, patrol: p });
    });
    return out;
  },

  /* Crédite un butin (plafond de l'Entrepôt). Rend { loot, lost, gold }. */
  _credit: function (loot, gold) {
    var got = {}, lost = {};
    Object.keys(loot || {}).forEach(function (k) {
      var n = Math.floor(Number(loot[k] || 0));
      if (n <= 0) return;
      var added = (window.WarehouseManager && typeof WarehouseManager.addResource === "function")
        ? WarehouseManager.addResource(k, n, true) : 0;
      added = (typeof added === "number") ? added : n;
      if (added > 0) got[k] = added;
      if (n - added > 0) lost[k] = n - added;
    });
    var g = Math.floor(Number(gold || 0));
    if (g > 0) {
      game.gold = Number(game.gold || 0) + g;
      if (window.QuestManager && typeof QuestManager.track === "function") QuestManager.track("goldEarned", g);
    }
    return { loot: got, lost: lost, gold: g };
  },

  /* Prend le butin d'une patrouille rentrée. Rend { loot, lost, gold, story } ou null. */
  collect: function (companionId) {
    var p = this.get(companionId);
    if (!p || Date.now() < p.endsAt) return null;
    var story = this.storyText(companionId, p);
    var res = this._credit(p.loot, p.gold);
    res.story = story;
    res.sectorId = p.sectorId; res.hours = p.hours; res.mapId = p.mapId;
    if (window.AchievementManager) AchievementManager.onPatrolCollected(p); // v3.338.0 (pas au rappel : patrouille inachevée)
    delete this.ensure()[companionId];
    var def = getCompanionDef(companionId);
    if (typeof addLog === "function") addLog("🧭 " + (def ? def.name : companionId) + " rentre de patrouille : " + this._describe(res) + ".", "event");
    this._refresh();
    return res;
  },

  collectAll: function () {
    var self = this, out = {};
    this.getReturned().forEach(function (r) { out[r.companionId] = self.collect(r.companionId); });
    return out;
  },

  /* P2 : rappel — butin au prorata du temps écoulé, sans récit ni ingrédients de rations. */
  recall: function (companionId) {
    var p = this.get(companionId);
    if (!p) return null;
    if (Date.now() >= p.endsAt) return this.collect(companionId);
    var frac = Math.max(0, Math.min(1, (Date.now() - p.startedAt) / (p.endsAt - p.startedAt)));
    var est = this.estimate(companionId, p.mapId, p.sectorId, p.hours);
    var loot = {};
    Object.keys(p.loot).forEach(function (k) {
      if (!est.loot[k]) return; // ingrédients de rations : seulement au bout de la patrouille
      loot[k] = Math.floor(p.loot[k] * frac);
    });
    var res = this._credit(loot, Math.floor(p.gold * frac));
    res.story = "";
    res.recalled = true;
    delete this.ensure()[companionId];
    var def = getCompanionDef(companionId);
    if (typeof addLog === "function") addLog("🧭 " + (def ? def.name : companionId) + " est rappelé" + (PATROL_COMPANION_FEMININE[companionId] ? "e" : "") + " : " + this._describe(res) + ".", "event");
    this._refresh();
    return res;
  },

  _describe: function (res) {
    var parts = Object.keys(res.loot || {}).map(function (k) {
      var d = (window.WAREHOUSE_RESOURCES || {})[k];
      return "+" + formatNumber(res.loot[k]) + " " + (d ? d.name : k);
    });
    if (res.gold) parts.push("+" + formatNumber(res.gold) + " or");
    return parts.length ? parts.join(", ") : "rien";
  },

  _refresh: function () {
    if (window.FilRouge) FilRouge.invalidate();
    if (typeof saveGame === "function") saveGame();
    if (typeof renderAll === "function") renderAll();
  },

  /* Chargement : ne garde que des patrouilles bien formées, de compagnons connus. */
  restore: function (raw) {
    var out = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      Object.keys(raw).forEach(function (id) {
        var p = raw[id];
        if (!p || typeof p !== "object" || !(window.COMPANIONS_DB && COMPANIONS_DB[id])) return;
        if (typeof p.sectorId !== "string" || typeof p.mapId !== "string" || !(Number(p.endsAt) > 0)) return;
        var loot = {};
        Object.keys(p.loot || {}).forEach(function (k) { var n = Math.floor(Number(p.loot[k] || 0)); if (n > 0 && (window.WAREHOUSE_RESOURCES || {})[k]) loot[k] = n; });
        out[id] = { mapId: p.mapId, sectorId: p.sectorId, hours: Number(p.hours || 0), startedAt: Number(p.startedAt || 0), endsAt: Number(p.endsAt),
          loot: loot, gold: Math.max(0, Math.floor(Number(p.gold || 0))),
          story: { rare: !!(p.story && p.story.rare), index: Math.max(0, Math.floor(Number((p.story && p.story.index) || 0))) } };
      });
    }
    game.patrols = out;
    return out;
  }
};

window.PatrolManager = PatrolManager;
