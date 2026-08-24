"use strict";
/* systems/offline-system.js — Village (6 bâtiments, affectent UNIQUEMENT le hors-ligne) + calcul des récompenses d'absence (OfflineManager).
   computeHuntingGold() partagée entre calculate() (retour d'absence) et tickAmbientHunting() (continu). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var VILLAGE_CONFIG = {
  goldMine: { name: "Mine d'Or", desc: "Multiplie l'or gagné hors-ligne (kills simulés par l'Hôtel de Ville).", baseCost: 250, costMult: 1.65, maxLevel: 25 },
  essenceWell: { name: "Hutte de l'Alchimiste", desc: "Ajoute de l'essence gagnée hors-ligne.", baseCost: 400, costMult: 1.75, maxLevel: 20 },
  barracks: { name: "Caserne", desc: "Améliore l'efficacité hors-ligne.", baseCost: 600, costMult: 1.8, maxLevel: 20 },
  timeRelay: { name: "Tour des Mages", desc: "Augmente la durée maximale des gains hors-ligne.", baseCost: 900, costMult: 2, maxLevel: 10 },
  watchtower: { name: "Hôtel de Ville", desc: "Simule des combats en continu (hors-ligne ET en jeu, même hors de l'écran Combat) : kills (qui rapportent l'or via la Mine d'Or), bestiaire, et chance de butin.", baseCost: 1200, costMult: 1.9, maxLevel: 20 },
  sanctuary: { name: "Atelier de Forgeron", desc: "Génère un peu d'Aether pendant ton absence.", baseCost: 5000, costMult: 2.3, maxLevel: 10 }
};

var OFFLINE_MAX_SIMULATED_KILLS = 2000;
var OFFLINE_BOSS_CHECK_EVERY = 25;
var OFFLINE_BOSS_CHECK_CHANCE = 20;
var OFFLINE_MAX_ITEMS = 3;

var OFFLINE_GOLD_PER_KILL_BASE = 6;
var OFFLINE_GOLD_PER_KILL_WORLD = 3;
var OFFLINE_AVG_ENEMY_INDEX = 4.5;
var OFFLINE_GOLD_KILL_MULT = 4.1;
var OFFLINE_BASE_GOLD_PER_SEC = 1;

var VillageManager = {
  ensure: function () {
    if (!game.village || typeof game.village !== "object") game.village = {};
    if (typeof game.village.goldMine !== "number") game.village.goldMine = 0;
    if (typeof game.village.essenceWell !== "number") game.village.essenceWell = 0;
    if (typeof game.village.barracks !== "number") game.village.barracks = 0;
    if (typeof game.village.timeRelay !== "number") game.village.timeRelay = 0;
    if (typeof game.village.watchtower !== "number") game.village.watchtower = 0;
    if (typeof game.village.sanctuary !== "number") game.village.sanctuary = 0;
  },

  getLevel: function (id) {
    this.ensure();
    return Number(game.village[id] || 0);
  },

  getConfig: function (id) {
    return VILLAGE_CONFIG[id] || null;
  },

  getCost: function (id) {
    var cfg = this.getConfig(id);
    if (!cfg) return Infinity;
    var level = this.getLevel(id);
    return Math.floor(cfg.baseCost * Math.pow(cfg.costMult, level));
  },

  canBuy: function (id) {
    var cfg = this.getConfig(id);
    if (!cfg) return false;
    var level = this.getLevel(id);
    if (level >= (cfg.maxLevel || Infinity)) return false;
    return game.gold >= this.getCost(id);
  },

  buy: function (id) {
    var cfg = this.getConfig(id);
    if (!cfg) {
      showToast("Bâtiment introuvable", 1200);
      return;
    }

    var level = this.getLevel(id);
    if (level >= (cfg.maxLevel || Infinity)) {
      showToast("Niveau maximum", 1200);
      return;
    }

    var cost = this.getCost(id);
    if (game.gold < cost) {
      showToast("Pas assez d'or", 1000);
      return;
    }

    game.gold -= cost;
    game.village[id] = level + 1;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", cost);
    }

    addLog("Village : " + cfg.name + " niv. " + game.village[id], "event");
    showToast(cfg.name + " +1", 1200);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  getTotalLevel: function () {
    this.ensure();
    var ids = Object.keys(VILLAGE_CONFIG);
    var total = 0;
    for (var i = 0; i < ids.length; i++) total += this.getLevel(ids[i]);
    return total;
  },

  computeHuntingGold: function (kills, seconds, bonuses) {
    var worldIndex = (window.WorldManager && WorldManager.worldIndex) || 0;
    var adventureIndex = (window.WorldManager && WorldManager.adventureIndex) || 0;
    var cycleCount = game.cycleCount || 0;
    var scale = 1 + worldIndex * 0.90 + adventureIndex * 0.30 + cycleCount * 0.45 + OFFLINE_AVG_ENEMY_INDEX * 0.05;
    var goldPerKill = OFFLINE_GOLD_PER_KILL_BASE * scale + worldIndex * OFFLINE_GOLD_PER_KILL_WORLD;
    var killBasedGold = Number(kills || 0) * goldPerKill * OFFLINE_GOLD_KILL_MULT * (1 + Number(bonuses.efficiencyBonus || 0)) * Number(bonuses.goldMult || 1);

    var floorGold = OFFLINE_BASE_GOLD_PER_SEC * Number(seconds || 0) * (1 + Number(bonuses.efficiencyBonus || 0)) * Number(bonuses.goldMult || 1);

    return Math.max(killBasedGold, floorGold);
  },

  tickAmbientHunting: function (dt) {
    this.ensure();
    dt = Math.max(0, Number(dt || 0));
    if (dt <= 0) return;

    var bonuses = this.getOfflineBonuses();

    var killsPerSecond = Number(bonuses.killsPerHour || 0) / 3600;
    game._huntKillAccum = Number(game._huntKillAccum || 0) + killsPerSecond * dt;
    var wholeKills = Math.floor(game._huntKillAccum);
    game._huntKillAccum -= wholeKills;

    game._huntGoldAccum = Number(game._huntGoldAccum || 0) + this.computeHuntingGold(wholeKills, dt, bonuses);
    var wholeGold = Math.floor(game._huntGoldAccum);
    game._huntGoldAccum -= wholeGold;

    if (wholeGold > 0) {
      game.gold += wholeGold;
      game.totalGoldEarned += wholeGold;
      if (window.QuestManager && typeof QuestManager.track === "function") {
        QuestManager.track("goldEarned", wholeGold);
      }
    }

    if (wholeKills <= 0) return;

    game.totalKills = Number(game.totalKills || 0) + wholeKills;
    game.killCounts = game.killCounts || {};

    var pool = [];
    if (window.WorldManager && typeof WorldManager.getAdventure === "function") {
      var adventure = WorldManager.getAdventure();
      if (adventure && adventure.enemyPool && adventure.enemyPool.length) pool = adventure.enemyPool;
    }

    if (pool.length) {
      for (var i = 0; i < wholeKills; i++) {
        var id = pool[randInt(0, pool.length - 1)];
        game.killCounts[id] = (game.killCounts[id] || 0) + 1;
      }
    }

    game._huntBossCheckAccum = Number(game._huntBossCheckAccum || 0) + wholeKills;
    while (game._huntBossCheckAccum >= OFFLINE_BOSS_CHECK_EVERY) {
      game._huntBossCheckAccum -= OFFLINE_BOSS_CHECK_EVERY;
      if (chance(OFFLINE_BOSS_CHECK_CHANCE) && window.LootSystem && typeof LootSystem.rollDrop === "function") {
        var drop = LootSystem.rollDrop();
        if (drop && typeof addDropToInventory === "function" && addDropToInventory(drop)) {
          addLog("🏘️ Chasse du village : " + drop.name + " (" + drop.rarity + ")", "event");
        }
      }
    }
  },

  getOfflineBonuses: function () {
    this.ensure();

    var talentEfficiency = 0;

    var ascensionEfficiency = Math.min(0.40, (game.ascensionCount || 0) * 0.02);

    return {
      goldMult: 1 + this.getLevel("goldMine") * 0.12,
      essenceFlat: this.getLevel("essenceWell"),
      efficiencyBonus: this.getLevel("barracks") * 0.04 + talentEfficiency + ascensionEfficiency,
      extraHours: this.getLevel("timeRelay") * 2,
      killsPerHour: this.getLevel("watchtower") * 3,
      aetherPerHour: this.getLevel("sanctuary") * 0.05
    };
  }
};

var OfflineManager = {
  calculate: function () {
    if (!game.lastOnline) return null;
    if (!window.VillageManager || typeof VillageManager.getOfflineBonuses !== "function") return null;

    VillageManager.ensure();

    var elapsedMs = Date.now() - game.lastOnline;
    if (elapsedMs <= 1000) return null;

    var bonuses = VillageManager.getOfflineBonuses();
    var baseCapHours = 4;
    var maxHours = baseCapHours + Number(bonuses.extraHours || 0);
    var cappedMs = Math.min(elapsedMs, maxHours * 3600 * 1000);
    var seconds = cappedMs / 1000;
    var hours = seconds / 3600;

    var essence = Math.floor(hours * Number(bonuses.essenceFlat || 0));
    var aether = Math.floor(hours * Number(bonuses.aetherPerHour || 0));

    var kills = Math.min(OFFLINE_MAX_SIMULATED_KILLS, Math.floor(hours * Number(bonuses.killsPerHour || 0)));
    var killsByEnemy = {};
    var items = [];

    if (kills > 0) {
      var pool = [];
      if (window.WorldManager && typeof WorldManager.getAdventure === "function") {
        var adventure = WorldManager.getAdventure();
        if (adventure && adventure.enemyPool && adventure.enemyPool.length) pool = adventure.enemyPool;
      }

      if (pool.length) {
        for (var i = 0; i < kills; i++) {
          var id = pool[randInt(0, pool.length - 1)];
          killsByEnemy[id] = (killsByEnemy[id] || 0) + 1;
        }

        var bossChecks = Math.floor(kills / OFFLINE_BOSS_CHECK_EVERY);
        for (var c = 0; c < bossChecks && items.length < OFFLINE_MAX_ITEMS; c++) {
          if (chance(OFFLINE_BOSS_CHECK_CHANCE) && window.LootSystem && typeof LootSystem.rollDrop === "function") {
            var drop = LootSystem.rollDrop();
            if (drop) items.push(drop);
          }
        }
      }
    }

    var gold = Math.floor(VillageManager.computeHuntingGold(kills, seconds, bonuses));

    if (gold <= 0 && essence <= 0 && aether <= 0 && kills <= 0) return null;

    return {
      ms: cappedMs,
      gold: Math.max(0, gold),
      essence: Math.max(0, essence),
      aether: Math.max(0, aether),
      kills: kills,
      killsByEnemy: killsByEnemy,
      items: items
    };
  },

  show: function (offline) {
    if (!offline) return;

    game.gold += Number(offline.gold || 0);
    game.essence += Number(offline.essence || 0);
    game.totalGoldEarned += Number(offline.gold || 0);

    if (offline.aether > 0) {
      game.aether = Number(game.aether || 0) + offline.aether;
      game.totalAetherEarned = Number(game.totalAetherEarned || 0) + offline.aether;
    }

    var itemNames = [];
    if (offline.kills > 0) {
      game.totalKills = Number(game.totalKills || 0) + offline.kills;
      game.killCounts = game.killCounts || {};

      Object.keys(offline.killsByEnemy || {}).forEach(function (id) {
        game.killCounts[id] = (game.killCounts[id] || 0) + offline.killsByEnemy[id];
      });

      if (window.QuestManager && typeof QuestManager.track === "function") {
        QuestManager.track("kills", offline.kills);
      }

      (offline.items || []).forEach(function (drop) {
        if (typeof addDropToInventory === "function" ? addDropToInventory(drop) : (game.inventory.push(drop), true)) {
          itemNames.push(drop.name);
        }
      });
    }

    addLog(
      "Gain hors-ligne : +" + formatNumber(offline.gold || 0) + " or, +" + formatNumber(offline.essence || 0) + " essence" +
      (offline.aether > 0 ? ", +" + formatNumber(offline.aether) + " Aether" : "") +
      (offline.kills > 0 ? ", " + formatNumber(offline.kills) + " ennemis vaincus par la Vigie" : ""),
      "event"
    );

    if (typeof showOfflineModal === "function") {
      showOfflineModal({
        ms: offline.ms,
        gold: offline.gold,
        essence: offline.essence,
        aether: offline.aether,
        kills: offline.kills,
        items: itemNames
      });
    } else {
      showToast("Hors-ligne : +" + formatNumber(offline.gold || 0) + " or", 1800);
    }

    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
  }
};

window.VillageManager = VillageManager;
window.OfflineManager = OfflineManager;
window.VILLAGE_CONFIG = VILLAGE_CONFIG;
