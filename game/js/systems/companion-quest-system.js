"use strict";
/* systems/companion-quest-system.js — v3.598.0 : les quêtes personnelles des compagnons (data/companion-quests.js).
   Débloquée par une conversation, une quête avance étape par étape ; la dernière donne la relique unique.
   État : game.companions[id].quests = { questId: { s: étape, n: compteur, d: finie } } (sauvegardé par companion-system.js). */

var CompanionQuestManager = {
  all: function () { return typeof companionQuestsData === "function" ? companionQuestsData() : []; },
  get: function (id) { return this.all().filter(function (q) { return q.id === id; })[0] || null; },

  questsOf: function (companionId) {
    var st = window.CompanionManager ? CompanionManager.state(companionId) : null;
    if (!st) return null;
    if (!st.quests || typeof st.quests !== "object") st.quests = {};
    return st.quests;
  },
  stateOf: function (id) {
    var q = this.get(id), s = q ? this.questsOf(q.companion) : null;
    return s && s[id] ? s[id] : null;
  },
  isUnlocked: function (id) { return !!this.stateOf(id); },
  isDone: function (id) { var s = this.stateOf(id); return !!(s && s.d); },
  isActive: function (id) { var s = this.stateOf(id); return !!(s && !s.d); },
  // v3.598.1 : un compagnon parti pour de bon (Ysolt recouchée) laisse ses quêtes en cours ; les finies restent
  departed: function (q) { return !!(window.CompanionManager && CompanionManager.hasDeparted && CompanionManager.hasDeparted(q.companion)); },
  step: function (q) { var s = this.stateOf(q.id); return s && !s.d && !this.departed(q) ? q.steps[s.s] || null : null; },

  // Quêtes débloquées, en cours d'abord puis finies, dans l'ordre des données.
  list: function () {
    var self = this, qs = this.all().filter(function (q) { return self.isUnlocked(q.id) && (self.isDone(q.id) || !self.departed(q)); });
    return qs.filter(function (q) { return !self.isDone(q.id); }).concat(qs.filter(function (q) { return self.isDone(q.id); }));
  },

  // Appelé à la fin d'une conversation qui la débloque. Une quête inconnue ou déjà ouverte ne change rien.
  unlock: function (id) {
    var q = this.get(id);
    if (!q || this.isUnlocked(id)) return false;
    this.questsOf(q.companion)[id] = { s: 0, n: 0, d: false };
    if (typeof addLog === "function") addLog("📜 " + _t("Quête de {n} : {t}", { n: _td(getCompanionDef(q.companion).name), t: _td(q.title) }), "event");
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  inParty: function (q) {
    return !!(window.CompanionManager && CompanionManager.partyIds().indexOf(q.companion) >= 0);
  },
  // Étape faisable tout de suite depuis la quête (livraison possible ou scène) : pastille de « Secondaires ».
  isReady: function (q) {
    var st = this.step(q);
    if (!st) return false;
    if (st.type === "scene") return true;
    return st.type === "deliver" && this.canDeliver(q);
  },
  readyCount: function () { var self = this; return this.list().filter(function (q) { return self.isReady(q); }).length; },

  /* ---------- Les étapes ---------- */
  canDeliver: function (q) {
    var st = this.step(q);
    if (!st || st.type !== "deliver" || !window.WarehouseManager) return false;
    return Object.keys(st.res || {}).every(function (k) { return WarehouseManager.getAmount(k) >= st.res[k]; });
  },
  deliver: function (id) {
    var q = this.get(id);
    if (!q || !this.canDeliver(q)) return false;
    var st = this.step(q);
    Object.keys(st.res).forEach(function (k) { WarehouseManager.removeResource(k, st.res[k]); });
    return this._advance(q);
  },
  sceneDone: function (id) {
    var q = this.get(id), st = q ? this.step(q) : null;
    if (!st || st.type !== "scene") return false;
    return this._advance(q);
  },
  // Fin d'une Petite Aventure ou d'un parcours (pa2-run.js), et victoire sur une élite de carte (living-map-system.js).
  onRunEnd: function (worldId, how) { if (how === "dest" || how === "parcours") this._count("run", worldId); },
  onEliteWon: function (worldId) { this._count("elite", worldId); },
  _count: function (type, worldId) {
    var self = this;
    this.list().forEach(function (q) {
      var st = self.step(q), s = self.stateOf(q.id);
      if (!st || st.type !== type || (st.world && st.world !== worldId) || !self.inParty(q)) return;
      s.n += 1;
      if (s.n >= Math.max(1, Number(st.count || 1))) self._advance(q);
      else if (typeof saveGame === "function") saveGame();
    });
  },
  /* v3.600.0 (option B de Seb) : les secteurs de la carte vivante qui font avancer l'étape en cours.
     Petite Aventure (contenu « expedition ») ou élite, atteignable et jouable hors contraintes du moment. */
  sectorsFor: function (q) {
    var st = this.step(q), LM = window.LivingMapManager;
    if (!st || (st.type !== "run" && st.type !== "elite") || !LM) return [];
    var map = LM.getMapForWorld(st.world), want = st.type === "run" ? "expedition" : "elite";
    if (!map) return [];
    var open = null;
    return map.sectors.filter(function (d) {
      var c = LM.getContentFor(map.id, d.id);
      if (!c || c.type !== want || !LM.isReachable(map.id, d.id)) return false;
      if (d.requiresStoryStep && !LM.isStoryStepReached(d.requiresStoryStep)) return false;
      if (LM.isLiberated(map.id, d.id) && !LM.isRepeatable(map.id, d.id)) {
        if (open === null) open = LM.getOpenTargets(map.id).length; // un libéré ne se rejoue que si rien d'autre n'attend
        return open === 0;
      }
      return true;
    }).map(function (d) { return d.id; });
  },
  // Quêtes en cours qu'un secteur fait avancer (pastille au portrait, ligne du volet).
  questsAt: function (mapId, sectorId) {
    var self = this, LM = window.LivingMapManager, map = LM && LM.getMap(mapId);
    if (!map) return [];
    return this.list().filter(function (q) {
      var st = self.step(q);
      return st && st.world === map.worldId && self.sectorsFor(q).indexOf(sectorId) >= 0;
    });
  },

  progressText: function (q) {
    var st = this.step(q), s = this.stateOf(q.id);
    if (!st || (st.type !== "run" && st.type !== "elite")) return "";
    return s.n + " / " + Math.max(1, Number(st.count || 1));
  },

  _advance: function (q) {
    var s = this.stateOf(q.id);
    s.s += 1; s.n = 0;
    if (s.s >= q.steps.length) this._complete(q);
    if (typeof saveGame === "function") saveGame();
    return true;
  },
  _complete: function (q) {
    var s = this.stateOf(q.id), name = _td(getCompanionDef(q.companion).name);
    s.d = true;
    var relic = window.CompanionRelics && q.relic ? CompanionRelics.grantUnique(q.relic) : null;
    if (typeof addLog === "function") addLog("✨ " + _t("Quête de {n} terminée : {t}", { n: name, t: _td(q.title) }) + (relic ? " · " + CompanionRelics.name(relic) : ""), "event");
    if (relic && typeof showToast === "function") showToast(_t("{x} : à équiper dans la fiche de {n}", { x: CompanionRelics.name(relic), n: name }), 2200);
  }
};

window.CompanionQuestManager = CompanionQuestManager;
