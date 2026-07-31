"use strict";

function createDefaultEquipped() {
  return {
    weapon: null,
    armor: null,
    amulet: null
  };
}

function createDefaultVillage() {
  return {
    goldMine: 0,
    essenceWell: 0,
    barracks: 0,
    timeRelay: 0
  };
}

function createInitialGameState() {
  return {
    gold: 0,
    essence: 0,
    aether: 0,
    totalAetherEarned: 0,

    tapDamage: 1,
    tapMult: 1,
    autoDps: 0,
    critChance: 5,
    critMult: 2,
    goldMult: 1,
        // NOUVEAU v1.8 : progression des stats RPG via le shop
    trainedStats: {
      power: 0,
      endurance: 0,
      celerity: 0,
      precision: 0,
      will: 0
    },

    heroLevel: 1,
    heroXp: 0,
    heroXpToNext: 20,
    talentPoints: 0,

    totalKills: 0,
    killCounts: {},
    upgrades: {},
    shopBuyAmount: 1,
    talents: {},
    enemy: null,
    activeTab: "combat",
    totalGoldEarned: 0,
    totalDamageDealt: 0,
    playTime: 0,
    cycleCount: 0,
    ascensionCount: 0,

    inventory: [],
    equipped: createDefaultEquipped(),

    aetherUpgrades: {},
    quests: [],
    questProgress: Object.assign({}, DEFAULT_QUEST_PROGRESS),
    questResetTime: 0,

    saveSupported: false,
    lastSave: 0,
    lastOnline: 0,

    village: createDefaultVillage(),

    playerName: "",
    heroId: ""
  };
}

var game = createInitialGameState();

function ensureGameStateDefaults() {
  if (!game.killCounts) game.killCounts = {};
  if (!game.upgrades) game.upgrades = {};
  if (!game.talents) game.talents = {};

  // NOUVEAU v1.8 : init + migration trainedStats
  if (!game.trainedStats || typeof game.trainedStats !== "object") {
    game.trainedStats = { power: 0, endurance: 0, celerity: 0, precision: 0, will: 0 };
    if (game.upgrades && game.upgrades.utap) {
      game.trainedStats.power = Number(game.upgrades.utap) || 0;
    }
  }
  if (typeof game.trainedStats.power !== "number") game.trainedStats.power = 0;
  if (typeof game.trainedStats.endurance !== "number") game.trainedStats.endurance = 0;
  if (typeof game.trainedStats.celerity !== "number") game.trainedStats.celerity = 0;
  if (typeof game.trainedStats.precision !== "number") game.trainedStats.precision = 0;
  if (typeof game.trainedStats.will !== "number") game.trainedStats.will = 0;

  if (!Array.isArray(game.inventory)) game.inventory = [];

  

  if (!game.equipped || typeof game.equipped !== "object") {
    game.equipped = createDefaultEquipped();
  }
  if (game.equipped.weapon === undefined) game.equipped.weapon = null;
  if (game.equipped.armor === undefined) game.equipped.armor = null;
  if (game.equipped.amulet === undefined) game.equipped.amulet = null;

  if (!game.aetherUpgrades) game.aetherUpgrades = {};
  if (!Array.isArray(game.quests)) game.quests = [];

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
      if (u && u.id != null && game.upgrades[u.id] === undefined) {
        game.upgrades[u.id] = 0;
      }
    });
  }

  if (typeof AETHER_SHOP !== "undefined" && Array.isArray(AETHER_SHOP)) {
    AETHER_SHOP.forEach(function (u) {
      if (u && u.id != null && game.aetherUpgrades[u.id] === undefined) {
        game.aetherUpgrades[u.id] = 0;
      }
    });
  }
  if (!game.village || typeof game.village !== "object") {
    game.village = createDefaultVillage();
  }
  if (typeof game.village.goldMine !== "number") game.village.goldMine = 0;
  if (typeof game.village.essenceWell !== "number") game.village.essenceWell = 0;
  if (typeof game.village.barracks !== "number") game.village.barracks = 0;
  if (typeof game.village.timeRelay !== "number") game.village.timeRelay = 0;

  if (typeof game.heroLevel !== "number") game.heroLevel = 1;
  if (typeof game.heroXp !== "number") game.heroXp = 0;
  if (typeof game.heroXpToNext !== "number" || !isFinite(game.heroXpToNext) || game.heroXpToNext <= 0) {
    game.heroXpToNext = 20;
  }
  if (typeof game.talentPoints !== "number") game.talentPoints = 0;

  if (typeof game.playerName !== "string") game.playerName = "";
  if (typeof game.heroId !== "string") game.heroId = "";

  if (![1, 10, 25, -1].includes(Number(game.shopBuyAmount))) {
    game.shopBuyAmount = 1;
  }
  if (typeof game.totalAetherEarned !== "number") game.totalAetherEarned = 0;
}

ensureGameStateDefaults();

window.game = game;
window.createDefaultEquipped = createDefaultEquipped;
window.createDefaultVillage = createDefaultVillage;
window.createInitialGameState = createInitialGameState;
window.ensureGameStateDefaults = ensureGameStateDefaults;