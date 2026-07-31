"use strict";
/* ============================================================
Quest Idle — systems/save-system.js
Save, load, reset, autosave, migrations
============================================================ */

var SAVE_KEY = "quest_idle_save_v6";
var SAVE_VERSION = 6;
var AUTO_SAVE_INTERVAL_MS = 30000;
var saveIntervalId = null;

function getDefaultQuestProgress() {
  if (typeof DEFAULT_QUEST_PROGRESS !== "undefined" && DEFAULT_QUEST_PROGRESS) {
    return Object.assign({}, DEFAULT_QUEST_PROGRESS);
  }
  return {
    kills: 0,
    treasures: 0,
    bossKills: 0,
    goldEarned: 0,
    goldSpent: 0,
    crits: 0,
    combatTime: 0,
    forestChaptersDone: 0,
    ruinsChaptersDone: 0
  };
}

function getDefaultEquipped() {
  return { weapon: null, armor: null, amulet: null };
}

function normalizeProgressMap(obj, fallback) {
  var out = {};
  var src = obj || {};

  Object.keys(fallback).forEach(function (key) {
    out[key] = typeof src[key] === "number" ? src[key] : fallback[key];
  });

  Object.keys(src).forEach(function (key) {
    if (typeof out[key] === "undefined" && typeof src[key] === "number") {
      out[key] = src[key];
    }
  });

  return out;
}

function migrateHeroId(heroId) {
  var map = {
    ChaosNight: "chaosKnight",
    ChaosRanger: "chaosRanger",
    ChaosMage: "chaosMage"
  };
  return map[heroId] || heroId || "";
}

function ensureUpgradeDefaults() {
  if (!game.upgrades || typeof game.upgrades !== "object") game.upgrades = {};
  if (!game.aetherUpgrades || typeof game.aetherUpgrades !== "object") game.aetherUpgrades = {};

  var upgradeKeyMap = {
    utap: "utrain_power",
    ucelery: "utrain_celerity",
    ucelerity: "utrain_celerity",
    uprecision: "utrain_precision",
    uwill: "utrain_will",
    uendurance: "utrain_endurance",
    u_crit: "u_crit",
    u_gold: "u_gold",
    u_tap_mult: "u_tap_mult",
    u_crit_mult: "u_crit_mult",
    u_auto_mult: "u_auto_mult",
    u_bounty: "u_bounty"
  };

  Object.keys(upgradeKeyMap).forEach(function(oldKey) {
    var newKey = upgradeKeyMap[oldKey];
    if (game.upgrades[oldKey] != null && game.upgrades[newKey] == null) {
      game.upgrades[newKey] = game.upgrades[oldKey];
    }
  });

  if (typeof UPGRADES !== "undefined" && Array.isArray(UPGRADES)) {
    UPGRADES.forEach(function(u) {
      if (u && u.id != null && game.upgrades[u.id] === undefined) game.upgrades[u.id] = 0;
    });
  }

  if (typeof AETHER_SHOP !== "undefined" && Array.isArray(AETHER_SHOP)) {
    AETHER_SHOP.forEach(function(u) {
      if (u && u.id != null && game.aetherUpgrades[u.id] === undefined) game.aetherUpgrades[u.id] = 0;
    });
  }
}

function initSaveSystem() {
  try {
    localStorage.setItem("__quest_idle_test__", "1");
    localStorage.removeItem("__quest_idle_test__");
    game.saveSupported = true;
  } catch (e) {
    game.saveSupported = false;
  }

  if (saveIntervalId) {
    clearInterval(saveIntervalId);
    saveIntervalId = null;
  }

  saveIntervalId = setInterval(function () {
    saveGame();
  }, AUTO_SAVE_INTERVAL_MS);

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") saveGame();
  });

  window.addEventListener("beforeunload", function () {
    saveGame();
  });
}

function buildSaveData() {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    lastOnline: Date.now(),
    gold: Number(game.gold || 0),
    essence: Number(game.essence || 0),
    aether: Number(game.aether || 0),
    totalAetherEarned: Number(game.totalAetherEarned || 0),
    tapDamage: Number(game.tapDamage || 1),
    tapMult: Number(game.tapMult || 1),
    autoDps: Number(game.autoDps || 0),
    critChance: Number(game.critChance || 5),
    critMult: Number(game.critMult || 2),
    goldMult: Number(game.goldMult || 1),

    trainedStats: game.trainedStats || {
      power: 0,
      endurance: 0,
      celerity: 0,
      precision: 0,
      will: 0
    },

    worldIndex: Number((window.WorldManager && WorldManager.worldIndex) || 0),
    adventureIndex: Number((window.WorldManager && WorldManager.adventureIndex) || 0),
    enemyIndex: Number((window.WorldManager && WorldManager.enemyIndex) || 0),
    totalKills: Number(game.totalKills || 0),
    totalGoldEarned: Number(game.totalGoldEarned || 0),
    totalDamageDealt: Number(game.totalDamageDealt || 0),
    playTime: Number(game.playTime || 0),
    cycleCount: Number(game.cycleCount || 0),
    ascensionCount: Number(game.ascensionCount || 0),
    killCounts: game.killCounts || {},
    upgrades: game.upgrades || {},
    talents: game.talents || {},
    inventory: Array.isArray(game.inventory) ? game.inventory : [],
    equipped: game.equipped || getDefaultEquipped(),
    quests: Array.isArray(game.quests) ? game.quests : [],
    questProgress: game.questProgress || getDefaultQuestProgress(),
    questResetTime: Number(game.questResetTime || 0),
    aetherUpgrades: game.aetherUpgrades || {},
    activeTab: game.activeTab || "combat",
    playerName: game.playerName,
    heroId: game.heroId,
    heroLevel: Number(game.heroLevel || 1),
    heroXp: Number(game.heroXp || 0),
    heroXpToNext: Number(game.heroXpToNext || 10),
    talentPoints: Number(game.talentPoints || 0),
    heroHp: Number(game.heroHp != null ? game.heroHp : (game.heroMaxHp || 10)),
    heroMaxHp: Number(game.heroMaxHp || 10),
    village: game.village || { goldMine: 0, essenceWell: 0, barracks: 0, timeRelay: 0 }
  };
}

function saveGame() {
  if (!game.saveSupported) return false;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(buildSaveData()));
    game.lastSave = Date.now();
    game.lastOnline = game.lastSave;
    return true;
  } catch (e) {
    return false;
  }
}

function restoreBaseState(d) {
  var questDefaults = getDefaultQuestProgress();

  game.gold = Number(d.gold || 0);
  game.essence = Number(d.essence || 0);
  game.aether = Number(d.aether || 0);
  game.totalAetherEarned = Number(d.totalAetherEarned != null ? d.totalAetherEarned : d.aether || 0);

  game.playerName = d.playerName || "";
  game.heroId = migrateHeroId(d.heroId);

  game.tapDamage = 1;
  game.tapMult = 1;
  game.autoDps = 0;
  game.critChance = 5;
  game.critMult = 2;
  game.goldMult = 1;

  game.trainedStats = (d.trainedStats && typeof d.trainedStats === "object") ? d.trainedStats : { power: 0, endurance: 0, celerity: 0, precision: 0, will: 0 };


  game.heroLevel = Number(d.heroLevel || 1);
  game.heroXp = Number(d.heroXp || 0);
  game.heroXpToNext = Number(d.heroXpToNext || 20);
  game.talentPoints = Number(d.talentPoints || 0);
  game.heroMaxHp = Number(d.heroMaxHp || 10);
  game.heroHp = d.heroHp != null ? Number(d.heroHp) : game.heroMaxHp;

  game.totalKills = Number(d.totalKills || 0);
  game.totalGoldEarned = Number(d.totalGoldEarned || 0);
  game.totalDamageDealt = Number(d.totalDamageDealt || 0);
  game.playTime = Number(d.playTime || 0);
  game.cycleCount = Number(d.cycleCount || 0);
  game.ascensionCount = Number(d.ascensionCount || 0);

  game.killCounts = d.killCounts && typeof d.killCounts === "object" ? d.killCounts : {};
  game.upgrades = d.upgrades && typeof d.upgrades === "object" ? d.upgrades : {};
  game.talents = d.talents && typeof d.talents === "object" ? d.talents : {};
  game.aetherUpgrades = d.aetherUpgrades && typeof d.aetherUpgrades === "object" ? d.aetherUpgrades : {};

  game.inventory = Array.isArray(d.inventory) ? d.inventory : [];
  game.equipped = d.equipped && typeof d.equipped === "object" ? d.equipped : getDefaultEquipped();
  if (game.equipped.weapon === undefined) game.equipped.weapon = null;
  if (game.equipped.armor === undefined) game.equipped.armor = null;
  if (game.equipped.amulet === undefined) game.equipped.amulet = null;

  game.quests = Array.isArray(d.quests) ? d.quests : [];
  game.questProgress = normalizeProgressMap(d.questProgress, questDefaults);
  game.questResetTime = Number(d.questResetTime || 0);

  game.activeTab = d.activeTab || "combat";
  game.enemy = null;
  game.lastOnline = Number(d.lastOnline || d.savedAt || 0);

  WorldManager.worldIndex = Math.max(0, Number(d.worldIndex || 0));
  WorldManager.adventureIndex = Math.max(0, Number(d.adventureIndex || 0));
  WorldManager.enemyIndex = Math.max(0, Number(d.enemyIndex || 0));

  game.village = d.village && typeof d.village === "object"
    ? d.village
    : { goldMine: 0, essenceWell: 0, barracks: 0, timeRelay: 0 };

  if (window.VillageManager && typeof VillageManager.ensure === "function") {
    VillageManager.ensure();
  }

  if (typeof game.village.goldMine !== "number") game.village.goldMine = 0;
  if (typeof game.village.essenceWell !== "number") game.village.essenceWell = 0;
  if (typeof game.village.barracks !== "number") game.village.barracks = 0;
  if (typeof game.village.timeRelay !== "number") game.village.timeRelay = 0;

  ensureUpgradeDefaults();
}

function reapplyProgressEffects() {
  game.tapDamage = 1;
  game.tapMult = 1;
  game.autoDps = 0;
  game.critChance = 5;
  game.critMult = 2;
  game.goldMult = 1;

  if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
    StatsSystem.recalcStats();
  }
}

function loadGame() {
  if (!game.saveSupported) return false;

  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    var d = JSON.parse(raw);
    if (!d || typeof d !== "object") return false;

    restoreBaseState(d);
    reapplyProgressEffects();

    if (window.QuestManager && typeof QuestManager.checkReset === "function") {
      QuestManager.checkReset();
    }

    return true;
  } catch (e) {
    return false;
  }
}

function clearSaveData() {
  if (!game.saveSupported) return;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {}
}

function hardResetState() {
  var questDefaults = getDefaultQuestProgress();
  var keptAether = game.aether || 0;
  var keptTotalAetherEarned = game.totalAetherEarned || 0;
  var keptAscensions = game.ascensionCount || 0;
  var keptAetherUpgrades = Object.assign({}, game.aetherUpgrades || {});

  game.gold = 0;
  game.essence = 0;
  game.aether = keptAether;
  game.totalAetherEarned = keptTotalAetherEarned;

  game.tapDamage = 1;
  game.tapMult = 1;
  game.autoDps = 0;
  game.critChance = 5;
  game.critMult = 2;
  game.goldMult = 1;

  game.heroLevel = 1;
  game.heroXp = 0;
  game.heroXpToNext = 20;
  game.talentPoints = 0;
  game.heroHp = 10;
  game.heroMaxHp = 10;

  game.totalKills = 0;
  game.totalGoldEarned = 0;
  game.totalDamageDealt = 0;
  game.playTime = 0;
  game.cycleCount = 0;
  game.ascensionCount = keptAscensions;

  game.killCounts = {};
  game.upgrades = {};
  game.talents = {};
  game.aetherUpgrades = keptAetherUpgrades;
  game.inventory = [];
  game.equipped = getDefaultEquipped();
  game.quests = [];
  game.questProgress = Object.assign({}, questDefaults);
  game.questResetTime = 0;
  game.activeTab = "combat";
  game.enemy = null;
  game.lastOnline = Date.now();
  game.lastSave = 0;
  game.village = { goldMine: 0, essenceWell: 0, barracks: 0, timeRelay: 0 };

  WorldManager.worldIndex = 0;
  WorldManager.adventureIndex = 0;
  WorldManager.enemyIndex = 0;

  if (typeof ensureUpgradeDefaults === "function") ensureUpgradeDefaults();

  if (typeof gameLog !== "undefined" && Array.isArray(gameLog)) gameLog.length = 0;

  if (window.QuestManager && typeof QuestManager.generateDaily === "function") {
    game.quests = QuestManager.generateDaily();
    var resetHours = (typeof QUEST_CONFIG !== "undefined" && QUEST_CONFIG && QUEST_CONFIG.resetHours) ? QUEST_CONFIG.resetHours : 24;
    game.questResetTime = Date.now() + resetHours * 3600 * 1000;
  }

  reapplyProgressEffects();

  if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {StatsSystem.recalcStats();}
  game.heroHp = game.heroMaxHp;

}

function fullResetState() {
  var questDefaults = getDefaultQuestProgress();

  game.gold = 1000000;
  game.essence = 0;
  game.aether = 0;
  game.totalAetherEarned = 0;
  game.playerName = "";
  game.heroId = "";

  game.tapDamage = 1;
  game.tapMult = 1;
  game.autoDps = 0;
  game.critChance = 5;
  game.critMult = 2;
  game.goldMult = 1;

  game.heroLevel = 1;
  game.heroXp = 0;
  game.heroXpToNext = 20;
  game.talentPoints = 0;
  game.heroHp = 10;
  game.heroMaxHp = 10;

  game.totalKills = 0;
  game.totalGoldEarned = 0;
  game.totalDamageDealt = 0;
  game.playTime = 0;
  game.cycleCount = 0;
  game.ascensionCount = 0;

  game.killCounts = {};
  game.upgrades = {};
  game.talents = {};
  game.aetherUpgrades = {};
  game.inventory = [];
  game.equipped = getDefaultEquipped();
  game.quests = [];
  game.questProgress = Object.assign({}, questDefaults);
  game.questResetTime = 0;
  game.activeTab = "combat";
  game.enemy = null;
  game.lastOnline = Date.now();
  game.lastSave = 0;
  game.village = { goldMine: 0, essenceWell: 0, barracks: 0, timeRelay: 0 };

  WorldManager.worldIndex = 0;
  WorldManager.adventureIndex = 0;
  WorldManager.enemyIndex = 0;

  if (typeof ensureUpgradeDefaults === "function") ensureUpgradeDefaults();

  if (typeof gameLog !== "undefined" && Array.isArray(gameLog)) gameLog.length = 0;

  if (window.QuestManager && typeof QuestManager.generateDaily === "function") {
    game.quests = QuestManager.generateDaily();
    var resetHours = (typeof QUEST_CONFIG !== "undefined" && QUEST_CONFIG && QUEST_CONFIG.resetHours) ? QUEST_CONFIG.resetHours : 24;
    game.questResetTime = Date.now() + resetHours * 3600 * 1000;
  }

  reapplyProgressEffects();

  if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {StatsSystem.recalcStats();}
  game.heroHp = game.heroMaxHp;
}

function resetGame() {
  var doReset = function () {
    clearSaveData();
    fullResetState();

    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
      CombatEngine.spawnEnemy();
    }

    if (typeof renderAll === "function") renderAll();
    if (typeof updateQuestBadge === "function") updateQuestBadge();

    saveGame();
    if (typeof showToast === "function") showToast("Partie réinitialisée", 1200);
  };

  if (typeof showConfirmModal === "function") {
    showConfirmModal(
      "Réinitialiser TOUT ?",
      "Cette action efface toute la progression, y compris l'Aether et les ascensions. Cette action est irréversible.",
      "⚠️",
      doReset
    );
  } else if (window.confirm("Réinitialiser toute la progression ?")) {
    doReset();
  }
}

window.initSaveSystem = initSaveSystem;
window.saveGame = saveGame;
window.loadGame = loadGame;
window.resetGame = resetGame;
window.clearSaveData = clearSaveData;
window.hardResetState = hardResetState;
window.fullResetState = fullResetState;
window.buildSaveData = buildSaveData;
window.ensureUpgradeDefaults = ensureUpgradeDefaults;
window.migrateHeroId = migrateHeroId;
