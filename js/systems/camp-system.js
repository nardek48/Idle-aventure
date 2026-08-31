"use strict";
/* systems/camp-system.js — v3.101.0 (P3-lite) : plus de repos à horloge. Régénération lente au Campement
   (5 % PV max / min, plafonnée à 50 % hors ligne) + Repas (5 viande + 2 eau → PV max). Détail : LIGNE_DIRECTRICE §4, §10. */

var CAMP_REGEN_PCT_PER_MIN = 0.05;
var CAMP_OFFLINE_REGEN_CAP_PCT = 0.50;
var CAMP_MEAL_COST = { viande: 5, eau: 2 };
var CAMP_REGEN_TALENT_BONUS_PER_LEVEL = 0.25; // t_last_stand « Repos du guerrier » : +25 % de vitesse par niveau

var CampManager = {
  ensureDefaults: function () {
    if (typeof game.campRegenLastAt !== "number" || game.campRegenLastAt <= 0) game.campRegenLastAt = Date.now();
  },

  getMealCost: function () {
    return CAMP_MEAL_COST;
  },

  getRegenPctPerMin: function () {
    var lvl = (game.talents && game.talents.t_last_stand) || 0;
    return CAMP_REGEN_PCT_PER_MIN * (1 + lvl * CAMP_REGEN_TALENT_BONUS_PER_LEVEL);
  },

  /* La régénération court hors combat (héros à terre inclus) : jamais pendant un combat actif. */
  isRegenActive: function () {
    if (game.dungeonRun && game.dungeonRun.active) return false;
    if (game.huntRun && game.huntRun.active) return false;
    return game.activeTab !== "combat" || (game.heroHp || 0) <= 0;
  },

  /* Accrual paresseux : appelé par renderHud (chaque tick) et au boot (offline = plafond 50 %).
     Le repère est toujours avancé, même sans soin, pour ne pas accumuler du temps de combat. */
  applyRegen: function (offline) {
    this.ensureDefaults();
    var now = Date.now();
    var elapsedMin = Math.max(0, now - game.campRegenLastAt) / 60000;
    game.campRegenLastAt = now;
    if (elapsedMin <= 0) return 0;
    // Hors ligne : le joueur était absent, on régénère quel que soit l'onglet restauré (sauf run en cours).
    if (offline ? ((game.dungeonRun && game.dungeonRun.active) || (game.huntRun && game.huntRun.active)) : !this.isRegenActive()) return 0;

    var maxHp = game.heroMaxHp || 1;
    var hp = game.heroHp != null ? game.heroHp : maxHp;
    if (hp >= maxHp) return 0;

    var heal = maxHp * this.getRegenPctPerMin() * elapsedMin;
    if (offline) heal = Math.min(heal, maxHp * CAMP_OFFLINE_REGEN_CAP_PCT);
    heal = Math.floor(Math.min(heal, maxHp - hp));
    if (heal <= 0) return 0;

    game.heroHp = hp + heal;
    if (offline) addLog("🔥 Régénération au camp pendant ton absence : +" + formatNumber(heal) + " PV.", "event");
    if (typeof renderHeroHp === "function") renderHeroHp();
    this.refreshCampCard();
    return heal;
  },

  /* Rafraîchit la carte Feu de camp sans re-rendre le panneau (renderHud tourne à chaque frame). */
  refreshCampCard: function () {
    if (typeof document === "undefined") return;
    var v = document.getElementById("camp-fire-hp-value");
    if (!v) return;
    var maxHp = game.heroMaxHp || 1;
    v.textContent = formatNumber(Math.floor(game.heroHp || 0)) + " / " + formatNumber(maxHp) + " PV";
    var eta = document.getElementById("camp-fire-eta");
    if (eta) {
      var full = (game.heroHp || 0) >= maxHp;
      eta.textContent = full ? "PV au maximum" : "Max dans " + formatTime(Math.ceil(this.getMinutesToFull() * 60));
      if (full && typeof renderPanel === "function") renderPanel(); // ré-évalue le bouton Repas (« Pas faim »)
    }
  },

  /* Minutes restantes avant PV max au rythme actuel (affichage). */
  getMinutesToFull: function () {
    var maxHp = game.heroMaxHp || 1;
    var missing = maxHp - (game.heroHp != null ? game.heroHp : maxHp);
    if (missing <= 0) return 0;
    return missing / (maxHp * this.getRegenPctPerMin());
  },

  canEat: function () {
    if (!window.WarehouseManager) return false;
    var cost = this.getMealCost();
    return Object.keys(cost).every(function (k) { return WarehouseManager.getAmount(k) >= cost[k]; });
  },

  /* Repas : consomme 5 viande + 2 eau (via WarehouseManager, jamais game.resources en direct), PV max. */
  eat: function () {
    var maxHp = game.heroMaxHp || 1;
    if ((game.heroHp || 0) >= maxHp) { showToast("PV déjà au maximum", 1200); return false; }
    if (!this.canEat()) { showToast("Il manque de quoi cuisiner (5 viande, 2 eau)", 1600); return false; }

    var cost = this.getMealCost();
    var ok = Object.keys(cost).every(function (k) { return WarehouseManager.removeResource(k, cost[k]); });
    if (!ok) return false;

    game.heroHp = maxHp;
    addLog("🍖 Repas au feu de camp — PV entièrement restaurés.", "event");
    showToast("🍖 PV restaurés !", 1600);
    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
    return true;
  }
};

window.CampManager = CampManager;
window.CAMP_MEAL_COST = CAMP_MEAL_COST;
window.CAMP_REGEN_PCT_PER_MIN = CAMP_REGEN_PCT_PER_MIN;
