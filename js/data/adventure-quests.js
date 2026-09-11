"use strict";
/* data/adventure-quests.js — quêtes scopées à une aventure précise (worldId+adventureIndex), séparées de world-quests.js.
   Logique : systems/adventure-quest-system.js. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var ADVENTURE_QUESTS = {
  // v3.109.0 : aq_forest_scout (« Éclaireur de la Lisière ») supprimée — jamais liée à l'Histoire, donc invisible depuis 3.107.4.
  aq_forest_expedition: {
    id: "aq_forest_expedition",
    type: "transition",
    section: "adventure",
    difficulty: "easy",
    progressionStage: "world_start",
    category: "side",
    worldId: "forest",
    adventureIndex: 0,
    gatesTransitionTo: 1, // v3.100.0 : category "side" — seule la chaîne Histoire (story-quests.js) est « Principale »
    enemyFilter: ["slime", "goblin", "spider"], // v3.107.4 : uniquement les ennemis génériques (décision Seb)
    name: "Prouver sa valeur",
    story: "Le Roi Slime géant règne sur la Lisière depuis des lunes, gardant jalousement le passage vers le cœur de la forêt. Pour qu'on te laisse poursuivre, il faudra d'abord montrer que tu n'es pas qu'un simple aventurier de passage.",
    icon: "./images/Icons/quest_icons/exploration/exploration1.png",
    steps: [
      {
        id: "kills_expedition",
        type: "kill",
        worldId: "forest",
        target: 9, // v3.107.2 : 15 -> 9 (décision Seb, trop dur — 9 kills + boss = 10 combats au total)
        desc: "Vaincre {target} ennemis en Forêt"
      },
      {
        id: "boss_slimeking",
        type: "bossKill",
        bossId: "slimeking",
        target: 1,
        desc: "Vaincre le Roi Slime géant {target} fois"
      }
    ],
    reward: { gold: 800, essence: 15 }
  },

  aq_forest_depths: {
    id: "aq_forest_depths",
    type: "kill",
    section: "adventure",
    difficulty: "medium",
    progressionStage: "world_end",
    category: "side", // v3.100.1 : « Principale » réservée à la chaîne Histoire
    worldId: "forest",
    adventureIndex: 1,
    gatesNextWorld: true,
    // v3.109.0 : + étape boss (Seigneur de guerre orc), liée à forest_15 — même patron que « Prouver sa valeur ».
    // Run dédié (spawnFor restaure les index) : plus de kill du boss en farm libre, qui relançait un cycle (+45 % de scale).
    name: "Le Cœur de la Forêt",
    story: "Au-delà de la Lisière, l'air se fait plus lourd et les arbres plus anciens. Le Seigneur de guerre orc tient le Cœur : il faudra s'enfoncer, faire ses preuves, puis l'abattre pour que le passage vers le Désert s'ouvre.",
    icon: "./images/Icons/quest_icons/exploration/exploration3.png",
    steps: [
      {
        id: "kills_depths",
        type: "kill",
        worldId: "forest",
        target: 20,
        desc: "Vaincre {target} ennemis en Cœur de la forêt"
      },
      {
        id: "boss_orcwarlord",
        type: "bossKill",
        bossId: "orcwarlord",
        target: 1,
        desc: "Vaincre le Seigneur de guerre orc {target} fois"
      }
    ],
    reward: { gold: 800, essence: 15 } // aligné sur « Prouver sa valeur » (kills + boss)
  },

  hq_wolf_pack: {
    id: "hq_wolf_pack",
    type: "kill",
    section: "adventure",
    difficulty: "easy",
    progressionStage: "world_start",
    category: "side", // v3.100.1 : « Principale » réservée à la chaîne Histoire (story-quests.js)
    worldId: "forest",
    adventureIndex: 0,
    enemyFilter: ["wolf"], // v3.107.0 : la Meute affamée ne fait combattre que des loups (cohérence narrative)
    name: "La Meute Affamée",
    story: "Des loups rôdent près du campement. Il faut réduire leur nombre avant d'envisager d'installer un poste de chasse permanent.",
    icon: "🐺",
    steps: [
      {
        id: "kills_wolfpack",
        type: "kill",
        worldId: "forest",
        target: 10,
        desc: "Tuer {target} loups en Forêt" // v3.108.0 : aligné sur enemyFilter
      }
    ],
    reward: { gold: 400, essence: 8, unlockBuildingId: "hunt" }
  },

  /* ---------------------------------------------------------------------
     QUÊTES ÉLITE (v3.205.0, lot E5). Même moteur que les quêtes d'aventure :
     type "elite" + une étape eliteKill. Le spawn passe par EliteManager
     (systems/elite-system.js), jamais écrit en ligne ici.

     Gating : après « Le grimoire du veilleur » (forest_12). C'est le moment où
     le joueur DISPOSE du Grimoire — sans lui, l'archétype de l'élite n'a aucun
     contre et la rencontre n'est qu'un sac à PV. Comparaison par ID d'étape,
     jamais par index (même patron que _syncCoeurEnemyPool).

     Hors du cap de 3 quêtes actives (voir mission-board-system.js) : comme le
     Donjon et la Petite Aventure, c'est une activité courte à lancement direct.

     Échec : progression conservée, l'élite se représente (décision Seb) —
     comportement par défaut du manager, rien à coder.
     --------------------------------------------------------------------- */

  eq_forest_spider: {
    id: "eq_forest_spider",
    type: "elite",
    section: "adventure",
    difficulty: "medium",
    progressionStage: "world_end",
    category: "side",
    worldId: "forest",
    adventureIndex: 0,
    eliteId: "araignee_marquee",
    requiresStoryStep: "forest_12",
    enemyFilter: ["spider"],
    name: "Les yeux blancs",
    story: "Les toiles de la Lisière ne prennent plus rien. Elles pendent, intactes, comme si "
      + "celle qui les a tissées avait cessé d'avoir faim. Wenna dit qu'elle a compté les fils "
      + "deux fois et qu'il y en a trop.",
    icon: "./images/Icons/quest_icons/elite/elite1.png",
    steps: [
      {
        id: "track_spider",
        type: "kill",
        worldId: "forest",
        target: 6,
        desc: "Pister {target} araignées à la Lisière"
      },
      {
        id: "elite_spider",
        type: "eliteKill",
        eliteId: "araignee_marquee",
        target: 1,
        desc: "Vaincre la Fileuse aux yeux blancs"
      }
    ],
    reward: { gold: 700, essence: 20, seve: 5 }
  },

  eq_forest_bramble: {
    id: "eq_forest_bramble",
    type: "elite",
    section: "adventure",
    difficulty: "hard",
    progressionStage: "world_end",
    category: "side",
    worldId: "forest",
    adventureIndex: 1,
    eliteId: "ronce_ardente",
    requiresStoryStep: "forest_12",
    enemyFilter: ["bramble"],
    name: "Ce qui a poussé sur la cendre",
    story: "Au Cœur, il y a un carré de terre où rien ne devrait tenir. Quelque chose y a poussé "
      + "quand même. Brannoc y est allé une fois, il n'en parle pas.",
    icon: "./images/Icons/quest_icons/elite/elite4.png",
    steps: [
      {
        id: "track_bramble",
        type: "kill",
        worldId: "forest",
        target: 6,
        desc: "Pister {target} ronces au Cœur de la forêt"
      },
      {
        id: "elite_bramble",
        type: "eliteKill",
        eliteId: "ronce_ardente",
        target: 1,
        desc: "Vaincre la Ronce qui se souvient"
      }
    ],
    reward: { gold: 1200, essence: 30, seve: 5 }
  }
};

window.ADVENTURE_QUESTS = ADVENTURE_QUESTS;
