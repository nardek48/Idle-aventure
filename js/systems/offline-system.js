"use strict";
/* ============================================================
Quest Idle — systems/offline-system.js
Le village (6 bâtiments achetables en or, chacun améliore un aspect
des gains hors-ligne) et le calcul des récompenses hors-ligne
(OfflineManager), déclenché au boot si le joueur était absent.
============================================================ */

/* Catalogue des bâtiments du village. Chaque bâtiment n'affecte QUE le
   hors-ligne (jamais les gains en jeu actif) — voir
   VillageManager.getOfflineBonuses() pour le détail de chaque effet. */
var VILLAGE_CONFIG = {
  goldMine: { name: "Mine d'or", desc: "Augmente les gains d'or hors-ligne.", baseCost: 250, costMult: 1.65, maxLevel: 25 },
  essenceWell: { name: "Puits d'essence", desc: "Ajoute de l'essence gagnée hors-ligne.", baseCost: 400, costMult: 1.75, maxLevel: 20 },
  barracks: { name: "Caserne", desc: "Améliore l'efficacité hors-ligne.", baseCost: 600, costMult: 1.8, maxLevel: 20 },
  timeRelay: { name: "Relais du temps", desc: "Augmente la durée maximale des gains hors-ligne.", baseCost: 900, costMult: 2, maxLevel: 10 },
  watchtower: { name: "Vigie", desc: "Simule des combats pendant ton absence : kills, bestiaire, et chance de butin.", baseCost: 1200, costMult: 1.9, maxLevel: 20 },
  sanctuary: { name: "Sanctuaire d'Aether", desc: "Génère un peu d'Aether pendant ton absence.", baseCost: 5000, costMult: 2.3, maxLevel: 10 }
};

var OFFLINE_MAX_SIMULATED_KILLS = 2000;   // garde-fou perf/économie, même sur une absence énorme
var OFFLINE_BOSS_CHECK_EVERY = 25;         // 1 "chance de butin" tous les 25 kills simulés
var OFFLINE_BOSS_CHECK_CHANCE = 20;        // % de chance de loot à chaque vérification
var OFFLINE_MAX_ITEMS = 3;                 // butin hors-ligne plafonné (évite d'inonder l'inventaire)

var VillageManager = {
  /* Comble les niveaux de bâtiments manquants (0 par défaut) — utile
     pour les sauvegardes créées avant l'ajout de watchtower/sanctuary. */
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

  /* Améliore un bâtiment d'un niveau (en or). */
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

  /* Village total : somme des niveaux de tous les bâtiments.
     Utilisé pour le visuel de village qui évolue (point 5). */
  getTotalLevel: function () {
    this.ensure();
    var ids = Object.keys(VILLAGE_CONFIG);
    var total = 0;
    for (var i = 0; i < ids.length; i++) total += this.getLevel(ids[i]);
    return total;
  },

  /* Regroupe TOUS les bonus hors-ligne actuels (village + talents +
     synergie d'ascension), consommé par OfflineManager.calculate().
     - goldMult      multiplicateur d'or hors-ligne (Mine d'or)
     - essenceFlat   essence gagnée par heure (Puits d'essence)
     - efficiencyBonus  % additionnel sur l'or hors-ligne (Caserne +
       talents + ascension)
     - extraHours    heures ajoutées au plafond de base de 4h (Relais)
     - killsPerHour  kills simulés par heure (Vigie)
     - aetherPerHour Aether généré par heure (Sanctuaire) */
  getOfflineBonuses: function () {
    this.ensure();

    var talentEfficiency = 0;
    if (game.talents.t_calm_breath) talentEfficiency += 0.10;
    if (game.talents.t_last_stand) talentEfficiency += 0.20;
    if (game.talents.t_immutable_guardian) talentEfficiency += 0.10;

    // Synergie d'ascension (point 6) : le village reste pertinent en fin de partie,
    // sans bâtiment dédié -> +2% d'efficacité hors-ligne par ascension, plafonné à +40%.
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
  /* Calcule ce que le joueur a gagné pendant son absence, sans encore
     rien appliquer à `game` (voir show() plus bas pour ça). Le temps
     pris en compte est plafonné par maxHours (4h de base + bonus du
     Relais du temps). Simule aussi des kills (Vigie) répartis
     aléatoirement sur le pool d'ennemis du chapitre courant, avec une
     petite chance de butin tous les OFFLINE_BOSS_CHECK_EVERY kills.
     Renvoie null s'il n'y a rien à donner (absence trop courte, ou
     aucun bâtiment investi). */
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

    var baseGoldPerSec = 1;
    var gold = Math.floor(baseGoldPerSec * seconds * (1 + Number(bonuses.efficiencyBonus || 0)) * Number(bonuses.goldMult || 1));
    var essence = Math.floor(hours * Number(bonuses.essenceFlat || 0));
    var aether = Math.floor(hours * Number(bonuses.aetherPerHour || 0));

    // v1.9.2 : Vigie -> combats simulés hors-ligne (kills, bestiaire, butin)
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

  /* Applique réellement le résultat de calculate() à `game` (or,
     essence, Aether, kills + bestiaire, objets), puis affiche la
     modale de bienvenue (ou un simple toast si la modale n'est pas
     disponible). Appelée une fois au boot si loadGame() a réussi. */
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
