"use strict";
/* ============================================================
Quest Idle — systems/progression-system.js
World progression, quests, upgrades, talents, XP and ascension
============================================================ */

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
      return { id: "fallback", name: "Ennemi", asset: "slime", isBoss: false, hp: 10, maxHp: 10, goldReward: 1, essenceReward: 0, resists: [], weak: [] };
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

    if (game.talents.t_sturdy) hp = Math.floor(hp * 1.2);

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
    if (this.enemyIndex < (adventure.enemyCount || 1)) return { type: "enemy" };

    this.enemyIndex = 0;
    this.adventureIndex += 1;

    if (window.QuestManager && typeof QuestManager.trackWorldCompletion === "function") {
      QuestManager.trackWorldCompletion(world.id);
    }

    if (this.adventureIndex < world.adventures.length) {
      return { type: "adventure", world: world, adventure: world.adventures[this.adventureIndex] };
    }

    this.adventureIndex = 0;
    this.worldIndex += 1;

    if (this.worldIndex < WORLDS.length) {
      return { type: "world", world: WORLDS[this.worldIndex] };
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
    if (world.combatMap) root.style.setProperty("--world-combat-map", 'url("' + world.combatMap + '")');
    else root.style.setProperty("--world-combat-map", "none");
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
    return (QUEST_TEMPLATES || []).find(function (q) { return q.id === id; }) || null;
  },

  getProgress: function (quest) {
    var tpl = this.getTemplate(quest.id);
    if (!tpl) return 0;
    if (typeof tpl.tracker === "function") return Math.floor(Number(tpl.tracker()) || 0);
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

function getAllTalentNodes() {
  if (typeof TALENTTREE !== "undefined") return TALENTTREE;
  if (typeof TALENT_TREE !== "undefined") return TALENT_TREE;
  return {};
}

function getUpgradeCost(upgrade, atLevel) {
  if (!upgrade) return Infinity;
  var level = (atLevel === undefined || atLevel === null)
    ? (game.upgrades[upgrade.id] || 0)
    : Number(atLevel || 0);

  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, level));
}



function buyUpgrade(id, amount) {
  var upgrade = (UPGRADES || []).find(function (u) { return u.id === id; });
  if (!upgrade) return showToast("Amélioration introuvable", 1000);

  if ((WorldManager.worldIndex || 0) < (upgrade.unlockWorld || 0)) {
    return showToast("Monde requis non débloqué", 1200);
  }

  amount = Number(amount || 1);
  var buyMax = amount === -1;
  var limit = buyMax ? Infinity : Math.max(1, amount);

  var bought = 0;
  var totalSpent = 0;

  while (bought < limit) {
    var level = game.upgrades[id] || 0;
    if (level >= (upgrade.maxLevel || Infinity)) break;

    var cost = getUpgradeCost(upgrade, level);
    if (game.gold < cost) break;

    game.gold -= cost;
    totalSpent += cost;
    game.upgrades[id] = level + 1;
    bought += 1;
  }

  if (bought <= 0) {
    var currentLevel = game.upgrades[id] || 0;
    if (currentLevel >= (upgrade.maxLevel || Infinity)) {
      return showToast("Niveau maximum", 1200);
    }
    return showToast("Pas assez d'or", 1000);
  }

  if (window.QuestManager && typeof QuestManager.track === "function") {
    QuestManager.track("goldSpent", totalSpent);
  }

  if (typeof upgrade.apply === "function") {
    upgrade.apply(game.upgrades[id]);
  }

  if (window.StatsSystem) StatsSystem.recalcStats();

  addLog(
    "Amélioration achetée : " + upgrade.name + " +" + bought + " (niv. " + game.upgrades[id] + ")",
    "event"
  );
  showToast(upgrade.name + " +" + bought, 1200);

  if (typeof renderAll === "function") renderAll();
  saveGame();
}

function getUpgradePurchasePreview(upgrade, amount) {
  if (!upgrade) {
    return {
      count: 0,
      totalCost: 0,
      currentLevel: 0,
      nextLevel: 0,
      reachedMax: false
    };
  }

  amount = Number(amount || 1);
  var buyMax = amount === -1;
  var limit = buyMax ? Infinity : Math.max(1, amount);

  var currentLevel = game.upgrades[upgrade.id] || 0;
  var maxLevel = upgrade.maxLevel || Infinity;
  var simLevel = currentLevel;
  var goldLeft = Number(game.gold || 0);

  var count = 0;
  var totalCost = 0;

  while (count < limit && simLevel < maxLevel) {
    var stepCost = getUpgradeCost(upgrade, simLevel);
    if (goldLeft < stepCost) break;

    goldLeft -= stepCost;
    totalCost += stepCost;
    simLevel += 1;
    count += 1;
  }

  return {
    count: count,
    totalCost: totalCost,
    currentLevel: currentLevel,
    nextLevel: simLevel,
    reachedMax: simLevel >= maxLevel
  };
}

function setShopBuyAmount(amount) {
  amount = Number(amount || 1);

  if (![1, 10, 25, -1].includes(amount)) {
    amount = 1;
  }

  game.shopBuyAmount = amount;

  if (typeof renderAll === "function") renderAll();
  saveGame();
}

function setShopBuyAmount(amount) {
  amount = Number(amount || 1);

  if (![1, 10, 25, -1].includes(amount)) {
    amount = 1;
  }

  game.shopBuyAmount = amount;

  if (typeof renderAll === "function") renderAll();
  saveGame();
}

function buyTalentNode(id) {
  var tree = getAllTalentNodes();
  var node = null;

  Object.keys(tree).forEach(function (branch) {
    (tree[branch] || []).forEach(function (entry) {
      if (entry.id === id) node = entry;
    });
  });

  if (!node) return showToast("Talent introuvable", 1000);
  if (game.talents[id]) return showToast("Talent déjà appris", 1000);
  if (node.requires && !game.talents[node.requires]) return showToast("Talent précédent requis", 1200);
  if ((game.talentPoints || 0) < 1) return showToast("Pas assez de points de talent", 1200);

  game.talentPoints -= 1;
  game.talents[id] = true;

  if (window.StatsSystem) StatsSystem.recalcStats();
  if (typeof syncAutoTapLoop === "function") syncAutoTapLoop();

  addLog("Talent débloqué : " + (node.name || id), "event");
  showToast((node.name || id) + " débloqué", 1500);
  vibrate([40, 20, 40]);
  if (typeof renderAll === "function") renderAll();
  saveGame();
}

function buyAetherUpgrade(id) {
  var upgrade = (AETHER_SHOP || []).find(function (u) { return u.id === id; });
  if (!upgrade) return showToast("Amélioration astrale introuvable", 1000);

  var currentLevel = game.aetherUpgrades[id] || 0;
  if (currentLevel >= (upgrade.maxLevel || Infinity)) return showToast("Niveau maximum", 1200);

  var cost = typeof getAetherUpgradeCost === "function"
    ? getAetherUpgradeCost(upgrade)
    : Math.floor(upgrade.baseCost * Math.pow(1.4, currentLevel));

  if (game.aether < cost) return showToast("Pas assez d'Aether", 1000);

  game.aether -= cost;
  game.aetherUpgrades[id] = currentLevel + 1;

  if (window.StatsSystem) StatsSystem.recalcStats();
  addLog("Amélioration astrale : " + upgrade.name + " niv. " + game.aetherUpgrades[id], "event");
  showToast(upgrade.name, 1500);
  if (typeof renderAll === "function") renderAll();
  saveGame();
}

function getHeroXpRequiredForLevel(level) {
  level = Math.max(1, Number(level || 1));
  return Math.floor(10 * Math.pow(1.25, level - 1) + (level - 1) * 5);
}

function grantHeroXp(amount, source) {
  amount = Math.max(0, Number(amount || 0));
  source = source || "generic";
  if (amount <= 0) return 0;

  var levelsGained = 0;
  var previousLevel = game.heroLevel || 1;

  game.heroXp = Number(game.heroXp || 0);
  game.heroLevel = Number(game.heroLevel || 1);
  game.heroXpToNext = Number(game.heroXpToNext || getHeroXpRequiredForLevel(game.heroLevel));
  game.talentPoints = Number(game.talentPoints || 0);

  game.heroXp += amount;

  while (game.heroXp >= game.heroXpToNext) {
    game.heroXp -= game.heroXpToNext;
    game.heroLevel += 1;
    game.talentPoints += 1;
    levelsGained += 1;
    game.heroXpToNext = getHeroXpRequiredForLevel(game.heroLevel);

    addLog("Niveau du héros : " + game.heroLevel + " (+1 point de talent)", "event");
    showToast("Niveau " + game.heroLevel + " ! +1 point de talent", 1800);
    vibrate([30, 20, 30]);
  }

  if (levelsGained === 0) {
    addLog("+" + Math.floor(amount) + " XP héros", "event");
  } else {
    addLog(
      "+" + Math.floor(amount) + " XP héros (" + previousLevel + " → " + game.heroLevel + ")",
      "event"
    );
  }

  if (typeof renderHud === "function") renderHud();
  if (typeof renderStats === "function") renderStats();
  if (typeof renderAll === "function") renderAll();

  return levelsGained;
}

function ensureDailyQuests() {
  if (!window.QuestManager || typeof QuestManager.generateDaily !== "function") return;

  if (!game.quests || game.quests.length === 0) {
    game.quests = QuestManager.generateDaily();
    var hours = (typeof QUEST_CONFIG !== "undefined" && QUEST_CONFIG.resetHours) ? QUEST_CONFIG.resetHours : 24;
    game.questResetTime = Date.now() + hours * 3600 * 1000;
  }

  if (!game.questProgress || typeof game.questProgress !== "object") {
    if (typeof DEFAULT_QUEST_PROGRESS !== "undefined" && DEFAULT_QUEST_PROGRESS) {
      game.questProgress = Object.assign({}, DEFAULT_QUEST_PROGRESS);
    } else {
      game.questProgress = {};
    }
  }

  if (typeof updateQuestBadge === "function") updateQuestBadge();
}

var AscensionManager = {
  previewGain: function () {
    var gain = typeof ASCENSION_CONFIG.computeGain === "function" ? ASCENSION_CONFIG.computeGain() : 0;
    if (game.talents.t_aether_broker) gain = Math.floor(gain * 1.1);
    return Math.max(0, gain);
  },

  canAscend: function () {
    return WorldManager.worldIndex >= (ASCENSION_CONFIG.minWorldToAscend || 1) && this.previewGain() > 0;
  },

  doAscend: function () {
    if (!this.canAscend()) {
      showToast("Ascension indisponible", 1200);
      return;
    }
    if (typeof ascendNow === "function") ascendNow();
  }
};

function ascendNow() {
  if (typeof ASCENSION_CONFIG === "undefined") return;
  if ((WorldManager.worldIndex || 0) < (ASCENSION_CONFIG.minWorldToAscend || 0)) {
    showToast("Ascension non disponible", 1200);
    return;
  }

  var gain = typeof ASCENSION_CONFIG.computeGain === "function" ? ASCENSION_CONFIG.computeGain() : 0;
  if (game.talents.t_aether_broker) gain = Math.floor(gain * 1.1);
  if (gain <= 0) return showToast("Gain d'Aether insuffisant", 1200);

  var doAscend = function () {
    game.aether = Number(game.aether || 0) + gain;
    game.ascensionCount = Number(game.ascensionCount || 0) + 1;

    addLog("Ascension accomplie : +" + gain + " Aether", "event");

    if (typeof hardResetState === "function") {
      hardResetState();
    }

    if (typeof ensureDailyQuests === "function") ensureDailyQuests();
    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") CombatEngine.spawnEnemy();
    if (typeof switchTab === "function") switchTab("combat");
    if (typeof renderAll === "function") renderAll();
    if (typeof updateQuestBadge === "function") updateQuestBadge();
    if (typeof saveGame === "function") saveGame();
    if (typeof showToast === "function") showToast("Ascension +" + gain + " Aether", 1800);
  };

  if (typeof showConfirmModal === "function") {
    showConfirmModal(
      "Ascension",
      "Tu vas recommencer ta progression, mais garder ton Aether, tes ascensions et tes améliorations d'Aether.\n\nGain prévu : +" + gain + " Aether.",
      "🌀",
      doAscend
    );
  } else if (window.confirm("Ascensionner et gagner +" + gain + " Aether ?")) {
    doAscend();
  }
}

window.WorldManager = WorldManager;
window.QuestManager = QuestManager;
window.AscensionManager = AscensionManager;
window.getUpgradeCost = getUpgradeCost;
window.getAllTalentNodes = getAllTalentNodes;
window.buyUpgrade = buyUpgrade;
window.buyTalentNode = buyTalentNode;
window.buyAetherUpgrade = buyAetherUpgrade;
window.grantHeroXp = grantHeroXp;
window.ensureDailyQuests = ensureDailyQuests;
window.ascendNow = ascendNow;
window.setShopBuyAmount = setShopBuyAmount;
window.getUpgradePurchasePreview = getUpgradePurchasePreview;
window.doAscend = function () { AscensionManager.doAscend(); };

