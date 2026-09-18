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
    /* v3.246.0 (décision Seb 15/09/2026) : PV de tous les ennemis de la quête ÷ 2,5. 4e étape de
       l'Histoire, elle doit se gagner avec l'équipement de départ — le joueur n'a ni l'or pour
       s'équiper (10 combats = 94 or, une pièce commune = 300) ni les améliorations. Le soin du boss
       est CONSERVÉ : c'est ici qu'on découvre les télégraphes. Calibré sim/lisiere-quest-bench.js. */
    /* v3.263.0 (retour Seb) : depuis que l'arme +15 arrive à Premier sang (v3.260.0), le run était
       trop facile. PV des ennemis ORDINAIRES doublés (×0,8), le Roi Slime reste à ×0,4.
       sim/roi-marais-bench.js : 0 % d'échec toujours, mais 23-26 rounds au lieu de 16-18 et
       53-67 % des PV à l'arrivée au lieu de 70-78 %. */
    enemyHpMult: 0.8,
    bossHpMult: 0.4,
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

  /* ---------------------------------------------------------------------
     v3.293.0 (règle Seb 18/09/2026) — PLUS DE FARM LIBRE. Trois étapes d'Histoire
     de la Forêt se jouaient sur l'onglet Combat sans quête (Premier sang, Franchir la
     Lisière, Le grimoire du veilleur). Elles deviennent des runs définis, liés à leur
     étape (isStoryLinkedQuest) : mêmes ennemis, dans le même ordre. En Forêt,
     enemyIndex est neutralisé (WorldManager.generateEnemy), donc un run dédié tire
     exactement les mêmes stats que l'ancien farm. Mesuré : sim/story-runs-bench.js.
     Récompense vide : c'est l'étape d'Histoire qui paie, à la réclamation.
     --------------------------------------------------------------------- */
  aq_story_premier_sang: {
    id: "aq_story_premier_sang",
    type: "kill",
    section: "adventure",
    difficulty: "easy",
    progressionStage: "world_start",
    category: "side",
    worldId: "forest",
    adventureIndex: 0,
    enemyFilter: ["slime", "goblin", "spider"],
    /* v3.293.0 : ×0,8 sur les PV. En farm libre une mort ne retirait aucun kill ; dans un run,
       elle fait tout recommencer. À ×1, le Rôdeur à mains nues échoue 44 % des départs
       (sim/story-runs-bench.js) ; à ×0,8 : 95-100 %, fin à 32-44 % des PV. */
    enemyHpMult: 0.8,
    name: "Premier sang",
    story: "Les bêtes viennent flairer les braises. Écarte-les du feu, une à une.",
    icon: "./images/Icons/quest_icons/exploration/exploration1.png",
    steps: [
      { id: "kills_premier_sang", type: "kill", worldId: "forest", target: 5, desc: "Vaincre {target} ennemis à la Lisière" }
    ],
    reward: {}
  },

  /* L'ancien farm menait la Lisière d'un bout à l'autre : 9 ennemis puis le Roi Slime à PV
     pleins. Même composition que « Prouver sa valeur », SANS ses réductions de PV. */
  aq_story_lisiere: {
    id: "aq_story_lisiere",
    type: "kill",
    section: "adventure",
    difficulty: "medium",
    progressionStage: "world_mid",
    category: "side",
    worldId: "forest",
    adventureIndex: 0,
    enemyFilter: ["slime", "goblin", "spider"],
    name: "Franchir la Lisière",
    story: "La Lisière d'un bout à l'autre, sans t'arrêter. Au bout, les marais. Ce qui les tient s'est relevé.",
    icon: "./images/Icons/quest_icons/exploration/exploration4.png",
    steps: [
      { id: "kills_lisiere", type: "kill", worldId: "forest", target: 9, desc: "Vaincre {target} ennemis à la Lisière" },
      { id: "boss_lisiere", type: "bossKill", bossId: "slimeking", target: 1, desc: "Vaincre le Roi Slime géant" }
    ],
    reward: {}
  },

  /* Pool de l'Acte III écrit en dur (STORY_COEUR_ACT3_POOL) : le run ne dépend plus de la
     synchronisation du pool du Cœur, qui ne servait qu'au farm libre. */
  aq_story_coeur: {
    id: "aq_story_coeur",
    type: "kill",
    section: "adventure",
    difficulty: "medium",
    progressionStage: "world_mid",
    category: "side",
    worldId: "forest",
    adventureIndex: 1,
    enemyFilter: ["slime", "goblin", "spider", "foresttroll", "bramble"],
    name: "Tenir le Cœur",
    story: "Au Cœur, les bêtes arrivent plus vite qu'on ne décide. Dix d'affilée. Laisse le Grimoire frapper quand tu ne regardes pas.",
    icon: "./images/Icons/quest_icons/exploration/exploration3.png",
    steps: [
      { id: "kills_coeur", type: "kill", worldId: "forest", target: 10, desc: "Vaincre {target} ennemis au Cœur de la forêt" }
    ],
    reward: {}
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
    /* v3.269.0 (L-3) — PREMIER GROUPE DU JEU. Une meute est une meute : des loups à la
       fois, pas des loups à la suite. Les PV et le butin de chaque membre suivent
       groupHpMult / groupGoldMult ; sans le second, une meute rapporterait plusieurs fois
       l'or pour les points de vie d'un seul ennemi.

       DEUX loups, pas trois, et c'est une MESURE qui l'impose. Cette quête est au tout
       début du jeu (progressionStage world_start, elle ouvre le bâtiment Chasse) et se
       joue donc sans compagnon et sans technique. Mesuré sur le vrai moteur, 200 runs,
       héros nu entraînement +4, attaque de base uniquement :
         3 loups ×0,35 : Chevalier 83 % PV · Rôdeur 99 % et 84 % de MORTS · Mage 96 %
         2 loups ×0,50 : Chevalier 61 % · Rôdeur 81 % · Mage 73 %, aucune mort
         2 loups ×0,40 : Chevalier 47 % · Rôdeur 68 % · Mage 60 %, aucune mort
       Le trio est un mur à cet endroit du jeu. ×0,40 à deux place la meute au-dessus d'un
       boss de Forêt sans jamais tuer, ce qui est le bon niveau pour une première
       rencontre de groupe. Les trios attendront un contenu plus avancé. */
    group: ["wolf", "wolf"],
    groupHpMult: 0.40,
    groupGoldMult: 0.40,
    name: "La Meute Affamée",
    story: "Des loups rôdent près du campement. Il faut réduire leur nombre avant d'envisager d'installer un poste de chasse permanent.",
    icon: "images/Icons/quests/objective_wolf.png",
    steps: [
      {
        id: "kills_wolfpack",
        type: "kill",
        worldId: "forest",
        /* v3.282.0 — objectif porté de 10 à 16 (mesure, sim/quest-cost-bench.js).
           Une meute coûte plus cher qu'un loup seul PAR COMBAT, mais elle fait avancer
           l'objectif de deux crans : à 10 crans, la quête devenait 40 % moins coûteuse
           qu'avant les groupes. Mesuré, héros nu, PV perdus par cran d'objectif :
             un par un        Chevalier 160 · Rôdeur 159 · Mage 132
             par meutes de 2   Chevalier  99 · Rôdeur 107 · Mage  86
           16 crans ramènent le coût total à celui d'avant (1584 / 1712 / 1376 contre
           1600 / 1587 / 1324), tout en restant environ 1,4 fois plus rapide — c'est
           l'échange qu'on veut : une meute va plus vite, elle ne coûte pas moins. */
        target: 16,
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

     Échec : v3.261.0 (décision Seb) — tout est à refaire, pistage compris, comme
     pour toute quête de combat (AdventureQuestManager._resetProgress).
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
