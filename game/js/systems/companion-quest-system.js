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
  /* Fin d'une Petite Aventure de la carte vivante (pa2-run.js) et victoire sur une élite de carte (living-map-system.js).
     v3.603.0 (demande de Seb) : seul le lieu attribué à la quête compte, et une sortie ne fait avancer qu'une quête. */
  onRunEnd: function (worldId, how, sectorId) { if (how === "dest" || how === "parcours") this._count("run", worldId, sectorId); }, // audit CPL2-13 : un parcours réussi compte
  onEliteWon: function (worldId, sectorId) { this._count("elite", worldId, sectorId); },
  _count: function (type, worldId, sectorId) {
    if (!sectorId) return;
    var self = this;
    this.assignAll();
    var q = this.list().filter(function (x) {
      var st = self.step(x), s = self.stateOf(x.id);
      return st && st.type === type && st.world === worldId && s.sec === sectorId && self.inParty(x);
    })[0];
    if (!q) return;
    var st = this.step(q), s = this.stateOf(q.id);
    s.n += 1; s.last = sectorId; s.sec = null; // le lieu suivant sera un autre, si la carte en offre un
    if (s.n >= Math.max(1, Number(st.count || 1))) this._advance(q);
    else if (typeof saveGame === "function") saveGame();
  },

  /* Le lieu de l'étape en cours : gardé tant qu'il reste jouable, sinon un autre, libre (pas celui d'une autre
     quête en cours), de préférence pas encore libéré et pas celui qu'on vient de jouer. */
  targetOf: function (q) {
    this.assignAll();
    var s = this.stateOf(q.id);
    return s && s.sec ? s.sec : null;
  },
  assignAll: function () {
    var self = this, LM = window.LivingMapManager, taken = {};
    if (!LM) return;
    this.list().forEach(function (q) {
      var s = self.stateOf(q.id), st = self.step(q);
      if (!st || (st.type !== "run" && st.type !== "elite")) { if (s && s.sec) s.sec = null; return; }
      var map = LM.getMapForWorld(st.world), pool = self.sectorsFor(q);
      if (!map || !pool.length) { s.sec = null; return; }
      var key = function (id) { return map.id + ":" + id; };
      if (s.sec && pool.indexOf(s.sec) >= 0 && !taken[key(s.sec)]) { taken[key(s.sec)] = true; return; }
      var free = pool.filter(function (id) { return !taken[key(id)]; });
      if (!free.length) free = pool; // plus de lieu libre : partagé, mais une sortie ne crédite qu'une quête
      var fresh = free.filter(function (id) { return id !== s.last; });
      if (fresh.length) free = fresh;
      var unlib = free.filter(function (id) { return !LM.isLiberated(map.id, id); });
      s.sec = (unlib.length ? unlib : free)[0];
      taken[key(s.sec)] = true;
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
  // Quêtes en cours dont le lieu attribué est ce secteur (pastille au portrait, ligne du volet).
  questsAt: function (mapId, sectorId) {
    var self = this, LM = window.LivingMapManager, map = LM && LM.getMap(mapId);
    if (!map) return [];
    this.assignAll();
    return this.list().filter(function (q) {
      var st = self.step(q), s = self.stateOf(q.id);
      return st && st.world === map.worldId && s.sec === sectorId;
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
