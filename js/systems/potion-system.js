"use strict";
/* systems/potion-system.js — v3.115.0 : potions PER-RUN (décision Seb). activePotions = {id: true}
   (armées — plus de minuteur) ; l'effet ne s'applique que pendant un run de MISSION
   (SortieManager.isMission(), jamais le farm libre) et les potions armées sont consommées à la
   fin du run (voir hooks dans sortie-system.js). Cumulables : 1 de chaque type par run. Une
   potion bue au camp reste armée indéfiniment jusqu'au prochain run. Élixir d'Aether inchangé
   (pendingPotionBonuses, hors runs). Anciennes saves : timestamps normalisés en booléens à
   ensure(). Ancien système 30 min : COMMENTAIRES_ORIGINAUX.md */

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
    // v3.115.0 : normalise l'ancien format {id: timestampExpiry} en {id: true} — une potion
    // encore minutée à la migration devient simplement armée pour le prochain run (généreux).
    Object.keys(game.activePotions).forEach(function (id) {
      var v = game.activePotions[id];
      if (v === true) return;
      if (typeof v === "number" && v > Date.now()) game.activePotions[id] = true;
      else delete game.activePotions[id];
    });
  },

  /* Une potion est « armée » dès qu'elle est bue ; son effet n'est VIVANT que pendant une mission. */
  isArmed: function (id) {
    this.ensure();
    return game.activePotions[id] === true;
  },

  isEffectLive: function () {
    // Lecture PASSIVE de game.sortie (jamais SortieManager.isMission() qui passe par ensure()
    // et recréerait l'objet — hardResetState/fullResetState mettent game.sortie à null et
    // recalcStats() passe par ici).
    var s = game.sortie;
    return !!(s && s.active && s.context && s.context !== "farm");
  },

  /* Consomme toutes les potions armées — appelé par SortieManager à la fin d'un run de
     MISSION (quelle que soit l'issue : bues, elles sont bues). Jamais appelé pour le farm. */
  consumeRunPotions: function () {
    this.ensure();
    var ids = Object.keys(game.activePotions);
    if (!ids.length) return false;
    game.activePotions = {};
    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
    addLog("🧪 Effets de potions dissipés (fin du run).", "event");
    return true;
  },

  getPotion: function (id) {
    return (POTIONS_DB || []).find(function (p) { return p.id === id; }) || null;
  },

  getStock: function (id) {
    this.ensure();
    return Number(game.potionsOwned[id] || 0);
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

    var cap = typeof POTION_STOCK_CAP === "number" ? POTION_STOCK_CAP : 9;
    if (potion.perRun && this.getStock(id) >= cap) {
      return showToast("Stock plein (" + cap + " max)", 1400);
    }

    game.gold -= cost;
    game.potionsOwned[id] = this.getStock(id) + 1;
    if (!potion.perRun) game.aetherElixirStackCount = Number(game.aetherElixirStackCount || 0) + 1;

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

    if (potion.perRun && this.isArmed(id)) {
      return showToast("Déjà armée pour ce run — 1 par type et par run", 1600);
    }

    game.potionsOwned[id] = stock - 1;

    if (potion.perRun) {
      game.activePotions[id] = true;
      if (this.isEffectLive()) {
        addLog("🧪 " + potion.name + " bue — active pour la mission en cours.", "event");
      } else {
        addLog("🧪 " + potion.name + " bue — armée pour la prochaine mission.", "event");
      }
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

  /* v3.115.0 : plus de minuteur — expiration événementielle (fin de run, consumeRunPotions).
     Signature conservée pour l'appel existant de game-loop.js (protégé, non modifié). */
  tick: function () {
    return false;
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

  getHealCooldownRemainingMs: function () { // v3.102.0 : conservé pour compatibilité (toujours 0, le tour de round remplace le cooldown)
    return 0;
  },

  _legacyHealCooldownRemainingMs: function () {
    this.ensureHealing();
    var elapsed = Date.now() - (game.lastHealUse || 0);
    return Math.max(0, HEALING_POTION_COOLDOWN_MS - elapsed);
  },

  /* v3.102.0 (P2) : la potion est l'action « Objet » d'un round (elle consomme le tour, voir CombatEngine.heroAction) —
     plus de cooldown d'horloge. Retourne true si une potion a été bue. */
  useHealingPotion: function (id) {
    this.ensureHealing();
    var potion = this.getHealingPotion(id);
    if (!potion) return false;

    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden()) {
      showToast("🚫 Potions interdites (Ascétisme actif)", 1600);
      return false;
    }

    var stock = this.getHealingStock(id);
    if (stock <= 0) { showToast("Aucune potion en stock", 1000); return false; }

    var maxHp = Number(game.heroMaxHp || 1);
    var currentHp = Number(game.heroHp != null ? game.heroHp : maxHp);
    if (currentHp >= maxHp) { showToast("PV déjà au maximum", 1000); return false; }

    game.healingPotionsOwned[id] = stock - 1;
    var healed = Math.floor(maxHp * potion.healPercent);
    game.heroHp = Math.min(maxHp, currentHp + healed);
    game.lastHealUse = Date.now();

    addLog("🩹 " + potion.name + " utilisée (+" + formatNumber(healed) + " PV)", "event");
    showToast("+" + formatNumber(healed) + " PV", 1200);
    if (typeof renderHeroHp === "function") renderHeroHp();
    if (typeof renderHud === "function") renderHud();
    if (typeof renderHealButtons === "function") renderHealButtons();
    if (game.activeTab !== "combat" && typeof renderPanel === "function") renderPanel();
    saveGame();
    return true;
  },

  getActiveEffects: function () {
    this.ensure();
    var effects = {};
    if (!this.isEffectLive()) return effects; // armées mais dormantes hors mission (jamais de boost du farm libre)

    (POTIONS_DB || []).forEach(function (potion) {
      if (!potion.perRun) return;
      if (game.activePotions[potion.id] === true) {
        effects[potion.stat] = (effects[potion.stat] || 0) + potion.bonus;
      }
    });

    return effects;
  }
};

window.PotionManager = PotionManager;
