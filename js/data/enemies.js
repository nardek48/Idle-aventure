"use strict";
/* ============================================================
QUEST IDLE — data/enemies.js
Assets globaux, helpers d'icônes, stats RPG, ennemis et bonus bestiaire.
============================================================ */

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

var BESTIARY_BONUS_CONFIG = {};