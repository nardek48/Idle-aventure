"use strict";
/* systems/special-attack-system.js — attaque spéciale + bouclier universel par HÉROS (pré-système de classes).
   NOTE : dépend de HERO_SPECIAL_ATTACKS/DEFENSE_ABILITY, retirés de data/heroes.js depuis v3.34.0 (système de classes) —
   possible code legacy/mort, à vérifier avec Seb. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var SpecialAttackManager = {
  ensure: function () {
    if (typeof game.lastSpecialUse !== "number") game.lastSpecialUse = 0;
    if (typeof game.specialBuffExpires !== "number") game.specialBuffExpires = 0;
    if (typeof game.specialBuffPct !== "number") game.specialBuffPct = 0;
  },

  getCurrentSpecial: function () {
    if (typeof HERO_SPECIAL_ATTACKS === "undefined" || !game.heroId) return null;
    return HERO_SPECIAL_ATTACKS[game.heroId] || null;
  },

  getCooldownRemainingMs: function () {
    this.ensure();
    var special = this.getCurrentSpecial();
    if (!special) return 0;
    var elapsed = Date.now() - (game.lastSpecialUse || 0);
    return Math.max(0, special.cooldownMs - elapsed);
  },

  getActiveBuffPct: function () {
    this.ensure();
    if (game.specialBuffExpires > Date.now()) return game.specialBuffPct || 0;
    return 0;
  },

  use: function () {
    this.ensure();
    var special = this.getCurrentSpecial();
    if (!special) return;

    if (this.getCooldownRemainingMs() > 0) {
      return showToast("⏳ Encore un instant...", 900);
    }
    if (!game.enemy) return;

    var baseDamage = (window.EquipmentManager && typeof EquipmentManager.effectiveTapDamage === "function")
      ? EquipmentManager.effectiveTapDamage()
      : Math.max(1, Math.floor(game.tapDamage * game.tapMult) + Math.floor(game.equipFlatTapBonus || 0));

    game.lastSpecialUse = Date.now();

    if (special.hits && special.hits > 1) {
      for (var i = 0; i < special.hits; i++) {
        if (!game.enemy) break;
        CombatEngine.dealDamage(baseDamage * special.multiplier, false, true, !!special.ignoreAffinity);
      }
    } else if (special.minMult != null && special.maxMult != null) {
      var roll = special.minMult + Math.random() * (special.maxMult - special.minMult);
      CombatEngine.dealDamage(baseDamage * roll, false, true, !!special.ignoreAffinity);
    } else {
      CombatEngine.dealDamage(baseDamage * special.multiplier, false, true, !!special.ignoreAffinity);
    }

    if (special.buffPct && special.buffDurationMs) {
      game.specialBuffPct = special.buffPct;
      game.specialBuffExpires = Date.now() + special.buffDurationMs;
      if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
        StatsSystem.recalcStats();
      }
      addLog("🔥 " + special.name + " ! (+"+ Math.round(special.buffPct * 100) + "% dégâts pendant " + Math.round(special.buffDurationMs / 1000) + "s)", "event");
    } else {
      addLog("✨ " + special.name + " !", "event");
    }

    showToast(special.icon + " " + special.name, 1400);
    if (typeof renderSpecialAttackButton === "function") renderSpecialAttackButton();
    saveGame();
  }
};

window.SpecialAttackManager = SpecialAttackManager;

var DefenseManager = {
  ensure: function () {
    if (typeof game.lastDefenseUse !== "number") game.lastDefenseUse = 0;
    if (typeof game.defenseBuffExpires !== "number") game.defenseBuffExpires = 0;
  },

  getCooldownRemainingMs: function () {
    this.ensure();
    var elapsed = Date.now() - (game.lastDefenseUse || 0);
    return Math.max(0, DEFENSE_ABILITY.cooldownMs - elapsed);
  },

  isActive: function () {
    this.ensure();
    return game.defenseBuffExpires > Date.now();
  },

  getActiveBonusPct: function () {
    if (!this.isActive()) return 0;
    var base = DEFENSE_ABILITY.defenseBonusPct;
    var talentBonus = (game.talents && game.talents.t_calm_breath) ? game.talents.t_calm_breath * 0.05 : 0;
    return base + talentBonus;
  },

  use: function () {
    this.ensure();
    if (this.getCooldownRemainingMs() > 0) {
      return showToast("⏳ Encore un instant...", 900);
    }

    game.lastDefenseUse = Date.now();
    var talentDurationBonusMs = (game.talents && game.talents.t_thick_skin) ? game.talents.t_thick_skin * 2000 : 0;
    var effectiveDurationMs = DEFENSE_ABILITY.durationMs + talentDurationBonusMs;
    game.defenseBuffExpires = Date.now() + effectiveDurationMs;

    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }

    addLog("🛡️ " + DEFENSE_ABILITY.name + " activée (" + Math.round(effectiveDurationMs / 1000) + "s)", "event");
    showToast(DEFENSE_ABILITY.icon + " " + DEFENSE_ABILITY.name, 1400);
    if (typeof renderDefenseButton === "function") renderDefenseButton();
    saveGame();
  }
};

window.DefenseManager = DefenseManager;
