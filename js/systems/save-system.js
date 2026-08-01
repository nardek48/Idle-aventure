"use strict";
/* ============================================================
Quest Idle — systems/save-system.js
Sauvegarde/chargement (localStorage), autosave, migrations
d'anciennes sauvegardes, et les 2 types de "reset" :
  - hardResetState()  reset d'ascension : garde l'Aether/les
    ascensions/les améliorations Aether, remet tout le reste à zéro
  - fullResetState()   reset complet (bouton "Réinitialiser tout"
    des Paramètres) : efface absolument tout, y compris le héros
Augmenter SAVE_VERSION quand la structure de sauvegarde change de
façon significative (permet de détecter d'anciennes sauvegardes).
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

/* Fusionne un objet de progression chargé avec un objet de valeurs
   par défaut : garde les nombres valides de `obj`, comble le reste. */
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

/* D'anciennes sauvegardes stockaient l'id du héros du chaos sous un
   format différent (ex: "ChaosNight" au lieu de "chaosKnight") ;
   cette table de correspondance répare ça au chargement. */
function migrateHeroId(heroId) {
  var map = {
    ChaosNight: "chaosKnight",
    ChaosRanger: "chaosRanger",
    ChaosMage: "chaosMage"
  };
  return map[heroId] || heroId || "";
}

/* Répare game.upgrades/aetherUpgrades pour une sauvegarde chargée :
   renomme les vieux ids d'upgrades (upgradeKeyMap, d'avant que les
   terrains d'entraînement soient renommés en "utrain_*"), puis
   pré-remplit à 0 toute amélioration connue qui manquerait encore. */
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

/* À appeler une fois au boot : détecte si localStorage est utilisable
   (peut échouer en navigation privée sur certains navigateurs), met en
   place l'autosave périodique, et sauvegarde aussi quand l'onglet perd
   le focus ou se ferme (pour ne jamais perdre de progression). */
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

/* Construit l'objet JSON exact qui sera stocké dans localStorage.
   TOUT champ persistant de `game` doit être repris ici, sinon il ne
   survivra pas à un rechargement de page. Voir restoreBaseState plus
   bas pour le chemin inverse (lecture). */
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
    village: game.village || { goldMine: 0, essenceWell: 0, barracks: 0, timeRelay: 0 },
    activePotions: game.activePotions || {},
    pendingPotionBonuses: game.pendingPotionBonuses || { aetherNext: 0 },
    equipShopStock: game.equipShopStock || [],
    equipShopResetTime: Number(game.equipShopResetTime || 0),
    dungeonTickets: Number(game.dungeonTickets != null ? game.dungeonTickets : 1),
    dungeonTicketResetTime: Number(game.dungeonTicketResetTime || 0),
    dungeonRun: game.dungeonRun || { active: false, wave: 0 },
    dungeonBestWave: Number(game.dungeonBestWave || 0)
  };
}

/* Écrit la sauvegarde dans localStorage. Renvoie false silencieusement
   si le stockage n'est pas dispo ou en erreur (quota dépassé...) plutôt
   que de faire planter le jeu. */
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

/* Recharge une sauvegarde (objet `d` = JSON.parse du localStorage)
   dans `game`. Ne fait AUCUN recalcul de stats dérivées (ça, c'est le
   rôle de StatsSystem.recalcStats(), appelé séparément après). */
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

  game.activePotions = d.activePotions && typeof d.activePotions === "object" ? d.activePotions : {};
  game.pendingPotionBonuses = d.pendingPotionBonuses && typeof d.pendingPotionBonuses === "object"
    ? d.pendingPotionBonuses
    : { aetherNext: 0 };
  if (typeof game.pendingPotionBonuses.aetherNext !== "number") game.pendingPotionBonuses.aetherNext = 0;

  game.equipShopStock = Array.isArray(d.equipShopStock) ? d.equipShopStock : [];
  game.equipShopResetTime = Number(d.equipShopResetTime || 0);

  game.dungeonTickets = typeof d.dungeonTickets === "number" ? d.dungeonTickets : 1;
  game.dungeonTicketResetTime = Number(d.dungeonTicketResetTime || 0);
  game.dungeonRun = d.dungeonRun && typeof d.dungeonRun === "object" ? d.dungeonRun : { active: false, wave: 0 };
  game.dungeonBestWave = Number(d.dungeonBestWave || 0);

  ensureUpgradeDefaults();
}

/* Remet les stats de base avant de laisser StatsSystem.recalcStats()
   reconstruire tout par-dessus — évite d'accumuler d'anciennes
   valeurs si cette fonction est appelée plusieurs fois. */
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

/* Point d'entrée principal pour charger la partie au démarrage :
   lit le JSON de localStorage, restaure l'état, recalcule les stats,
   et vérifie si les quêtes journalières doivent être régénérées.
   Renvoie false (sans planter) si rien n'est sauvegardé ou en cas
   d'erreur de parsing. */
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

/* Reset "ascension" : réinitialise la progression classique (or, dégâts,
   monde, inventaire, talents, niveau du héros...) mais CONSERVE l'Aether,
   le nombre d'ascensions et les améliorations Aether (kept* ci-dessous).
   Appelée par ascendNow() en progression-system.js. */
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

/* Reset "complet" (bouton "Réinitialiser tout" des Paramètres) : efface
   VRAIMENT tout, y compris l'Aether et le choix de héros — c'est
   repartir d'une partie neuve. Contrairement à hardResetState, rien
   n'est conservé. Note : redonne 1 000 000 d'or de départ (probablement
   un réglage de debug/confort, à surveiller si le jeu est publié tel quel). */
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

/* Bouton "Réinitialiser tout" des Paramètres : demande confirmation
   (action irréversible) puis efface la sauvegarde et appelle
   fullResetState(). */
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
