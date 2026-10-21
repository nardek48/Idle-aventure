"use strict";
/* systems/initiative-system.js — v3.447.0 : INITIATIVE (décisions Seb, docs/pistes-combat.md).
   Un jet par combat : d20 + bonus de célérité, le Rôdeur lance 2 dés et garde le meilleur.
   Bonus = 10 × c / (c + 60). Héros : célérité ÷ multiplicateur d'équipement du monde (ses bottes
   suivent EQUIP_WORLD_SCALE) ; compagnons et ennemis : célérité brute (elle ne suit pas le monde).
   Égalité : ton camp d'abord. Un combattant arrivé en cours de combat lance son dé à son arrivée.
   Lu par CombatEngine (file de tours) et par le bandeau de l'écran de combat. */

var INITIATIVE_DIE = 20;
var INITIATIVE_BONUS_MAX = 10;
var INITIATIVE_BONUS_K = 60;          // même courbe que la jauge de célérité (CELERITY_SOFT_CAP_K)
var INITIATIVE_STEP_MS = 400;         // jeu réel : un combattant toutes les 0,4 s à vitesse ×1 (accord Seb)
var INITIATIVE_FIRST_STEP_MS = 1000;  // ouverture d'un combat : le temps de voir les dés

var Initiative = {
  combatKey: 0,     // change à chaque nouveau combat : les jets d'avant ne valent plus
  legacy: false,    // harnais : ordre d'avant (héros, compagnons, ennemis), pour ses contrôles historiques

  bonusFromCelerity: function (c) {
    c = Math.max(0, Number(c) || 0);
    return Math.round(INITIATIVE_BONUS_MAX * c / (c + INITIATIVE_BONUS_K));
  },

  isHero: function (a) { return !!(window.CombatActors && CombatActors.isHero(a)); },

  celerityOf: function (a) {
    if (this.isHero(a)) {
      var total = (window.CombatEngine && typeof CombatEngine.getTotalCelerity === "function") ? CombatEngine.getTotalCelerity() : 0;
      var wi = (typeof WorldManager !== "undefined" && WorldManager) ? WorldManager.worldIndex : 0;
      var scale = (typeof getEquipWorldScale === "function") ? getEquipWorldScale(wi) : 1;
      return total / Math.max(1, scale);
    }
    if (a && a.companionId && window.CompanionManager && typeof CompanionManager.statsOf === "function") {
      var s = CompanionManager.statsOf(a.companionId);
      return s ? Number(s.celerity || 0) : 0;
    }
    return Number((a && a.stats && a.stats.celerity) || 0);
  },

  /* Avantage : le Rôdeur (classe « archer ») lance deux dés. */
  hasAdvantage: function (a) {
    if (!this.isHero(a) || !window.ClassCombatManager) return false;
    return ClassCombatManager.getCurrentClassId() === "archer";
  },

  roll: function (a) {
    var r1 = 1 + Math.floor(Math.random() * INITIATIVE_DIE);
    var r2 = this.hasAdvantage(a) ? 1 + Math.floor(Math.random() * INITIATIVE_DIE) : 0;
    var b = this.bonusFromCelerity(this.celerityOf(a));
    a._ini = { key: this.combatKey, r1: r1, r2: r2, bonus: b, total: Math.max(r1, r2) + b };
    return a._ini;
  },

  rollOf: function (a) { return (a && a._ini && a._ini.key === this.combatKey) ? a._ini : null; },

  participants: function () {
    if (!window.CombatActors) return [];
    return CombatActors.allies().concat(CombatActors.enemies()).filter(Boolean);
  },

  /* Nouveau combat (CombatEngine.spawnGroup) : tout le monde lance, une ligne de journal. */
  newCombat: function () {
    this.combatKey += 1;
    var self = this, list = this.participants();
    list.forEach(function (a) { self.roll(a); });
    if (this.legacy || list.length < 2 || typeof addLog !== "function") return;
    // v3.457.5 (audit P21) : pas de ligne pour l'ennemi de fond, hors de tout combat (lancement, création du héros)
    var engage = (typeof hasCombatQuestContext === "function" && hasCombatQuestContext())
      || !!(window.SceneRunManager && typeof SceneRunManager.isRunActive === "function" && SceneRunManager.isRunActive());
    if (!engage) return;
    addLog("🎲 " + _t("Initiative : {x}.", { x: this.order().map(function (a) { return self.describe(a); }).join(", ") }), "event");
  },

  describe: function (a) {
    var r = this.rollOf(a) || this.roll(a);
    var name = (a && a.name) ? _td(a.name) : "?";
    var dice = r.r2 ? r.r1 + "/" + r.r2 : String(r.r1);
    return name + " " + r.total + " (" + dice + (r.bonus ? " + " + r.bonus : "") + ")";
  },

  /* Ordre des tours du combat en cours. Un arrivant sans jet lance le sien. */
  order: function () {
    var self = this, list = this.participants();
    if (this.legacy) return list;   // CombatActors : héros, compagnons, puis ennemis triés par célérité
    list.forEach(function (a, i) {
      if (!self.rollOf(a)) {
        self.roll(a);
        if (self.combatKey && typeof addLog === "function") addLog("🎲 " + _t("{x} entre dans l'ordre des tours.", { x: self.describe(a) }), "event");
      }
      a._iniIdx = i;
    });
    return list.slice().sort(function (x, y) {
      var rx = x._ini, ry = y._ini;
      if (ry.total !== rx.total) return ry.total - rx.total;
      var ax = x.side === "enemy" ? 0 : 1, ay = y.side === "enemy" ? 0 : 1;   // égalité : ton camp d'abord
      if (ay !== ax) return ay - ax;
      if (ry.bonus !== rx.bonus) return ry.bonus - rx.bonus;
      return x._iniIdx - y._iniIdx;
    });
  },

  /* Un ennemi joue-t-il avant le héros ? Alors les effets du héros se décomptent à son tour. */
  enemyBeforeHero: function () {
    var o = this.order();
    for (var i = 0; i < o.length; i++) {
      if (this.isHero(o[i])) return false;
      if (o[i].side === "enemy") return true;
    }
    return false;
  }
};

window.Initiative = Initiative;
window.INITIATIVE_STEP_MS = INITIATIVE_STEP_MS;
window.INITIATIVE_FIRST_STEP_MS = INITIATIVE_FIRST_STEP_MS;
window.INITIATIVE_BONUS_MAX = INITIATIVE_BONUS_MAX;
