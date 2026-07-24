"use strict";
/* ============================================================
   Quest Idle — game-state.js (version refaite)
   Etat global mutable + helpers derives
   A charger apres data.js, avant managers.js / ui.js / save.js / main.js
============================================================ */

var DEFAULT_QUEST_PROGRESS = {
  kills: 0,
  treasures: 0,
  bossKills: 0,
  goldEarned: 0,
  goldSpent: 0,
  crits: 0,
  swordKills: 0,
  bowKills: 0,
  magicKills: 0,
  combatTime: 0,
  forestChaptersDone: 0,
  ruinsChaptersDone: 0
};

var game = {
  gold: 0,
  essence: 0,
  aether: 0,

  tapDamage: 1,
  tapMult: 1,
  autoDps: 0,
  critChance: 5,
  critMult: 2,
  goldMult: 1,

  heroLevel: 1,
  heroXp: 0,
  heroXpToNext: 10,
  talentPoints: 0,

  totalKills: 0,
  killCounts: {},
  upgrades: {},
  talents: {},
  enemy: null,
  activeTab: "combat",
  totalGoldEarned: 0,
  totalDamageDealt: 0,
  playTime: 0,
  cycleCount: 0,
  ascensionCount: 0,

  inventory: [],
  equipped: {
    weapon: null,
    armor: null,
    amulet: null
  },

  aetherUpgrades: {},
  quests: [],
  questProgress: Object.assign({}, DEFAULT_QUEST_PROGRESS),
  questResetTime: 0,

  saveSupported: false,
  lastSave: 0,
  lastOnline: 0,

  village: {
    goldMine: 0,
    essenceWell: 0,
    barracks: 0,
    timeRelay: 0
  }
};

function ensureGameStateDefaults() {
  if (!game.killCounts) game.killCounts = {};
  if (!game.upgrades) game.upgrades = {};
  if (!game.talents) game.talents = {};
  if (!game.inventory) game.inventory = [];
  if (!game.equipped || typeof game.equipped !== "object") {
    game.equipped = { weapon: null, armor: null, amulet: null };
  }

  if (!game.aetherUpgrades) game.aetherUpgrades = {};
  if (!game.quests) game.quests = [];
  if (!game.questProgress || typeof game.questProgress !== "object") {
    game.questProgress = {};
  }

  Object.keys(DEFAULT_QUEST_PROGRESS).forEach(function (key) {
    if (typeof game.questProgress[key] !== "number") {
      game.questProgress[key] = DEFAULT_QUEST_PROGRESS[key];
    }
  });

  if (typeof UPGRADES !== "undefined" && Array.isArray(UPGRADES)) {
    UPGRADES.forEach(function (u) {
      if (game.upgrades[u.id] === undefined) game.upgrades[u.id] = 0;
    });
  }

  if (typeof AETHER_SHOP !== "undefined" && Array.isArray(AETHER_SHOP)) {
    AETHER_SHOP.forEach(function (u) {
      if (game.aetherUpgrades[u.id] === undefined) game.aetherUpgrades[u.id] = 0;
    });
  }

  if (!game.village || typeof game.village !== "object") {
    game.village = {};
  }

  if (typeof game.village.goldMine !== "number") game.village.goldMine = 0;
  if (typeof game.village.essenceWell !== "number") game.village.essenceWell = 0;
  if (typeof game.village.barracks !== "number") game.village.barracks = 0;
  if (typeof game.village.timeRelay !== "number") game.village.timeRelay = 0;

  if (typeof game.heroLevel !== "number") game.heroLevel = 1;
  if (typeof game.heroXp !== "number") game.heroXp = 0;
  if (typeof game.heroXpToNext !== "number" || !isFinite(game.heroXpToNext) || game.heroXpToNext <= 0) {
    game.heroXpToNext = 10;
  }
  if (typeof game.talentPoints !== "number") game.talentPoints = 0;
}
ensureGameStateDefaults();

function getAetherBonuses() {
  ensureGameStateDefaults();

  var tapLevel = game.aetherUpgrades.a_tap || 0;
  var goldLevel = game.aetherUpgrades.a_gold || 0;
  var lootLevel = game.aetherUpgrades.a_loot || 0;
  var essenceLevel = game.aetherUpgrades.a_essence || 0;

  return {
    tapBonus: tapLevel * 0.10,
    goldBonus: goldLevel * 0.10,
    lootBonus: lootLevel * 3,
    essenceBonus: Math.floor(essenceLevel / 2)
  };
}

function getAetherMult() {
  var bonuses = getAetherBonuses();
  return 1 + bonuses.tapBonus + bonuses.goldBonus;
}

function getAetherBonuses() {
  ensureGameStateDefaults();

  var tapLevel = game.aetherUpgrades.a_tap || 0;
  var goldLevel = game.aetherUpgrades.a_gold || 0;
  var lootLevel = game.aetherUpgrades.a_loot || 0;
  var essenceLevel = game.aetherUpgrades.a_essence || 0;

  return {
    tapBonus: tapLevel * 0.10,
    goldBonus: goldLevel * 0.10,
    lootBonus: lootLevel * 3,
    essenceBonus: Math.floor(essenceLevel / 2)
  };
}

function getAetherMult() {
  var bonuses = getAetherBonuses();
  return 1 + bonuses.tapBonus + bonuses.goldBonus;
}

ensureGameStateDefaults();

window.DEFAULT_QUEST_PROGRESS = DEFAULT_QUEST_PROGRESS;
window.game = game;
window.ensureGameStateDefaults = ensureGameStateDefaults;
window.getAetherBonuses = getAetherBonuses;
window.getAetherMult = getAetherMult;