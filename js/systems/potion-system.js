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
