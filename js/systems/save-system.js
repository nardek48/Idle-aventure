"use strict";
/* Quest Idle — systems/save-system.js : sauvegarde/chargement (localStorage), autosave, migrations, hardResetState()/fullResetState().
   Détail complet : voir save-system_notes.md #1. */

var SAVE_KEY = "quest_idle_save_v6";
var SAVE_VERSION = 6;
var AUTO_SAVE_INTERVAL_MS = 30000;
var saveIntervalId = null;

/* v3.25 : plusieurs héros = plusieurs sauvegardes indépendantes, une clé localStorage par emplacement (getSlotKey), migration auto de l'ancien format.
   Détail complet : voir save-system_notes.md #2. */

var MAX_HERO_SLOTS = 6;
var ACTIVE_SLOT_KEY = "quest_idle_active_slot";

function getSlotKey(slotNumber) {
  return SAVE_KEY + "_slot" + slotNumber;
}

function getActiveSlot() {
  try {
    var raw = localStorage.getItem(ACTIVE_SLOT_KEY);
    var n = parseInt(raw, 10);
    if (n >= 1 && n <= MAX_HERO_SLOTS) return n;
  } catch (e) {}
  return 1;
}

function setActiveSlot(slotNumber) {
  try {
    localStorage.setItem(ACTIVE_SLOT_KEY, String(slotNumber));
  } catch (e) {}
}

/* La clé RÉELLEMENT utilisée par saveGame()/loadGame()/clearSaveData()
   ci-dessous — toujours celle de l'emplacement actif du moment. */
function getActiveSaveKey() {
  return getSlotKey(getActiveSlot());
}

/* Migration unique : ancienne sauvegarde à plat -> Emplacement 1, si besoin.
   Détail : save-system_notes.md #3. */
function migrateOldSaveToSlot1() {
  try {
    var slot1Key = getSlotKey(1);
    if (localStorage.getItem(slot1Key)) return; // déjà migré / déjà en place

    var oldRaw = localStorage.getItem(SAVE_KEY);
    if (!oldRaw) return; // rien à migrer (partie neuve)

    localStorage.setItem(slot1Key, oldRaw);
    setActiveSlot(1);
  } catch (e) {}
}

/* HeroSlotManager : créer/switcher/supprimer un emplacement de héros (couche fine sur saveGame()/loadGame()).
   Détail : save-system_notes.md #4. */
/* v3.26 : réplique la séquence de boot.js après un switch/création de héros pour éviter un combat sans ennemi (spawnEnemy()).
   Détail : save-system_notes.md #5. */
function resumeCombatAfterSlotChange(freshState) {
  // v3.109.2 (scope validé Seb, remplace la règle v3.41 « toujours monde 1 ») : la position est dans la save
  // (worldIndex/adventureIndex/enemyIndex, restaurée par loadGame comme au boot) — on ne la jette plus au switch.
  // freshState=true (création de héros, suppression du dernier slot) : état neuf SANS loadGame, or WorldManager
  // ne vit pas dans `game` — le reset reste indispensable pour purger la position de l'ancien héros.
  if (freshState && window.WorldManager && typeof WorldManager.resetToCycleStart === "function") {
    WorldManager.resetToCycleStart();
  }

  if (window.WorldManager && typeof WorldManager.markWorldReached === "function") {
    WorldManager.markWorldReached(WorldManager.worldIndex || 0);
  }

  if (typeof ensureDailyQuests === "function") ensureDailyQuests();

  if (game.dungeonRun && game.dungeonRun.active && window.DungeonManager) {
    if (typeof DungeonManager.applyDungeonTheme === "function") DungeonManager.applyDungeonTheme(game.dungeonRun.tierId);
    if (typeof DungeonManager.spawnWave === "function") DungeonManager.spawnWave(game.dungeonRun.wave || 1);
  } else if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
    CombatEngine.spawnEnemy();
  }

  if (window.QuestManager && typeof QuestManager.checkReset === "function") {
    QuestManager.checkReset();
  }
}

var HeroSlotManager = {
  getMaxSlots: function () { return MAX_HERO_SLOTS; },
  getActiveSlot: getActiveSlot,

  hasSlot: function (slotNumber) {
    if (!game.saveSupported) return false;
    try {
      return !!localStorage.getItem(getSlotKey(slotNumber));
    } catch (e) {
      return false;
    }
  },

  /* Résumé léger pour le sélecteur (nom, classe, niveau, monde) sans charger l'emplacement dans `game`.
     Détail : save-system_notes.md #6. */
  getSlotSummary: function (slotNumber) {
    if (!this.hasSlot(slotNumber)) return null;
    try {
      var raw = localStorage.getItem(getSlotKey(slotNumber));
      var d = JSON.parse(raw);
      if (!d || typeof d !== "object") return null;

      var hero = null;
      if (typeof HEROES_DB !== "undefined" && d.heroId) {
        Object.keys(HEROES_DB).forEach(function (key) {
          if (HEROES_DB[key] && HEROES_DB[key].id === d.heroId) hero = HEROES_DB[key];
        });
      }

      return {
        playerName: d.playerName || "",
        heroId: d.heroId || "",
        heroName: hero ? hero.name : "",
        heroImage: hero ? hero.image : "",
        heroLevel: Number(d.heroLevel || 1),
        worldIndex: Number(d.worldIndex || 0),
        cycleCount: Number(d.cycleCount || 0),
        ascensionCount: Number(d.ascensionCount || 0),
        playTime: Number(d.playTime || 0), // secondes, voir main/game-loop.js
        savedAt: Number(d.savedAt || d.lastOnline || 0) // ms epoch, dernière sauvegarde
      };
    } catch (e) {
      return null;
    }
  },

  /* Bascule vers un autre emplacement : sauvegarde l'actif, charge le demandé. Emplacement vide géré par createHeroInSlot().
     Détail : save-system_notes.md #7. */
  // v3.29.5 : `skipSaveCurrent` évite de resauvegarder (et ressusciter) un emplacement qu'on vient de supprimer (deleteSlot()).
  // Détail : save-system_notes.md #8.
  switchToSlot: function (slotNumber, skipSaveCurrent) {
    if (slotNumber === getActiveSlot()) return true;
    if (!this.hasSlot(slotNumber)) return false;

    // Sauvegarde l'emplacement qu'on quitte avant de changer la clé active (sauté si skipSaveCurrent).
    if (!skipSaveCurrent) saveGame();

    setActiveSlot(slotNumber);

    // Repart d'un état par défaut avant de charger, comme au premier boot (évite qu'un champ manquant garde l'ancien héros).
    if (typeof createInitialGameState === "function") {
      // v3.25 : préserve game.saveSupported (détection au boot, pas propre à un héros) pendant le wipe de `game`, sinon saveGame() échoue.
      // Détail : save-system_notes.md #11.
      var keptSaveSupported = game.saveSupported;
      var fresh = createInitialGameState();
      Object.keys(game).forEach(function (k) { delete game[k]; });
      Object.assign(game, fresh);
      game.saveSupported = keptSaveSupported;
    }

    loadGame();
    if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
    resumeCombatAfterSlotChange();

    return true;
  },

  /* Crée un héros dans un emplacement vide : sauvegarde l'ancien, bascule la clé active, repart d'un état neuf, ouvre la création (modal-view.js).
     Détail : save-system_notes.md #12. */
  createHeroInSlot: function (slotNumber) {
    if (this.hasSlot(slotNumber)) return false; // emplacement déjà occupé, pas de recréation silencieuse
    if (slotNumber < 1 || slotNumber > MAX_HERO_SLOTS) return false;

    // v3.29 : mémorise l'emplacement qu'on quitte pour permettre d'annuler (croix ✕, voir cancelHeroSelection() dans modal-view.js) — null si aucun emplacement précédent (tout premier lancement, rien où revenir).
    var originSlot = getActiveSlot();
    window.pendingHeroCreationOrigin = HeroSlotManager.hasSlot(originSlot) ? originSlot : null;

    if (getActiveSlot() !== slotNumber) saveGame(); // préserve l'emplacement qu'on quitte

    setActiveSlot(slotNumber);

    if (typeof createInitialGameState === "function") {
      // v3.25 : préserve game.saveSupported pendant le wipe de `game` (voir save-system_notes.md #13).
      var keptSaveSupported = game.saveSupported;
      var fresh = createInitialGameState();
      Object.keys(game).forEach(function (k) { delete game[k]; });
      Object.assign(game, fresh);
      game.saveSupported = keptSaveSupported;
    }
    if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
    resumeCombatAfterSlotChange(true); // v3.26 (spawn) ; v3.109.2 : true = état neuf, purge la position de l'ancien héros

    // Pas de saveGame() ici : l'emplacement n'existe "pour de vrai" qu'une fois la création confirmée (confirmHeroSelection()).

    if (typeof renderAll === "function") renderAll();
    if (typeof openHeroSelection === "function") openHeroSelection();

    return true;
  },

  /* Supprime un emplacement occupé (DESTRUCTIF, confirmation à charge de l'UI). Bascule sur le 1er emplacement restant si c'était l'actif.
     Détail : save-system_notes.md #15. */
  deleteSlot: function (slotNumber) {
    if (!this.hasSlot(slotNumber)) return false;

    var wasActive = getActiveSlot() === slotNumber;
    try {
      localStorage.removeItem(getSlotKey(slotNumber));
    } catch (e) {
      return false;
    }

    if (wasActive) {
      var self = this;
      var fallback = null;
      for (var i = 1; i <= MAX_HERO_SLOTS; i++) {
        if (i !== slotNumber && self.hasSlot(i)) { fallback = i; break; }
      }
      if (fallback) {
        this.switchToSlot(fallback, true); // true = ne pas resauvegarder le slot qu'on vient de supprimer
      } else {
        // Plus aucun emplacement occupé : repart sur un état neuf,
        // needsHeroSetup() rouvrira naturellement la création.
        setActiveSlot(1);
        if (typeof createInitialGameState === "function") {
          var keptSaveSupported2 = game.saveSupported;
          var fresh = createInitialGameState();
          Object.keys(game).forEach(function (k) { delete game[k]; });
          Object.assign(game, fresh);
          game.saveSupported = keptSaveSupported2;
        }
        if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
        resumeCombatAfterSlotChange(true); // v3.26 ; v3.109.2 : true = état neuf (plus aucun emplacement), position purgée
        if (typeof renderAll === "function") renderAll();
      }
    }

    return true;
  }
};
window.HeroSlotManager = HeroSlotManager;
window.MAX_HERO_SLOTS = MAX_HERO_SLOTS;

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
  return { weapon: null, armor: null, helmet: null, gloves: null, boots: null, ring: null, amulet: null };
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

/* Anciennes sauvegardes : id du héros du chaos sous un ancien format (ex "ChaosNight") — table de correspondance au chargement. */
function migrateHeroId(heroId) {
  var map = {
    ChaosNight: "chaosKnight",
    ChaosRanger: "chaosRanger",
    ChaosMage: "chaosMage"
  };
  return map[heroId] || heroId || "";
}

/* Répare game.upgrades/aetherUpgrades : renomme les vieux ids (upgradeKeyMap) et complète les upgrades manquantes à 0.
   Détail : save-system_notes.md #17. */
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

/* À appeler une fois au boot : détecte si localStorage marche, lance l'autosave périodique et sauvegarde au blur/fermeture d'onglet. */
function initSaveSystem() {
  try {
    localStorage.setItem("__quest_idle_test__", "1");
    localStorage.removeItem("__quest_idle_test__");
    game.saveSupported = true;
  } catch (e) {
    game.saveSupported = false;
  }

  // v3.25 : migration de l'ancienne sauvegarde à plat vers l'Emplacement 1 — doit tourner AVANT le premier loadGame() de boot.js.
  // Détail : save-system_notes.md #19.
  if (game.saveSupported) migrateOldSaveToSlot1();

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

/* Construit l'objet JSON stocké dans localStorage. Tout champ persistant de `game` doit être repris ici (voir restoreBaseState pour l'inverse). */
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
    equipFlatTapBonus: Number(game.equipFlatTapBonus || 0),
    autoDps: Number(game.autoDps || 0),
    critChance: Number(game.critChance || 5),
    critMult: Number(game.critMult || 2),
    goldMult: Number(game.goldMult || 1),
    bossGoldBonusPct: Number(game.bossGoldBonusPct || 0),

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
    combatSpeed: Number(game.combatSpeed || 1),
    totalKills: Number(game.totalKills || 0),
    totalGoldEarned: Number(game.totalGoldEarned || 0),
    totalDamageDealt: Number(game.totalDamageDealt || 0),
    playTime: Number(game.playTime || 0),
    cycleCount: Number(game.cycleCount || 0),
    ascensionCount: Number(game.ascensionCount || 0),
    killCounts: game.killCounts || {},
    upgrades: game.upgrades || {},
    talents: game.talents || {},
    unlockedTabs: game.unlockedTabs || {}, // v3.99.15 : onglets débloqués, voir core/state.js
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
    // v3.113.0 : game.village n'est plus persisté (bâtiments hors-ligne supprimés).
    activePotions: game.activePotions || {},
    pendingPotionBonuses: game.pendingPotionBonuses || { aetherNext: 0 },
    aetherElixirStackCount: Number(game.aetherElixirStackCount || 0),
    equipShopStock: game.equipShopStock || [],
    equipShopResetTime: Number(game.equipShopResetTime || 0),
    equipShopManualRefreshCount: Number(game.equipShopManualRefreshCount || 0),
    dungeonTickets: Number(game.dungeonTickets != null ? game.dungeonTickets : 1),
    dungeonTicketResetTime: Number(game.dungeonTicketResetTime || 0),
    dungeonTicketsPurchasedToday: Number(game.dungeonTicketsPurchasedToday || 0),
    dungeonRun: game.dungeonRun || { active: false, wave: 0, tierId: 1 },
    dungeonBestWave: Number(game.dungeonBestWave || 0),
    dungeonBossClears: Number(game.dungeonBossClears || 0),
    dungeonShards: Number(game.dungeonShards || 0),
    dungeonShopLevels: game.dungeonShopLevels || {},
    // v2.90.11 : dungeonTierCleared oublié lors de l'ajout du déblocage séquentiel (v2.90.9) — se perdait à chaque rechargement.
    // Détail : save-system_notes.md #21.
    dungeonTierCleared: game.dungeonTierCleared || {},
    healingPotionsOwned: game.healingPotionsOwned || {},
    potionsOwned: game.potionsOwned || {},
    lastHealUse: Number(game.lastHealUse || 0),
    autoSellEquipment: !!game.autoSellEquipment,
    autoSellRarityThreshold: game.autoSellRarityThreshold || "common",
    // v3.47.0 : combat auto de base (skill1/skill2/skill3/defense +
    // attaque de base), voir ClassCombatManager.tickAutoSkills() —
    // actif par défaut, réglable dans Paramètres.
    autoSkillsEnabled: game.autoSkillsEnabled === true,
    // v3.102.0 (P2) : mode de combat par rounds ("tactique" | "grimoire")
    combatMode: game.combatMode === "grimoire" ? "grimoire" : "tactique",
    // v3.102.1 : sortie en cours (butin non banqué) — survit à un rechargement
    sortie: (game.sortie && typeof game.sortie === "object") ? game.sortie : null,
    // v3.66.0 : Mode Expert du Grimoire (Phase 6) — préférence
    // d'affichage pure, réglable directement dans l'écran Grimoire.
    expertModeEnabled: !!game.expertModeEnabled,
    // v3.50.0 : Grimoire de tactiques (étape 4a) — tableau de règles
    // { conditionId, actionSlot }, voir data/grimoire-conditions.js et
    // ClassCombatManager.tickAutoSkills(). Array.isArray() garde
    // contre un état corrompu plutôt que de planter la sauvegarde.
    grimoireRules: Array.isArray(game.grimoireRules) ? game.grimoireRules : [],
    // v3.65.0 : presets nommés du Grimoire (Phase 5) — voir
    // ui/grimoire-view.js (ensureGrimoirePresets()/saveGrimoirePreset()).
    grimoirePresets: Array.isArray(game.grimoirePresets) ? game.grimoirePresets : [],
    // v3.34.0 : lastSpecialUse/specialBuffExpires/specialBuffPct/
    // lastDefenseUse/defenseBuffExpires retirés (ancien système), voir
    // classResource/classCooldowns/classActiveDefense ci-dessous.
    classResource: game.classResource || null,
    classCooldowns: game.classCooldowns || {},
    classActiveDefense: game.classActiveDefense || null,
    achievementsClaimed: game.achievementsClaimed || {},
    worldsEverReached: game.worldsEverReached || {},
    worldQuestProgress: game.worldQuestProgress || {},
    worldQuestsCompleted: game.worldQuestsCompleted || {},
    // v3.0 : système Quêtes/Ressources/Territoire (voir data/adventure-quests.js).
    // v3.35 : planche/lingot (artisanat tier 1, voir data/recipes.js) ajoutés ici.
    // v3.36 : pierre (brute, Carrière) / farine (tier 1, Blé→Farine) ajoutées ici.
    resources: game.resources || { viande: 0, ble: 0, bois: 0, fer: 0, pierre: 0, eau: 0, planche: 0, lingot: 0, farine: 0, pain: 0, ration: 0, petite_ration: 0 },
    adventureQuestProgress: game.adventureQuestProgress || {},
    adventureQuestsCompleted: game.adventureQuestsCompleted || {},
    adventureQuestRun: game.adventureQuestRun || { active: false, questId: null },
    // v3.30 : Chasse en boucle (voir data/hunt-quests.js) — huntStats
    // est purement informatif (compteur de lots), persiste comme
    // adventureQuestProgress ; huntRun NE survit PAS (comme dungeonRun).
    huntStats: game.huntStats || {},
    huntRun: game.huntRun || { active: false, questId: null, killsInLot: 0 },
    // v3.90.0 : Expéditions non-combat (voir systems/exploration-engine.js) — même règle
    // que huntRun/dungeonRun/adventureQuestRun : le run éphémère survit à un simple
    // rechargement de page (pour reprendre exactement où on en était), mais NE survit PAS
    // à une ascension (hardResetState) ; explorationProgression (déblocages) est permanent.
    explorationRun: game.explorationRun || null,
    explorationProgression: game.explorationProgression || { blockedPathCompleted: false, forgottenClearingUnlocked: false, unstableVeinDiscoveryCompleted: false, quarryUnlocked: false, huntBuildingUnlocked: false, driedSpringDiscoveryCompleted: false, wellUnlocked: false },
    // v3.92.0 : session de minijeu de minage (quête "La Veine Instable" ou activité bonus
    // Carrière) — même règle de persistance que explorationRun (survit au rechargement).
    // v3.94.0 : bloc "well" ajouté pour le minijeu du Puits (systems/well-system.js).
    gatheringActivity: game.gatheringActivity || { quarry: { cooldownEndsAt: 0, activeSession: null }, well: { cooldownEndsAt: 0, activeSession: null } },
    // v3.43 : file d'attente de craft de l'Entrepôt (voir
    // WarehouseManager.enqueueCraft()/tickCraftQueue()) — survit à un
    // rechargement de page (SANS rattrapage hors-ligne, contrairement
    // à production.lastTick : la file reprend là où elle était, sans
    // compenser le temps écoulé pendant que l'app était fermée).
    craftQueue: Array.isArray(game.craftQueue) ? game.craftQueue : [],
    // v3.31 : bâtiments de production (voir data/production-buildings.js)
    // — niveau/stock persistent TOUJOURS (comme le Village), lastTick
    // sert au rattrapage hors-ligne (voir ProductionManager.catchUpOffline()).
    production: game.production || {},
    // v3.37 : bâtiments de Construction (voir data/construction.js) —
    // niveau persistant, même principe que production (pas de champ
    // temporel à rattraper ici, contrairement à production.lastTick :
    // pas de stock local qui s'accumule tout seul pour ce système).
    construction: game.construction || {},
    // v3.38 : chaîne de déblocage de l'Atelier (voir
    // data/workshop-unlock.js, systems/workshop-unlock-system.js) —
    // même principe que construction ci-dessus, état simple sans
    // champ temporel à rattraper.
    workshopUnlock: game.workshopUnlock || {},
    workshopFoundationsCompleted: !!game.workshopFoundationsCompleted,
    storyQuests: game.storyQuests || {}, // v3.100.0 : chaîne Histoire (data/story-quests.js, systems/story-quest-system.js)
    campfireLastUsed: game.campfireLastUsed || 0, // v3.7 : cooldown du feu de camp (long repos), voir systems/camp-system.js
    campfireShortLastUsed: game.campfireShortLastUsed || 0, // v3.14 : cooldown du repos court
    campRegenLastAt: game.campRegenLastAt || 0, // v3.101.0 : repère de régénération au camp (systems/camp-system.js)
    activeAfflictions: Object.assign({}, game.activeAfflictions || {}), // v3.20 : voir data/afflictions.js
    dungeonTiersEntered: game.dungeonTiersEntered || {},
    codexChaosSeen: !!game.codexChaosSeen,
    codexRead: game.codexRead || {},
    hasSeenOnboarding: !!game.hasSeenOnboarding,
    genericTutorialsSeen: game.genericTutorialsSeen || {}
  };
}

/* Écrit la sauvegarde dans localStorage ; renvoie false silencieusement si le stockage échoue (quota...), sans planter le jeu. */
function saveGame() {
  if (!game.saveSupported) return false;
  try {
    localStorage.setItem(getActiveSaveKey(), JSON.stringify(buildSaveData()));
    game.lastSave = Date.now();
    game.lastOnline = game.lastSave;
    return true;
  } catch (e) {
    return false;
  }
}

/* Recharge une sauvegarde dans `game`. Aucun recalcul de stats dérivées ici — rôle de StatsSystem.recalcStats(), appelé après. */
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
  game.equipFlatTapBonus = 0;
  game.autoDps = 0;
  game.critChance = 5;
  game.critMult = 2;
  game.goldMult = 1;
  game.bossGoldBonusPct = 0;

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
  // v3.99.15 : onglets débloqués (voir core/state.js). Migration pour les sauvegardes
  // antérieures à cette version (d.unlockedTabs absent) : une partie déjà entamée
  // (playerName déjà rempli à ce stade du chargement) débloque tout directement plutôt
  // que de se retrouver limitée aux 3 onglets de départ après une mise à jour.
  if (d.unlockedTabs && typeof d.unlockedTabs === "object") {
    game.unlockedTabs = d.unlockedTabs;
  } else if (d.playerName) {
    game.unlockedTabs = {
      campement: true, combat: true, village: true, more: true,
      dungeon: true, shop: true, talents: true, equip: true, quests: true,
      ascension: true, map: true, achievements: true, bestiary: true,
      afflictions: true, grimoire: true, settings: true
    };
  } else {
    game.unlockedTabs = { campement: true, quests: true, settings: true };
  }

  game.inventory = Array.isArray(d.inventory) ? d.inventory : [];
  game.equipped = d.equipped && typeof d.equipped === "object" ? d.equipped : getDefaultEquipped();
  if (game.equipped.weapon === undefined) game.equipped.weapon = null;
  if (game.equipped.armor === undefined) game.equipped.armor = null;
  if (game.equipped.amulet === undefined) game.equipped.amulet = null;
  // v2.83.55 : 4 nouveaux emplacements — anciennes sauvegardes n'ont que weapon/armor/amulet, le reste est comblé à null.
  if (game.equipped.helmet === undefined) game.equipped.helmet = null;
  if (game.equipped.gloves === undefined) game.equipped.gloves = null;
  if (game.equipped.boots === undefined) game.equipped.boots = null;
  if (game.equipped.ring === undefined) game.equipped.ring = null;

  game.quests = Array.isArray(d.quests) ? d.quests : [];
  game.questProgress = normalizeProgressMap(d.questProgress, questDefaults);
  game.questResetTime = Number(d.questResetTime || 0);

  game.activeTab = d.activeTab || "combat";
  // v3.107.3 : une save enregistrée avec activeTab="combat" ET heroHp<=0 (ex. autosave juste après une
  // mort, avant que switchTab("campement") n'ait fini de s'exécuter) recréait le blocage au rechargement
  // — l'écran Combat n'offre aucune action possible à 0 PV, sans message l'expliquant.
  if (game.activeTab === "combat" && (game.heroHp || 0) <= 0) {
    game.activeTab = "campement";
  }
  game.enemy = null;
  // v3.102.0 (P2) : l'état de round est transitoire (l'ennemi ne l'est pas non plus) — repart de zéro au chargement
  game.combatRound = { number: 0, busy: false, continueAttack: false, clockMs: 0 };
  game.heroGauge = 0;
  game.silencedRounds = 0;
  game.lastOnline = Number(d.lastOnline || d.savedAt || 0);

  WorldManager.worldIndex = Math.max(0, Number(d.worldIndex || 0));
  WorldManager.adventureIndex = Math.max(0, Number(d.adventureIndex || 0));
  WorldManager.enemyIndex = Math.max(0, Number(d.enemyIndex || 0));

  game.combatSpeed = [1, 2, 4].indexOf(Number(d.combatSpeed)) !== -1 ? Number(d.combatSpeed) : 1;

  // v3.113.0 : d.village (anciens bâtiments hors-ligne) est ignoré au chargement —
  // reset définitif du village validé avec Seb, aucun remboursement.
  if (typeof game.village !== "undefined") delete game.village;

  game.activePotions = d.activePotions && typeof d.activePotions === "object" ? d.activePotions : {};
  game.pendingPotionBonuses = d.pendingPotionBonuses && typeof d.pendingPotionBonuses === "object"
    ? d.pendingPotionBonuses
    : { aetherNext: 0 };
  if (typeof game.pendingPotionBonuses.aetherNext !== "number") game.pendingPotionBonuses.aetherNext = 0;
  game.aetherElixirStackCount = Number(d.aetherElixirStackCount || 0);

  game.equipShopStock = Array.isArray(d.equipShopStock) ? d.equipShopStock : [];
  game.equipShopResetTime = Number(d.equipShopResetTime || 0);
  game.equipShopManualRefreshCount = Number(d.equipShopManualRefreshCount || 0);

  game.dungeonTickets = typeof d.dungeonTickets === "number" ? d.dungeonTickets : 1;
  game.dungeonTicketResetTime = Number(d.dungeonTicketResetTime || 0);
  game.dungeonTicketsPurchasedToday = Number(d.dungeonTicketsPurchasedToday || 0);
  game.dungeonRun = d.dungeonRun && typeof d.dungeonRun === "object" ? d.dungeonRun : { active: false, wave: 0, tierId: 1 };
  if (typeof game.dungeonRun.tierId !== "number") game.dungeonRun.tierId = 1;
  game.dungeonBestWave = Number(d.dungeonBestWave || 0);
  game.dungeonBossClears = Number(d.dungeonBossClears || 0);
  game.dungeonShards = Number(d.dungeonShards || 0);
  game.dungeonShopLevels = d.dungeonShopLevels && typeof d.dungeonShopLevels === "object" ? d.dungeonShopLevels : {};
  // v2.90.11 : voir buildSaveData() ci-dessus, même correctif.
  game.dungeonTierCleared = d.dungeonTierCleared && typeof d.dungeonTierCleared === "object" ? d.dungeonTierCleared : {};
  game.healingPotionsOwned = d.healingPotionsOwned && typeof d.healingPotionsOwned === "object" ? d.healingPotionsOwned : {};
  game.potionsOwned = d.potionsOwned && typeof d.potionsOwned === "object" ? d.potionsOwned : {};
  game.lastHealUse = Number(d.lastHealUse || 0);
  game.autoSellEquipment = !!d.autoSellEquipment;
  game.autoSellRarityThreshold = (typeof d.autoSellRarityThreshold === "string") ? d.autoSellRarityThreshold : "common";
  // v3.47.0 : absent d'une ancienne sauvegarde = true (comportement
  // par défaut souhaité), pas false — seul un false explicite désactive.
  // v3.102.0 (P2) : combatMode ; migration d'une save d'avant P2 (autoSkillsEnabled true par défaut) → Grimoire
  // seulement si l'onglet Grimoire est débloqué (étape 12 de l'Histoire), sinon Tactique.
  if (d.combatMode === "grimoire" || d.combatMode === "tactique") {
    game.combatMode = d.combatMode;
  } else {
    var legacyAuto = d.autoSkillsEnabled !== false;
    var grimoireTabUnlocked = !!(d.unlockedTabs && d.unlockedTabs.grimoire);
    game.combatMode = (legacyAuto && grimoireTabUnlocked) ? "grimoire" : "tactique";
  }
  game.autoSkillsEnabled = (game.combatMode === "grimoire");
  game.sortie = (d.sortie && typeof d.sortie === "object") ? d.sortie : null; // v3.102.1 (normalisé par SortieManager.ensure)
  // v3.66.0 : Mode Expert — absent d'une ancienne sauvegarde = false
  // (off par défaut, cohérent avec l'état initial createInitialGameState()).
  game.expertModeEnabled = !!d.expertModeEnabled;
  // v3.50.0 : Grimoire — absent d'une ancienne sauvegarde (avant
  // v3.50.0) = tableau vide (aucune règle configurée, comportement
  // identique à avant cette version). sanitizeGrimoireRules() filtre
  // toute entrée corrompue/obsolète (ex. conditionId retiré d'une
  // future version) — kit: null ici, la classe courante n'est pas
  // encore forcément connue à ce point du chargement (heroId vient
  // d'être posé juste au-dessus, mais recalcStats()/le kit réel ne
  // sont garantis qu'après tout restoreBaseState()) ; une validation
  // plus stricte par classe aura de toute façon lieu à la volée dans
  // chooseGrimoireAction() à chaque tick (canUseAction() y échoue déjà
  // proprement si l'action n'existe pas dans le kit courant).
  game.grimoireRules = (typeof sanitizeGrimoireRules === "function")
    ? sanitizeGrimoireRules(d.grimoireRules, null)
    : (Array.isArray(d.grimoireRules) ? d.grimoireRules : []);
  // v3.65.0 : presets nommés du Grimoire (Phase 5) — même filtre de
  // validation par entrée que restoreBaseState() (core/state.js),
  // dupliqué ici volontairement : loadGame() ne passe pas forcément
  // par restoreBaseState() selon le chemin de chargement (voir plus
  // haut dans ce fichier pour le contexte des 2 chemins existants).
  game.grimoirePresets = Array.isArray(d.grimoirePresets)
    ? d.grimoirePresets.filter(function (p) {
        return p && typeof p === "object" && typeof p.id === "string" && typeof p.name === "string" && Array.isArray(p.rules);
      }).map(function (p) {
        return {
          id: p.id,
          name: p.name,
          icon: typeof p.icon === "string" ? p.icon : "📖",
          rules: (typeof sanitizeGrimoireRules === "function") ? sanitizeGrimoireRules(p.rules, null) : p.rules,
          lastModified: typeof p.lastModified === "number" ? p.lastModified : 0
        };
      })
    : [];
  // v3.34.0 : classResource absent (sauvegarde d'avant ce système, ou
  // valeur invalide) -> null, régénéré automatiquement au premier
  // besoin par ClassCombatManager.ensureForCurrentClass() (voir
  // systems/class-combat-system.js), pas une perte de données.
  game.classResource = (d.classResource && typeof d.classResource === "object") ? d.classResource : null;
  // v3.102.0 (P2) : cooldowns en ROUNDS (entiers ≤ 20) — une save d'avant P2 les stockait en ms : on les purge.
  game.classCooldowns = {};
  if (d.classCooldowns && typeof d.classCooldowns === "object") {
    Object.keys(d.classCooldowns).forEach(function (k) {
      var v = Number(d.classCooldowns[k]);
      if (isFinite(v) && v > 0 && v <= 20 && v === Math.floor(v)) game.classCooldowns[k] = v;
    });
  }
  game.classActiveDefense = (d.classActiveDefense && typeof d.classActiveDefense === "object" && typeof d.classActiveDefense.roundsLeft === "number")
    ? d.classActiveDefense
    : null;
  game.achievementsClaimed = d.achievementsClaimed && typeof d.achievementsClaimed === "object" ? d.achievementsClaimed : {};
  game.worldsEverReached = d.worldsEverReached && typeof d.worldsEverReached === "object" ? d.worldsEverReached : {};
  game.worldQuestProgress = d.worldQuestProgress && typeof d.worldQuestProgress === "object" ? d.worldQuestProgress : {};
  game.worldQuestsCompleted = d.worldQuestsCompleted && typeof d.worldQuestsCompleted === "object" ? d.worldQuestsCompleted : {};
  // v3.0 : système Quêtes/Ressources/Territoire (voir data/adventure-quests.js).
  game.resources = d.resources && typeof d.resources === "object" ? d.resources : { viande: 0, ble: 0, bois: 0, fer: 0, pierre: 0, eau: 0, planche: 0, lingot: 0, farine: 0, pain: 0, ration: 0, petite_ration: 0, grande_ration: 0 };
  if (typeof game.resources.grande_ration !== "number") game.resources.grande_ration = 0; // v3.106.0 : migration saves antérieures
  if (typeof game.resources.viande !== "number") game.resources.viande = 0;
  if (typeof game.resources.ble !== "number") game.resources.ble = 0;
  if (typeof game.resources.bois !== "number") game.resources.bois = 0;
  if (typeof game.resources.fer !== "number") game.resources.fer = 0;
  // v3.35 : artisanat tier 1 (voir data/recipes.js).
  if (typeof game.resources.planche !== "number") game.resources.planche = 0;
  if (typeof game.resources.lingot !== "number") game.resources.lingot = 0;
  // v3.36 : Pierre (Carrière) / Farine (tier 1, Blé→Farine) — une
  // ancienne sauvegarde n'a ni l'une ni l'autre, doit charger à 0
  // sans planter (critère de validation explicite de Seb).
  if (typeof game.resources.pierre !== "number") game.resources.pierre = 0;
  if (typeof game.resources.farine !== "number") game.resources.farine = 0;
  game.adventureQuestProgress = d.adventureQuestProgress && typeof d.adventureQuestProgress === "object" ? d.adventureQuestProgress : {};
  game.adventureQuestsCompleted = d.adventureQuestsCompleted && typeof d.adventureQuestsCompleted === "object" ? d.adventureQuestsCompleted : {};
  game.adventureQuestRun = d.adventureQuestRun && typeof d.adventureQuestRun === "object" ? d.adventureQuestRun : { active: false, questId: null };
  // v3.30 : Chasse en boucle (voir data/hunt-quests.js).
  game.huntStats = d.huntStats && typeof d.huntStats === "object" ? d.huntStats : {};
  game.huntRun = d.huntRun && typeof d.huntRun === "object" ? d.huntRun : { active: false, questId: null, killsInLot: 0 };
  // v3.90.0 : Expéditions non-combat — ancienne sauvegarde sans ces champs = valeurs par
  // défaut sûres (aucun run à reprendre, aucun déblocage perdu). ensureGameStateDefaults()
  // (core/state.js) revalide ensuite la forme exacte de explorationProgression.
  game.explorationRun = d.explorationRun && typeof d.explorationRun === "object" ? d.explorationRun : null;
  game.explorationProgression = d.explorationProgression && typeof d.explorationProgression === "object"
    ? d.explorationProgression
    : { blockedPathCompleted: false, forgottenClearingUnlocked: false, unstableVeinDiscoveryCompleted: false, quarryUnlocked: false, huntBuildingUnlocked: false, driedSpringDiscoveryCompleted: false, wellUnlocked: false };
  // v3.92.0 : migration "Veine Instable" — la Carrière était débloquée nativement pour
  // TOUTE sauvegarde antérieure à cette version (aucun verrou n'a jamais existé avant),
  // qu'elle ait ou non déjà un explorationProgression (les sauvegardes très anciennes,
  // d'avant v3.90.0, n'en ont aucun du tout). Toute sauvegarde RÉELLE (d présent, on est
  // bien dans un chargement, pas une nouvelle partie) dont quarryUnlocked n'était pas déjà
  // explicitement défini = ancienne sauvegarde -> migrée à true d'office, une seule fois.
  // Une fois le champ présent (même à false, ex. une partie créée après cette version), on
  // ne le retouche plus ici.
  if (d && typeof (d.explorationProgression && d.explorationProgression.quarryUnlocked) !== "boolean") {
    game.explorationProgression.quarryUnlocked = true;
  }
  // v3.93.0 : même migration pour la Chasse (hunt) — même raisonnement exact que quarryUnlocked
  // ci-dessus, le bâtiment Chasse était lui aussi débloqué nativement pour toute sauvegarde
  // antérieure à cette version (voir data/adventure-quests.js: hq_wolf_pack).
  if (d && typeof (d.explorationProgression && d.explorationProgression.huntBuildingUnlocked) !== "boolean") {
    game.explorationProgression.huntBuildingUnlocked = true;
  }
  // v3.94.0 : même migration pour le Puits (well) — même raisonnement exact, le bâtiment
  // Puits était lui aussi débloqué nativement pour toute sauvegarde antérieure à cette
  // version (voir data/exploration-quests.js: driedSpring).
  if (d && typeof (d.explorationProgression && d.explorationProgression.wellUnlocked) !== "boolean") {
    game.explorationProgression.wellUnlocked = true;
  }
  if (typeof game.explorationProgression.unstableVeinDiscoveryCompleted !== "boolean") {
    game.explorationProgression.unstableVeinDiscoveryCompleted = false;
  }
  if (typeof game.explorationProgression.quarryUnlocked !== "boolean") {
    game.explorationProgression.quarryUnlocked = false;
  }
  if (typeof game.explorationProgression.huntBuildingUnlocked !== "boolean") {
    game.explorationProgression.huntBuildingUnlocked = false;
  }
  if (typeof game.explorationProgression.driedSpringDiscoveryCompleted !== "boolean") {
    game.explorationProgression.driedSpringDiscoveryCompleted = false;
  }
  if (typeof game.explorationProgression.wellUnlocked !== "boolean") {
    game.explorationProgression.wellUnlocked = false;
  }
  // v3.92.0 : session de minijeu de minage (quête ou activité bonus Carrière) — même
  // règle que explorationRun (run éphémère non trouvé -> valeurs par défaut sûres).
  // v3.94.0 : bloc "well" ajouté avec garde de forme séparée (une sauvegarde v3.92.x/
  // v3.93.x a déjà gatheringActivity mais sans la clé "well").
  game.gatheringActivity = d.gatheringActivity && typeof d.gatheringActivity === "object"
    ? d.gatheringActivity
    : { quarry: { cooldownEndsAt: 0, activeSession: null }, well: { cooldownEndsAt: 0, activeSession: null } };
  if (!game.gatheringActivity.well || typeof game.gatheringActivity.well !== "object") {
    game.gatheringActivity.well = { cooldownEndsAt: 0, activeSession: null };
  }
  // v3.43 : file d'attente de craft — migration douce, une ancienne
  // sauvegarde sans `craftQueue` repart avec [] (WarehouseManager.ensure()
  // le recrée de toute façon au premier accès).
  game.craftQueue = Array.isArray(d.craftQueue) ? d.craftQueue : [];
  // v3.31 : bâtiments de production (voir data/production-buildings.js)
  // — migration douce : une vieille sauvegarde sans `production` (ou
  // avec un bâtiment manquant, ex. ajout d'un 5e bâtiment plus tard)
  // repart avec {} ici, ProductionManager.ensure() complète le reste
  // au premier accès (voir boot.js, appelé juste après loadGame()).
  game.production = d.production && typeof d.production === "object" ? d.production : {};
  // v3.37 : bâtiments de Construction (voir data/construction.js) —
  // même migration douce que production ci-dessus : une ancienne
  // sauvegarde (ou toute nouvelle entrée future de CONSTRUCTION_BUILDINGS)
  // repart avec {} ici, ConstructionManager.ensure() complète le reste
  // au premier accès.
  game.construction = d.construction && typeof d.construction === "object" ? d.construction : {};
  // v3.38 : chaîne de déblocage de l'Atelier — migration douce, même
  // principe que construction ci-dessus. WorkshopUnlockManager.ensure()
  // complète les champs manquants au premier accès ; la validation
  // rétroactive (runRetroactiveCheck()) tourne une fois au boot, voir
  // main/boot.js, APRÈS ce chargement.
  game.workshopUnlock = d.workshopUnlock && typeof d.workshopUnlock === "object" ? d.workshopUnlock : {};
  // v3.107.8 : « Les fondations » sortie de la chaîne Histoire (quête secondaire indépendante).
  // Migration : une save ayant déjà dépassé cette étape (steps réclamées avant le retrait, ou
  // Atelier déjà terminé) ne doit pas se retrouver avec la mission encore active sur le tableau.
  game.workshopFoundationsCompleted = !!d.workshopFoundationsCompleted || !!(game.workshopUnlock && game.workshopUnlock.completed);
  // v3.100.0 : chaîne Histoire. Migration : save antérieure (d.storyQuests absent) d'une
  // partie entamée dont tous les onglets sont déjà débloqués (legacy < v3.99.15, ou bouton
  // Paramètres) → chapitre court-circuité (skipped). Sinon la chaîne démarre à l'étape 1.
  if (d.storyQuests && typeof d.storyQuests === "object") {
    game.storyQuests = d.storyQuests;
    // v3.107.8 : « Les fondations » (ex-forest_10, ancien index 9) retirée de la chaîne Histoire.
    // Une save antérieure à cette version dont currentStep avait déjà dépassé cet index pointerait
    // sinon vers la mauvaise étape (décalée d'un cran) une fois le tableau raccourci de 15 à 14
    // entrées. Migration one-shot : abaisse currentStep de 1 si > 9, marquée pour ne jouer qu'une fois.
    var forestState = game.storyQuests.forest;
    if (forestState && !forestState.migratedV31078) {
      if (typeof forestState.currentStep === "number" && forestState.currentStep > 9) {
        forestState.currentStep -= 1;
      }
      forestState.migratedV31078 = true;
    }
  } else {
    game.storyQuests = {};
    if (d.playerName) {
      var storyTabs = ["combat", "village", "more", "dungeon", "shop", "talents", "equip", "ascension", "map", "achievements", "bestiary", "afflictions", "grimoire"];
      var allUnlocked = !d.unlockedTabs || storyTabs.every(function (t) { return !!game.unlockedTabs[t]; });
      if (allUnlocked) game.storyQuests.forest = { currentStep: 0, accepted: false, claimedSteps: {}, readyNotified: false, skipped: true };
    }
  }
  game.campfireLastUsed = typeof d.campfireLastUsed === "number" ? d.campfireLastUsed : 0;
  game.campfireShortLastUsed = typeof d.campfireShortLastUsed === "number" ? d.campfireShortLastUsed : 0;
  game.campRegenLastAt = typeof d.campRegenLastAt === "number" && d.campRegenLastAt > 0 ? d.campRegenLastAt : Date.now(); // v3.101.0
  game.activeAfflictions = (d.activeAfflictions && typeof d.activeAfflictions === "object") ? d.activeAfflictions : {};
  game.dungeonTiersEntered = d.dungeonTiersEntered && typeof d.dungeonTiersEntered === "object" ? d.dungeonTiersEntered : {};
  game.codexChaosSeen = !!d.codexChaosSeen;
  game.codexRead = d.codexRead && typeof d.codexRead === "object" ? d.codexRead : {};
  game.hasSeenOnboarding = !!d.hasSeenOnboarding;
  game.genericTutorialsSeen = d.genericTutorialsSeen && typeof d.genericTutorialsSeen === "object" ? d.genericTutorialsSeen : {};

  ensureUpgradeDefaults();
}

/* Remet les stats de base avant que StatsSystem.recalcStats() reconstruise tout — évite d'accumuler d'anciennes valeurs si rappelée. */
function reapplyProgressEffects() {
  game.tapDamage = 1;
  game.tapMult = 1;
  game.equipFlatTapBonus = 0;
  game.autoDps = 0;
  game.critChance = 5;
  game.critMult = 2;
  game.goldMult = 1;
  game.bossGoldBonusPct = 0;

  if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
    StatsSystem.recalcStats();
  }
}

/* Point d'entrée principal pour charger la partie au démarrage : lit le JSON, restaure l'état, recalcule les stats, vérifie les quêtes du jour.
   Détail : save-system_notes.md #26. */
function loadGame() {
  if (!game.saveSupported) return false;

  try {
    var raw = localStorage.getItem(getActiveSaveKey());
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
    localStorage.removeItem(getActiveSaveKey());
  } catch (e) {}
}

/* Reset "ascension" : réinitialise la run classique mais conserve l'Aether/les ascensions/les améliorations Aether. Appelée par ascendNow(). */
function hardResetState() {
  // v3.43 : rembourse intégralement toute commande de craft en cours
  // (y compris celle déjà démarrée) AVANT de figer keptResources
  // juste en dessous — décision explicite de Seb : contrairement à
  // huntRun/dungeonRun/adventureQuestRun (progression en cours perdue
  // sans remboursement), une ascension ne doit pas faire perdre des
  // ressources déjà déduites pour un craft jamais livré.
  if (window.WarehouseManager && typeof WarehouseManager.refundAndClearCraftQueue === "function") {
    WarehouseManager.refundAndClearCraftQueue();
  }

  var questDefaults = getDefaultQuestProgress();
  var keptAether = game.aether || 0;
  var keptTotalAetherEarned = game.totalAetherEarned || 0;
  var keptAscensions = game.ascensionCount || 0;
  var keptAetherUpgrades = Object.assign({}, game.aetherUpgrades || {});

  // v2.26 : la progression VRAIMENT permanente (Codex, hauts faits, boutique du donjon...) doit survivre à l'ascension comme l'Aether.
  // Détail : save-system_notes.md #28.
  var keptAchievementsClaimed = Object.assign({}, game.achievementsClaimed || {});
  var keptWorldsEverReached = Object.assign({}, game.worldsEverReached || {});
  var keptWorldQuestProgress = Object.assign({}, game.worldQuestProgress || {});
  var keptWorldQuestsCompleted = Object.assign({}, game.worldQuestsCompleted || {});
  // v3.0 : ressources rares et progression des quêtes d'aventure = progression permanente, comme les questlines de monde.
  // v3.35 : planche/lingot suivent la même règle (conservés à l'ascension, comme Bois/Fer).
  // v3.36 : pierre/farine idem.
  // v3.45 : eau/pain/ration idem (6e bâtiment Puits + recettes croisées).
  var keptResources = Object.assign({ viande: 0, ble: 0, bois: 0, fer: 0, pierre: 0, eau: 0, planche: 0, lingot: 0, farine: 0, pain: 0, ration: 0, petite_ration: 0, grande_ration: 0 }, game.resources || {});
  var keptAdventureQuestProgress = Object.assign({}, game.adventureQuestProgress || {});
  var keptAdventureQuestsCompleted = Object.assign({}, game.adventureQuestsCompleted || {});
  // v3.30 : huntStats (compteur de lots) = progression permanente, comme adventureQuestProgress.
  var keptHuntStats = Object.assign({}, game.huntStats || {});
  // v3.90.0 : Expéditions non-combat — explorationProgression (déblocages, ex. Clairière
  // oubliée) = progression permanente, même règle que adventureQuestsCompleted/huntStats.
  // explorationRun (le run éphémère lui-même), lui, ne survit PAS à l'ascension, comme
  // huntRun/dungeonRun/adventureQuestRun — décision explicite : pas de remboursement des
  // rations déjà consommées dans ce cas (même traitement que les 3 runs existants).
  var keptExplorationProgression = Object.assign(
    { blockedPathCompleted: false, forgottenClearingUnlocked: false, unstableVeinDiscoveryCompleted: false, quarryUnlocked: false, huntBuildingUnlocked: false, driedSpringDiscoveryCompleted: false, wellUnlocked: false },
    game.explorationProgression || {}
  );
  // v3.31 : bâtiments de production (niveau + stock local) = progression
  // permanente (v3.113.0 : l'ancien Village hors-ligne a disparu) — un joueur
  // qui a investi dans sa Chasse/Champs/Scierie/Mine ne perd pas ces niveaux
  // à l'ascension. deep-copy nécessaire (objet imbriqué par bâtiment).
  var keptProduction = JSON.parse(JSON.stringify(game.production || {}));
  // v3.37 : bâtiments de Construction = progression permanente,
  // même règle que Production (deep-copy pour la même raison : objet
  // imbriqué par bâtiment).
  var keptConstruction = JSON.parse(JSON.stringify(game.construction || {}));
  // v3.38 : progression de déblocage de l'Atelier = permanente,
  // même règle que Construction (une fois débloqué, jamais reverrouillé,
  // y compris à l'ascension).
  var keptWorkshopUnlock = JSON.parse(JSON.stringify(game.workshopUnlock || {}));
  var keptWorkshopFoundationsCompleted = !!game.workshopFoundationsCompleted;
  // v3.100.0 : chaîne Histoire = permanente à l'ascension, comme unlockedTabs (jamais reverrouillé).
  var keptStoryQuests = JSON.parse(JSON.stringify(game.storyQuests || {}));
  var keptDungeonTiersEntered = Object.assign({}, game.dungeonTiersEntered || {});
  var keptCodexChaosSeen = !!game.codexChaosSeen;
  var keptCodexRead = Object.assign({}, game.codexRead || {});
  // v3.14 : les quêtes journalières ne se réinitialisent plus à l'ascension (seulement au reset complet) — rien ne change dans la journée.
  // Détail : save-system_notes.md #30.
  var keptQuests = Array.isArray(game.quests) ? game.quests.slice() : [];
  var keptQuestProgress = Object.assign({}, game.questProgress || {});
  var keptQuestResetTime = game.questResetTime || 0;
  var keptDungeonShopLevels = Object.assign({}, game.dungeonShopLevels || {});
  // v2.90.11 : le déblocage séquentiel des paliers de donjon est une progression permanente, doit survivre à l'ascension.
  // Détail : save-system_notes.md #31.
  var keptDungeonTierCleared = Object.assign({}, game.dungeonTierCleared || {});
  var keptDungeonShards = Number(game.dungeonShards || 0);
  var keptDungeonBestWave = Number(game.dungeonBestWave || 0);
  var keptDungeonBossClears = Number(game.dungeonBossClears || 0);
  var keptDungeonTickets = Number(game.dungeonTickets != null ? game.dungeonTickets : 1);
  var keptDungeonTicketResetTime = Number(game.dungeonTicketResetTime || 0);
  var keptDungeonTicketsPurchasedToday = Number(game.dungeonTicketsPurchasedToday || 0);
  var keptEquipShopStock = game.equipShopStock || [];
  var keptEquipShopResetTime = Number(game.equipShopResetTime || 0);
  var keptEquipShopManualRefreshCount = Number(game.equipShopManualRefreshCount || 0);
  // v3.14 : le réglage d'autovente n'est plus conservé à l'ascension — logique puisque tout l'équipement est perdu à l'ascension.
  // Détail : save-system_notes.md #32.
  var keptHasSeenOnboarding = !!game.hasSeenOnboarding;
  var keptGenericTutorialsSeen = Object.assign({}, game.genericTutorialsSeen || {});

  game.gold = 0;
  game.essence = 0;
  game.aether = keptAether;
  game.totalAetherEarned = keptTotalAetherEarned;

  game.tapDamage = 1;
  game.tapMult = 1;
  game.equipFlatTapBonus = 0;
  game.autoDps = 0;
  game.critChance = 5;
  game.critMult = 2;
  game.goldMult = 1;
  game.bossGoldBonusPct = 0;
  game.essenceGlobalMult = 1;
  game.heroDefensePct = 0;

  game.trainedStats = { power: 0, endurance: 0, celerity: 0, precision: 0, will: 0 };

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
  game.quests = keptQuests;
  game.questProgress = keptQuestProgress;
  game.questResetTime = keptQuestResetTime;
  game.activeTab = "combat";
  game.enemy = null;
  game.lastOnline = Date.now();
  game.lastSave = 0;
  game.equipShopStock = keptEquipShopStock;
  game.equipShopResetTime = keptEquipShopResetTime;
  game.equipShopManualRefreshCount = keptEquipShopManualRefreshCount;

  game.activePotions = {};
  game.pendingPotionBonuses = { aetherNext: 0 };
  game.aetherElixirStackCount = 0;
  game.healingPotionsOwned = {};
  game.potionsOwned = {};
  game.lastHealUse = 0;

  game.dungeonTickets = keptDungeonTickets;
  game.dungeonTicketResetTime = keptDungeonTicketResetTime;
  game.dungeonTicketsPurchasedToday = keptDungeonTicketsPurchasedToday;
  game.dungeonRun = { active: false, wave: 0, tierId: 1 };
  // v3.2 : le run de quête en cours ne survit pas à l'ascension (la progression déjà enregistrée, elle, est conservée séparément).
  // Détail : save-system_notes.md #33.
  game.adventureQuestRun = { active: false, questId: null };
  // v3.30 : même traitement que adventureQuestRun juste au-dessus — le
  // run de chasse en cours ne survit pas à l'ascension.
  game.huntRun = { active: false, questId: null, killsInLot: 0 };
  // v3.90.0 : même traitement — le run d'Expédition en cours ne survit pas à l'ascension
  // (pas de remboursement des rations déjà consommées, cohérent avec huntRun/adventureQuestRun).
  game.explorationRun = null;
  // v3.92.0 : même règle pour la session de minijeu de minage — ne survit pas à l'ascension.
  // Le cooldown de l'activité bonus Carrière est aussi remis à zéro (pas de sens de le
  // faire survivre à un reset de la run classique) ; quarryUnlocked, lui, reste permanent
  // (voir keptExplorationProgression ci-dessus). v3.94.0 : même règle pour le Puits.
  game.gatheringActivity = { quarry: { cooldownEndsAt: 0, activeSession: null }, well: { cooldownEndsAt: 0, activeSession: null } };
  game.dungeonBestWave = keptDungeonBestWave;
  game.dungeonBossClears = keptDungeonBossClears;
  game.dungeonShards = keptDungeonShards;
  game.dungeonShopLevels = keptDungeonShopLevels;
  game.dungeonTierCleared = keptDungeonTierCleared;

  game.achievementsClaimed = keptAchievementsClaimed;

  game.worldsEverReached = keptWorldsEverReached;
  game.worldQuestProgress = keptWorldQuestProgress;
  game.worldQuestsCompleted = keptWorldQuestsCompleted;
  game.resources = keptResources;
  game.campRegenLastAt = Date.now(); // v3.101.0 : ascension = pas d'accrual
  game.adventureQuestProgress = keptAdventureQuestProgress;
  game.adventureQuestsCompleted = keptAdventureQuestsCompleted;
  game.huntStats = keptHuntStats;
  // v3.90.0 : progression permanente d'Expédition (déblocages) conservée à l'ascension.
  game.explorationProgression = keptExplorationProgression;
  game.production = keptProduction;
  game.construction = keptConstruction;
  game.workshopUnlock = keptWorkshopUnlock;
  game.workshopFoundationsCompleted = keptWorkshopFoundationsCompleted;
  game.storyQuests = keptStoryQuests;
  // v3.31 : lastTick de chaque bâtiment doit repartir de "maintenant"
  // à l'ascension (sinon le premier tick/boot suivant croirait à une
  // absence de plusieurs secondes égale au temps écoulé DANS
  // l'ancienne run, et créditerait à tort du stock rattrapé).
  Object.keys(game.production).forEach(function (id) {
    if (game.production[id] && typeof game.production[id] === "object") {
      game.production[id].lastTick = Date.now();
    }
  });
  game.dungeonTiersEntered = keptDungeonTiersEntered;
  game.codexChaosSeen = keptCodexChaosSeen;
  game.codexRead = keptCodexRead;

  // v3.34.0 : ressource/cooldowns de classe effacés à l'ascension —
  // même principe que les potions ("liées à la run", voir guide
  // d'équilibrage section 19), pas de Rage/Concentration/Mana ni de
  // cooldown de skill reportés d'une run à l'autre.
  game.classResource = null;
  game.classCooldowns = {};
  game.classActiveDefense = null;
  // v3.102.0 (P2) : combatMode = préférence, PRÉSERVÉE à l'ascension (comme autoSkillsEnabled avant) ; état de round remis à zéro
  if (game.combatMode !== "grimoire") game.combatMode = "tactique";
  game.combatRound = { number: 0, busy: false, continueAttack: false, clockMs: 0 };
  game.heroGauge = 0;
  game.silencedRounds = 0;
  game.sortie = null; // v3.102.1 : l'ascension part du camp, aucune sortie en cours

  game.autoSellEquipment = false;
  game.autoSellRarityThreshold = "common";
  game.hasSeenOnboarding = keptHasSeenOnboarding;
  game.genericTutorialsSeen = keptGenericTutorialsSeen;

  WorldManager.worldIndex = 0;
  WorldManager.adventureIndex = 0;
  WorldManager.enemyIndex = 0;
  if (typeof WorldManager.markWorldReached === "function") WorldManager.markWorldReached(0);

  if (typeof ensureUpgradeDefaults === "function") ensureUpgradeDefaults();

  if (typeof gameLog !== "undefined" && Array.isArray(gameLog)) gameLog.length = 0;

  // v3.14 : plus de régénération forcée des quêtes journalières ici — ça écrasait le "kept" plus haut ; QuestManager gère déjà leur renouvellement.
  // Détail : save-system_notes.md #34.

  reapplyProgressEffects();

  if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {StatsSystem.recalcStats();}
  game.heroHp = game.heroMaxHp;

}

/* Reset "complet" (bouton Paramètres) : efface VRAIMENT tout, y compris l'Aether et le héros. Redonne 1M d'or de départ (réglage debug à surveiller).
   Détail : save-system_notes.md #35. */
function fullResetState() {
  var questDefaults = getDefaultQuestProgress();

  // v2.26 : plus d'or de confort au reset complet (était 1 000 000,
  // un réglage de test qui n'avait pas sa place dans un vrai reset).
  game.gold = 0;
  game.essence = 0;
  game.aether = 0;
  game.totalAetherEarned = 0;
  game.playerName = "";
  game.heroId = "";

  game.tapDamage = 1;
  game.tapMult = 1;
  game.equipFlatTapBonus = 0;
  game.autoDps = 0;
  game.critChance = 5;
  game.critMult = 2;
  game.goldMult = 1;
  game.bossGoldBonusPct = 0;
  game.essenceGlobalMult = 1;
  game.heroDefensePct = 0;

  game.trainedStats = { power: 0, endurance: 0, celerity: 0, precision: 0, will: 0 };

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
  game.unlockedTabs = { campement: true, quests: true, settings: true }; // v3.99.15
  game.inventory = [];
  game.equipped = getDefaultEquipped();
  game.quests = [];
  game.questProgress = Object.assign({}, questDefaults);
  game.questResetTime = 0;
  game.activeTab = "combat";
  game.enemy = null;
  game.lastOnline = Date.now();
  game.lastSave = 0;
  // v2.26 : tous les systèmes ajoutés depuis la 1ère version de fullResetState() — oubliés jusqu'ici, un reset "complet" ne l'était pas vraiment.
  game.equipShopStock = [];
  game.equipShopResetTime = 0;
  game.equipShopManualRefreshCount = 0;

  game.activePotions = {};
  game.pendingPotionBonuses = { aetherNext: 0 };
  game.aetherElixirStackCount = 0;
  game.healingPotionsOwned = {};
  game.potionsOwned = {};
  game.lastHealUse = 0;

  game.dungeonRun = { active: false, wave: 0, tierId: 1 };
  game.adventureQuestRun = { active: false, questId: null };
  game.huntRun = { active: false, questId: null, killsInLot: 0 }; // v3.30
  game.explorationRun = null; // v3.90.0 : reset complet, tout repart de zéro
  game.gatheringActivity = { quarry: { cooldownEndsAt: 0, activeSession: null }, well: { cooldownEndsAt: 0, activeSession: null } }; // v3.92.0/v3.94.0
  game.campfireLastUsed = 0; // v3.7 : repos gratuit du Campement — repart bien à zéro sur un reset complet
  game.campfireShortLastUsed = 0; // v3.14 : idem pour le repos court
  game.campRegenLastAt = Date.now(); // v3.101.0
  game.activeAfflictions = {}; // v3.20 : remis à zéro sur un reset complet (conservé à l'ascension)
  game.dungeonBossClears = 0;
  game.dungeonShards = 0;
  game.dungeonShopLevels = {};
  // v2.90.11 : voir note dans buildSaveData() — repart bien à zéro
  // sur un reset complet, comme dungeonBossClears/dungeonShopLevels.
  game.dungeonTierCleared = {};

  game.worldsEverReached = {};
  game.worldQuestProgress = {};
  game.worldQuestsCompleted = {};
  // v3.0 : système Quêtes/Ressources/Territoire — repart bien à zéro
  // sur un reset complet, comme worldQuestProgress ci-dessus.
  // v3.35 : planche/lingot repartent aussi à zéro (artisanat tier 1).
  // v3.36 : pierre/farine idem.
  game.resources = { viande: 0, ble: 0, bois: 0, fer: 0, pierre: 0, eau: 0, planche: 0, lingot: 0, farine: 0, pain: 0, ration: 3, petite_ration: 0, grande_ration: 0 }; // v3.107.1 : 3 rations de départ (4 -> 3, décision Seb après test)
  game.adventureQuestProgress = {};
  game.adventureQuestsCompleted = {};
  game.huntStats = {}; // v3.30
  game.explorationProgression = { blockedPathCompleted: false, forgottenClearingUnlocked: false, unstableVeinDiscoveryCompleted: false, quarryUnlocked: false, huntBuildingUnlocked: false, driedSpringDiscoveryCompleted: false, wellUnlocked: false }; // v3.90.0/v3.92.0/v3.93.0/v3.94.0
  game.craftQueue = []; // v3.43 : repart à zéro, aucun remboursement à faire sur un reset complet (tout repart de zéro de toute façon)
  game.production = {}; // v3.31 : repart à zéro, ProductionManager.ensure() recrée les 4 bâtiments au niveau 1
  game.construction = {}; // v3.37 : repart à zéro, ConstructionManager.ensure() recrée workshop au niveau 0
  game.workshopUnlock = {}; // v3.38 : repart à zéro, WorkshopUnlockManager.ensure() recrée l'état initial (currentStep 0)
  game.workshopFoundationsCompleted = false; // v3.107.8
  game.storyQuests = {}; // v3.100.0 : repart à zéro, StoryQuestManager.ensure() recrée l'état initial (étape 1)
  game.dungeonTiersEntered = {};
  game.codexChaosSeen = false;
  game.codexRead = {};

  // v3.34.0 : reset complet -> ressource/cooldowns de classe effacés.
  game.classResource = null;
  game.classCooldowns = {};
  game.classActiveDefense = null;

  game.autoSellEquipment = false;
  game.autoSellRarityThreshold = "common";
  // v3.47.0 : préférence de confort (pas un état de run) — remise à
  // sa valeur par défaut (true) sur un reset complet uniquement,
  // volontairement PRÉSERVÉE à l'ascension (hardResetState, plus haut
  // dans ce fichier) : contrairement à autoSellEquipment/classResource,
  // rien ne justifie de forcer le joueur à la réactiver à chaque run.
  game.autoSkillsEnabled = false;
  // v3.102.0 (P2) : nouvelle partie = mode Tactique (décision §10 n°2) ; état de round vierge
  game.combatMode = "tactique";
  game.combatRound = { number: 0, busy: false, continueAttack: false, clockMs: 0 };
  game.heroGauge = 0;
  game.silencedRounds = 0;
  game.sortie = null; // v3.102.1
  // v3.66.0 : Mode Expert — même principe que autoSkillsEnabled
  // juste au-dessus (préférence d'affichage, préservée à l'ascension),
  // remise à sa valeur par défaut (off) seulement sur un reset complet.
  game.expertModeEnabled = false;
  // v3.50.0 : même principe que autoSkillsEnabled juste au-dessus —
  // configuration stratégique du joueur (pas un état de run), donc
  // volontairement PRÉSERVÉE à l'ascension (hardResetState, plus haut
  // dans ce fichier), remise à vide seulement sur un reset complet ici.
  game.grimoireRules = [];
  // v3.65.0 : même principe — les presets sont eux aussi une
  // configuration stratégique du joueur, préservée à l'ascension (rien
  // ne les touche dans hardResetState), remise à vide seulement ici.
  game.grimoirePresets = [];
  game.hasSeenOnboarding = false;
  game.genericTutorialsSeen = {}; // v3.107.9

  WorldManager.worldIndex = 0;
  WorldManager.adventureIndex = 0;
  WorldManager.enemyIndex = 0;
  if (typeof WorldManager.markWorldReached === "function") WorldManager.markWorldReached(0);

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

/* Bouton "Réinitialiser tout" des Paramètres : demande confirmation (irréversible) puis efface la sauvegarde et appelle fullResetState(). */
function resetGame() {
  var doReset = function () {
    clearSaveData();
    fullResetState();

    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
      CombatEngine.spawnEnemy();
    }

    if (typeof renderAll === "function") renderAll();
    // v3.7 : sans cet appel switchTab(), l'affichage restait figé sur l'écran d'où le reset a été déclenché au lieu de refléter activeTab="combat".
    // Détail : save-system_notes.md #38.
    if (typeof switchTab === "function") switchTab(game.activeTab || "combat");
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
window.restoreBaseState = restoreBaseState;
window.reapplyProgressEffects = reapplyProgressEffects;
window.ensureUpgradeDefaults = ensureUpgradeDefaults;
window.migrateHeroId = migrateHeroId;

/* v2.9 : export/import de sauvegarde (tout repose sur localStorage, rien côté serveur) — fichier JSON téléchargé ou code texte à copier/coller.
   Détail : save-system_notes.md #39. */

/* Génère le JSON de sauvegarde et déclenche son téléchargement comme
   fichier .json (le navigateur choisit où l'enregistrer). */
/* v3.29 : construit le payload d'export COMPLET (tous les emplacements occupés), partagé par exportSaveToFile() et showExportTextModal(). */
function buildMultiSaveExportPayload() {
  saveGame(); // l'emplacement actif doit être à jour avant de lire les autres

  var slots = {};
  var maxSlots = window.MAX_HERO_SLOTS || 3;
  for (var i = 1; i <= maxSlots; i++) {
    if (window.HeroSlotManager && HeroSlotManager.hasSlot(i)) {
      try {
        var raw = localStorage.getItem(getSlotKey(i));
        if (raw) slots[i] = JSON.parse(raw);
      } catch (e) {}
    }
  }

  return {
    aethervaleMultiSave: true,
    exportVersion: 1,
    activeSlot: getActiveSlot(),
    slots: slots
  };
}

/* Génère le JSON de sauvegarde et déclenche son téléchargement comme
   fichier .json (le navigateur choisit où l'enregistrer). */
/* v3.29 : bug corrigé — l'export n'incluait que l'emplacement actif ; exporte maintenant TOUS les emplacements occupés (nouveau format enveloppe).
   Détail : save-system_notes.md #41. */
function exportSaveToFile() {
  var payload = buildMultiSaveExportPayload();
  var json = JSON.stringify(payload, null, 2);
  var blob = new Blob([json], { type: "application/json" });
  var url = URL.createObjectURL(blob);

  var date = new Date().toISOString().slice(0, 10);
  var a = document.createElement("a");
  a.href = url;
  a.download = "quest-idle-save-" + date + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  var slotCount = Object.keys(payload.slots).length;
  showToast("💾 Sauvegarde exportée (" + slotCount + " héros)", 1800);
}

/* Affiche le JSON de sauvegarde dans une modale texte à copier manuellement — repli si le téléchargement de fichier ne convient pas. */
function showExportTextModal() {
  var host = document.getElementById("export-text-root");
  if (!host) return;
  // v3.29 : même correctif que exportSaveToFile() — inclut maintenant
  // tous les emplacements de héros occupés, pas seulement l'actif.
  var json = JSON.stringify(buildMultiSaveExportPayload());

  host.innerHTML = ''
    + '<div class="full-menu-overlay" onclick="if (event.target === this) closeExportTextModal();">'
    +   '<div class="full-menu" style="max-height:75vh;">'
    +     '<div class="full-menu-header"><h2>Code de sauvegarde</h2><button class="full-menu-close" type="button" onclick="closeExportTextModal()">✕</button></div>'
    +     '<div class="export-text-body">'
    +       '<p>Copie ce texte et garde-le en lieu sûr. Tu pourras le recoller via "Importer un code" pour restaurer cette progression.</p>'
    +       '<textarea readonly id="export-text-area" class="export-textarea">' + esc(json) + '</textarea>'
    +       '<button class="settings-btn" type="button" onclick="copyExportText()">📋 Copier</button>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}

/* Modale d'import par copier/coller (symétrique de showExportTextModal). */
function showImportTextModal() {
  var host = document.getElementById("export-text-root");
  if (!host) return;

  host.innerHTML = ''
    + '<div class="full-menu-overlay" onclick="if (event.target === this) closeExportTextModal();">'
    +   '<div class="full-menu" style="max-height:75vh;">'
    +     '<div class="full-menu-header"><h2>Importer un code</h2><button class="full-menu-close" type="button" onclick="closeExportTextModal()">✕</button></div>'
    +     '<div class="export-text-body">'
    +       '<p>Colle ici un code de sauvegarde exporté précédemment. Ça remplacera ta progression actuelle.</p>'
    +       '<textarea id="import-text-area" class="export-textarea" placeholder="Colle le code ici..."></textarea>'
    +       '<button class="settings-btn" type="button" onclick="importSaveFromText(document.getElementById(\'import-text-area\').value)">📥 Importer ce code</button>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}

function closeExportTextModal() {
  var host = document.getElementById("export-text-root");
  if (host) host.innerHTML = "";
}

function copyExportText() {
  var area = document.getElementById("export-text-area");
  if (!area) return;
  area.select();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(area.value)
      .then(function () { showToast("📋 Copié !", 1200); })
      .catch(function () { showToast("Sélectionne et copie manuellement", 1500); });
  } else {
    try {
      document.execCommand("copy");
      showToast("📋 Copié !", 1200);
    } catch (e) {
      showToast("Sélectionne et copie manuellement", 1500);
    }
  }
}

/* Vérifie grossièrement qu'un objet ressemble à une sauvegarde Aethervale avant de l'appliquer, pour éviter d'écraser la partie par erreur. */
function looksLikeQuestIdleSave(d) {
  return !!(d && typeof d === "object" &&
    typeof d.gold === "number" &&
    typeof d.heroId === "string" &&
    d.equipped !== undefined &&
    d.talents !== undefined);
}

/* v3.29 : détecte le nouveau format d'export multi-héros ({ aethervaleMultiSave: true, slots: {...} }), un ou plusieurs héros complets. */
function looksLikeMultiSave(d) {
  return !!(d && typeof d === "object" && d.aethervaleMultiSave === true &&
    d.slots && typeof d.slots === "object" && Object.keys(d.slots).length > 0);
}

/* Applique une sauvegarde importée après confirmation — reconnaît le nouveau format multi-héros ET l'ancien format à un seul héros.
   Détail : save-system_notes.md #45. */
function applyImportedSave(data) {
  var isMulti = looksLikeMultiSave(data);
  var isSingle = !isMulti && looksLikeQuestIdleSave(data);

  if (!isMulti && !isSingle) {
    showToast("❌ Fichier invalide (pas une sauvegarde Aethervale)", 2200);
    return;
  }

  var doImport = function () {
    if (isMulti) {
      // Écrit chaque emplacement du fichier dans sa clé localStorage dédiée ; les emplacements absents du fichier restent inchangés.
      var maxSlots = window.MAX_HERO_SLOTS || 3;
      var importedCount = 0;
      Object.keys(data.slots).forEach(function (slotKey) {
        var slotNum = parseInt(slotKey, 10);
        if (slotNum < 1 || slotNum > maxSlots) return;
        var slotData = data.slots[slotKey];
        if (!slotData) return;
        try {
          localStorage.setItem(getSlotKey(slotNum), JSON.stringify(slotData));
          importedCount++;
        } catch (e) {}
      });

      var targetSlot = (data.activeSlot && data.slots[data.activeSlot]) ? Number(data.activeSlot) : Number(Object.keys(data.slots)[0]);
      setActiveSlot(targetSlot);

      // Repart d'un état neuf avant de charger l'emplacement importé
      // (même précaution que HeroSlotManager.switchToSlot()).
      if (typeof createInitialGameState === "function") {
        var keptSaveSupported = game.saveSupported;
        var fresh = createInitialGameState();
        Object.keys(game).forEach(function (k) { delete game[k]; });
        Object.assign(game, fresh);
        game.saveSupported = keptSaveSupported;
      }
      loadGame();
      if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
      if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
      if (typeof resumeCombatAfterSlotChange === "function") resumeCombatAfterSlotChange();

      if (typeof renderAll === "function") renderAll();
      showToast("✅ Sauvegarde importée (" + importedCount + " héros)", 2000);
      addLog("📥 Sauvegarde multi-héros importée (" + importedCount + " héros).", "event");
    } else {
      // Ancien format (un seul héros) — importe dans l'EMPLACEMENT
      // ACTIF uniquement, comportement identique à avant ce correctif.
      restoreBaseState(data);
      reapplyProgressEffects();

      if (window.QuestManager && typeof QuestManager.checkReset === "function") {
        QuestManager.checkReset();
      }
      if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
        CombatEngine.spawnEnemy();
      }

      saveGame();
      if (typeof renderAll === "function") renderAll();
      showToast("✅ Sauvegarde importée", 1800);
      addLog("📥 Sauvegarde importée.", "event");
    }
  };

  // Ferme la modale d'import (copier/coller) AVANT d'ouvrir la
  // confirmation, sinon les deux se superposent et bloquent le clic.
  if (typeof closeExportTextModal === "function") closeExportTextModal();

  var confirmMsg = isMulti
    ? "Ceci va REMPLACER la progression des héros présents dans ce fichier (" + Object.keys(data.slots).length + "). Cette action est irréversible."
    : "Ceci va REMPLACER toute la progression de l'emplacement ACTIF par celle importée. Cette action est irréversible.";

  if (typeof showConfirmModal === "function") {
    showConfirmModal("Importer cette sauvegarde ?", confirmMsg, "📥", doImport);
  } else if (window.confirm(confirmMsg)) {
    doImport();
  }
}

/* Lit le fichier choisi via l'input caché (voir index.html) et tente
   de l'importer comme sauvegarde. */
function importSaveFromFile(fileInput) {
  var file = fileInput && fileInput.files && fileInput.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var data = JSON.parse(e.target.result);
      applyImportedSave(data);
    } catch (err) {
      showToast("❌ Fichier illisible (JSON invalide)", 2200);
    }
    fileInput.value = "";
  };
  reader.onerror = function () {
    showToast("❌ Erreur de lecture du fichier", 1800);
  };
  reader.readAsText(file);
}

function importSaveFromText(text) {
  try {
    var data = JSON.parse(text);
    applyImportedSave(data);
  } catch (err) {
    showToast("❌ Texte invalide (JSON incorrect)", 2200);
  }
}

function triggerImportFilePicker() {
  var input = document.getElementById("import-save-file-input");
  if (input) input.click();
}

window.exportSaveToFile = exportSaveToFile;
window.showExportTextModal = showExportTextModal;
window.showImportTextModal = showImportTextModal;
window.closeExportTextModal = closeExportTextModal;
window.copyExportText = copyExportText;
window.importSaveFromFile = importSaveFromFile;
window.importSaveFromText = importSaveFromText;
window.triggerImportFilePicker = triggerImportFilePicker;
