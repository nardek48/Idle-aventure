"use strict";
/* systems/camp-system.js — Feu de camp (Campement) : Long repos (30min, 100% PV) + Repos court (15min, 50% PV), cooldowns indépendants.
   Distinct des potions (urgence en combat). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var CAMPFIRE_LONG_COOLDOWN_MS = 30 * 60 * 1000;
var CAMPFIRE_SHORT_COOLDOWN_MS = 15 * 60 * 1000;
var CAMPFIRE_SHORT_HEAL_PCT = 0.5;

var CampManager = {
  ensureDefaults: function () {
    if (typeof game.campfireLastUsed !== "number") game.campfireLastUsed = 0;
    if (typeof game.campfireShortLastUsed !== "number") game.campfireShortLastUsed = 0;
  },

  getEffectiveCooldownMs: function (baseCooldownMs) {
    var reduction = (game.talents && game.talents.t_last_stand) ? game.talents.t_last_stand * 0.10 : 0;
    return Math.floor(baseCooldownMs * Math.max(0.1, 1 - reduction));
  },

  getLongRemainingMs: function () {
    this.ensureDefaults();
    var elapsed = Date.now() - game.campfireLastUsed;
    return Math.max(0, this.getEffectiveCooldownMs(CAMPFIRE_LONG_COOLDOWN_MS) - elapsed);
  },

  isLongReady: function () {
    return this.getLongRemainingMs() <= 0;
  },

  useLongRest: function () {
    this.ensureDefaults();

    if (!this.isLongReady()) {
      showToast("Long repos pas encore prêt (" + formatTime(Math.ceil(this.getLongRemainingMs() / 1000)) + ")", 1600);
      return false;
    }
    if ((game.heroHp || 0) >= (game.heroMaxHp || 1)) {
      showToast("PV déjà au maximum", 1200);
      return false;
    }

    game.heroHp = game.heroMaxHp;
    game.campfireLastUsed = Date.now();

    addLog("🔥 Long repos au feu de camp — PV entièrement restaurés.", "event");
    showToast("🔥 PV restaurés !", 1600);

    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  getShortRemainingMs: function () {
    this.ensureDefaults();
    var elapsed = Date.now() - game.campfireShortLastUsed;
    return Math.max(0, this.getEffectiveCooldownMs(CAMPFIRE_SHORT_COOLDOWN_MS) - elapsed);
  },

  isShortReady: function () {
    return this.getShortRemainingMs() <= 0;
  },

  useShortRest: function () {
    this.ensureDefaults();

    if (!this.isShortReady()) {
      showToast("Repos court pas encore prêt (" + formatTime(Math.ceil(this.getShortRemainingMs() / 1000)) + ")", 1600);
      return false;
    }

    var maxHp = game.heroMaxHp || 1;
    if ((game.heroHp || 0) >= maxHp) {
      showToast("PV déjà au maximum", 1200);
      return false;
    }

    var healAmount = Math.floor(maxHp * CAMPFIRE_SHORT_HEAL_PCT);
    game.heroHp = Math.min(maxHp, (game.heroHp || 0) + healAmount);
    game.campfireShortLastUsed = Date.now();

    addLog("🔥 Repos court au feu de camp — +50% des PV max soignés.", "event");
    showToast("🔥 +50% des PV max soignés !", 1600);

    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  useCampfire: function () {
    return this.useLongRest();
  },
  getRemainingMs: function () {
    return this.getLongRemainingMs();
  },
  isReady: function () {
    return this.isLongReady();
  }
};

window.CampManager = CampManager;
window.CAMPFIRE_LONG_COOLDOWN_MS = CAMPFIRE_LONG_COOLDOWN_MS;
window.CAMPFIRE_SHORT_COOLDOWN_MS = CAMPFIRE_SHORT_COOLDOWN_MS;
