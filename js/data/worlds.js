"use strict";
/* data/worlds.js — mondes, chapitres, ambiance et fonds de panneaux. Ordre = progression linéaire (WorldManager.worldIndex).
   Note : requiredAscension potentiellement vestigial depuis v2.83 (world-quests.js), à vérifier. Détail : COMMENTAIRES_ORIGINAUX.md */

var WORLD_PANEL_BACKGROUNDS = {
  forest: "../images/Worlds/World_Forest.jpg",
  ruins: "../images/Worlds/World_Ruins.jpg",
  crypt: "../images/Worlds/World_Crypt.jpg",
  mountain: "../images/Worlds/World_Mountain.jpg",
  tower: "../images/Worlds/World_Tower.jpg",
  desert: "../images/Worlds/World_Desert.jpg"
};

var WORLDS = [
  {
    id: "forest",
    name: "Forêt enchantée",
    requiredAscension: 0,
    assetKey: "forest",
    bg: "#0d1a0d",
    combatMap: "../images/Maps/forest-combat.jpg",
    adventures: [
      {
        id: "forest_1",
        name: "Lisière de la forêt",
        introText: "L'air est frais et plein de mystères...",
        enemyPool: ["slime", "wolf", "goblin", "spider", "foresttroll", "bramble"], // v3.104.0 (P5) : +Troll des forêts, +Ronce animée
        enemyCount: 10,
        boss: "slimeking"
      },
      {
        id: "forest_2",
        name: "Cœur de la forêt",
        introText: "Les arbres semblent chuchoter votre nom...",
        enemyPool: ["wolf", "spider", "goblin", "slime", "foresttroll", "bramble"], // v3.104.0 (P5) : +Troll des forêts, +Ronce animée
        enemyCount: 10,
        boss: "orcwarlord" // v3.104.0 (P5) : nouveau boss du Cœur (le Roi Slime reste le boss de Lisière, forest_1)
      }
    ]
  },
  {
    id: "desert",
    name: "Désert oublié",
    requiredAscension: 0,
    assetKey: "desert",
    bg: "#2a1b0f",
    combatMap: "../images/Maps/desert-combat.jpg",
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
    requiredAscension: 2,
    assetKey: "ruins",
    bg: "#1a1510",
    combatMap: "../images/Maps/ruins-combat.jpg",
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
    requiredAscension: 3,
    assetKey: "crypt",
    bg: "#0a0a15",
    combatMap: "../images/Maps/crypt-combat.jpg",
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
    requiredAscension: 6,
    assetKey: "mountain",
    bg: "#1a0d0a",
    combatMap: "../images/Maps/mountain-combat.jpg",
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
    requiredAscension: 10,
    assetKey: "tower",
    bg: "#0d0d1a",
    combatMap: "../images/Maps/tower-combat.jpg",
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
