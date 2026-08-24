"use strict";
/* systems/potion-system.js — potions temporaires (data/potions.js) : achat/stock découplés de l'activation, effets lus par StatsSystem.recalcStats().
   activePotions = {id: expiry} ; pendingPotionBonuses = bonus sans minuteur (Élixir d'Aether). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var POTION_CYCLE_PRICE_GROWTH = 0.15;

var PotionManager = {
  ensure: function () {
    if (!game.activePotions || typeof game.activePotions !== "object") game.activePotions = {};
    if (!game.pendingPotionBonuses || typeof game.pendingPotionBonuses !== "object") {
      game.pendingPotionBonuses = { aetherNext: 0 };
    }
    if (typeof game.pendingPotionBonuses.aetherNext !== "number") game.pendingPotionBonuses.aetherNext = 0;
    if (typeof game.aetherElixirStackCount !== "number") game.aetherElixirStackCount = 0;
    if (!game.potionsOwned || typeof game.potionsOwned !== "object") game.potionsOwned = {};
  },

  getPotion: function (id) {
    return (POTIONS_DB || []).find(function (p) { return p.id === id; }) || null;
  },

  getStock: function (id) {
    this.ensure();
    return Number(game.potionsOwned[id] || 0);
  },

  getRemainingMs: function (id) {
    this.ensure();
    var expires = game.activePotions[id];
    if (!expires) return 0;
    return Math.max(0, expires - Date.now());
  },

  isActive: function (id) {
    return this.getRemainingMs(id) > 0;
  },

  getCost: function (potion) {
    this.ensure();
    var base = potion.cost;
    if (potion.costMult) {
      var stacks = Number(game.aetherElixirStackCount || 0);
      base = base * Math.pow(potion.costMult, stacks);
    }
    var cycleMult = Math.pow(1 + POTION_CYCLE_PRICE_GROWTH, Number(game.cycleCount || 0));
    return Math.floor(base * cycleMult);
  },

  buyPotion: function (id) {
    this.ensure();
    var potion = this.getPotion(id);
    if (!potion) return showToast("Potion introuvable", 1000);

    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden()) {
      return showToast("🚫 Potions interdites (Ascétisme actif)", 1600);
    }

    var cost = this.getCost(potion);
    if ((game.gold || 0) < cost) return showToast("Pas assez d'or", 1000);

    if (potion.durationMin && this.getStock(id) >= 1) {
      return showToast("Déjà 1 en stock — utilise-la avant d'en racheter", 1600);
    }

    game.gold -= cost;
    game.potionsOwned[id] = this.getStock(id) + 1;
    if (!potion.durationMin) game.aetherElixirStackCount = Number(game.aetherElixirStackCount || 0) + 1;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", cost);
    }

    addLog("🧪 " + potion.name + " achetée (stock : " + game.potionsOwned[id] + ")", "event");
    showToast(potion.name + " +1", 1300);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  usePotion: function (id) {
    this.ensure();
    var potion = this.getPotion(id);
    if (!potion) return showToast("Potion introuvable", 1000);

    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden()) {
      return showToast("🚫 Potions interdites (Ascétisme actif)", 1600);
    }

    var stock = this.getStock(id);
    if (stock <= 0) return showToast("Aucune potion en stock", 1000);

    if (potion.durationMin) {
      var now = Date.now();
      var hasOtherActive = Object.keys(game.activePotions).some(function (activeId) {
        return activeId !== id && game.activePotions[activeId] > now;
      });
      if (hasOtherActive) {
        return showToast("Une seule potion à bonus active à la fois", 1600);
      }
    }

    game.potionsOwned[id] = stock - 1;

    if (potion.durationMin) {
      game.activePotions[id] = Date.now() + potion.durationMin * 60000;
      addLog("🧪 " + potion.name + " bue (" + potion.durationMin + " min)", "event");
    } else {
      game.pendingPotionBonuses.aetherNext = Number(game.pendingPotionBonuses.aetherNext || 0) + potion.bonus;
      addLog("🌀 " + potion.name + " bu — bonus prêt pour la prochaine ascension", "event");
    }

    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }

    showToast(potion.name + " utilisée", 1500);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  sellPotion: function (id) {
    this.ensure();
    this.ensureHealing();
    var potion = this.getPotion(id) || this.getHealingPotion(id);
    if (!potion) return showToast("Potion introuvable", 1000);

    var isHealing = !this.getPotion(id);
    var stock = isHealing ? this.getHealingStock(id) : this.getStock(id);
    if (stock <= 0) return showToast("Aucune potion à vendre", 1000);

    var value = Math.floor(this.getCost(potion) / 2);
    if (isHealing) game.healingPotionsOwned[id] = stock - 1;
    else game.potionsOwned[id] = stock - 1;
    game.gold += value;

    addLog("💰 " + potion.name + " vendue (+" + formatNumber(value) + " or)", "event");
    showToast("+" + formatNumber(value) + " or", 1300);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  tick: function () {
    this.ensure();
    var now = Date.now();
    var changed = false;

    Object.keys(game.activePotions).forEach(function (id) {
      if (game.activePotions[id] <= now) {
        delete game.activePotions[id];
        changed = true;
      }
    });

    if (changed && window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }

    return changed;
  },

  ensureHealing: function () {
    if (!game.healingPotionsOwned || typeof game.healingPotionsOwned !== "object") {
      game.healingPotionsOwned = {};
    }
    if (typeof game.lastHealUse !== "number") game.lastHealUse = 0;
  },

  getHealingPotion: function (id) {
    return (HEALING_POTIONS_DB || []).find(function (p) { return p.id === id; }) || null;
  },

  getHealingStock: function (id) {
    this.ensureHealing();
    return Number(game.healingPotionsOwned[id] || 0);
  },

  buyHealingPotion: function (id) {
    this.ensureHealing();
    var potion = this.getHealingPotion(id);
    if (!potion) return;

    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden()) {
      return showToast("🚫 Potions interdites (Ascétisme actif)", 1600);
    }

    var cost = this.getCost(potion);
    if ((game.gold || 0) < cost) return showToast("Pas assez d'or", 1000);

    game.gold -= cost;
    game.healingPotionsOwned[id] = this.getHealingStock(id) + 1;

    addLog("🩹 " + potion.name + " achetée (stock : " + game.healingPotionsOwned[id] + ")", "event");
    showToast(potion.name + " +1", 1300);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  getHealCooldownRemainingMs: function () {
    this.ensureHealing();
    var elapsed = Date.now() - (game.lastHealUse || 0);
    return Math.max(0, HEALING_POTION_COOLDOWN_MS - elapsed);
  },

  useHealingPotion: function (id) {
    this.ensureHealing();
    var potion = this.getHealingPotion(id);
    if (!potion) return;

    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden()) {
      return showToast("🚫 Potions interdites (Ascétisme actif)", 1600);
    }

    if (this.getHealCooldownRemainingMs() > 0) {
      return showToast("⏳ Encore un instant...", 900);
    }

    var stock = this.getHealingStock(id);
    if (stock <= 0) return showToast("Aucune potion en stock", 1000);

    var maxHp = Number(game.heroMaxHp || 1);
    var currentHp = Number(game.heroHp != null ? game.heroHp : maxHp);
    if (currentHp >= maxHp) return showToast("PV déjà au maximum", 1000);

    game.healingPotionsOwned[id] = stock - 1;
    var healed = Math.floor(maxHp * potion.healPercent);
    game.heroHp = Math.min(maxHp, currentHp + healed);
    game.lastHealUse = Date.now();

    addLog("🩹 " + potion.name + " utilisée (+" + formatNumber(healed) + " PV)", "event");
    showToast("+" + formatNumber(healed) + " PV", 1200);
    if (typeof renderHeroHp === "function") renderHeroHp();
    if (typeof renderHud === "function") renderHud();
    if (typeof renderHealButtons === "function") renderHealButtons();
    if (typeof renderPanel === "function") renderPanel();
    saveGame();
  },

  getActiveEffects: function () {
    this.ensure();
    var now = Date.now();
    var effects = {};

    (POTIONS_DB || []).forEach(function (potion) {
      if (!potion.durationMin) return;
      var expires = game.activePotions[potion.id];
      if (expires && expires > now) {
        effects[potion.stat] = (effects[potion.stat] || 0) + potion.bonus;
      }
    });

    return effects;
  }
};

window.PotionManager = PotionManager;
