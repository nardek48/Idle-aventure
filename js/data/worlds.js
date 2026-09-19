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
        introText: "L'air est frais. Ce qui rôde à la Lisière ne dort jamais.", // v3.197.0 (bible B §4.1)
        // v3.107.4 : pool de base réduit aux 3 ennemis génériques (décision Seb — tutoriel, pas de
        // surcharge). Loup, Troll, Ronce restent dans ENEMY_DB mais ne sortent plus du farm libre :
        // ils n'apparaissent que via enemyFilter sur leur quête dédiée (hq_wolf_pack pour le Loup).
        enemyPool: ["slime", "goblin", "spider"],
        enemyCount: 10,
        boss: "slimeking"
      },
      {
        id: "forest_2",
        name: "Cœur de la forêt",
        introText: "Ici, la forêt ne chuchote plus : elle observe.", // v3.197.0 (bible B §4.1)
        enemyPool: ["slime", "goblin", "spider"], // v3.107.4 : voir note Lisière ci-dessus, même logique
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
        introText: "Le sable prend tout, et rend tard. Ce qui vit ici a le temps.", // v3.197.0 (bible B §4.1)
        enemyPool: ["scarab", "scorpion", "sandworm", "sandwarrior"],
        enemyCount: 10,
        boss: "djinn"
      },
      {
        id: "desert_2",
        name: "Temple ensablé",
        reachedFlag: "templeReached", // v3.310.0 : posé par la descente (acte II §4), relu au voyage retour
        introText: "Sous le sable, des pierres taillées avant tout le reste. Elles n'ont pas fini d'attendre.", // v3.197.0 (bible B §4.1)
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
        introText: "Un royaume est mort ici. Les pierres n'ont pas fini de tomber.", // v3.197.0
        enemyPool: ["skeleton", "ghoul", "gargoyle", "zombie"],
        enemyCount: 10,
        boss: "skeletonlord"
      },
      {
        id: "ruins_2",
        name: "Sanctuaire enseveli",
        introText: "Les murs ont été écrits. Quelqu'un les relit encore.", // v3.197.0
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
        introText: "Le froid entre. Il ne ressort pas.", // v3.197.0
        enemyPool: ["spectre", "wraith", "necromancer", "deadknight"],
        enemyCount: 10,
        boss: "necrosupreme"
      },
      {
        id: "crypt_2",
        name: "Chambre funéraire",
        introText: "Ici, on ne repose pas. On attend.", // v3.197.0
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
        introText: "La roche est chaude sous la main. Elle l'était déjà avant le feu.", // v3.197.0
        enemyPool: ["lavagolem", "dragonling", "minordemon", "ifrit"],
        enemyCount: 10,
        boss: "ancientdragon"
      },
      {
        id: "mountain_2",
        name: "Antre du volcan",
        introText: "La lave éclaire. Ce qu'elle éclaire est plus grand qu'il ne devrait.", // v3.197.0
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
        introText: "L'air a le goût de la nuit où le ciel s'est fendu.", // v3.197.0
        enemyPool: ["arcanegolem", "corruptmage", "hybrid", "guardian"],
        enemyCount: 10,
        boss: "archmage"
      },
      {
        id: "tower_2",
        name: "Sanctuaire interdit",
        introText: "Le sommet. Ce n'est pas une fin.", // v3.197.0
        enemyPool: ["guardian", "hybrid", "corruptmage", "arcanegolem"],
        enemyCount: 10,
        boss: "archmage"
      }
    ]
  }
];

/* v3.197.0 (passe de ton, bible B §4.2) : narrateur — une chose perçue, au présent, sans
   vouvoiement ni points de suspension. */
var AMBIANCE_TEXTS = [
  "Un craquement, loin. Puis rien.",
  "L'air a un goût de sève.",
  "Les ombres bougent avant toi.",
  "Le vent tourne. Il vient de derrière.",
  "Le sol a tremblé une fois.",
  "Sur la pierre, des traits qui luisent quand tu ne regardes pas.",
  "Quelqu'un parle, trop bas pour les mots."
];
