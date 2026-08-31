"use strict";
/* core/state.js — objet `game` global et ses valeurs par défaut. Fichier central, lu/modifié par tous les systèmes.
   Toute nouvelle donnée persistante : l'ajouter ici ET dans ensureGameStateDefaults() (migration des vieilles sauvegardes).
   Détail complet : COMMENTAIRES_ORIGINAUX.md */

function createDefaultEquipped() {
  return {
    weapon: null,
    armor: null,
    helmet: null,
    gloves: null,
    boots: null,
    ring: null,
    amulet: null
  };
}

function createDefaultVillage() {
  return {
    goldMine: 0,
    essenceWell: 0,
    barracks: 0,
    timeRelay: 0,
    watchtower: 0,
    sanctuary: 0
  };
}

function createDefaultExplorationProgression() {
  return {
    blockedPathCompleted: false,
    forgottenClearingUnlocked: false,
    // v3.92.0 : "La Veine Instable" (Jalon B) — découverte du minijeu de minage +
    // déblocage définitif de la Carrière (data/exploration-quests.js: unstableVein).
    unstableVeinDiscoveryCompleted: false,
    quarryUnlocked: false,
    // v3.93.0 : "La Meute Affamée" (data/adventure-quests.js: hq_wolf_pack) — déblocage
    // définitif du bâtiment Chasse en Production, via AdventureQuestManager existant
    // (vrai combat), pas un nouveau moteur. Détecté et appliqué depuis quests-view.js
    // (openQuestCompletePopup) au moment où cette quête précise se termine.
    huntBuildingUnlocked: false,
    // v3.94.0 : "La Source Tarie" (data/exploration-quests.js: driedSpring) — minijeu
    // maintenir/relâcher (systems/well-system.js) + déblocage définitif du Puits.
    driedSpringDiscoveryCompleted: false,
    wellUnlocked: false
  };
}

function createDefaultGatheringActivity() {
  return {
    quarry: {
      cooldownEndsAt: 0,
      activeSession: null
    },
    // v3.94.0 : même structure que quarry, dédiée à l'activité bonus du Puits.
    well: {
      cooldownEndsAt: 0,
      activeSession: null
    }
  };
}

/* État complet d'une nouvelle partie. Toute nouvelle donnée de jeu
   persistante doit être ajoutée ici ET dans ensureGameStateDefaults()
   ci-dessous (pour réparer les sauvegardes plus anciennes qui ne
   l'ont pas encore). */
function createInitialGameState() {
  return {
    gold: 0,
    essence: 0,
    aether: 0,
    totalAetherEarned: 0,

    tapDamage: 1,
    tapMult: 1,
    equipFlatTapBonus: 0,
    autoDps: 0,
    critChance: 5,
    critMult: 2,
    goldMult: 1,
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
    heroHp: 10,
    heroMaxHp: 10,
    heroDefensePct: 0,

    totalKills: 0,
    killCounts: {},
    upgrades: {},
    shopBuyAmount: 1,
    talents: {},
    enemy: null,
    activeTab: "campement",
    // v3.99.15 : onglets débloqués par défaut à la création d'un héros — le reste
    // (combat, village, more/héros, et tout le menu ☰ sauf quêtes/paramètres) reste
    // caché tant que non débloqué. Voir ui/ui-root.js (isTabUnlocked) et
    // ui/menu-view.js (filtrage de MENU_ITEMS). Pas de condition de déblocage
    // automatique pour l'instant (viendra plus tard via les quêtes) — seul un
    // bouton dédié dans Paramètres permet de tout débloquer en une fois.
    unlockedTabs: { campement: true, quests: true, settings: true },
    storyQuests: {}, // v3.100.0 : chaîne Histoire, rempli par StoryQuestManager.ensure() (systems/story-quest-system.js)
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

    activePotions: {},
    pendingPotionBonuses: { aetherNext: 0 },
    aetherElixirStackCount: 0,

    equipShopStock: [],
    equipShopResetTime: 0,
    equipShopManualRefreshCount: 0,

    dungeonTickets: 1,
    dungeonTicketResetTime: 0,
    dungeonTicketsPurchasedToday: 0,
    dungeonRun: { active: false, wave: 0, tierId: 1 },
    dungeonBestWave: 0,
    dungeonBossClears: 0,
    dungeonShards: 0,
    dungeonShopLevels: {},

    healingPotionsOwned: {},
    lastHealUse: 0,

    autoSellEquipment: false,
    autoSellRarityThreshold: "common",

    autoSkillsEnabled: false,
    combatMode: "tactique", // v3.102.0 (P2) : "tactique" | "grimoire" (autoSkillsEnabled = miroir hérité)
    sortie: null, // v3.102.1 : sortie en cours { active, context, loot, potionsUsed, kills } — voir SortieManager.ensure()

    expertModeEnabled: false,

    grimoireRules: [],

    grimoirePresets: [],

    classResource: null,
    classCooldowns: {},
    classActiveDefense: null,

    combatSpeed: 1,

    achievementsClaimed: {},

    worldsEverReached: {},
    worldQuestProgress: {},
    worldQuestsCompleted: {},

    resources: { viande: 10, eau: 6, ble: 0, bois: 0, fer: 0 }, // v3.101.0 : 3 repas de départ (« les cendres d'Aeswyn ont laissé quelque chose »)
    adventureQuestProgress: {},
    adventureQuestsCompleted: {},
    adventureQuestRun: { active: false, questId: null },

    production: {},

    dungeonTiersEntered: {},
    codexChaosSeen: false,
    codexRead: {},

    hasSeenOnboarding: false,

    // v3.90.0 : moteur d'Expéditions non-combat (systems/exploration-engine.js) — jamais
    // de CombatEngine. explorationRun = run éphémère actif (null si aucun), voir la forme
    // complète dans exploration-engine.js. explorationProgression = déblocages persistants.
    explorationRun: null,
    explorationProgression: createDefaultExplorationProgression(),
    // v3.92.0 : session active du minijeu de minage (quête OU activité bonus Carrière,
    // voir systems/mining-system.js), séparée de explorationRun (moteur indépendant).
    gatheringActivity: createDefaultGatheringActivity(),

    playerName: "",
    heroId: ""
  };
}

var game = createInitialGameState();

function ensureGameStateDefaults() {
  if (!game.killCounts) game.killCounts = {};
  if (!game.upgrades) game.upgrades = {};
  if (!game.talents) game.talents = {};

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
  if (game.equipped.helmet === undefined) game.equipped.helmet = null;
  if (game.equipped.gloves === undefined) game.equipped.gloves = null;
  if (game.equipped.boots === undefined) game.equipped.boots = null;
  if (game.equipped.ring === undefined) game.equipped.ring = null;

  if (!game.aetherUpgrades) game.aetherUpgrades = {};
  if (typeof game.totalAetherEarned !== "number") game.totalAetherEarned = Number(game.aether || 0);
  if (!Array.isArray(game.quests)) game.quests = [];

  // v3.99.15 : garde-fou minimal — la vraie migration pour les sauvegardes
  // antérieures se fait dans systems/save-system.js:restoreBaseState() (après le
  // chargement réel, donc avec le bon contexte playerName/etc.). Ici, on couvre
  // seulement le cas où unlockedTabs serait devenu invalide en cours de partie.
  if (!game.unlockedTabs || typeof game.unlockedTabs !== "object") {
    game.unlockedTabs = { campement: true, quests: true, settings: true };
  }

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
  if (typeof game.village.watchtower !== "number") game.village.watchtower = 0;
  if (typeof game.village.sanctuary !== "number") game.village.sanctuary = 0;

  if (!game.classCooldowns || typeof game.classCooldowns !== "object") game.classCooldowns = {};
  if (typeof game.classResource === "undefined") game.classResource = null;
  if (typeof game.classActiveDefense === "undefined") game.classActiveDefense = null;

  if (game.combatMode !== "tactique" && game.combatMode !== "grimoire") game.combatMode = "tactique";

  if ([1, 2, 4].indexOf(Number(game.combatSpeed)) === -1) game.combatSpeed = 1;

  if (!game.activePotions || typeof game.activePotions !== "object") game.activePotions = {};
  if (!game.pendingPotionBonuses || typeof game.pendingPotionBonuses !== "object") {
    game.pendingPotionBonuses = { aetherNext: 0 };
  }
  if (typeof game.pendingPotionBonuses.aetherNext !== "number") game.pendingPotionBonuses.aetherNext = 0;
  if (typeof game.aetherElixirStackCount !== "number") game.aetherElixirStackCount = 0;

  if (!Array.isArray(game.equipShopStock)) game.equipShopStock = [];
  if (typeof game.equipShopResetTime !== "number") game.equipShopResetTime = 0;
  if (typeof game.equipShopManualRefreshCount !== "number") game.equipShopManualRefreshCount = 0;

  if (typeof game.dungeonTickets !== "number") game.dungeonTickets = 1;
  if (typeof game.dungeonTicketResetTime !== "number") game.dungeonTicketResetTime = 0;
  if (typeof game.dungeonTicketsPurchasedToday !== "number") game.dungeonTicketsPurchasedToday = 0;
  if (!game.dungeonRun || typeof game.dungeonRun !== "object") game.dungeonRun = { active: false, wave: 0, tierId: 1 };
  if (window.CampManager && typeof CampManager.ensureDefaults === "function") CampManager.ensureDefaults();
  if (window.AfflictionManager && typeof AfflictionManager.ensure === "function") AfflictionManager.ensure();
  if (typeof game.dungeonRun.tierId !== "number") game.dungeonRun.tierId = 1;
  if (typeof game.dungeonBestWave !== "number") game.dungeonBestWave = 0;
  if (typeof game.dungeonBossClears !== "number") game.dungeonBossClears = 0;
  if (typeof game.dungeonShards !== "number") game.dungeonShards = 0;
  if (!game.dungeonShopLevels || typeof game.dungeonShopLevels !== "object") game.dungeonShopLevels = {};

  if (!game.healingPotionsOwned || typeof game.healingPotionsOwned !== "object") game.healingPotionsOwned = {};
  if (typeof game.lastHealUse !== "number") game.lastHealUse = 0;

  if (typeof game.autoSellEquipment !== "boolean") game.autoSellEquipment = false;
  if (typeof game.autoSellRarityThreshold !== "string" || (typeof RARITY_ORDER !== "undefined" && RARITY_ORDER.indexOf(game.autoSellRarityThreshold) === -1)) {
    game.autoSellRarityThreshold = "common";
  }
  if (typeof game.autoSkillsEnabled !== "boolean") game.autoSkillsEnabled = (game.combatMode === "grimoire");
  if (typeof game.expertModeEnabled !== "boolean") game.expertModeEnabled = false;

  if (!Array.isArray(game.grimoireRules)) {
    game.grimoireRules = [];
  } else if (typeof sanitizeGrimoireRules === "function") {
    game.grimoireRules = sanitizeGrimoireRules(game.grimoireRules, null);
  }

  if (!Array.isArray(game.grimoirePresets)) {
    game.grimoirePresets = [];
  } else {
    game.grimoirePresets = game.grimoirePresets.filter(function (p) {
      return p && typeof p === "object" && typeof p.id === "string" && typeof p.name === "string" && Array.isArray(p.rules);
    }).map(function (p) {
      return {
        id: p.id,
        name: p.name,
        icon: typeof p.icon === "string" ? p.icon : "📖",
        rules: (typeof sanitizeGrimoireRules === "function") ? sanitizeGrimoireRules(p.rules, null) : p.rules,
        lastModified: typeof p.lastModified === "number" ? p.lastModified : 0
      };
    });
  }

  if (typeof game.lastSpecialUse !== "number") game.lastSpecialUse = 0;
  if (typeof game.specialBuffExpires !== "number") game.specialBuffExpires = 0;
  if (typeof game.specialBuffPct !== "number") game.specialBuffPct = 0;

  if (typeof game.lastDefenseUse !== "number") game.lastDefenseUse = 0;
  if (typeof game.defenseBuffExpires !== "number") game.defenseBuffExpires = 0;

  if (!game.achievementsClaimed || typeof game.achievementsClaimed !== "object") game.achievementsClaimed = {};

  if (!game.worldsEverReached || typeof game.worldsEverReached !== "object") game.worldsEverReached = {};

  if (window.WorldQuestManager && typeof WorldQuestManager.migrate === "function") {
    WorldQuestManager.migrate();
  }

  if (!game.resources || typeof game.resources !== "object") game.resources = {};
  if (window.AdventureQuestManager && typeof AdventureQuestManager.ensureDefaults === "function") {
    AdventureQuestManager.ensureDefaults();
  }

  if (!game.dungeonTiersEntered || typeof game.dungeonTiersEntered !== "object") game.dungeonTiersEntered = {};
  if (typeof game.codexChaosSeen !== "boolean") game.codexChaosSeen = false;
  if (!game.codexRead || typeof game.codexRead !== "object") game.codexRead = {};

  if (typeof game.hasSeenOnboarding !== "boolean") game.hasSeenOnboarding = false;

  // v3.90.0 : migration Expéditions — sauvegarde ancienne sans ces champs = valeurs par
  // défaut sûres (run absent, aucun déblocage). Ne recrée jamais un run à partir de rien.
  if (game.explorationRun !== null && typeof game.explorationRun !== "object") {
    game.explorationRun = null;
  }
  if (!game.explorationProgression || typeof game.explorationProgression !== "object") {
    game.explorationProgression = createDefaultExplorationProgression();
  }
  if (typeof game.explorationProgression.blockedPathCompleted !== "boolean") {
    game.explorationProgression.blockedPathCompleted = false;
  }
  if (typeof game.explorationProgression.forgottenClearingUnlocked !== "boolean") {
    game.explorationProgression.forgottenClearingUnlocked = false;
  }
  // v3.93.0 : garde de forme uniquement (valeur par défaut sûre) — la vraie logique de
  // migration (sauvegarde existante -> true d'office) vit dans save-system.js/loadGame(),
  // même pattern que quarryUnlocked.
  if (typeof game.explorationProgression.huntBuildingUnlocked !== "boolean") {
    game.explorationProgression.huntBuildingUnlocked = false;
  }
  // v3.94.0 : même garde de forme pour le Puits — vraie migration dans save-system.js.
  if (typeof game.explorationProgression.driedSpringDiscoveryCompleted !== "boolean") {
    game.explorationProgression.driedSpringDiscoveryCompleted = false;
  }
  if (typeof game.explorationProgression.wellUnlocked !== "boolean") {
    game.explorationProgression.wellUnlocked = false;
  }
  if (!game.gatheringActivity || typeof game.gatheringActivity !== "object") {
    game.gatheringActivity = createDefaultGatheringActivity();
  }
  if (!game.gatheringActivity.well || typeof game.gatheringActivity.well !== "object") {
    game.gatheringActivity.well = { cooldownEndsAt: 0, activeSession: null };
  }

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
}

ensureGameStateDefaults();

window.game = game;
window.createDefaultEquipped = createDefaultEquipped;
window.createDefaultVillage = createDefaultVillage;
window.createDefaultExplorationProgression = createDefaultExplorationProgression;
window.createInitialGameState = createInitialGameState;
window.ensureGameStateDefaults = ensureGameStateDefaults;