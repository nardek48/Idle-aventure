"use strict";
alert("main.js chargé")
/* ============================================================
   QUEST IDLE — data.js
   Données statiques du jeu : assets, mondes, upgrades, talents,
   équipements, quêtes, ascension et bonus bestiaire.
============================================================ */

// ============================================================
// 1. ASSETS
// ============================================================
var ASSETS = {
  enemies: {
    slime: "🟢",
    wolf: "🐺",
    goblin: "👺",
    spider: "🕷️",
    skeleton: "💀",
    ghoul: "🧟",
    gargoyle: "👹",
    spectre: "👻",
    zombie: "🧟",
    wraith: "👻",
    necromancer: "🧙",
    deadknight: "🤺",
    lavagolem: "🗿",
    dragonling: "🐲",
    minordemon: "😈",
    ifrit: "🔥",
    arcanegolem: "🗿",
    corruptmage: "🧙",
    hybrid: "🐲",
    guardian: "🛡️",
    scarab: "🪲",
    scorpion: "🦂",
    sandworm: "🪱",
    sandwarrior: "⚔️"
  },
  bosses: {
    slimeking: "🟢",
    skeletonlord: "💀",
    necrosupreme: "🧙",
    ancientdragon: "🐉",
    archmage: "🧙",
    djinn: "🧞"
  },
  worlds: {
    forest: "🌲",
    ruins: "🏛️",
    crypt: "⚰️",
    mountain: "🌋",
    tower: "🗼",
    desert: "🏜️"
  },
  equipment: {
    sword: "⚔️",
    axe: "🪓",
    bow: "🏹",
    staff: "🪄",
    shield: "🛡️",
    armor: "👕",
    robe: "👘",
    amulet: "📿",
    ring: "💍",
    crown: "👑"
  },
  ui: {
    gold: "💰",
    essence: "🔮",
    aether: "🌀",
    tap: "⚔️",
    boss: "🔥",
    chest: "🎁",
    star: "🌟"
  }
};

function renderIcon(cat, id) {
  return (ASSETS[cat] && ASSETS[cat][id]) || "❓";
}

// ============================================================
// 2. ENNEMIS / BOSS / Hero
// ============================================================
function makeRpgStats(power, endurance, celerity, precision, will) {
  return {
    power: power,
    endurance: endurance,
    celerity: celerity,
    precision: precision,
    will: will
  };
}

var RPG_STAT_LABELS = {
  power: "Puissance",
  endurance: "Endurance",
  celerity: "Célérité",
  precision: "Précision",
  will: "Volonté"
};


var ENEMY_DB = {
  slime: {
    name: "Slime",
    asset: "slime",
    image: "Images/Enemies/slime.jpg",
    resists: ["magic"],
    weak: ["sword"],
    stats: makeRpgStats(12, 18, 20, 8, 5)
  },
  wolf: {
    name: "Loup sauvage",
    asset: "wolf",
    image: "Images/Enemies/wolf.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(28, 24, 52, 30, 12)
  },
  goblin: {
    name: "Gobelin",
    asset: "goblin",
    image: "Images/Enemies/goblin.jpg",
    resists: ["bow"],
    weak: ["magic"],
    stats: makeRpgStats(24, 18, 44, 36, 14)
  },
  spider: {
    name: "Araignée géante",
    asset: "spider",
    image: "Images/Enemies/spider.jpg",
    resists: ["magic"],
    weak: ["bow"],
    stats: makeRpgStats(20, 14, 58, 34, 10)
  },
  skeleton: {
    name: "Squelette",
    asset: "skeleton",
    image: "Images/Enemies/skeleton.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(26, 34, 18, 26, 20)
  },
  ghoul: {
    name: "Goule",
    asset: "ghoul",
    image: "Images/Enemies/ghoul.jpg",
    resists: ["magic"],
    weak: ["sword"],
    stats: makeRpgStats(30, 28, 30, 22, 16)
  },
  gargoyle: {
    name: "Gargouille",
    asset: "gargoyle",
    image: "Images/Enemies/gargoyle.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(34, 48, 16, 20, 24)
  },
  spectre: {
    name: "Spectre",
    asset: "spectre",
    image: "Images/Enemies/spectre.jpg",
    resists: ["magic"],
    weak: ["bow"],
    stats: makeRpgStats(22, 18, 46, 28, 52)
  },
  zombie: {
    name: "Zombie",
    asset: "zombie",
    image: "Images/Enemies/zombie.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(24, 42, 10, 12, 8)
  },
  wraith: {
    name: "Spectre errant",
    asset: "wraith",
    image: "Images/Enemies/wraith.jpg",
    resists: ["magic"],
    weak: ["bow"],
    stats: makeRpgStats(34, 26, 42, 38, 60)
  },
  necromancer: {
    name: "Nécromancien",
    asset: "necromancer",
    image: "Images/Enemies/necromancer.jpg",
    resists: ["magic"],
    weak: ["sword", "bow"],
    stats: makeRpgStats(28, 20, 24, 34, 68)
  },
  deadknight: {
    name: "Chevalier mort",
    asset: "deadknight",
    image: "Images/Enemies/deadknight.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(40, 56, 18, 28, 26)
  },
  lavagolem: {
    name: "Golem de lave",
    asset: "lavagolem",
    image: "Images/Enemies/lavagolem.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(42, 74, 8, 16, 30)
  },
  dragonling: {
    name: "Dragonnet",
    asset: "dragonling",
    image: "Images/Enemies/dragonling.jpg",
    resists: ["bow"],
    weak: ["magic"],
    stats: makeRpgStats(38, 36, 34, 30, 24)
  },
  minordemon: {
    name: "Démon mineur",
    asset: "minordemon",
    image: "Images/Enemies/minordemon.jpg",
    resists: ["magic"],
    weak: ["sword"],
    stats: makeRpgStats(36, 30, 32, 28, 40)
  },
  ifrit: {
    name: "Ifrit",
    asset: "ifrit",
    image: "Images/Enemies/ifrit.jpg",
    resists: ["magic"],
    weak: ["bow"],
    stats: makeRpgStats(44, 34, 38, 32, 46)
  },
  arcanegolem: {
    name: "Golem arcanique",
    asset: "arcanegolem",
    image: "Images/Enemies/arcanegolem.jpg",
    resists: ["magic"],
    weak: ["sword"],
    stats: makeRpgStats(40, 70, 12, 22, 58)
  },
  corruptmage: {
    name: "Mage corrompu",
    asset: "corruptmage",
    image: "Images/Enemies/corruptmage.jpg",
    resists: ["magic"],
    weak: ["sword", "bow"],
    stats: makeRpgStats(32, 24, 28, 40, 72)
  },
  hybrid: {
    name: "Hybride",
    asset: "hybrid",
    image: "Images/Enemies/hybrid.jpg",
    resists: ["sword", "bow"],
    weak: ["magic"],
    stats: makeRpgStats(46, 44, 34, 36, 44)
  },
  guardian: {
    name: "Gardien",
    asset: "guardian",
    image: "Images/Enemies/guardian.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(38, 68, 14, 24, 40)
  },
  scarab: {
    name: "Scarabée",
    asset: "scarab",
    image: "Images/Enemies/scarab.jpg",
    resists: ["magic"],
    weak: ["sword"],
    stats: makeRpgStats(26, 22, 34, 26, 18)
  },
  scorpion: {
    name: "Scorpion",
    asset: "scorpion",
    image: "Images/Enemies/scorpion.jpg",
    resists: ["bow"],
    weak: ["magic"],
    stats: makeRpgStats(32, 30, 40, 34, 16)
  },
  sandworm: {
    name: "Ver des sables",
    asset: "sandworm",
    image: "Images/Enemies/sandworm.jpg",
    resists: ["sword"],
    weak: ["bow"],
    stats: makeRpgStats(42, 54, 22, 18, 12)
  },
  sandwarrior: {
    name: "Guerrier des sables",
    asset: "sandwarrior",
    image: "Images/Enemies/sandwarrior.jpg",
    resists: ["sword", "bow"],
    weak: ["magic"],
    stats: makeRpgStats(38, 40, 28, 32, 20)
  }
};

var BOSS_DB = {
  slimeking: {
    name: "Roi Slime géant",
    asset: "slimeking",
    image: "Images/Boss/Lord_Slim.jpg",
    resists: ["magic"],
    weak: ["sword"],
    stats: makeRpgStats(32, 58, 16, 18, 22)
  },
  djinn: {
    name: "Djinn des dunes",
    asset: "djinn",
    image: "Images/Boss/Lord_Djinn.jpg",
    resists: ["magic", "bow"],
    weak: ["sword"],
    stats: makeRpgStats(58, 48, 54, 46, 72)
  },
  skeletonlord: {
    name: "Seigneur squelette",
    asset: "skeletonlord",
    image: "Images/Boss/Lord_Skelette.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(44, 72, 14, 26, 34)
  },
  necrosupreme: {
    name: "Nécromancien suprême",
    asset: "necrosupreme",
    image: "Images/Boss/Lord_Necro.jpg",
    resists: ["magic"],
    weak: ["sword", "bow"],
    stats: makeRpgStats(42, 34, 28, 46, 86)
  },
  ancientdragon: {
    name: "Dragon ancien",
    asset: "ancientdragon",
    image: "Images/Boss/Lord_Dragon.jpg",
    resists: ["bow"],
    weak: ["magic"],
    stats: makeRpgStats(68, 78, 26, 40, 48)
  },
  archmage: {
    name: "Archimage",
    asset: "archmage",
    image: "Images/Boss/Lord_Archimage.jpg",
    resists: ["magic"],
    weak: ["sword", "bow"],
    stats: makeRpgStats(48, 32, 30, 52, 90)
  }
};

var HEROES_DB = {
  knight: {
    id: "knight",
    name: "Chevalier",
    image: "Images/Heroes/knight.jpg",
    stats: makeRpgStats(58, 74, 30, 38, 48)
  },
  ranger: {
    id: "ranger",
    name: "Rôdeur",
    image: "Images/Heroes/ranger.jpg",
    stats: makeRpgStats(46, 38, 72, 68, 40)
  },
  mage: {
    id: "mage",
    name: "Mage",
    image: "Images/Heroes/mage.jpg",
    stats: makeRpgStats(64, 34, 40, 50, 82)
  },
  assassin: {
    id: "ChaosNight",
    name: "Chevalier du Chaos",
    image: "Images/Heroes/ChaosNight.jpg",
    stats: makeRpgStats(72, 58, 44, 56, 46)
  },
  paladin: {
    id: "ChaosRanger",
    name: "Rôdeur du chaos",
    image: "Images/Heroes/ChaosRanger.jpg",
    stats: makeRpgStats(52, 46, 64, 60, 44)
  },
  necromancer: {
    id: "ChaosMage",
    name: "Sorcier du Chaos",
    image: "Images/Heroes/ChaosSorcier.jpg",
    stats: makeRpgStats(70, 36, 34, 48, 88)
  }
};

var HERO_LEVELING = {
  baseXp: 10,
  xpGrowth: 1.35
};

// ============================================================
// 3. MONDES
// ============================================================
var WORLD_PANEL_BACKGROUNDS = {
  forest: "Images/Worlds/World_Forest.jpg",
  ruins: "Images/Worlds/World_Ruins.jpg",
  crypt: "Images/Worlds/World_Crypt.jpg",
  mountain: "Images/Worlds/World_Mountain.jpg",
  tower: "Images/Worlds/World_Tower.jpg"
};


var WORLDS = [
  {
    id: "forest",
    name: "Forêt enchantée",
    assetKey: "forest",
    bg: "#0d1a0d",
    combatMap: "Images/Maps/forest-combat.jpg",
    adventures: [
      {
        id: "forest_1",
        name: "Lisière de la forêt",
        introText: "L'air est frais et plein de mystères...",
        enemyPool: ["slime", "wolf", "goblin", "spider"],
        enemyCount: 10,
        boss: "slimeking"
      },
      {
        id: "forest_2",
        name: "Cœur de la forêt",
        introText: "Les arbres semblent chuchoter votre nom...",
        enemyPool: ["wolf", "spider", "goblin", "slime"],
        enemyCount: 10,
        boss: "slimeking"
      }
    ]
  },
  {
    id: "desert",
    name: "Désert oublié",
    assetKey: "desert",
    bg: "#2a1b0f",
    combatMap: "Images/Maps/desert-combat.jpg",
    adventures: [
      {
        id: "desert_1",
        name: "Dunes brûlantes",
        introText: "Le soleil écrase les dunes et le vent charrie des menaces invisibles...",
        enemyPool: ["scarab", "scorpion", "sandworm", "sandwarrior"],
        enemyCount: 10,
        boss: "djinn"
      },
      {
        id: "desert_2",
        name: "Temple ensablé",
        introText: "Sous les sables repose un sanctuaire oublié où souffle une magie ancienne...",
        enemyPool: ["sandwarrior", "sandworm", "scorpion", "scarab"],
        enemyCount: 10,
        boss: "djinn"
      }
    ]
  },
  {
    id: "ruins",
    name: "Ruines anciennes",
    assetKey: "ruins",
    bg: "#1a1510",
    combatMap: "Images/Maps/ruins-combat.jpg",
    adventures: [
      {
        id: "ruins_1",
        name: "Couloirs effondrés",
        introText: "La poussière du temps recouvre chaque pierre...",
        enemyPool: ["skeleton", "ghoul", "gargoyle", "zombie"],
        enemyCount: 10,
        boss: "skeletonlord"
      },
      {
        id: "ruins_2",
        name: "Sanctuaire enseveli",
        introText: "Des inscriptions oubliées gravent les murs...",
        enemyPool: ["gargoyle", "zombie", "skeleton", "ghoul"],
        enemyCount: 10,
        boss: "skeletonlord"
      }
    ]
  },
  {
    id: "crypt",
    name: "Crypte oubliée",
    assetKey: "crypt",
    bg: "#0a0a15",
    combatMap: "Images/Maps/crypt-combat.jpg",
    adventures: [
      {
        id: "crypt_1",
        name: "Sépulcres silencieux",
        introText: "Un froid glacial s'infiltre dans vos os...",
        enemyPool: ["spectre", "wraith", "necromancer", "deadknight"],
        enemyCount: 10,
        boss: "necrosupreme"
      },
      {
        id: "crypt_2",
        name: "Chambre funéraire",
        introText: "Les morts refusent de reposer en paix...",
        enemyPool: ["deadknight", "necromancer", "wraith", "spectre"],
        enemyCount: 10,
        boss: "necrosupreme"
      }
    ]
  },
  {
    id: "mountain",
    name: "Montagne brûlante",
    assetKey: "mountain",
    bg: "#1a0d0a",
    combatMap: "Images/Maps/mountain-combat.jpg",
    adventures: [
      {
        id: "mountain_1",
        name: "Pentes de cendres",
        introText: "La chaleur devient presque insupportable...",
        enemyPool: ["lavagolem", "dragonling", "minordemon", "ifrit"],
        enemyCount: 10,
        boss: "ancientdragon"
      },
      {
        id: "mountain_2",
        name: "Antre du volcan",
        introText: "La lave illumine des silhouettes menaçantes...",
        enemyPool: ["ifrit", "minordemon", "dragonling", "lavagolem"],
        enemyCount: 10,
        boss: "ancientdragon"
      }
    ]
  },
  {
    id: "tower",
    name: "Tour du sorcier",
    assetKey: "tower",
    bg: "#0d0d1a",
    combatMap: "Images/Maps/tower-combat.jpg",
    adventures: [
      {
        id: "tower_1",
        name: "Sommet arcanique",
        introText: "La magie crépite dans l'air autour de vous...",
        enemyPool: ["arcanegolem", "corruptmage", "hybrid", "guardian"],
        enemyCount: 10,
        boss: "archmage"
      },
      {
        id: "tower_2",
        name: "Sanctuaire interdit",
        introText: "Le pouvoir ultime est presque à portée de main...",
        enemyPool: ["guardian", "hybrid", "corruptmage", "arcanegolem"],
        enemyCount: 10,
        boss: "archmage"
      }
    ]
  }
];

var AMBIANCE_TEXTS = [
  "Un bruit étrange résonne au loin...",
  "Vous sentez une présence magique...",
  "Les ombres dansent autour de vous...",
  "Une brise porte l'odeur du danger...",
  "Le sol vibre sous vos pieds...",
  "Des runes brillent faiblement sur les murs...",
  "Vous entendez un murmure incompréhensible..."
];

// ============================================================
// 4. UPGRADES
// ============================================================
var UPGRADES = [
  { id: "u_tap", name: "Force du héros", icon: "⚔️", desc: "+1 dégâts de tap par niveau.", baseCost: 15, costMult: 1.18, maxLevel: 250, unlockWorld: 0, apply: function (lvl) { game.tapDamage = 1 + lvl; } },
  { id: "u_auto", name: "Compagnon d'armes", icon: "🤖", desc: "+1 DPS auto par niveau.", baseCost: 45, costMult: 1.22, maxLevel: 200, unlockWorld: 0, apply: function (lvl) { game.autoDps = lvl; } },
  { id: "u_crit", name: "Précision affûtée", icon: "🎯", desc: "+0.5% critique par niveau.", baseCost: 50, costMult: 1.22, maxLevel: 60, unlockWorld: 0, apply: function (lvl) { game.critChance = 5 + lvl * 0.5; } },
  { id: "u_gold", name: "Bourse lourde", icon: "💰", desc: "+3% or gagné par niveau.", baseCost: 55, costMult: 1.21, maxLevel: 120, unlockWorld: 0, apply: function (lvl) { game.goldMult = 1 + lvl * 0.03; } },
  { id: "u_tap_mult", name: "Frappe maîtrisée", icon: "💥", desc: "+10% multiplicateur de tap par niveau.", baseCost: 100, costMult: 1.28, maxLevel: 50, unlockWorld: 1, apply: function (lvl) { game.tapMult = 1 + lvl * 0.10; } },
  { id: "u_crit_mult", name: "Exécution", icon: "🩸", desc: "+10% multiplicateur critique par niveau.", baseCost: 150, costMult: 1.27, maxLevel: 40, unlockWorld: 1, apply: function (lvl) { game.critMult = 2 + lvl * 0.10; } },
  { id: "u_auto_mult", name: "Machine de guerre", icon: "⚙️", desc: "+18% DPS auto final par niveau.", baseCost: 190, costMult: 1.33, maxLevel: 40, unlockWorld: 2, apply: function (lvl) { game.autoDps = (game.autoDps || 0) * (1 + lvl * 0.18); } },
  { id: "u_bounty", name: "Contrats lucratifs", icon: "📜", desc: "+10% or sur boss par niveau.", baseCost: 260, costMult: 1.32, maxLevel: 30, unlockWorld: 2, apply: function (lvl) { game.goldMult = (game.goldMult || 1) + lvl * 0.10; } }
];

function getUpgradeById(id) {
  for (var i = 0; i < UPGRADES.length; i++) {
    if (UPGRADES[i].id === id) return UPGRADES[i];
  }
  return null;
}

function getUpgradeCost(upgrade) {
  var lvl = game.upgrades[upgrade.id] || 0;
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, lvl));
}

// ============================================================
// 5. TALENTS
// ============================================================
var TALENTTREE = {
  combat: [
    { id: "t_sharpened_blades", name: "Lames affûtées", icon: "🗡️", cost: 8, row: 0, col: 1, effect: "+10% de dégâts sur les coups critiques" },
    { id: "t_war_instinct", name: "Instinct de guerre", icon: "🔥", cost: 12, row: 1, col: 0, requires: "t_sharpened_blades", effect: "+5% dégâts contre boss." },
    { id: "t_auto_tap", name: "Main spectrale", icon: "👆", cost: 18, row: 1, col: 2, requires: "t_sharpened_blades", effect: "Auto tap toutes les 2s." },
    { id: "t_boss_slayer", name: "Tueur de boss", icon: "👑", cost: 30, row: 2, col: 1, requires: "t_war_instinct", effect: "+20% dégâts critiques sur boss.", capstone: true },
    { id: "t_bloodlust", name: "Soif de sang", icon: "🩸", cost: 40, row: 3, col: 1, requires: "t_boss_slayer", effect: "+5% dégâts critiques par ascension, max 25%.", capstone: true }
  ],
  fortune: [
    { id: "t_interest", name: "Intérêt composé", icon: "💰", cost: 8, row: 0, col: 1, effect: "Petit gain d'or passif toutes les 10s." },
    { id: "t_scavenger", name: "Charognard", icon: "🧰", cost: 12, row: 1, col: 0, requires: "t_interest", effect: "+10% d'or sur ennemis normaux." },
    { id: "t_treasure_hunter", name: "Chasseur de trésors", icon: "🎁", cost: 18, row: 1, col: 2, requires: "t_interest", effect: "+1 progression quête trésor bonus sur événements." },
    { id: "t_golden_touch", name: "Toucher doré", icon: "✨", cost: 28, row: 2, col: 1, requires: "t_scavenger", effect: "+20% or global.", capstone: true },
    { id: "t_rich_ritual", name: "Rituel opulent", icon: "🏆", cost: 38, row: 3, col: 1, requires: "t_golden_touch", effect: "+1 Aether supplémentaire sur ascension importante.", capstone: true }
  ],
  survival: [
    { id: "t_regenerate", name: "Régénération", icon: "💚", cost: 10, row: 0, col: 1, effect: "+1 essence par seconde." },
    { id: "t_thick_skin", name: "Peau épaisse", icon: "🛡️", cost: 14, row: 1, col: 0, requires: "t_regenerate", effect: "+5% gains d'essence sur boss." },
    { id: "t_second_wind", name: "Second souffle", icon: "🌬️", cost: 18, row: 1, col: 2, requires: "t_regenerate", effect: "+10% récompenses en fin de chapitre." },
    { id: "t_essence_bloom", name: "Floraison d'essence", icon: "🔮", cost: 30, row: 2, col: 1, requires: "t_thick_skin", effect: "+25% essence globale.", capstone: true },
    { id: "t_last_stand", name: "Dernier rempart", icon: "🕯️", cost: 42, row: 3, col: 1, requires: "t_essence_bloom", effect: "+bonus passif hors-ligne accru.", capstone: true }
  ]
};

var TALENT_TREE = TALENTTREE;

function getAllTalentNodes() {
  return [].concat(TALENTTREE.combat, TALENTTREE.fortune, TALENTTREE.survival);
}

function getTalentById(id) {
  var all = getAllTalentNodes();
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === id) return all[i];
  }
  return null;
}

// ============================================================
// 6. ASCENSION
// ============================================================
var ASCENSION_CONFIG = {
  minWorldToAscend: 1,
  aetherPerBonus: 0.02,
  computeGain: function () {
    var goldPart = Math.floor(Math.sqrt(Math.max(0, game.totalGoldEarned)) / 14);
    var worldPart = (WorldManager.worldIndex || 0) * 3;
    var cyclePart = (game.cycleCount || 0) * 7;
    var killPart = Math.floor((game.totalKills || 0) / 75);

    return Math.max(0, goldPart + worldPart + cyclePart + killPart);
  }
};

var AETHER_SHOP = [
  { id: "a_tap", name: "Puissance ancestrale", icon: "⚔️", desc: "+10% dégâts de tap globaux par niveau.", baseCost: 1, costMult: 1.9, maxLevel: 20 },
  { id: "a_gold", name: "Fortune astrale", icon: "💰", desc: "+10% or global par niveau.", baseCost: 1, costMult: 1.9, maxLevel: 20 },
  { id: "a_loot", name: "Main du destin", icon: "🎁", desc: "+3% chance de loot boss par niveau.", baseCost: 2, costMult: 2.1, maxLevel: 15 },
  { id: "a_essence", name: "Noyau d'essence", icon: "🔮", desc: "+1 essence boss tous les 2 niveaux.", baseCost: 2, costMult: 2.2, maxLevel: 12 }
];

function getAetherUpgradeById(id) {
  for (var i = 0; i < AETHER_SHOP.length; i++) {
    if (AETHER_SHOP[i].id === id) return AETHER_SHOP[i];
  }
  return null;
}

function getAetherUpgradeCost(upgrade) {
  var lvl = game.aetherUpgrades[upgrade.id] || 0;
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, lvl));
}

// ============================================================
// 7. ÉQUIPEMENT
// ============================================================
var EQUIPMENT_DB = {
  weapon: [
    { name: "Dague rouillée", icon: "sword", rarity: "common", stat: "tapDmg", value: 3 },
    { name: "Épée de fer", icon: "sword", rarity: "common", stat: "tapDmg", value: 8 },
    { name: "Massette ébréchée", icon: "axe", rarity: "common", stat: "tapDmg", value: 12 },
    { name: "Bâton de bois", icon: "staff", rarity: "common", stat: "tapDmg", value: 5 },
    { name: "Arc de chasseur", icon: "bow", rarity: "common", stat: "tapMult", value: 0.15 },
    { name: "Hache de guerre", icon: "axe", rarity: "rare", stat: "tapDmg", value: 25 },
    { name: "Épée runique", icon: "sword", rarity: "rare", stat: "tapDmg", value: 35 },
    { name: "Arc elfe", icon: "bow", rarity: "rare", stat: "tapMult", value: 0.5 },
    { name: "Lame envoûtée", icon: "sword", rarity: "epic", stat: "tapMult", value: 1.0 },
    { name: "Bâton ardent", icon: "staff", rarity: "epic", stat: "tapDmg", value: 100 },
    { name: "Tranche-démon", icon: "sword", rarity: "legendary", stat: "tapMult", value: 2.0 }
  ],
  armor: [
    { name: "Tunique usée", icon: "armor", rarity: "common", stat: "goldMult", value: 0.05 },
    { name: "Armure de cuir", icon: "armor", rarity: "common", stat: "goldMult", value: 0.10 },
    { name: "Vieille cape", icon: "robe", rarity: "common", stat: "goldMult", value: 0.08 },
    { name: "Cotte de mailles", icon: "shield", rarity: "rare", stat: "goldMult", value: 0.25 },
    { name: "Armure renforcée", icon: "armor", rarity: "rare", stat: "goldMult", value: 0.30 },
    { name: "Bouclier runique", icon: "shield", rarity: "rare", stat: "goldMult", value: 0.35 },
    { name: "Armure runique", icon: "armor", rarity: "epic", stat: "goldMult", value: 0.50 },
    { name: "Plastron astral", icon: "armor", rarity: "epic", stat: "goldMult", value: 0.65 },
    { name: "Bouclier légendaire", icon: "shield", rarity: "legendary", stat: "goldMult", value: 1.0 }
  ],
  amulet: [
    { name: "Pendentif simple", icon: "amulet", rarity: "common", stat: "critChance", value: 2 },
    { name: "Anneau de cuivre", icon: "ring", rarity: "common", stat: "critMult", value: 0.3 },
    { name: "Charme fêlé", icon: "amulet", rarity: "common", stat: "critChance", value: 1 },
    { name: "Amulette sombre", icon: "amulet", rarity: "rare", stat: "critChance", value: 5 },
    { name: "Bague affûtée", icon: "ring", rarity: "rare", stat: "critMult", value: 0.6 },
    { name: "Médaillon d'ombre", icon: "amulet", rarity: "rare", stat: "critChance", value: 7 },
    { name: "Bague de sang", icon: "ring", rarity: "epic", stat: "critMult", value: 1.0 },
    { name: "Pendentif des étoiles", icon: "amulet", rarity: "epic", stat: "critChance", value: 10 },
    { name: "Collier divin", icon: "amulet", rarity: "legendary", stat: "critChance", value: 15 }
  ]
};

var RARITY_COLORS = {
  common: "#9ca3af",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b"
};

var RARITY_DROP_RATES = {
  common: 70,
  rare: 22,
  epic: 7,
  legendary: 1
};

var RARITY_ORDER = ["common", "rare", "epic", "legendary"];

// ============================================================
// 8. BONUS DE SET
// ============================================================
var SET_BONUS_CONFIG = {
  sameRarityCount: 3,
  bonuses: {
    common: {
      text: "+10% or",
      apply: function () {
        return { goldMult: 0.10 };
      }
    },
    rare: {
      text: "+15% dégâts tap",
      apply: function () {
        return { tapMult: 0.15 };
      }
    },
    epic: {
      text: "+20% critique",
      apply: function () {
        return { critChance: 20 };
      }
    },
    legendary: {
      text: "+25% or et +25% dégâts tap",
      apply: function () {
        return { goldMult: 0.25, tapMult: 0.25 };
      }
    }
  }
};

// ============================================================
// 9. QUÊTES
// ============================================================
var QUEST_CONFIG = {
  perDay: 3,
  resetHours: 24
};

var QUEST_TEMPLATES = [
  {
    id: "kills",
    name: "Chasseur débutant",
    icon: "⚔️",
    desc: "Vaincre {target} ennemis.",
    target: 25,
    rewardGold: 150,
    rewardEssence: 8,
    tracker: function () { return game.questProgress.kills || 0; }
  },
  {
    id: "bossKills",
    name: "Briseur de boss",
    icon: "👑",
    desc: "Vaincre {target} boss.",
    target: 3,
    rewardGold: 300,
    rewardEssence: 15,
    tracker: function () { return game.questProgress.bossKills || 0; }
  },
  {
    id: "goldEarned",
    name: "Bourse pleine",
    icon: "💰",
    desc: "Gagner {target} or.",
    target: 2000,
    rewardGold: 400,
    rewardEssence: 12,
    tracker: function () { return game.questProgress.goldEarned || 0; }
  },
  {
    id: "goldSpent",
    name: "Investisseur",
    icon: "🛒",
    desc: "Dépenser {target} or en améliorations.",
    target: 1500,
    rewardGold: 300,
    rewardEssence: 10,
    tracker: function () { return game.questProgress.goldSpent || 0; }
  },
  {
    id: "crits",
    name: "Exécuteur",
    icon: "💥",
    desc: "Infliger {target} coups critiques.",
    target: 20,
    rewardGold: 250,
    rewardEssence: 12,
    tracker: function () { return game.questProgress.crits || 0; }
  },
  {
    id: "treasures",
    name: "Chercheur de trésors",
    icon: "🎁",
    desc: "Déclencher {target} trésors.",
    target: 3,
    rewardGold: 450,
    rewardEssence: 18,
    tracker: function () { return game.questProgress.treasures || 0; }
  }
];

// ============================================================
// 10. OFFLINE
// ============================================================
var OFFLINE_CONFIG = {
  maxHours: 8,
  goldFactor: 0.35,
  essenceFactor: 0.20
};

// ============================================================
// 11. BESTIAIRE
// ============================================================
var BESTIARY_BONUS_CONFIG = {};
(function () {
  var allIds = Object.keys(ENEMY_DB).concat(Object.keys(BOSS_DB));
  allIds.forEach(function (id) {
    var isBoss = !!BOSS_DB[id];
    BESTIARY_BONUS_CONFIG[id] = isBoss ? [
      { kills: 3, goldBonus: 0.02, essenceBonus: 0.02, lootBonus: 0 },
      { kills: 10, goldBonus: 0.05, essenceBonus: 0.05, lootBonus: 2 },
      { kills: 25, goldBonus: 0.10, essenceBonus: 0.10, lootBonus: 5 }
    ] : [
      { kills: 10, goldBonus: 0.01, essenceBonus: 0 },
      { kills: 50, goldBonus: 0.03, essenceBonus: 0.01 },
      { kills: 100, goldBonus: 0.05, essenceBonus: 0.02 }
    ];
  });
})();
