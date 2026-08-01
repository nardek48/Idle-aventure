"use strict";
/* ============================================================
QUEST IDLE — data/enemies.js
Assets globaux, helpers d'icônes, stats RPG, ennemis et bonus bestiaire.
============================================================ */

/* Table d'emoji utilisée comme repli visuel partout où une vraie image
   pourrait manquer (voir renderIcon ci-dessous). Organisée par
   catégorie : enemies/bosses/worlds/equipment/ui. */
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

/* Renvoie l'emoji associé à (catégorie, id), ou un "❓" de secours si
   la combinaison n'existe pas dans ASSETS. Utilisé notamment par le
   bestiaire et l'aperçu de monstres de la carte du monde. */
function renderIcon(cat, id) {
  return (ASSETS[cat] && ASSETS[cat][id]) || "❓";
}

/* Construit un objet de stats RPG à 5 axes, dans un ordre fixe et
   positionnel (voir data/heroes.js pour le détail de ce que fait
   chaque stat côté héros/ennemi). */
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

/* Base de tous les ennemis normaux (hors boss, voir data/bosses.js).
   - resists/weak : types de dégâts ("sword"/"bow"/"magic", voir
     WEAPON_ICON_DAMAGE_TYPE dans combat-engine.js) qui infligent
     respectivement -30% / +30% de dégâts contre cet ennemi
   - stats.endurance pilote directement les PV de l'ennemi
     (voir WorldManager.generateEnemy en progression-system.js)
   - stats.power/celerity/precision/will pilotent sa riposte
     (voir CombatEngine.enemyStrike en combat-engine.js) */
var ENEMY_DB = {
  slime: {
    name: "Slime",
    asset: "slime",
    image: "./images/Enemies/slime.jpg",
    resists: ["magic"],
    weak: ["sword"],
    stats: makeRpgStats(12, 18, 20, 8, 5)
  },
  wolf: {
    name: "Loup sauvage",
    asset: "wolf",
    image: "./images/Enemies/wolf.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(28, 24, 52, 30, 12)
  },
  goblin: {
    name: "Gobelin",
    asset: "goblin",
    image: "./images/Enemies/goblin.jpg",
    resists: ["bow"],
    weak: ["magic"],
    stats: makeRpgStats(24, 18, 44, 36, 14)
  },
  spider: {
    name: "Araignée géante",
    asset: "spider",
    image: "./images/Enemies/spider.jpg",
    resists: ["magic"],
    weak: ["bow"],
    stats: makeRpgStats(20, 14, 58, 34, 10)
  },
  skeleton: {
    name: "Squelette",
    asset: "skeleton",
    image: "./images/Enemies/skeleton.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(26, 34, 18, 26, 20)
  },
  ghoul: {
    name: "Goule",
    asset: "ghoul",
    image: "./images/Enemies/ghoul.jpg",
    resists: ["magic"],
    weak: ["sword"],
    stats: makeRpgStats(30, 28, 30, 22, 16)
  },
  gargoyle: {
    name: "Gargouille",
    asset: "gargoyle",
    image: "./images/Enemies/gargoyle.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(34, 48, 16, 20, 24)
  },
  spectre: {
    name: "Spectre",
    asset: "spectre",
    image: "./images/Enemies/spectre.jpg",
    resists: ["magic"],
    weak: ["bow"],
    stats: makeRpgStats(22, 18, 46, 28, 52)
  },
  zombie: {
    name: "Zombie",
    asset: "zombie",
    image: "./images/Enemies/zombie.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(24, 42, 10, 12, 8)
  },
  wraith: {
    name: "Spectre errant",
    asset: "wraith",
    image: "./images/Enemies/wraith.jpg",
    resists: ["magic"],
    weak: ["bow"],
    stats: makeRpgStats(34, 26, 42, 38, 60)
  },
  necromancer: {
    name: "Nécromancien",
    asset: "necromancer",
    image: "./images/Enemies/necromancer.jpg",
    resists: ["magic"],
    weak: ["sword", "bow"],
    stats: makeRpgStats(28, 20, 24, 34, 68)
  },
  deadknight: {
    name: "Chevalier mort",
    asset: "deadknight",
    image: "./images/Enemies/deadknight.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(40, 56, 18, 28, 26)
  },
  lavagolem: {
    name: "Golem de lave",
    asset: "lavagolem",
    image: "./images/Enemies/lavagolem.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(42, 74, 8, 16, 30)
  },
  dragonling: {
    name: "Dragonnet",
    asset: "dragonling",
    image: "./images/Enemies/dragonling.jpg",
    resists: ["bow"],
    weak: ["magic"],
    stats: makeRpgStats(38, 36, 34, 30, 24)
  },
  minordemon: {
    name: "Démon mineur",
    asset: "minordemon",
    image: "./images/Enemies/minordemon.jpg",
    resists: ["magic"],
    weak: ["sword"],
    stats: makeRpgStats(36, 30, 32, 28, 40)
  },
  ifrit: {
    name: "Ifrit",
    asset: "ifrit",
    image: "./images/Enemies/ifrit.jpg",
    resists: ["magic"],
    weak: ["bow"],
    stats: makeRpgStats(44, 34, 38, 32, 46)
  },
  arcanegolem: {
    name: "Golem arcanique",
    asset: "arcanegolem",
    image: "./images/Enemies/arcanegolem.jpg",
    resists: ["magic"],
    weak: ["sword"],
    stats: makeRpgStats(40, 70, 12, 22, 58)
  },
  corruptmage: {
    name: "Mage corrompu",
    asset: "corruptmage",
    image: "./images/Enemies/corruptmage.jpg",
    resists: ["magic"],
    weak: ["sword", "bow"],
    stats: makeRpgStats(32, 24, 28, 40, 72)
  },
  hybrid: {
    name: "Hybride",
    asset: "hybrid",
    image: "./images/Enemies/hybrid.jpg",
    resists: ["sword", "bow"],
    weak: ["magic"],
    stats: makeRpgStats(46, 44, 34, 36, 44)
  },
  guardian: {
    name: "Gardien",
    asset: "guardian",
    image: "./images/Enemies/guardian.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(38, 68, 14, 24, 40)
  },
  scarab: {
    name: "Scarabée",
    asset: "scarab",
    image: "./images/Enemies/scarab.jpg",
    resists: ["magic"],
    weak: ["sword"],
    stats: makeRpgStats(26, 22, 34, 26, 18)
  },
  scorpion: {
    name: "Scorpion",
    asset: "scorpion",
    image: "./images/Enemies/scorpion.jpg",
    resists: ["bow"],
    weak: ["magic"],
    stats: makeRpgStats(32, 30, 40, 34, 16)
  },
  sandworm: {
    name: "Ver des sables",
    asset: "sandworm",
    image: "./images/Enemies/sandworm.jpg",
    resists: ["sword"],
    weak: ["bow"],
    stats: makeRpgStats(42, 54, 22, 18, 12)
  },
  sandwarrior: {
    name: "Guerrier des sables",
    asset: "sandwarrior",
    image: "./images/Enemies/sandwarrior.jpg",
    resists: ["sword", "bow"],
    weak: ["magic"],
    stats: makeRpgStats(38, 40, 28, 32, 20)
  }
};

/* Rempli dynamiquement par l'IIFE en fin de data/bosses.js (une fois
   ENEMY_DB et BOSS_DB tous les deux chargés), avec des paliers de
   bonus or/essence/butin par nombre de kills sur chaque créature. Lu
   par getBestiaryBonus()/getTotalBestiaryBonus() en systems/stats-system.js. */
var BESTIARY_BONUS_CONFIG = {};
