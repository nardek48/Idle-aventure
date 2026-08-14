"use strict";
/* ============================================================
Aethervale — systems/camp-system.js
v3.7 : mécanique du Feu de camp (nouvelle page Campement, voir
ui/camp-view.js) — restaure les PV au maximum, utilisable toutes les
30 minutes. Volontairement séparé des potions de soin (systems/
potion-system.js) : le feu de camp est un utilitaire gratuit "avant
de partir à l'aventure", les potions restent la solution d'urgence
EN PLEIN COMBAT. Les deux coexistent sans se cannibaliser.
============================================================ */

var CAMPFIRE_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

var CampManager = {
  ensureDefaults: function () {
    if (typeof game.campfireLastUsed !== "number") game.campfireLastUsed = 0;
  },

  /* Millisecondes restantes avant que le feu de camp soit de nouveau
     utilisable (0 si déjà prêt). */
  getRemainingMs: function () {
    this.ensureDefaults();
    var elapsed = Date.now() - game.campfireLastUsed;
    return Math.max(0, CAMPFIRE_COOLDOWN_MS - elapsed);
  },

  isReady: function () {
    return this.getRemainingMs() <= 0;
  },

  /* Bouton "Se reposer" de l'écran Campement. */
  useCampfire: function () {
    this.ensureDefaults();

    if (!this.isReady()) {
      showToast("Feu de camp pas encore prêt (" + formatTime(Math.ceil(this.getRemainingMs() / 1000)) + ")", 1600);
      return false;
    }
    if ((game.heroHp || 0) >= (game.heroMaxHp || 1)) {
      // Pas de gâchis de cooldown si le joueur clique par erreur alors
      // qu'il est déjà à PV pleins.
      showToast("PV déjà au maximum", 1200);
      return false;
    }

    game.heroHp = game.heroMaxHp;
    game.campfireLastUsed = Date.now();

    addLog("🔥 Repos au feu de camp — PV entièrement restaurés.", "event");
    showToast("🔥 PV restaurés !", 1600);

    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
    return true;
  }
};

window.CampManager = CampManager;
window.CAMPFIRE_COOLDOWN_MS = CAMPFIRE_COOLDOWN_MS;
