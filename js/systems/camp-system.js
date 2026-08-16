"use strict";
/* ============================================================
Aethervale — systems/camp-system.js
v3.7 : mécanique du Feu de camp (page Campement, voir ui/camp-view.js).
Volontairement séparé des potions de soin (systems/potion-system.js) :
le feu de camp est un utilitaire gratuit "avant de partir à
l'aventure", les potions restent la solution d'urgence EN PLEIN
COMBAT. Les deux coexistent sans se cannibaliser.

v3.14 : deux types de repos au lieu d'un seul —
  - Long repos  : cooldown 30 min, restaure les PV à 100% (comportement
    v3.7 inchangé, juste renommé long/short en interne).
  - Repos court : cooldown 15 min, restaure les PV à 50% seulement —
    option plus rapide mais moins efficace, pour un choix tactique
    réel plutôt qu'un unique bouton "attendre 30 min".
Les deux cooldowns sont INDÉPENDANTS (utiliser l'un ne déclenche pas
le cooldown de l'autre) — game.campfireLastUsed (long) existait déjà
en v3.7, conservé tel quel pour ne pas casser les sauvegardes ;
game.campfireShortLastUsed est nouveau.
============================================================ */

var CAMPFIRE_LONG_COOLDOWN_MS = 30 * 60 * 1000;  // 30 minutes
var CAMPFIRE_SHORT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
var CAMPFIRE_SHORT_HEAL_PCT = 0.5;               // repos court : 50% des PV max

var CampManager = {
  ensureDefaults: function () {
    if (typeof game.campfireLastUsed !== "number") game.campfireLastUsed = 0;
    if (typeof game.campfireShortLastUsed !== "number") game.campfireShortLastUsed = 0;
  },

  /* v3.28 : talent "Repos du guerrier" (t_last_stand, branche Survie
     rethématisée) — réduit le cooldown des DEUX repos de 10%/niveau
     (ex. niveau 3 = cooldown ×0.70 de sa valeur normale). */
  getEffectiveCooldownMs: function (baseCooldownMs) {
    var reduction = (game.talents && game.talents.t_last_stand) ? game.talents.t_last_stand * 0.10 : 0;
    return Math.floor(baseCooldownMs * Math.max(0.1, 1 - reduction));
  },

  /* --- Long repos (30 min, 100% PV) --- */

  getLongRemainingMs: function () {
    this.ensureDefaults();
    var elapsed = Date.now() - game.campfireLastUsed;
    return Math.max(0, this.getEffectiveCooldownMs(CAMPFIRE_LONG_COOLDOWN_MS) - elapsed);
  },

  isLongReady: function () {
    return this.getLongRemainingMs() <= 0;
  },

  /* Bouton "Long repos" de l'écran Campement. */
  useLongRest: function () {
    this.ensureDefaults();

    if (!this.isLongReady()) {
      showToast("Long repos pas encore prêt (" + formatTime(Math.ceil(this.getLongRemainingMs() / 1000)) + ")", 1600);
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

    addLog("🔥 Long repos au feu de camp — PV entièrement restaurés.", "event");
    showToast("🔥 PV restaurés !", 1600);

    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  /* --- Repos court (15 min, 50% PV) --- */

  getShortRemainingMs: function () {
    this.ensureDefaults();
    var elapsed = Date.now() - game.campfireShortLastUsed;
    return Math.max(0, this.getEffectiveCooldownMs(CAMPFIRE_SHORT_COOLDOWN_MS) - elapsed);
  },

  isShortReady: function () {
    return this.getShortRemainingMs() <= 0;
  },

  /* Bouton "Repos court" de l'écran Campement — restaure à 50% des PV
     max, jamais moins que les PV actuels (un joueur déjà à 70% ne
     redescend pas à 50% en l'utilisant par erreur). */
  useShortRest: function () {
    this.ensureDefaults();

    if (!this.isShortReady()) {
      showToast("Repos court pas encore prêt (" + formatTime(Math.ceil(this.getShortRemainingMs() / 1000)) + ")", 1600);
      return false;
    }

    var target = Math.floor((game.heroMaxHp || 1) * CAMPFIRE_SHORT_HEAL_PCT);
    if ((game.heroHp || 0) >= target) {
      showToast("PV déjà au-dessus de 50%", 1200);
      return false;
    }

    game.heroHp = target;
    game.campfireShortLastUsed = Date.now();

    addLog("🔥 Repos court au feu de camp — PV restaurés à 50%.", "event");
    showToast("🔥 PV restaurés à 50% !", 1600);

    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  /* Alias rétrocompatible — anciens appels éventuels vers l'ancien nom
     (useCampfire) redirigés vers le long repos, comportement identique
     à avant v3.14. */
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
