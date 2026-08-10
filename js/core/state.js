"use strict";
/* ============================================================
Quest Idle — core/state.js
Définit l'objet `game` global (toute la partie vivante en mémoire)
et ses valeurs par défaut. C'est LE fichier central : tous les
autres systèmes lisent/modifient `game`.
============================================================ */

/* Emplacements d'équipement du héros (arme/armure/amulette). */
function createDefaultEquipped() {
  return {
    weapon: null,
    armor: null,
    amulet: null
  };
}

/* Niveaux des bâtiments du village (VillageManager en systems/offline-system.js).
   watchtower (Vigie) et sanctuary (Sanctuaire d'Aether) ont été ajoutés
   en v1.9.2 ; VillageManager.ensure() les recrée aussi au runtime si absents
   d'une ancienne sauvegarde, donc les avoir ici est surtout pour la cohérence. */
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

/* État complet d'une nouvelle partie. Toute nouvelle donnée de jeu
   persistante doit être ajoutée ici ET dans ensureGameStateDefaults()
   ci-dessous (pour réparer les sauvegardes plus anciennes qui ne
   l'ont pas encore). */
function createInitialGameState() {
  return {
    gold: 0,
    essence: 0,
    aether: 0,
    totalAetherEarned: 0,   // cumul à vie, ne diminue jamais même dépensé (bonus passif)

    tapDamage: 1,
    tapMult: 1,
    equipFlatTapBonus: 0,
    autoDps: 0,
    critChance: 5,
    critMult: 2,
    goldMult: 1,
    // NOUVEAU v1.8 : progression des stats RPG via le shop (Force/Endurance/...)
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
    heroHp: 10,             // PV courants (recalculés/plafonnés dans StatsSystem.recalcStats)
    heroMaxHp: 10,           // PV max, dérivés de l'endurance (voir stats-system.js)
    heroDefensePct: 0,       // % de réduction des dégâts de riposte ennemie

    totalKills: 0,
    killCounts: {},          // { idEnnemi: nombre de fois tué } -> bestiaire + bonus
    upgrades: {},
    shopBuyAmount: 1,        // mode d'achat boutique : 1 / 10 / 25 / -1 (MAX)
    talents: {},
    enemy: null,
    activeTab: "combat",
    totalGoldEarned: 0,
    totalDamageDealt: 0,
    playTime: 0,
    cycleCount: 0,           // nombre de fois où tous les mondes ont été bouclés sans ascensionner
    ascensionCount: 0,

    inventory: [],
    equipped: createDefaultEquipped(),

    aetherUpgrades: {},
    quests: [],
    questProgress: Object.assign({}, DEFAULT_QUEST_PROGRESS),
    questResetTime: 0,

    saveSupported: false,
    lastSave: 0,
    lastOnline: 0,            // timestamp du dernier moment "en ligne", sert au calcul hors-ligne

    village: createDefaultVillage(),

    activePotions: {},                        // { idPotion: timestamp d'expiration }
    pendingPotionBonuses: { aetherNext: 0 },    // bonus sans minuteur (Élixir d'Aether)
    aetherElixirStackCount: 0,                  // v2.26 : nombre d'Élixirs d'Aether achetés depuis la dernière ascension (coût croissant)

    equipShopStock: [],          // 6 objets en vente à l'échoppe, voir systems/equip-shop-system.js
    equipShopResetTime: 0,        // prochain renouvellement du stock
    equipShopManualRefreshCount: 0,  // v2.27 : nombre de renouvellements payants depuis le dernier renouvellement

    dungeonTickets: 1,             // voir systems/dungeon-system.js
    dungeonTicketResetTime: 0,
    dungeonTicketsPurchasedToday: 0,
    dungeonRun: { active: false, wave: 0, tierId: 1 },
    dungeonBestWave: 0,
    dungeonBossClears: 0,
    dungeonShards: 0,           // monnaie exclusive au donjon, voir data/dungeon.js DUNGEON_SHOP
    dungeonShopLevels: {},

    healingPotionsOwned: {},   // { idPotionSoin: quantité en stock }, voir systems/potion-system.js
    lastHealUse: 0,             // timestamp du dernier usage (cooldown commun)

    autoSellEquipment: false,   // v2.26 : autovente du butin ≤ au seuil de rareté choisi
    autoSellRarityThreshold: "common", // v2.83.31 : seuil réglable (voir addDropToInventory)

    lastSpecialUse: 0,          // voir systems/special-attack-system.js
    specialBuffExpires: 0,
    specialBuffPct: 0,

    lastDefenseUse: 0,           // bouclier temporaire, voir DefenseManager
    defenseBuffExpires: 0,

    achievementsClaimed: {},   // { idHautFait: true }, voir systems/achievement-system.js

    worldsEverReached: {},      // { indexMonde: true }, persiste même après ascension — voir data/codex.js
    worldQuestProgress: {},     // v2.83 : { idQuestline: { idEtape: nombre } }, persiste même après ascension — voir systems/world-quest-system.js
    worldQuestsCompleted: {},   // v2.83 : { idQuestline: true }, persiste même après ascension — c'est CE flag qui débloque le monde
    dungeonTiersEntered: {},    // { idPalier: true }
    codexChaosSeen: false,      // vrai dès qu'un héros du Chaos a été choisi une fois
    codexRead: {},              // { idEntree: true }, voir systems/codex-system.js

    hasSeenOnboarding: false,   // tutoriel d'accueil, voir ui/onboarding-view.js

    playerName: "",
    heroId: ""
  };
}

var game = createInitialGameState();

/* Répare un objet `game` chargé depuis une sauvegarde (potentiellement
   ancienne) en comblant tous les champs manquants avec des valeurs par
   défaut sûres. Appelée au boot juste après le chargement, et de
   nouveau après un reset/ascension. Ne doit jamais écraser une valeur
   déjà présente et valide. */
function ensureGameStateDefaults() {
  if (!game.killCounts) game.killCounts = {};
  if (!game.upgrades) game.upgrades = {};
  if (!game.talents) game.talents = {};

  // NOUVEAU v1.8 : init + migration trainedStats (anciennes sauvegardes
  // avaient un simple compteur "utap" pour la Force, récupéré ici)
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
  if (typeof game.totalAetherEarned !== "number") game.totalAetherEarned = Number(game.aether || 0);
  if (!Array.isArray(game.quests)) game.quests = [];

  if (!game.questProgress || typeof game.questProgress !== "object") {
    game.questProgress = {};
  }

  // Comble les compteurs de quête manquants (ex: swordKills/bowKills/magicKills
  // ajoutés après coup) sans toucher à ceux déjà en cours.
  Object.keys(DEFAULT_QUEST_PROGRESS).forEach(function (key) {
    if (typeof game.questProgress[key] !== "number") {
      game.questProgress[key] = DEFAULT_QUEST_PROGRESS[key];
    }
  });

  // Pré-remplit game.upgrades/aetherUpgrades à 0 pour chaque amélioration
  // connue, pour que le reste du code puisse toujours lire une valeur
  // numérique sans avoir à vérifier `undefined` partout.
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

  if (typeof game.lastSpecialUse !== "number") game.lastSpecialUse = 0;
  if (typeof game.specialBuffExpires !== "number") game.specialBuffExpires = 0;
  if (typeof game.specialBuffPct !== "number") game.specialBuffPct = 0;

  if (typeof game.lastDefenseUse !== "number") game.lastDefenseUse = 0;
  if (typeof game.defenseBuffExpires !== "number") game.defenseBuffExpires = 0;

  if (!game.achievementsClaimed || typeof game.achievementsClaimed !== "object") game.achievementsClaimed = {};

  if (!game.worldsEverReached || typeof game.worldsEverReached !== "object") game.worldsEverReached = {};

  // v2.83 : questlines de déblocage des mondes — ensureDefaults() crée
  // les compteurs manquants, migrate() rattrape les parties antérieures
  // à v2.83 (un monde déjà atteint sous l'ancien système reste débloqué).
  if (window.WorldQuestManager && typeof WorldQuestManager.migrate === "function") {
    WorldQuestManager.migrate();
  }

  if (!game.dungeonTiersEntered || typeof game.dungeonTiersEntered !== "object") game.dungeonTiersEntered = {};
  if (typeof game.codexChaosSeen !== "boolean") game.codexChaosSeen = false;
  if (!game.codexRead || typeof game.codexRead !== "object") game.codexRead = {};

  if (typeof game.hasSeenOnboarding !== "boolean") game.hasSeenOnboarding = false;

  if (typeof game.heroLevel !== "number") game.heroLevel = 1;
  if (typeof game.heroXp !== "number") game.heroXp = 0;
  if (typeof game.heroXpToNext !== "number" || !isFinite(game.heroXpToNext) || game.heroXpToNext <= 0) {
    game.heroXpToNext = 20;
  }
  if (typeof game.talentPoints !== "number") game.talentPoints = 0;

  if (typeof game.playerName !== "string") game.playerName = "";
  if (typeof game.heroId !== "string") game.heroId = "";

  // Le mode d'achat doit être l'une de ces 4 valeurs ; sinon on revient à x1.
  if (![1, 10, 25, -1].includes(Number(game.shopBuyAmount))) {
    game.shopBuyAmount = 1;
  }
}

ensureGameStateDefaults();

window.game = game;
window.createDefaultEquipped = createDefaultEquipped;
window.createDefaultVillage = createDefaultVillage;
window.createInitialGameState = createInitialGameState;
window.ensureGameStateDefaults = ensureGameStateDefaults;