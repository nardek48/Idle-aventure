"use strict";
/* ============================================================
Quest Idle — managers.js
WorldManager, EquipmentManager, QuestManager, AscensionManager,
OfflineManager
============================================================ */

var VILLAGE_CONFIG = {
  goldMine: {
    name: "Mine d'or",
    desc: "Augmente les gains d'or hors-ligne.",
    baseCost: 250,
    costMult: 1.65,
    maxLevel: 25
  },
  essenceWell: {
    name: "Puits d'essence",
    desc: "Ajoute de l'essence gagnée hors-ligne.",
    baseCost: 400,
    costMult: 1.75,
    maxLevel: 20
  },
  barracks: {
    name: "Caserne",
    desc: "Améliore l'efficacité hors-ligne.",
    baseCost: 600,
    costMult: 1.8,
    maxLevel: 20
  },
  timeRelay: {
    name: "Relais du temps",
    desc: "Augmente la durée maximale des gains hors-ligne.",
    baseCost: 900,
    costMult: 2,
    maxLevel: 10
  }
};

var VillageManager = {
  ensure: function () {
    if (!game.village || typeof game.village !== "object") {
      game.village = {};
    }

    if (typeof game.village.goldMine !== "number") game.village.goldMine = 0;
    if (typeof game.village.essenceWell !== "number") game.village.essenceWell = 0;
    if (typeof game.village.barracks !== "number") game.village.barracks = 0;
    if (typeof game.village.timeRelay !== "number") game.village.timeRelay = 0;
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
    showToast(cfg.name + " +" + 1, 1200);

    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  getOfflineBonuses: function () {
    this.ensure();

    return {
      goldMult: 1 + this.getLevel("goldMine") * 0.12,
      essenceFlat: this.getLevel("essenceWell"),
      efficiencyBonus: this.getLevel("barracks") * 0.04,
      extraHours: this.getLevel("timeRelay") * 0.5
    };
  }
};

var WorldManager = {
  worldIndex: 0,
  adventureIndex: 0,
  enemyIndex: 0,

  getWorld: function () {
    return WORLDS[this.worldIndex] || WORLDS[0];
  },

  getAdventure: function () {
    var world = this.getWorld();
    if (!world || !world.adventures || !world.adventures.length) return null;
    return world.adventures[this.adventureIndex] || world.adventures[0];
  },

  generateEnemy: function () {
    var adventure = this.getAdventure();
    if (!adventure) {
      return {
        id: "fallback",
        name: "Ennemi",
        asset: "slime",
        isBoss: false,
        hp: 10,
        maxHp: 10,
        goldReward: 1,
        essenceReward: 0,
        resists: [],
        weak: []
      };
    }

    var isBoss = this.enemyIndex >= Math.max(0, (adventure.enemyCount || 1) - 1);
    var enemyId;

    if (isBoss) {
      enemyId = adventure.boss;
      var bossData = BOSS_DB[enemyId] || { name: "Boss", asset: "slimeking" };
      var bossScale = 1 + this.worldIndex * 0.90 + this.adventureIndex * 0.30 + (game.cycleCount || 0) * 0.35;
      var bossHp = Math.floor(120 * bossScale + (game.totalKills || 0) * 2);

      return {
        id: enemyId,
        name: bossData.name,
        asset: bossData.asset,
        isBoss: true,
        hp: bossHp,
        maxHp: bossHp,
        goldReward: Math.floor(40 * bossScale),
        essenceReward: 3 + this.worldIndex,
        resists: bossData.resists || [],
        weak: bossData.weak || []
      };
    }

    enemyId = adventure.enemyPool[randInt(0, adventure.enemyPool.length - 1)];
    var enemyData = ENEMY_DB[enemyId] || { name: "Ennemi", asset: "slime" };
    var scale = 1 + this.worldIndex * 0.60 + this.adventureIndex * 0.22 + (game.cycleCount || 0) * 0.2 + this.enemyIndex * 0.05;
    var hp = Math.floor(22 * scale + this.enemyIndex * 5);

    if (game.talents.t_sturdy) {
      hp = Math.floor(hp * 1.2);
    }

    return {
      id: enemyId,
      name: enemyData.name,
      asset: enemyData.asset,
      isBoss: false,
      hp: hp,
      maxHp: hp,
      goldReward: Math.floor(6 * scale + this.worldIndex * 3),
      essenceReward: 1,
      resists: enemyData.resists || [],
      weak: enemyData.weak || []
    };
  },

  advance: function () {
    var world = this.getWorld();
    var adventure = this.getAdventure();
    if (!world || !adventure) return { type: "none" };

    this.enemyIndex += 1;

    if (this.enemyIndex < (adventure.enemyCount || 1)) {
      return { type: "enemy" };
    }

    this.enemyIndex = 0;
    this.adventureIndex += 1;

    if (window.QuestManager && typeof QuestManager.trackWorldCompletion === "function") {
      QuestManager.trackWorldCompletion(world.id);
    }

    if (this.adventureIndex < world.adventures.length) {
      return {
        type: "adventure",
        world: world,
        adventure: world.adventures[this.adventureIndex]
      };
    }

    this.adventureIndex = 0;
    this.worldIndex += 1;

    if (this.worldIndex < WORLDS.length) {
      return {
        type: "world",
        world: WORLDS[this.worldIndex]
      };
    }

    this.worldIndex = 0;
    game.cycleCount = (game.cycleCount || 0) + 1;
    return { type: "cycle" };
  },

  applyWorldTheme: function () {
    var root = document.documentElement;
    var world = this.getWorld();
    if (!root || !world) return;

    root.style.setProperty("--world-bg", world.bg || "#111");

    if (world.combatMap) {
      root.style.setProperty("--world-combat-map", 'url("' + world.combatMap + '")');
    } else {
      root.style.setProperty("--world-combat-map", "none");
    }
  }
};

function cloneItem(template, slot) {
  return {
    uid: "itm_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
    slot: slot,
    name: template.name,
    icon: template.icon,
    rarity: template.rarity,
    stat: template.stat,
    value: template.value
  };
}

var EquipmentManager = {
  recalcStats: function () {
    game.tapDamage = 1;
    game.tapMult = 1;
    game.autoDps = 0;
    game.critChance = 5;
    game.critMult = 2;
    game.goldMult = 1;

    (UPGRADES || []).forEach(function (u) {
      if (typeof u.apply === "function") {
        u.apply(game.upgrades[u.id] || 0);
      }
    });

    var equipped = game.equipped || {};
    [equipped.weapon, equipped.armor, equipped.amulet].forEach(function (item) {
      if (!item) return;

      if (item.stat === "tapDmg") game.tapDamage += item.value;
      else if (item.stat === "tapMult") game.tapMult += item.value;
      else if (item.stat === "goldMult") game.goldMult += item.value;
      else if (item.stat === "critChance") game.critChance += item.value;
      else if (item.stat === "critMult") game.critMult += item.value;
      else if (item.stat === "autoDps") game.autoDps += item.value;
    });

    var setBonus = this.getSetBonus();
    if (setBonus && setBonus.config && typeof setBonus.config.apply === "function") {
      var bonus = setBonus.config.apply() || {};
      if (bonus.tapMult) game.tapMult += bonus.tapMult;
      if (bonus.goldMult) game.goldMult += bonus.goldMult;
      if (bonus.critChance) game.critChance += bonus.critChance;
      if (bonus.critMult) game.critMult += bonus.critMult;
      if (bonus.autoDps) game.autoDps += bonus.autoDps;
      if (bonus.tapDamage) game.tapDamage += bonus.tapDamage;
    }

    if (game.talents.t_power_training) game.tapDamage += 5;
    if (game.talents.t_sharpened_blades) game.tapMult += 0.10;
    if (game.talents.t_precision) game.critChance += 5;
    if (game.talents.t_crit_master) game.critChance += 10;
    if (game.talents.t_berserker) game.tapMult += 0.50;
    if (game.talents.t_gilded_pouch) game.goldMult += 0.25;
    if (game.talents.t_gold_rush) game.goldMult += 0.15;
    if (game.talents.t_boss_jackpot) game.goldMult += 0.30;

    if (game.ascensionCount > 0) {
      game.tapMult += game.ascensionCount * 0.15;
      game.goldMult += game.ascensionCount * 0.12;
    }

    if (game.talents.t_cycle_master) {
      game.tapMult += Math.min((game.cycleCount || 0) * 0.10, 0.30);
      game.goldMult += Math.min((game.cycleCount || 0) * 0.10, 0.30);
    }

    var aether = getAetherBonuses();
    game.tapMult += aether.tapBonus || 0;
    game.goldMult *= 1 + (aether.goldBonus || 0);
  },

  effectiveTapDamage: function () {
    return Math.max(1, Math.floor(game.tapDamage * game.tapMult));
  },

  effectiveAutoDps: function () {
    return Math.max(0, game.autoDps);
  },

  effectiveCritChance: function () {
    return Math.max(0, game.critChance);
  },

  effectiveCritMult: function () {
    return Math.max(1, game.critMult);
  },

  effectiveGoldMult: function () {
    return Math.max(1, game.goldMult);
  },

  getSetBonus: function () {
    var items = [
      game.equipped.weapon,
      game.equipped.armor,
      game.equipped.amulet
    ].filter(Boolean);

    if (items.length < (SET_BONUS_CONFIG.sameRarityCount || 3)) {
      return { rarity: null, config: null };
    }

    var rarity = items[0].rarity;
    var same = items.every(function (item) {
      return item.rarity === rarity;
    });

    if (!same) {
      return { rarity: null, config: null };
    }

    return {
      rarity: rarity,
      config: (SET_BONUS_CONFIG.bonuses && SET_BONUS_CONFIG.bonuses[rarity]) || null
    };
  },

  rollDrop: function () {
    var slot = ["weapon", "armor", "amulet"][randInt(0, 2)];
    var pool = EQUIPMENT_DB[slot] || [];
    if (!pool.length) return null;

    var roll = Math.random() * 100;
    var rarity;

    if (roll < (RARITY_DROP_RATES.common || 0)) {
      rarity = "common";
    } else if (roll < (RARITY_DROP_RATES.common || 0) + (RARITY_DROP_RATES.rare || 0)) {
      rarity = "rare";
    } else if (roll < (RARITY_DROP_RATES.common || 0) + (RARITY_DROP_RATES.rare || 0) + (RARITY_DROP_RATES.epic || 0)) {
      rarity = "epic";
    } else {
      rarity = "legendary";
    }

    if (game.talents.t_lucky_find && rarity === "common" && chance(20)) {
      rarity = "rare";
    }

    var candidates = pool.filter(function (item) {
      return item.rarity === rarity;
    });

    if (!candidates.length) {
      candidates = pool;
    }

    return cloneItem(candidates[randInt(0, candidates.length - 1)], slot);
  },

  equip: function (uid) {
    var index = (game.inventory || []).findIndex(function (item) {
      return item.uid === uid;
    });

    if (index === -1) return;

    var item = game.inventory[index];
    var previous = game.equipped[item.slot];

    if (previous) {
      game.inventory.push(previous);
    }

    game.equipped[item.slot] = item;
    game.inventory.splice(index, 1);

    this.recalcStats();
    addLog("Équipé : " + item.name, "event");

    if (typeof renderAll === "function") {
      renderAll();
    }

    saveGame();
  },

  unequip: function (slot) {
    var item = game.equipped[slot];
    if (!item) return;

    game.inventory.push(item);
    game.equipped[slot] = null;

    this.recalcStats();
    addLog("Retiré : " + item.name, "event");

    if (typeof renderAll === "function") {
      renderAll();
    }

    saveGame();
  },

  sell: function (uid) {
    var index = (game.inventory || []).findIndex(function (item) {
      return item.uid === uid;
    });

    if (index === -1) return;

    var item = game.inventory[index];
    var value =
      item.rarity === "legendary" ? 1000 :
      item.rarity === "epic" ? 200 :
      item.rarity === "rare" ? 50 : 10;

    game.inventory.splice(index, 1);
    game.gold += value;
    game.totalGoldEarned += value;

    addLog("Objet vendu : " + item.name + " (+" + value + " or)", "event");

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldEarned", value);
    }

    if (typeof renderAll === "function") {
      renderAll();
    }

    saveGame();
  }
};

var QuestManager = {
  generateDaily: function () {
    var templates = Array.isArray(QUEST_TEMPLATES) ? QUEST_TEMPLATES.slice() : [];
    var picked = [];
    var maxCount = (QUEST_CONFIG && QUEST_CONFIG.count) || 3;

    while (templates.length && picked.length < maxCount) {
      var idx = randInt(0, templates.length - 1);
      var t = templates.splice(idx, 1)[0];

      picked.push({
        id: t.id,
        icon: t.icon || "📜",
        name: t.name || "Quête",
        desc: String(t.desc || "").replace("{target}", t.target),
        target: Number(t.target || 0),
        rewardGold: Number(t.rewardGold || 0),
        rewardEssence: Number(t.rewardEssence || 0),
        claimed: false
      });
    }

    return picked;
  },

  getTemplate: function (id) {
    return (QUEST_TEMPLATES || []).find(function (q) {
      return q.id === id;
    }) || null;
  },

  getProgress: function (quest) {
    var tpl = this.getTemplate(quest.id);
    if (!tpl) return 0;
    if (typeof tpl.tracker === "function") {
      return Math.floor(Number(tpl.tracker()) || 0);
    }
    return 0;
  },

  isComplete: function (quest) {
    return this.getProgress(quest) >= Number(quest.target || 0);
  },

  claim: function (id) {
    var quest = (game.quests || []).find(function (q) { return q.id === id; });
    if (!quest || quest.claimed || !this.isComplete(quest)) return;

    quest.claimed = true;
    game.gold += Number(quest.rewardGold || 0);
    game.essence += Number(quest.rewardEssence || 0);
    game.totalGoldEarned += Number(quest.rewardGold || 0);

    addLog("Quête accomplie : " + quest.name, "event");
    showToast("Quête réclamée", 1400);

    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  track: function (key, amount) {
    if (!game.questProgress) game.questProgress = {};
    if (typeof game.questProgress[key] !== "number") game.questProgress[key] = 0;
    game.questProgress[key] += Number(amount || 0);
  },

  trackWorldCompletion: function (worldId) {
    if (worldId === "forest") this.track("forestChaptersDone", 1);
    if (worldId === "ruins") this.track("ruinsChaptersDone", 1);
  },

  checkReset: function () {
    if (!game.questResetTime || Date.now() >= game.questResetTime) {
      game.quests = this.generateDaily();
      game.questProgress = Object.assign({}, DEFAULT_QUEST_PROGRESS);
      game.questResetTime = Date.now() + (((QUEST_CONFIG && QUEST_CONFIG.resetHours) || 24) * 3600 * 1000);
      if (typeof updateQuestBadge === "function") updateQuestBadge();
      if (typeof renderAll === "function") renderAll();
    }
  },

  timeUntilReset: function () {
    var diff = Math.max(0, (game.questResetTime || 0) - Date.now());
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    return h + "h " + m + "m";
  }
};

var AscensionManager = {
  previewGain: function () {
    var gain = typeof ASCENSION_CONFIG.computeGain === "function"
      ? ASCENSION_CONFIG.computeGain()
      : 0;

    if (game.talents.t_aether_broker) {
      gain = Math.floor(gain * 1.1);
    }

    return Math.max(0, gain);
  },

  canAscend: function () {
    return (
      WorldManager.worldIndex >= (ASCENSION_CONFIG.minWorldToAscend || 1) &&
      this.previewGain() > 0
    );
  },

  doAscend: function () {
    if (!this.canAscend()) {
      showToast("Ascension indisponible", 1200);
      return;
    }

    if (typeof ascendNow === "function") {
      ascendNow();
    }
  }
};

var OfflineManager = {
  calculate: function () {
    if (!game.lastOnline) return null;

    if (!window.VillageManager || typeof VillageManager.getOfflineBonuses !== "function") {
      return null;
    }

    VillageManager.ensure();

    var elapsedMs = Date.now() - game.lastOnline;
    if (elapsedMs <= 1000) return null;

    var bonuses = VillageManager.getOfflineBonuses();
    var baseCapHours = 2;
    var maxHours = baseCapHours + Number(bonuses.extraHours || 0);
    var cappedMs = Math.min(elapsedMs, maxHours * 3600 * 1000);
    var seconds = cappedMs / 1000;

    var baseGoldPerSec = 1;
    var gold = Math.floor(
      baseGoldPerSec *
      seconds *
      (1 + Number(bonuses.efficiencyBonus || 0)) *
      Number(bonuses.goldMult || 1)
    );

    var essence = Math.floor(
      seconds / 3600 * Number(bonuses.essenceFlat || 0)
    );

    if (gold <= 0 && essence <= 0) return null;

    return {
      ms: cappedMs,
      gold: Math.max(0, gold),
      essence: Math.max(0, essence)
    };
  },

  show: function (offline) {
    if (!offline) return;

    game.gold += Number(offline.gold || 0);
    game.essence += Number(offline.essence || 0);
    game.totalGoldEarned += Number(offline.gold || 0);

    addLog(
      "Gain hors-ligne : +" +
      formatNumber(offline.gold || 0) +
      " or, +" +
      formatNumber(offline.essence || 0) +
      " essence",
      "event"
    );

    showToast("Hors-ligne : +" + formatNumber(offline.gold || 0) + " or", 1800);

    if (typeof renderAll === "function") {
      renderAll();
    }
  }
};

window.WorldManager = WorldManager;
window.EquipmentManager = EquipmentManager;
window.QuestManager = QuestManager;
window.AscensionManager = AscensionManager;
window.OfflineManager = OfflineManager;
window.VillageManager = VillageManager;
window.VILLAGE_CONFIG = VILLAGE_CONFIG;
window.doAscend = function () {
  AscensionManager.doAscend();
};