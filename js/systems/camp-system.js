"use strict";
/* systems/camp-system.js — v3.106.0 : plus de repos à horloge. Régénération lente au Campement
   (5 % PV max / min, plafonnée à 50 % hors ligne) + Rations (v3.106.0 : remplace Repas viande/eau).
   Chaque ration restaure un % fixe de PV max (WAREHOUSE_RESOURCES[id].healPct). Détail : LIGNE_DIRECTRICE §4, §10. */

var CAMP_REGEN_PCT_PER_MIN = 0.05;
var CAMP_OFFLINE_REGEN_CAP_PCT = 0.50;
var CAMP_REGEN_TALENT_BONUS_PER_LEVEL = 0.25; // t_last_stand « Repos du guerrier » : +25 % de vitesse par niveau

var CampManager = {
  ensureDefaults: function () {
    if (typeof game.campRegenLastAt !== "number" || game.campRegenLastAt <= 0) game.campRegenLastAt = Date.now();
  },

  /* Run à sortie en cours (donjon / chasse / quête d'aventure) : pas de repos au camp tant qu'il n'est pas clos. */
  _hasActiveRun: function () {
    if (game.dungeonRun && game.dungeonRun.active) return true;
    if (game.huntRun && game.huntRun.active) return true;
    if (game.adventureQuestRun && game.adventureQuestRun.active) return true;
    return false;
  },

  getRegenPctPerMin: function () {
    var lvl = (game.talents && game.talents.t_last_stand) || 0;
    return CAMP_REGEN_PCT_PER_MIN * (1 + lvl * CAMP_REGEN_TALENT_BONUS_PER_LEVEL);
  },

  /* La régénération court hors combat (héros à terre inclus) : jamais pendant un combat actif ni pendant
     une sortie à run (donjon, chasse, quête d'aventure — v3.108.0 : la quête n'était pas exclue). */
  isRegenActive: function () {
    if (this._hasActiveRun()) return false;
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
    if (offline ? this._hasActiveRun() : !this.isRegenActive()) return 0;

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
      if (full && typeof renderPanel === "function") renderPanel(); // ré-évalue les boutons de ration (grisés si PV pleins)
    }
  },

  /* Minutes restantes avant PV max au rythme actuel (affichage). */
  getMinutesToFull: function () {
    var maxHp = game.heroMaxHp || 1;
    var missing = maxHp - (game.heroHp != null ? game.heroHp : maxHp);
    if (missing <= 0) return 0;
    return missing / (maxHp * this.getRegenPctPerMin());
  },

  /* Liste des rations avec stock courant et % de soin, dans l'ordre d'affichage (petite -> grande). */
  getRationOptions: function () {
    var ids = (typeof RATION_IDS !== "undefined") ? RATION_IDS : ["petite_ration", "ration", "grande_ration"];
    return ids.map(function (id) {
      var def = (window.WAREHOUSE_RESOURCES || {})[id] || {};
      return { id: id, name: def.name || id, healPct: Number(def.healPct || 0), amount: window.WarehouseManager ? WarehouseManager.getAmount(id) : 0 };
    });
  },

  canEatRation: function (rationId) {
    if (!window.WarehouseManager) return false;
    return WarehouseManager.getAmount(rationId) >= 1;
  },

  /* Ration : consomme 1 unité (via WarehouseManager), restaure healPct % des PV max. */
  eatRation: function (rationId) {
    var def = (window.WAREHOUSE_RESOURCES || {})[rationId];
    if (!def || !def.healPct) return false;
    var maxHp = game.heroMaxHp || 1;
    if ((game.heroHp || 0) >= maxHp) { showToast("PV déjà au maximum", 1200); return false; }
    if (!this.canEatRation(rationId)) { showToast("Aucune " + def.name.toLowerCase() + " en stock", 1600); return false; }
    if (!WarehouseManager.removeResource(rationId, 1)) return false;

    var healed = Math.min(maxHp - (game.heroHp || 0), Math.floor(maxHp * def.healPct));
    game.heroHp = (game.heroHp || 0) + healed;
    addLog("🍖 " + def.name + " — +" + formatNumber(healed) + " PV.", "event");
    showToast("🍖 +" + formatNumber(healed) + " PV", 1600);
    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
    return true;
  }
};

window.CampManager = CampManager;
window.CAMP_REGEN_PCT_PER_MIN = CAMP_REGEN_PCT_PER_MIN;
