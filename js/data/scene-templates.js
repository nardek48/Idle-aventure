"use strict";
/* data/scene-templates.js — canevas du scene-engine générique. Un canevas est purement des
   données (aucune logique) consommées par SceneEngine.buildCard() + scene-run-system.js.
   v1 : un seul canevas génératif, sandbox (pas encore branché à MissionBoard/SortieManager
   en usage réel — voir CHANGELOG_v3.120.0.md, Lot S1). Détail : DESIGN_Scene_Engine_v1.md §5 */

var SCENE_TEMPLATES = {
  expedition_faille: {
    id: "expedition_faille",
    mode: "generative",
    title: "Expédition en profondeur",
    icon: "🕳️",

    depthMax: 8,
    firstDepthType: "obstacle", // v1 : premier palier toujours lisible, pas de mystère d'entrée
    gatesPerDepth: [2, 3],

    slotWeights: { obstacle: 56, autel: 12, decouverte: 12, source: 8, mystere: 12 },
    pools: {
      obstacle: ["eboulis", "gouffre", "porte_scellee", "paroi", "riviere", "racines"]
    },
    // v3.121.0 (recalibrage Seb) : variance de difficulté/gain entre les portes d'un même
    // palier — chaque porte-obstacle tire un riskMod dans cette plage, qui multiplie SA
    // PROPRE difficulté ET son gain (voir SceneEngine.buildCard/rollLoot). Range large
    // (0.6-1.6) pour un spectre net entre "sûr mais peu payant" et "périlleux mais lucratif".
    riskModRange: [0.6, 1.6],

    // Équipement proposé en préparation (3 emplacements, doublons permis pour provisions).
    loadoutOffer: ["torche", "corde", "provisions", "provisions", "amulette"],
    loadoutSlots: 3,

    items: {
      torche: { id: "torche", name: "🔥 Torche", desc: "Révèle le détail des portes du niveau courant (3 charges).", charges: 3 },
      corde: { id: "corde", name: "🪢 Corde", desc: "Approche sûre sur les obstacles compatibles (réutilisable, gain réduit)." },
      provisions: { id: "provisions", name: "🥖 Provisions", desc: "Soigne 1 blessure (consommable)." },
      amulette: { id: "amulette", name: "🧿 Amulette", desc: "Relance automatiquement le premier jet raté (1 fois)." }
    },

    // Gains de base par type de salle (avant multiplicateur de profondeur, voir
    // SceneCheckSystem.depthLootMultiplier). v3.121.0 (recalibrage Seb) : or en faible
    // quantité plutôt que petite_ration (une ressource de production, pas une récompense —
    // n'a pas de sens comme gain d'expédition) ; montants pensés pour un total de run
    // comparable aux quêtes secondaires existantes (400-800 or, voir adventure-quests.js)
    // sans les dépasser sur un run complet. Les ressources de production liées à la quête en
    // cours sont un sujet du Lot S2 (canevas migrés depuis de vraies quêtes), pas de ce lot.
    lootResource: "gold",
    lootRanges: {
      obstacleSuccess: [6, 14],
      obstacleRope: [3, 7],
      obstacleSetback: [1, 3],
      decouverte: [8, 16],
      finalSafe: [20, 20],
      finalRiskyBase: [0, 0] // spécial : double ou moitié du loot total, géré en run-system
    },

    autelCostRatio: 0.2 // coût de l'offrande = 20% du loot courant
  },

  /* ================= v3.122.0 (Lot S2a) — quêtes de déblocage migrées =================
     Mécanique identique à expedition_faille (paliers, push-your-luck, blessures typées,
     chambre finale) — décision Seb : ces quêtes bénéficient du même moteur, juste raccourci
     (2-3 paliers au lieu de 8) et thématisé. unlockOnSuccess (bâtiment + flags) s'applique
     uniquement à la résolution de la chambre finale (le run doit aller jusqu'au bout) ; un
     échec en cours de route fait perdre un peu de loot et continuer, jamais échouer net. */

  sentier_obstrue: {
    id: "sentier_obstrue",
    mode: "semi",
    title: "Le Sentier Obstrué",
    icon: "🌲",

    depthMax: 2,
    firstDepthType: "obstacle",
    gatesPerDepth: [1, 1], // canevas court : un seul passage par palier, pas de choix de porte

    slotWeights: { obstacle: 100 }, // que des obstacles, pas d'autel/découverte/source sur 2 paliers
    pools: { obstacle: ["tronc_deracine", "racines"] },
    riskModRange: [0.7, 1.3], // plage resserrée : quête courte, moins de variance que l'expédition longue

    loadoutOffer: [], loadoutSlots: 0, // pas d'équipement : quête simple, va droit au but

    entryCost: { resourceId: "petite_ration", amount: 1 }, // même coût que l'ancien moteur (exploration-quests.js, retiré)

    // v3.124.0 (retrait ancien moteur) : boardRequires rapatrié depuis exploration-quests.js
    // (fichier supprimé) — condition d'AFFICHAGE au tableau de missions, lue par
    // MissionBoard._isExplorationQuestBoardVisible(). Distinct des conditions de lancement
    // (gérées par WarehouseManager via entryCost, et prérequis narratifs via unlockFlag ci-dessous).
    boardRequires: { progressFlag: "huntBuildingUnlocked" },

    lootResource: "bois",
    lootRanges: {
      obstacleSuccess: [3, 6],
      obstacleRope: [2, 3],
      obstacleSetback: [1, 2],
      decouverte: [4, 7],
      finalSafe: [8, 8],
      finalRiskyBase: [0, 0]
    },
    autelCostRatio: 0.2,

    unlockOnSuccess: {
      buildingId: null, // le Sentier Obstrué débloque la Clairière (pas un bâtiment de production), voir note ci-dessous
      unlockFlag: "forgottenClearingUnlocked",
      completionFlag: "blockedPathCompleted"
    }
  },

  bosquet_silencieux: {
    id: "bosquet_silencieux",
    mode: "semi",
    title: "Le Bosquet Silencieux",
    icon: "🪓",

    depthMax: 2,
    firstDepthType: "obstacle",
    gatesPerDepth: [1, 1],

    slotWeights: { obstacle: 100 },
    pools: { obstacle: ["troncs_jumeaux", "fute_dense"] },
    riskModRange: [0.7, 1.3],

    loadoutOffer: [], loadoutSlots: 0,

    // Pas de coût : à l'ouverture du Village, le Puits n'existe pas encore, la petite ration
    // est infabricable (même raison que l'ancien canevas exploration-quests.js:silentGrove).
    entryCost: null,

    boardRequires: { tabUnlocked: "village" },

    lootResource: "bois",
    lootRanges: {
      obstacleSuccess: [3, 6],
      obstacleRope: [2, 3],
      obstacleSetback: [1, 2],
      decouverte: [4, 7],
      finalSafe: [8, 8],
      finalRiskyBase: [0, 0]
    },
    autelCostRatio: 0.2,

    unlockOnSuccess: {
      buildingId: "sawmill",
      unlockFlag: "sawmillUnlocked",
      completionFlag: "silentGroveDiscoveryCompleted"
    }
  },

  terre_en_friche: {
    id: "terre_en_friche",
    mode: "semi",
    title: "La Terre en Friche",
    icon: "🌾",

    depthMax: 2,
    firstDepthType: "obstacle",
    gatesPerDepth: [1, 1],

    slotWeights: { obstacle: 100 },
    pools: { obstacle: ["ronces_epaisses", "sillons_geles", "talus_boueux"] },
    riskModRange: [0.7, 1.3],

    loadoutOffer: [], loadoutSlots: 0,

    entryCost: { resourceId: "petite_ration", amount: 1 },

    boardRequires: { progressFlags: ["wellUnlocked", "huntBuildingUnlocked"] },

    lootResource: "ble",
    lootRanges: {
      obstacleSuccess: [3, 6],
      obstacleRope: [2, 3],
      obstacleSetback: [1, 2],
      decouverte: [4, 7],
      finalSafe: [8, 8],
      finalRiskyBase: [0, 0]
    },
    autelCostRatio: 0.2,

    unlockOnSuccess: {
      buildingId: "farm",
      unlockFlag: "farmUnlocked",
      completionFlag: "fallowFieldDiscoveryCompleted"
    }
  },

  /* ================= v3.123.0 (Lot S2b) — quêtes de minage/eau migrées =================
     Décision Seb : le geste physique (jauge/timing) de l'ancien mining-system.js/well-system.js
     est remplacé par un jet de stat classique, comme les 3 quêtes du Lot S2a — même mécanique
     paliers/push-your-luck/chambre finale, cohérence totale avec le reste du scene-engine.
     Le bonus de ressource secondaire de l'ancien Éboulis Ferreux (pierre en plus du fer sur un
     coup parfait) est retiré (décision Seb : simplification, fer seul). */

  veine_instable: {
    id: "veine_instable",
    mode: "semi",
    title: "La Veine Instable",
    icon: "⛏️",

    depthMax: 2,
    firstDepthType: "obstacle",
    gatesPerDepth: [1, 1],

    slotWeights: { obstacle: 100 },
    pools: { obstacle: ["filon_fragile", "paroi_instable"] },
    riskModRange: [0.7, 1.3],

    loadoutOffer: [], loadoutSlots: 0,

    entryCost: { resourceId: "petite_ration", amount: 1 },

    boardRequires: { progressFlag: "forgottenClearingUnlocked" },

    lootResource: "pierre",
    lootRanges: {
      obstacleSuccess: [3, 6],
      obstacleRope: [2, 3],
      obstacleSetback: [1, 2],
      decouverte: [4, 7],
      finalSafe: [8, 8],
      finalRiskyBase: [0, 0]
    },
    autelCostRatio: 0.2,

    unlockOnSuccess: {
      buildingId: "quarry",
      unlockFlag: "quarryUnlocked",
      completionFlag: "unstableVeinDiscoveryCompleted"
    }
  },

  eboulis_ferreux: {
    id: "eboulis_ferreux",
    mode: "semi",
    title: "L'Éboulis Ferreux",
    icon: "⛏️",

    depthMax: 2,
    firstDepthType: "obstacle",
    gatesPerDepth: [1, 1],

    slotWeights: { obstacle: 100 },
    pools: { obstacle: ["veine_rougeatre", "eboulis_recent"] },
    riskModRange: [0.7, 1.3],

    loadoutOffer: [], loadoutSlots: 0,

    entryCost: { resourceId: "petite_ration", amount: 1 },

    boardRequires: { progressFlag: "quarryUnlocked" },

    lootResource: "fer",
    lootRanges: {
      obstacleSuccess: [3, 6],
      obstacleRope: [2, 3],
      obstacleSetback: [1, 2],
      decouverte: [4, 7],
      finalSafe: [8, 8],
      finalRiskyBase: [0, 0]
    },
    autelCostRatio: 0.2,

    unlockOnSuccess: {
      buildingId: "mine",
      unlockFlag: "mineUnlocked",
      completionFlag: "ironLodeDiscoveryCompleted"
    }
  },

  source_tarie: {
    id: "source_tarie",
    mode: "semi",
    title: "La Source Tarie",
    icon: "💧",

    depthMax: 2,
    firstDepthType: "obstacle",
    gatesPerDepth: [1, 1],

    slotWeights: { obstacle: 100 },
    pools: { obstacle: ["source_irreguliere", "bassin_trouble"] },
    riskModRange: [0.7, 1.3],

    loadoutOffer: [], loadoutSlots: 0,

    // Gratuit — même raison que l'ancien canevas : le Puits produit justement l'Eau,
    // intrant de la petite ration ; un coût ici créerait un verrou circulaire.
    entryCost: null,

    lootResource: "eau",
    lootRanges: {
      obstacleSuccess: [3, 6],
      obstacleRope: [2, 3],
      obstacleSetback: [1, 2],
      decouverte: [4, 7],
      finalSafe: [8, 8],
      finalRiskyBase: [0, 0]
    },
    autelCostRatio: 0.2,

    unlockOnSuccess: {
      buildingId: "well",
      unlockFlag: "wellUnlocked",
      completionFlag: "driedSpringDiscoveryCompleted"
    }
  }
};

window.SCENE_TEMPLATES = SCENE_TEMPLATES;
