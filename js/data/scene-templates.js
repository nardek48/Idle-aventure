"use strict";
/* data/scene-templates.js — canevas du scene-engine générique. Un canevas est purement des
   données (aucune logique) consommées par SceneEngine.buildCard() + scene-run-system.js.
   v1 : un seul canevas génératif, sandbox (pas encore branché à MissionBoard/SortieManager
   en usage réel — voir CHANGELOG_v3.120.0.md, Lot S1). Détail : DESIGN_Scene_Engine_v1.md §5 */

/* v3.388.0 (PA2-6) : les intensités (SCENE_INTENSITY), les mutateurs (SCENE_MUTATORS) et le bac
   à sable expedition_faille sont retirés avec les Petites Aventures v1. Les anneaux de la carte
   vivante sont décrits par PA2_RINGS (data/pa2-content.js). */

var SCENE_TEMPLATES = {
  /* ================= Quêtes de déblocage (v3.122.0 ; parcours v2 depuis v3.389.0) =================
     Deux obstacles en ligne droite, joués par Pa2Run (mode "parcours"). unlockOnSuccess
     (bâtiment + drapeaux) s'applique à l'arrivée. Butin : lootResource, au barème de lootRanges
     (obstacleSuccess par obstacle réussi, finalSafe à l'arrivée). */

  sentier_obstrue: {
    id: "sentier_obstrue",
    worldId: "forest", // v3.298.0 (W-1b, D6) : ses combats sortent de la Forêt, où que réside le joueur
    mode: "parcours", // v3.389.0 (chantier P) : parcours sur le moteur des Petites Aventures v2
    title: "Le Sentier Obstrué",
    parcours: { steps: [{ type: "obstacle" }, { type: "obstacle" }] }, // gabarits tirés dans pools.obstacle
    icon: "images/Icons/codex/world_forest.png",

    pools: { obstacle: ["tronc_deracine", "racines"] },

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

    unlockOnSuccess: {
      buildingId: null, // le Sentier Obstrué débloque la Clairière (pas un bâtiment de production), voir note ci-dessous
      unlockFlag: "forgottenClearingUnlocked",
      completionFlag: "blockedPathCompleted"
    }
  },

  bosquet_silencieux: {
    id: "bosquet_silencieux",
    worldId: "forest", // v3.298.0 (W-1b, D6) : ses combats sortent de la Forêt, où que réside le joueur
    mode: "parcours", // v3.389.0 (chantier P) : parcours sur le moteur des Petites Aventures v2
    title: "Le Bosquet Silencieux",
    parcours: { steps: [{ type: "obstacle" }, { type: "obstacle" }] }, // gabarits tirés dans pools.obstacle
    icon: "images/Icons/scene/scene_woodland.png",

    pools: { obstacle: ["troncs_jumeaux", "fute_dense"] },

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

    unlockOnSuccess: {
      buildingId: "sawmill",
      unlockFlag: "sawmillUnlocked",
      completionFlag: "silentGroveDiscoveryCompleted"
    }
  },

  terre_en_friche: {
    id: "terre_en_friche",
    worldId: "forest", // v3.298.0 (W-1b, D6) : ses combats sortent de la Forêt, où que réside le joueur
    mode: "parcours", // v3.389.0 (chantier P) : parcours sur le moteur des Petites Aventures v2
    title: "La Terre en Friche",
    parcours: { steps: [{ type: "obstacle" }, { type: "obstacle" }] }, // gabarits tirés dans pools.obstacle
    icon: "images/Icons/scene/scene_harvest.png",

    pools: { obstacle: ["ronces_epaisses", "sillons_geles", "talus_boueux"] },

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
    worldId: "forest", // v3.298.0 (W-1b, D6) : ses combats sortent de la Forêt, où que réside le joueur
    mode: "parcours", // v3.389.0 (chantier P) : parcours sur le moteur des Petites Aventures v2
    title: "La Veine Instable",
    parcours: { steps: [{ type: "obstacle" }, { type: "obstacle" }] }, // gabarits tirés dans pools.obstacle
    icon: "images/Icons/scene/scene_mine.png",

    pools: { obstacle: ["filon_fragile", "paroi_instable"] },

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

    unlockOnSuccess: {
      buildingId: "quarry",
      unlockFlag: "quarryUnlocked",
      completionFlag: "unstableVeinDiscoveryCompleted"
    }
  },

  eboulis_ferreux: {
    id: "eboulis_ferreux",
    worldId: "forest", // v3.298.0 (W-1b, D6) : ses combats sortent de la Forêt, où que réside le joueur
    mode: "parcours", // v3.389.0 (chantier P) : parcours sur le moteur des Petites Aventures v2
    title: "L'Éboulis Ferreux",
    parcours: { steps: [{ type: "obstacle" }, { type: "obstacle" }] }, // gabarits tirés dans pools.obstacle
    icon: "images/Icons/scene/scene_mine.png",

    pools: { obstacle: ["veine_rougeatre", "eboulis_recent"] },

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

    unlockOnSuccess: {
      buildingId: "mine",
      unlockFlag: "mineUnlocked",
      completionFlag: "ironLodeDiscoveryCompleted"
    }
  },

  source_tarie: {
    id: "source_tarie",
    worldId: "forest", // v3.298.0 (W-1b, D6) : ses combats sortent de la Forêt, où que réside le joueur
    mode: "parcours", // v3.389.0 (chantier P) : parcours sur le moteur des Petites Aventures v2
    title: "La Source Tarie",
    parcours: { steps: [{ type: "obstacle" }, { type: "obstacle" }] }, // gabarits tirés dans pools.obstacle
    icon: "images/Icons/scene/node_clear_spring.png",

    // v3.131.0 : seul canevas sans boardRequires (oubli) — disponible dès le lancement d'une
    // nouvelle partie, avant même Le Bosquet Silencieux. Gate désormais sur sawmillUnlocked
    // (débloqué par bosquet_silencieux), pour arriver après la toute première petite quête.
    boardRequires: { progressFlag: "sawmillUnlocked" },

    pools: { obstacle: ["source_irreguliere", "bassin_trouble"] },

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

    unlockOnSuccess: {
      buildingId: "well",
      unlockFlag: "wellUnlocked",
      completionFlag: "driedSpringDiscoveryCompleted"
    }
  },

  /* ================= v3.300.0 (W-2) — LA TRAVERSÉE, acte I étape 1 du Désert =================
     Document « Désert — Acte I » v1.0, §3. Run scripté de quatre paliers (fixedCard) : les
     dalles du portail, le premier puits, la nuée, le vent. Journal fixe par palier. Coût :
     une Ration moyenne, le prix de Sarkel. Ses combats sortent du Désert (worldId), mais le
     monde de résidence ne bascule qu'à l'arrivée (travelOnSuccess). Pas de boss en fin de run. */
  traversee_desert: {
    id: "traversee_desert",
    worldId: "desert",
    adventureIndex: 0,
    mode: "semi",
    title: "La traversée",
    icon: "images/Icons/codex/world_desert.png",

    depthMax: 4,
    gatesPerDepth: [1, 1],
    fixedCard: [
      [{ type: "obstacle", gabaritId: "dalles_ensablees" }],
      [{ type: "source" }],
      [{ type: "combat", gabaritId: "scarabees_desert" }],
      [{ type: "obstacle", gabaritId: "vent_de_face" }]
    ],
    combatWaveRange: [1, 1], // une seule rencontre : la nuée
    finalBoss: false,
    slotWeights: { obstacle: 100 },
    pools: { obstacle: ["dalles_ensablees", "vent_de_face"], combat: ["scarabees_desert"] },

    loadoutOffer: [], loadoutSlots: 0,
    entryCost: { resourceId: "ration", amount: 1 },

    journalByDepth: {
      1: "Les dalles du portail. Du sable entre elles, puis dessus, puis plus de dalles du tout.",
      2: "Un puits. La corde est neuve. Quelqu'un l'entretient, et ce n'est pas Sarkel.",
      3: { before: "Le sable bouge à trois endroits à la fois. Sarkel arrête la carriole. Il ne descend pas.",
           after: "Wenna compte les carapaces. Trois. Elle recompte." },
      4: "Le deuxième puits est sec. Sarkel n'a pas l'air surpris. Il a de l'eau pour deux jours. Il te compte la tienne."
    },

    lootResource: "gold",
    lootRanges: {
      obstacleSuccess: [10, 20],
      obstacleRope: [5, 10],
      obstacleSetback: [2, 5],
      decouverte: [10, 20],
      finalSafe: [40, 40],
      finalRiskyBase: [0, 0]
    },
    autelCostRatio: 0.2,

    unlockOnSuccess: { buildingId: null, unlockFlag: "desertReached", completionFlag: "desertCrossingCompleted" },
    travelOnSuccess: { worldId: "desert", adventureIndex: 0 }
  },

  /* v3.310.0 (W-3a, acte II §4) — LA DESCENTE. Première libération de la porte du Temple, lancée
     depuis la carte (firstContent du secteur) : hors cap journalier (pas de profileWeights), un seul
     combat, journal fixe. L'arrivée pose le Temple ensablé (adventureIndex 1). */
  descente_temple: {
    id: "descente_temple",
    worldId: "desert",
    adventureIndex: 1,
    mode: "semi",
    title: "La descente",
    icon: "images/Icons/codex/world_desert.png",

    depthMax: 4,
    gatesPerDepth: [1, 1],
    fixedCard: [
      [{ type: "obstacle", gabaritId: "dalle_scellee" }],
      [{ type: "obstacle", gabaritId: "dalles_ensablees" }],
      [{ type: "combat", gabaritId: "guerrier_seul_desert" }],
      [{ type: "source" }]
    ],
    combatWaveRange: [1, 1],
    finalBoss: false,
    slotWeights: { obstacle: 100 },
    pools: { obstacle: ["dalle_scellee", "dalles_ensablees"], combat: ["guerrier_seul_desert"] },

    loadoutOffer: [], loadoutSlots: 0,

    journalByDepth: {
      1: "Le battant ouvert laisse passer un homme, pas un sac. Sarkel pose le sien et s'assoit dessus.",
      2: "Des marches. Le sable les a remplies à moitié. Quelqu'un a dégagé une bande de la largeur d'un pied.",
      3: { before: "Quelque chose se tient en travers des marches. Il n'attendait pas toi.",
           after: "Wenna regarde en haut. La lumière de la porte est petite, maintenant." },
      4: "En bas, une lampe. L'huile est neuve."
    },

    lootResource: "gold",
    lootRanges: {
      obstacleSuccess: [15, 25],
      obstacleRope: [8, 12],
      obstacleSetback: [3, 6],
      decouverte: [15, 25],
      finalSafe: [60, 60],
      finalRiskyBase: [0, 0]
    },
    autelCostRatio: 0.2,

    unlockOnSuccess: { buildingId: null, unlockFlag: "templeReached", completionFlag: "templeDescended" },
    travelOnSuccess: { worldId: "desert", adventureIndex: 1 }
  },

  /* v3.361.0 (acte IV §4, textes validés par Seb 28/09/2026) — PERSONNE NE REMONTE LE FLEUVE,
     étape 16. Lancé depuis la carte d'étape (cardId scene_remontee_fleuve), comme la traversée :
     hors cap journalier (pas de profileWeights), une Ration moyenne. Six paliers écrits, deux
     combats seulement (l'étape 17 en a quatre). Palier 4 : le Veilleur tire le héros des sables
     mouvants — une source qui rend TOUT le Souffle et lave la pire blessure (fullBreath), sans
     condition. Réglages de la Petite Aventure du Désert (Souffle, triangle, force des combats) :
     c'est une fin de monde, pas une traversée d'arrivée. Pas de boss, pas de voyage. */
  remontee_fleuve: {
    id: "remontee_fleuve",
    worldId: "desert",
    adventureIndex: 0, // le lit du fleuve est en surface
    mode: "semi",
    title: "Personne ne remonte le fleuve",
    departLabel: "Remonter le lit",
    icon: "images/Icons/codex/world_desert.png",

    depthMax: 6,
    gatesPerDepth: [1, 1],
    fixedCard: [
      [{ type: "obstacle", gabaritId: "vent_de_face" }],
      [{ type: "combat", gabaritId: "ver_desert" }],
      [{ type: "obstacle", gabaritId: "sables_mouvants", riskMod: 0.8 }],
      [{ type: "source", fullBreath: true }],
      [{ type: "combat", gabaritId: "guerriers_desert" }],
      [{ type: "obstacle", gabaritId: "dune" }]
    ],
    maxInjuries: 2,
    heroScaling: { ref: 21, coef: 0.60, max: 3.5 },
    optionProfiles: {
      power: { diffMod: 1.12, lootMod: 2.60, breathCost: 10, injurySeverity: "grave" },
      precision: { diffMod: 1.0, lootMod: 1.15, breathCost: 5, injurySeverity: "normale" },
      endurance: { diffMod: 0.95, lootMod: 0.50, breathCost: 20, injurySeverity: "legere" }
    },
    breathPerDepth: 6,
    combatWaveRange: [1, 1],
    combatPowerMult: 3.5,
    combatHpMult: 2.3,
    finalBoss: false,
    slotWeights: { obstacle: 100 },
    pools: { obstacle: ["vent_de_face", "sables_mouvants", "dune"], combat: ["ver_desert", "guerriers_desert"] },
    gourdeUses: 1,

    loadoutOffer: ["torche", "corde", "provisions", "gourde", "amulette", "outre"],
    loadoutSlots: 3,
    // v3.388.0 (PA2-6) : son propre sac, jadis repris de la Petite Aventure du Désert (v3.361.0).
    items: {
      torche: { id: "torche", icon: "images/Icons/scene/torch.png", name: "Torche", desc: "Révèle le détail des portes du niveau courant (3 charges).", charges: 3 },
      corde: { id: "corde", icon: "images/Icons/scene/rope.png", name: "Corde", desc: "Passe un obstacle compatible sans jet (1 usage, gain réduit).", charges: 1 },
      provisions: { id: "provisions", icon: "images/Icons/scene/provisions.png", name: "Provisions", desc: "Soigne la blessure la plus grave (1 usage).", charges: 1 },
      gourde: { id: "gourde", icon: "images/Icons/scene/water_flask.png", name: "Gourde", desc: "Restaure du Souffle une fois, quand tu veux. Au Désert, elle ne se remplit pas en route." },
      amulette: { id: "amulette", icon: "images/Icons/scene/protective_amulet.png", name: "Amulette", desc: "Relance automatiquement le premier jet raté (1 fois)." },
      outre: { id: "outre", icon: "images/Icons/resources/outre_pleine_icon.png", name: "Outre pleine",
        desc: "Se boit une fois, quand tu veux. Prise dans ton Entrepôt au départ.",
        consumes: { resourceId: "outre_pleine", amount: 1 }, breath: 40,
        breathBonusEffect: "outre_plus" } // v3.305.0 : puits sec tenu -> +15
    },
    deathLine: "Le parcours s'arrête là. Ce que tu portais reste dans le sable. Retour au camp.",
    entryCost: { resourceId: "ration", amount: 1 },

    journalByDepth: {
      1: "Le lit est large comme une rue de la cité. Les pierres rondes roulent sous les bottes. Derrière, le Veilleur ne fait aucun bruit.",
      2: { before: "Le sable du lit se soulève d'une berge à l'autre. Quelque chose remonte le fleuve, lui aussi.",
           after: "Maddoc s'assoit sur une pierre ronde. Il se relève avant qu'on le lui demande." },
      3: "Le lit cède. Pas le sable dessus : le sol dessous. Tu t'enfonces jusqu'à la taille, puis plus.",
      4: "Une main te prend au col et te tire. Le Veilleur te pose sur la berge, te tend son outre, et reprend sa place derrière. Wenna le regarde. Pour une fois, elle ne demande rien.",
      5: { before: "Deux armures sur la berge. Elles ne gardent pas une rue : elles marchent vers le sud, comme toi.",
           after: "Elles tombent face au sud. Pas face à toi." },
      6: "Le lit s'arrête contre une dune. Au sommet, un siège taillé dans le sable, tourné vers le sud. Vide."
    },

    lootResource: "gold",
    lootRanges: {
      obstacleSuccess: [15, 25],
      obstacleRope: [8, 12],
      obstacleSetback: [3, 6],
      decouverte: [15, 25],
      finalSafe: [60, 60],
      finalRiskyBase: [0, 0]
    },
    autelCostRatio: 0.2,

    unlockOnSuccess: { buildingId: null, unlockFlag: null, completionFlag: "remonteeFleuveDone" }
  },

  /* ================= Petites Aventures (v3.388.0, PA2-6) =================
     Deux cartes de lancement, menées par Pa2Run (systems/pa2-run.js, ui/pa2-view.js) : le
     contenu (tracés, besace, pactes, accroches) vit dans data/pa2-maps.js et data/pa2-content.js.
     worldId : monde des cartes et des ennemis. boardRequires : visibilité au tableau.
     successFlag : drapeau posé à une destination atteinte (étape « L'outre » du Désert). */
  petite_aventure_foret: {
    id: "petite_aventure_foret",
    mode: "pa2",
    worldId: "forest",
    title: "Petite aventure — Forêt",
    icon: "images/Icons/scene/path_easy.png",
    boardRequires: { tabUnlocked: "village" }
  },
  petite_aventure_desert: {
    id: "petite_aventure_desert",
    mode: "pa2",
    worldId: "desert",
    adventureIndex: 0,
    title: "Petite aventure — Désert",
    departLabel: "Partir dans les dunes",
    icon: "images/Icons/scene/path_easy.png",
    boardRequires: { tabUnlocked: "village", storyStep: "desert_03" },
    successFlag: "desertPaCompleted"
  }
};

window.SCENE_TEMPLATES = SCENE_TEMPLATES;
