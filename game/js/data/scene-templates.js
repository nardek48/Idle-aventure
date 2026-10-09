"use strict";
/* data/scene-templates.js — canevas des expéditions, purement des données, menés par Pa2Run :
   mode "parcours" (quêtes, parcours d'Histoire) ou "pa2" (Petites Aventures). */

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
    parcours: { steps: [{ type: "obstacle" }, { type: "obstacle" }], image: "foret_quetes", points: [0, 2] }, // gabarits tirés dans pools.obstacle
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
    parcours: { steps: [{ type: "obstacle" }, { type: "obstacle" }], image: "foret_quetes", points: [1, 3] }, // gabarits tirés dans pools.obstacle
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
    parcours: { steps: [{ type: "obstacle" }, { type: "obstacle" }], image: "foret_quetes", points: [2, 4] }, // gabarits tirés dans pools.obstacle
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
    parcours: { steps: [{ type: "obstacle" }, { type: "obstacle" }], image: "foret_quetes", points: [3, 5] }, // gabarits tirés dans pools.obstacle
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
    parcours: { steps: [{ type: "obstacle" }, { type: "obstacle" }], image: "foret_quetes", points: [4, 7] }, // gabarits tirés dans pools.obstacle
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
    parcours: { steps: [{ type: "obstacle" }, { type: "obstacle" }], image: "foret_quetes", points: [5, 6] }, // gabarits tirés dans pools.obstacle
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
    mode: "parcours", // v3.390.0 (chantier P, lot P-2) : parcours v2 sur la piste de sable
    title: "La traversée",
    icon: "images/Icons/codex/world_desert.png",
    // Journal fixe par étape (texte en tête de feuille ; after : après le combat).
    parcours: {
      image: "desert_route", track: "route", points: [0, 2, 4, 6],
      steps: [
        { type: "obstacle", gabaritId: "dalles_ensablees", text: "Les dalles du portail. Du sable entre elles, puis dessus, puis plus de dalles du tout." },
        { type: "source", text: "Un puits. La corde est neuve. Quelqu'un l'entretient, et ce n'est pas Sarkel." },
        // v3.428.2 (retour Seb : trop facile) : 0,5 -> 1,3, banc fin de Forêt « Tenir » 20 à 23 %, « Charger » 38 à 42 % (avant 3 et 6 %)
        { type: "combat", foe: "scarab", pack: 3, foeMult: 1.3, text: "Le sable bouge à trois endroits à la fois. Sarkel arrête la carriole. Il ne descend pas.",
          after: "Wenna compte les carapaces. Trois. Elle recompte." },
        { type: "obstacle", gabaritId: "vent_de_face", text: "Le deuxième puits est sec. Sarkel n'a pas l'air surpris. Il a de l'eau pour deux jours. Il te compte la tienne." }
      ]
    },
    entryCost: { resourceId: "ration", amount: 1 },
    lootResource: "gold",
    unlockOnSuccess: { buildingId: null, unlockFlag: "desertReached", completionFlag: "desertCrossingCompleted" },
    travelOnSuccess: { worldId: "desert", adventureIndex: 0 }
  },


  /* ================= v3.428.0 (Ruines, U-4) — LA ROUTE DU NORD, acte I étape 1 des Ruines =================
     Document « Ruines — Acte I » v1.0, §3. Quatre paliers écrits ; un combat au palier 3 : trois
     morts qui se relèvent (le combat de parcours est résolu par approche : la relève se lit dans le
     texte et dans la force du groupe, foeMult au banc — cible 30 à 40 % de PV perdus). Coût : deux
     Outres pleines, le prix de Sarkel. Le monde bascule à l'arrivée (travelOnSuccess). */
  traversee_ruines: {
    id: "traversee_ruines",
    worldId: "ruins",
    adventureIndex: 0,
    mode: "parcours",
    title: "La route du nord",
    icon: "images/Icons/codex/world_ruins.png",
    parcours: {
      image: "ruines_route", track: "route", points: [0, 2, 4, 6],
      steps: [
        { type: "obstacle", gabaritId: "route_de_pierre", text: "Le sable s'arrête net. Après, de la pierre, à plat, comme une route posée hier." },
        { type: "source", text: "Une borne, plantée de travers. Sarkel la touche en passant. « Celle-là ne bouge pas. »" },
        // banc (fin2) : « Tenir » 31 à 35 % des PV, « Charger » 57 à 65 % (traversée du Désert : 3 à 6 %)
        { type: "combat", foe: "skeleton", pack: 3, foeMult: 1.3, text: "Trois silhouettes, assises contre un mur. Elles se lèvent quand vous passez.",
          after: "Le dernier tombe pour de bon. Wenna compte les os. Chacun est tombé deux fois." },
        { type: "obstacle", gabaritId: "rue_qui_tourne", text: "La rue que vous venez de prendre tourne à gauche. Tout à l'heure, elle allait tout droit." }
      ]
    },
    entryCost: { resourceId: "outre_pleine", amount: 2 },
    lootResource: "gold",
    unlockOnSuccess: { buildingId: null, unlockFlag: "ruinsReached", completionFlag: "ruinsCrossingCompleted" },
    travelOnSuccess: { worldId: "ruins", adventureIndex: 0 }
  },


  /* v3.310.0 (W-3a, acte II §4) — LA DESCENTE. Première libération de la porte du Temple, lancée
     depuis la carte (firstContent du secteur) : hors cap journalier (pas de profileWeights), un seul
     combat, journal fixe. L'arrivée pose le Temple ensablé (adventureIndex 1). */
  descente_temple: {
    id: "descente_temple",
    worldId: "desert",
    adventureIndex: 1,
    mode: "parcours", // v3.390.0 (chantier P, lot P-2) : parcours v2
    title: "La descente",
    icon: "images/Icons/codex/world_desert.png",
    parcours: {
      image: "desert_temple", track: "allee", points: [3, 4, 5, 6], // v3.392.0 : les ruines, jusqu'aux marches de la porte
      steps: [
        { type: "obstacle", gabaritId: "dalle_scellee", text: "Le battant ouvert laisse passer un homme, pas un sac. Sarkel pose le sien et s'assoit dessus." },
        { type: "obstacle", gabaritId: "dalles_ensablees", text: "Des marches. Le sable les a remplies à moitié. Quelqu'un a dégagé une bande de la largeur d'un pied." },
        { type: "combat", foe: "sandwarrior", pack: 1, act: 2, text: "Quelque chose se tient en travers des marches. Il n'attendait pas toi.",
          after: "Wenna regarde en haut. La lumière de la porte est petite, maintenant." },
        { type: "source", text: "En bas, une lampe. L'huile est neuve." }
      ]
    },
    lootResource: "gold",
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
    mode: "parcours", // v3.390.0 (chantier P, lot P-2) : parcours v2 dans le lit asséché, besace de 3 places (H4)
    title: "Personne ne remonte le fleuve",
    departLabel: "Remonter le lit",
    icon: "images/Icons/codex/world_desert.png",
    parcours: {
      image: "desert_route", track: "oued", points: [0, 1, 2, 3, 4, 5], bag: 3,
      steps: [
        { type: "obstacle", gabaritId: "vent_de_face", text: "Le lit est large comme une rue de la cité. Les pierres rondes roulent sous les bottes. Derrière, le Veilleur ne fait aucun bruit." },
        { type: "combat", foe: "sandworm", pack: 1, act: 2, text: "Le sable du lit se soulève d'une berge à l'autre. Quelque chose remonte le fleuve, lui aussi.",
          after: "Maddoc s'assoit sur une pierre ronde. Il se relève avant qu'on le lui demande." },
        { type: "obstacle", gabaritId: "sables_mouvants", text: "Le lit cède. Pas le sable dessus : le sol dessous. Tu t'enfonces jusqu'à la taille, puis plus." },
        { type: "source", fullBreath: true, text: "Une main te prend au col et te tire. Le Veilleur te pose sur la berge, te tend son outre, et reprend sa place derrière. Wenna le regarde. Pour une fois, elle ne demande rien." },
        { type: "combat", foe: "sandwarrior", pack: 2, act: 3, text: "Deux armures sur la berge. Elles ne gardent pas une rue : elles marchent vers le sud, comme toi.",
          after: "Elles tombent face au sud. Pas face à toi." },
        { type: "obstacle", gabaritId: "dune", text: "Le lit s'arrête contre une dune. Au sommet, un siège taillé dans le sable, tourné vers le sud. Vide." }
      ]
    },
    entryCost: { resourceId: "ration", amount: 1 },
    lootResource: "gold",
    unlockOnSuccess: { buildingId: null, unlockFlag: null, completionFlag: "remonteeFleuveDone" }
  },


  /* v3.432.0 (Ruines, acte IV étape 17, texte validé par Seb le 09/10) — VERS LE CŒUR. Parcours dédié,
     sur le modèle de la remontée du fleuve : lancé depuis la carte d'étape, une Ration moyenne, hors
     cap journalier. Palier 3 : les murs se ferment, le Veilleur pose la main, le mur s'ouvre — une
     source pleine, sans épreuve (la ville le reconnaît, elle). Fond provisoire : la route des Ruines
     (image dédiée à générer). Pas de boss. */
  vers_le_coeur: {
    id: "vers_le_coeur",
    worldId: "ruins",
    adventureIndex: 0,
    mode: "parcours",
    title: "Vers le Cœur",
    departLabel: "Marcher vers le Cœur",
    icon: "images/Icons/codex/world_ruins.png",
    parcours: {
      image: "ruines_route", track: "route", points: [0, 1, 3, 4, 6], bag: 3,
      steps: [
        { type: "obstacle", gabaritId: "rue_qui_tourne", text: "Les rues d'en haut ont la forme de celles d'en bas. Edda marche sans regarder sa feuille." },
        { type: "combat", foe: "skeleton", pack: 2, act: 2, text: "Des squelettes, et derrière eux quelqu'un qui pose des pierres.",
          after: "Ils tombent sur les dalles neuves. Les dalles ne gardent aucune trace." },
        { type: "source", fullBreath: true, text: "Un mur se lève devant toi, puis un autre derrière. Le Veilleur pose la main à plat sur le premier. Il s'ouvre." },
        { type: "combat", foe: "gargoyle", pack: 2, act: 3, text: "Des gargouilles sur les toits neufs. Elles regardent le Veilleur, pas toi.",
          after: "La dernière s'arrête avant de tomber. Elle regarde le Veilleur. Puis elle tombe quand même." },
        { type: "obstacle", gabaritId: "porte_qui_attend", text: "L'arche du Cœur. En haut, un vide de la taille d'une pierre." }
      ]
    },
    entryCost: { resourceId: "ration", amount: 1 },
    lootResource: "gold",
    unlockOnSuccess: { buildingId: null, unlockFlag: null, completionFlag: "versLeCoeurDone" }
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
  },

  /* v3.429.0 (Ruines, U-6) — la Petite Aventure des Ruines : les murs bougent, la Craie d'Edda.
     Ouverte avec l'étape ruines_06 « Les murs bougent ». */
  petite_aventure_ruines: {
    id: "petite_aventure_ruines",
    mode: "pa2",
    worldId: "ruins",
    adventureIndex: 0,
    title: "Petite aventure — Ruines",
    departLabel: "Partir dans la ville",
    icon: "images/Icons/scene/path_easy.png",
    boardRequires: { tabUnlocked: "village", storyStep: "ruines_06" },
    successFlag: "ruinsPaCompleted"
  }
};

window.SCENE_TEMPLATES = SCENE_TEMPLATES;
