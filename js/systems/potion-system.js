"use strict";
/* ============================================================
Quest Idle — systems/potion-system.js
Achat et gestion des potions temporaires (voir data/potions.js).
Deux mécanismes distincts :
  - game.activePotions      { id: timestamp d'expiration } pour les
    potions à durée (Force/Célérité/Précision/Endurance/Fortune)
  - game.pendingPotionBonuses  bonus en attente sans minuteur
    (Élixir d'Aether), consommé par ascendNow() en
    progression-system.js puis remis à zéro
Les effets réels sont appliqués dans StatsSystem.recalcStats() via
PotionManager.getActiveEffects() — ce fichier ne touche jamais
directement game.tapDamage/goldMult/etc.
============================================================ */

var PotionManager = {
  ensure: function () {
    if (!game.activePotions || typeof game.activePotions !== "object") game.activePotions = {};
    if (!game.pendingPotionBonuses || typeof game.pendingPotionBonuses !== "object") {
      game.pendingPotionBonuses = { aetherNext: 0 };
    }
    if (typeof game.pendingPotionBonuses.aetherNext !== "number") game.pendingPotionBonuses.aetherNext = 0;
  },

  getPotion: function (id) {
    return (POTIONS_DB || []).find(function (p) { return p.id === id; }) || null;
  },

  /* Millisecondes restantes avant expiration d'une potion à durée
     (0 si inactive ou déjà expirée). */
  getRemainingMs: function (id) {
    this.ensure();
    var expires = game.activePotions[id];
    if (!expires) return 0;
    return Math.max(0, expires - Date.now());
  },

  isActive: function (id) {
    return this.getRemainingMs(id) > 0;
  },

  /* Achète une potion : pour une potion à durée, (re)démarre son
     minuteur à durationMin minutes à partir de maintenant (boire une
     potion déjà active la RECHARGE, ne cumule pas son effet). Pour
     l'Élixir d'Aether (pas de durationMin), additionne son bonus dans
     pendingPotionBonuses.aetherNext, consommé à la prochaine ascension. */
  buy: function (id) {
    this.ensure();
    var potion = this.getPotion(id);
    if (!potion) return showToast("Potion introuvable", 1000);
    if ((game.gold || 0) < potion.cost) return showToast("Pas assez d'or", 1000);

    game.gold -= potion.cost;

    if (potion.durationMin) {
      game.activePotions[id] = Date.now() + potion.durationMin * 60000;
      addLog("🧪 " + potion.name + " bue (" + potion.durationMin + " min)", "event");
    } else {
      game.pendingPotionBonuses.aetherNext = Number(game.pendingPotionBonuses.aetherNext || 0) + potion.bonus;
      addLog("🌀 " + potion.name + " bu — bonus prêt pour la prochaine ascension", "event");
    }

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", potion.cost);
    }

    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }

    showToast(potion.name, 1500);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* Purge les potions à durée expirées. Renvoie true si au moins une
     a expiré (pour savoir s'il faut recalculer les stats/redessiner).
     Appelée à chaque frame de la boucle de jeu (voir main/game-loop.js) —
     le coût est négligeable (juste un parcours de quelques clés). */
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

  // ============================================================
  // Potions de soin (v2.16) — achat en stock, usage instantané
  // depuis le bouton dédié de l'écran Combat (voir ui/combat-view.js).
  // ============================================================

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

  /* Achète UNE potion de soin (ajoutée au stock, pas consommée
     immédiatement — voir useHealingPotion pour l'usage). */
  buyHealingPotion: function (id) {
    this.ensureHealing();
    var potion = this.getHealingPotion(id);
    if (!potion) return;
    if ((game.gold || 0) < potion.cost) return showToast("Pas assez d'or", 1000);

    game.gold -= potion.cost;
    game.healingPotionsOwned[id] = this.getHealingStock(id) + 1;

    addLog("🩹 " + potion.name + " achetée (stock : " + game.healingPotionsOwned[id] + ")", "event");
    showToast(potion.name + " +1", 1300);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* Millisecondes restantes avant de pouvoir réutiliser une potion de
     soin (cooldown commun à toutes, pour éviter le spam). */
  getHealCooldownRemainingMs: function () {
    this.ensureHealing();
    var elapsed = Date.now() - (game.lastHealUse || 0);
    return Math.max(0, HEALING_POTION_COOLDOWN_MS - elapsed);
  },

  /* Consomme une potion de soin du stock et restaure des PV
     immédiatement (plafonnés aux PV max). Respecte le cooldown
     commun. Utilisable à tout moment, y compris en plein donjon. */
  useHealingPotion: function (id) {
    this.ensureHealing();
    var potion = this.getHealingPotion(id);
    if (!potion) return;

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
    saveGame();
  },

  /* Agrège les bonus de TOUTES les potions à durée actuellement
     actives, par clé de stat (voir StatsSystem.recalcStats). Les
     potions n'ayant pas de durée (Élixir d'Aether) n'apparaissent
     jamais ici — elles passent par pendingPotionBonuses. */
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
