"use strict";
/* ============================================================
Aethervale — systems/affliction-system.js
v3.20 : gère l'activation/désactivation des afflictions (voir
data/afflictions.js) et centralise le calcul de leurs effets combinés
— chaque système consommateur (stats-system.js, combat-engine.js,
progression-system.js, potion-system.js, loot-system.js) appelle une
méthode dédiée ici plutôt que de relire game.activeAfflictions
directement, pour garder toute la logique de cumul à un seul endroit.

Activation/désactivation IMMÉDIATE (pas besoin d'attendre le prochain
cycle) — un simple interrupteur, comme un réglage. Voir
ui/afflictions-view.js pour l'écran dédié (Menu ☰).
============================================================ */

var AfflictionManager = {
  ensure: function () {
    if (!game.activeAfflictions || typeof game.activeAfflictions !== "object") {
      game.activeAfflictions = {};
    }
  },

  isActive: function (id) {
    this.ensure();
    return !!game.activeAfflictions[id];
  },

  getActiveCount: function () {
    this.ensure();
    return Object.keys(game.activeAfflictions).filter(function (id) { return game.activeAfflictions[id]; }).length;
  },

  getActiveList: function () {
    this.ensure();
    return (AFFLICTIONS || []).filter(function (a) { return game.activeAfflictions[a.id]; });
  },

  /* Active/désactive UNE affliction. Refuse d'en activer une
     nouvelle si AFFLICTION_MAX_ACTIVE est déjà atteint (désactiver
     reste toujours possible, même au plafond). Recalcule les stats
     immédiatement (les afflictions touchent tapMult/heroMaxHp/etc.,
     au même titre que talents/équipement). */
  toggle: function (id) {
    this.ensure();
    var def = (AFFLICTIONS || []).find(function (a) { return a.id === id; });
    if (!def) return showToast("Affliction introuvable", 1000);

    var currentlyActive = !!game.activeAfflictions[id];

    if (!currentlyActive && this.getActiveCount() >= (window.AFFLICTION_MAX_ACTIVE || 4)) {
      showToast("Maximum " + (window.AFFLICTION_MAX_ACTIVE || 4) + " afflictions actives à la fois", 1600);
      return false;
    }

    game.activeAfflictions[id] = !currentlyActive;
    showToast((currentlyActive ? "Désactivé : " : "Activé : ") + def.name, 1400);

    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  /* Fusionne les `modifiers` de TOUTES les afflictions actives —
     chaque champ additif s'additionne, chaque champ multiplicatif se
     multiplie, les booléens (forbidPotions/forceAllBosses) passent à
     true si N'IMPORTE QUELLE affliction active le demande. Lu par
     StatsSystem.recalcStats() pour les champs qui touchent les stats
     globales (tapMult/heroMaxHp/goldMult/essenceGlobalMult/bonus
     boss) — les autres champs (lootChanceMult, enemyPowerMult,
     forbidPotions, forceAllBosses) sont lus directement par leurs
     systèmes concernés via les méthodes dédiées plus bas. */
  getCombinedModifiers: function () {
    var out = {
      tapMult: 0,
      heroMaxHpMult: 1,
      goldMult: 1,
      lootChanceMult: 1,
      enemyPowerMult: 1,
      bossHpMult: 1,
      bossGoldBonusPct: 0,
      bossEssenceBonusPct: 0,
      forbidPotions: false,
      forceAllBosses: false
    };

    this.getActiveList().forEach(function (a) {
      var m = a.modifiers || {};
      if (m.tapMult) out.tapMult += m.tapMult;
      if (m.heroMaxHpMult != null) out.heroMaxHpMult *= m.heroMaxHpMult;
      if (m.goldMult != null) out.goldMult *= m.goldMult;
      if (m.lootChanceMult != null) out.lootChanceMult *= m.lootChanceMult;
      if (m.enemyPowerMult != null) out.enemyPowerMult *= m.enemyPowerMult;
      if (m.bossHpMult != null) out.bossHpMult *= m.bossHpMult;
      if (m.bossGoldBonusPct) out.bossGoldBonusPct += m.bossGoldBonusPct;
      if (m.bossEssenceBonusPct) out.bossEssenceBonusPct += m.bossEssenceBonusPct;
      if (m.forbidPotions) out.forbidPotions = true;
      if (m.forceAllBosses) out.forceAllBosses = true;
    });

    return out;
  },

  /* +10% (AFFLICTION_STACK_REWARD_BONUS) à TOUTES les récompenses
     par affliction active, cumulé — récompense le cumul en lui-même,
     en plus de l'effet propre à chaque affliction. Multiplicatif,
     combiné avec goldMult/essenceGlobalMult dans recalcStats(). */
  getStackRewardMult: function () {
    var count = this.getActiveCount();
    return 1 + count * (window.AFFLICTION_STACK_REWARD_BONUS || 0);
  },

  /* Un ennemi doit-il être forcé "boss" à la génération (Élite) ?
     Lu par WorldManager.generateEnemy(), systems/progression-system.js. */
  shouldForceAllBosses: function () {
    return this.getCombinedModifiers().forceAllBosses;
  },

  /* Les potions sont-elles interdites (Ascétisme) ? Lu par
     PotionManager.buyPotion()/buyHealingPotion()/usePotion(),
     systems/potion-system.js. */
  arePotionsForbidden: function () {
    return this.getCombinedModifiers().forbidPotions;
  }
};

window.AfflictionManager = AfflictionManager;
