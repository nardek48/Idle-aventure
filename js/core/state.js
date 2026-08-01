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

    equipShopStock: [],          // 6 objets en vente à l'échoppe, voir systems/equip-shop-system.js
    equipShopResetTime: 0,        // prochain renouvellement du stock

    dungeonTickets: 1,             // voir systems/dungeon-system.js
    dungeonTicketResetTime: 0,
    dungeonRun: { active: false, wave: 0 },
    dungeonBestWave: 0,

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

  if (!Array.isArray(game.equipShopStock)) game.equipShopStock = [];
  if (typeof game.equipShopResetTime !== "number") game.equipShopResetTime = 0;

  if (typeof game.dungeonTickets !== "number") game.dungeonTickets = 1;
  if (typeof game.dungeonTicketResetTime !== "number") game.dungeonTicketResetTime = 0;
  if (!game.dungeonRun || typeof game.dungeonRun !== "object") game.dungeonRun = { active: false, wave: 0 };
  if (typeof game.dungeonBestWave !== "number") game.dungeonBestWave = 0;

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