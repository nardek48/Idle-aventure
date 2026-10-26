"use strict";
/* systems/skill-rank-system.js — chantier du héros, lot H2 (décisions de Seb du 26/10/2026 : option A, prix validés,
   variante A de l'atelier atelier/rangs-sorts.html). Rangs 1 à 5 des trois techniques et de la défense.

   - Un rang : +8 % de dégâts (techniques) ou +2 points d'effet (défense : Garde, Esquive, Barrière).
   - Appliqué au kit APRÈS les talents (getClassSkills) : le Grimoire, l'aperçu et le robot jouent le kit classé sans rien savoir.
   - Rang r ouvert par le monde r−1 (plus haut monde atteint) et payé en or + matériau de ce monde.
   - game.skillRanks : { <id d'action> : rang } — lié au sort, pas à l'emplacement (réserve de sorts, H5). */

var SKILL_RANK_MAX = 5;
var SKILL_RANK_DMG_PCT = 0.08;   // par rang, sur damageMultiplier
var SKILL_RANK_DEF_PTS = 0.02;   // par rang, sur la valeur de l'effet défensif
var SKILL_RANK_SLOTS = ["skill1", "skill2", "skill3", "defense"];
var SKILL_RANK_DEF_EFFECTS = ["damageReduction", "evasion", "damageAbsorption"];
/* Prix (décision 5c) : index = rang visé − 1. */
var SKILL_RANK_PRICES = [
  { gold: 1000, mat: "resine_durcie", qty: 4 },
  { gold: 5000, mat: "verre_trempe", qty: 4 },
  { gold: 15000, mat: "cle_de_voute", qty: 3 },
  { gold: 30000, mat: "cire_consacree", qty: 4 },
  { gold: 80000, mat: "obsidienne_taillee", qty: 3 }
];

var SkillRanks = {
  _cache: { src: null, key: "", out: null },

  ranks: function () {
    if (!game.skillRanks || typeof game.skillRanks !== "object") game.skillRanks = {};
    return game.skillRanks;
  },
  get: function (actionId) { return Math.max(0, Math.min(SKILL_RANK_MAX, Math.floor(Number(this.ranks()[actionId] || 0)))); },

  /* Rang le plus haut permis : monde atteint + 1 (Forêt 1 … Montagne 5). */
  maxRank: function () {
    var w = (window.WorldCaps && typeof WorldCaps.getReachedWorldIndex === "function") ? WorldCaps.getReachedWorldIndex() : 0;
    return Math.max(1, Math.min(SKILL_RANK_MAX, Number(w || 0) + 1));
  },
  nextCost: function (actionId) {
    var r = this.get(actionId);
    return r >= SKILL_RANK_MAX ? null : SKILL_RANK_PRICES[r];
  },
  /* "max" | "lock" (monde pas atteint) | "short" (pas assez) | "ok" */
  status: function (actionId) {
    var r = this.get(actionId);
    if (r >= SKILL_RANK_MAX) return "max";
    if (r + 1 > this.maxRank()) return "lock";
    var p = SKILL_RANK_PRICES[r], WM = window.WarehouseManager;
    var mat = WM ? WM.getAmount(p.mat) : 0;
    return (Number(game.gold || 0) >= p.gold && mat >= p.qty) ? "ok" : "short";
  },
  /* Monde qui ouvre le rang `rank` (texte prêt à lire : « s'ouvre à la Montagne brûlante »). */
  openingText: function (rank) {
    return (window.WorldCaps && typeof WorldCaps.withPrep === "function") ? _t("s'ouvre {w}", { w: WorldCaps.withPrep(rank - 1) }) : "";
  },

  /* Actions classables du kit courant (techniques et défense). */
  kitActions: function () {
    var CC = window.ClassCombatManager, out = [];
    if (!CC || typeof CC.getAction !== "function") return out;
    SKILL_RANK_SLOTS.forEach(function (slot) { var a = CC.getAction(slot); if (a) out.push(a); });
    return out;
  },
  total: function () { var self = this, t = 0; this.kitActions().forEach(function (a) { t += self.get(a.id); }); return t; },
  buyableCount: function () { var self = this; return this.kitActions().filter(function (a) { return self.status(a.id) === "ok"; }).length; },

  buy: function (actionId) {
    if (window.heroLockToast && heroLockToast()) return false; // héros en expédition, comme l'entraînement
    var st = this.status(actionId), r = this.get(actionId);
    if (st !== "ok") {
      if (st === "short" && typeof showToast === "function") showToast(_t("Pas assez de ressources pour ce rang"), 1400);
      return false;
    }
    var p = SKILL_RANK_PRICES[r];
    if (!WarehouseManager.removeResource(p.mat, p.qty)) return false;
    game.gold = Number(game.gold || 0) - p.gold;
    this.ranks()[actionId] = r + 1;
    this._cache.src = null;
    var a = this.kitActions().filter(function (x) { return x.id === actionId; })[0];
    var nom = a && a.label ? _td(a.label) : actionId;
    if (typeof addLog === "function") addLog("📈 " + _t("{x} passe au rang {n}.", { x: nom, n: r + 1 }), "event");
    if (typeof showToast === "function") showToast(_t("{x} : rang {n}", { x: nom, n: r + 1 }), 1400);
    if (typeof saveGame === "function") saveGame();
    if (typeof renderPanel === "function") renderPanel();
    return true;
  },

  /* Kit classé : copie du kit (déjà modifié par les talents) avec les rangs posés. Mise en cache sur le kit source et les rangs. */
  apply: function (classId, kit) {
    if (!kit || !kit.actions) return kit;
    var self = this, key = "", any = false;
    SKILL_RANK_SLOTS.forEach(function (slot) { var a = kit.actions[slot], r = a ? self.get(a.id) : 0; if (a) key += a.id + ":" + r + ","; if (r) any = true; });
    if (!any) return kit; // aucun rang : le kit tel quel
    if (this._cache.src === kit && this._cache.key === key) return this._cache.out;
    var raw = (window.CLASS_SKILLS && CLASS_SKILLS[classId]) ? CLASS_SKILLS[classId].actions : {};
    var out = JSON.parse(JSON.stringify(kit));
    SKILL_RANK_SLOTS.forEach(function (slot) {
      var a = out.actions[slot], r = a ? self.get(a.id) : 0, base = raw[slot] || {};
      if (!r) return;
      a.rank = r;
      if (a.type === "defense") {
        (a.effects || []).forEach(function (e) {
          if (SKILL_RANK_DEF_EFFECTS.indexOf(e.type) === -1 || typeof e.value !== "number") return;
          e.value = Math.round((e.value + SKILL_RANK_DEF_PTS * r) * 1000) / 1000;
          var b = (base.effects || []).filter(function (x) { return x.type === e.type; })[0];
          a.rankDesc = { from: Math.round(Number(b ? b.value : 0) * 100) + "%", to: Math.round(e.value * 100) + "%", value: e.value };
        });
      } else if (typeof a.damageMultiplier === "number") {
        a.damageMultiplier = Math.round(a.damageMultiplier * (1 + SKILL_RANK_DMG_PCT * r) * 1000) / 1000;
        a.rankDesc = { from: Math.round(Number(base.damageMultiplier || 0) * 100) + "%", to: Math.round(a.damageMultiplier * 100) + "%", value: a.damageMultiplier };
      }
    });
    this._cache = { src: kit, key: key, out: out };
    return out;
  },

  /* Valeur affichée d'une action à un rang donné (carte Capacités : « 205 % → 218 % »). */
  valueAt: function (action, rank) {
    if (!action) return null;
    var cur = this.get(action.id), base;
    if (action.type === "defense") {
      var e = (action.effects || []).filter(function (x) { return SKILL_RANK_DEF_EFFECTS.indexOf(x.type) !== -1; })[0];
      if (!e) return null;
      base = Number(e.value) - SKILL_RANK_DEF_PTS * cur;
      return Math.round((base + SKILL_RANK_DEF_PTS * rank) * 100);
    }
    if (typeof action.damageMultiplier !== "number") return null;
    base = action.damageMultiplier / (1 + SKILL_RANK_DMG_PCT * cur);
    return Math.round(base * (1 + SKILL_RANK_DMG_PCT * rank) * 100);
  }
};

window.SKILL_RANK_MAX = SKILL_RANK_MAX;
window.SKILL_RANK_DMG_PCT = SKILL_RANK_DMG_PCT;
window.SKILL_RANK_DEF_PTS = SKILL_RANK_DEF_PTS;
window.SKILL_RANK_PRICES = SKILL_RANK_PRICES;
window.SkillRanks = SkillRanks;
