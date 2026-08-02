"use strict";
/* ============================================================
Quest Idle — data/dungeon.js
Configuration du premier donjon : un gauntlet de 15 vagues + un boss
final, séparé de la progression normale des mondes. Voir
systems/dungeon-system.js pour la logique.
============================================================ */

var DUNGEON_CONFIG = {
  waveCount: 15,              // vagues normales avant le boss (vague 16)
  freeTicketsPerDay: 1,
  ticketResetHours: 24,
  ticketCostEssence: 100,      // prix d'un ticket supplémentaire

  // Multiplicateurs de difficulté : le donjon est calibré sur le monde
  // actuel du joueur (WorldManager.worldIndex), puis monte en intensité
  // vague après vague jusqu'au boss.
  basePremiumMult: 1.3,        // le donjon est TOUJOURS plus dur qu'un combat normal au même monde
  waveRampMult: 1.5,           // intensité additionnelle entre la vague 1 et la vague 15
  bossPremiumMult: 1.8,        // le boss de donjon est nettement plus fort qu'un boss de monde

  // Récompenses
  fullClearGoldBase: 500,      // + bonus par monde/vague, voir DungeonManager.getReward
  fullClearEssenceBase: 40,
  partialLootChance: 40,        // % de chance de butin quand même en cas d'échec

  // v2.14 : monnaie exclusive au donjon (Éclats), gagnée en jouant,
  // dépensable UNIQUEMENT à la boutique du donjon ci-dessous — pour
  // lui donner une vraie raison d'y retourner, pas juste un mode à
  // essayer une fois.
  shardsPerWaveCleared: 1,       // gagné à chaque vague passée, succès ou échec
  shardsBossBonus: 10            // bonus supplémentaire si le boss tombe
};

/* Boutique exclusive du donjon, payée en Éclats (game.dungeonShards).
   Mêmes principes que AETHER_SHOP (data/upgrades.js) : achats par
   niveau, coût croissant, bonus permanent appliqué dans
   StatsSystem.recalcStats(). */
var DUNGEON_SHOP = [
  { id: "d_power", name: "Lame du donjon", icon: "⚔️", desc: "+2% dégâts globaux par niveau.", baseCost: 5, costMult: 1.5, maxLevel: 20 },
  { id: "d_gold", name: "Trésor du donjon", icon: "💰", desc: "+2% or global par niveau.", baseCost: 5, costMult: 1.5, maxLevel: 20 },
  { id: "d_essence", name: "Essence du donjon", icon: "🔮", desc: "+2% essence globale par niveau.", baseCost: 5, costMult: 1.5, maxLevel: 20 }
];

window.DUNGEON_CONFIG = DUNGEON_CONFIG;
window.DUNGEON_SHOP = DUNGEON_SHOP;
