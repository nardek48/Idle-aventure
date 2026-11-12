"use strict";
/* systems/skill-rank-system.js — chantier du héros, lot H2 ; v3.779.0 (simplification lot 5, Seb A) : rangs AUTOMATIQUES.
   Rangs 0 à 5 des trois techniques et de la défense, donnés par le monde atteint (Forêt 0, Désert 1 … Tour 5).

   - Un rang : +8 % de dégâts (techniques) ou +2 points d'effet (défense : Garde, Esquive, Barrière).
   - Appliqué au kit APRÈS les talents (getClassSkills) : le Grimoire, l'aperçu et le robot jouent le kit classé sans rien savoir.
   - Plus d'achat : game.skillRanks (rangs payés avant v3.779.0) reste en sauvegarde mais n'est plus lu. */

var SKILL_RANK_MAX = 5;
var SKILL_RANK_DMG_PCT = 0.08;   // par rang, sur damageMultiplier
var SKILL_RANK_DEF_PTS = 0.02;   // par rang, sur la valeur de l'effet défensif
var SKILL_RANK_SLOTS = ["skill1", "skill2", "skill3", "defense"];
var SKILL_RANK_DEF_EFFECTS = ["damageReduction", "evasion", "damageAbsorption"];

var SkillRanks = {
  _cache: { src: null, key: "", out: null },

  /* Rang automatique : index du plus haut monde atteint, plafonné à SKILL_RANK_MAX (même rang pour tout le kit). */
  current: function () {
    var w = (window.WorldCaps && typeof WorldCaps.getReachedWorldIndex === "function") ? WorldCaps.getReachedWorldIndex() : 0;
    return Math.max(0, Math.min(SKILL_RANK_MAX, Math.floor(Number(w || 0))));
  },
  get: function (actionId) { return this.current(); },
  maxRank: function () { return this.current(); },
  /* "max" | "lock" (le rang suivant vient avec le monde suivant) */
  status: function (actionId) { return this.get(actionId) >= SKILL_RANK_MAX ? "max" : "lock"; },
  /* Texte « s'ouvre à la Montagne brûlante » pour le monde d'index `w` (rang des sorts : rang n = monde n). */
  worldText: function (w) {
    return (window.WorldCaps && typeof WorldCaps.withPrep === "function") ? _t("s'ouvre {w}", { w: WorldCaps.withPrep(w) }) : "";
  },
  /* Compétences des compagnons (rang n ouvert au monde n − 1) : règle d'origine, gardée pour Or à investir. */
  openingText: function (rank) { return this.worldText(rank - 1); },

  /* Actions classables du kit courant (techniques et défense). */
  kitActions: function () {
    var CC = window.ClassCombatManager, out = [];
    if (!CC || typeof CC.getAction !== "function") return out;
    SKILL_RANK_SLOTS.forEach(function (slot) { var a = CC.getAction(slot); if (a) out.push(a); });
    return out;
  },
  total: function () { var self = this, t = 0; this.kitActions().forEach(function (a) { t += self.get(a.id); }); return t; },

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
window.SkillRanks = SkillRanks;
