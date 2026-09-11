"use strict";
/* data/scene-templates.js — canevas du scene-engine générique. Un canevas est purement des
   données (aucune logique) consommées par SceneEngine.buildCard() + scene-run-system.js.
   v1 : un seul canevas génératif, sandbox (pas encore branché à MissionBoard/SortieManager
   en usage réel — voir CHANGELOG_v3.120.0.md, Lot S1). Détail : DESIGN_Scene_Engine_v1.md §5 */

/* v3.195.0 (recalibrage "choix pas intéressant") : curseur d'intensité de la Petite Aventure,
   choisi en préparation (après le profil Bourrin/Prudent, avant le loadout) — ORTHOGONAL au
   profil (décision Seb : profil = nature du parcours, intensité = ampleur du risque/gain).
   depthMax remplace template.depthMax pour le run (SceneRunManager.chooseIntensity),
   diffMult multiplie SceneCheckSystem.depthDifficulty (via SceneEngine.resolveObstacle/
   estimateObstacle, appliqué en plus du riskMod de porte et du diffMod d'option — voir
   scene-nodes.js:optionProfiles), lootMult multiplie tous les gains du run (obstacles,
   découvertes, bonus de finale) SAUF la Sève d'Aeswyn (collection, jamais mise en jeu par le
   risque, voir _rollSeveAeswynPerNode/_rollSeveAeswynFinale — inchangé). Calibrage validé par
   simulation Monte-Carlo (session, voir CHANGELOG_v3.195.0.md) : Sentier praticable dès un
   héros neuf (~40-45% chance), Périple reste tendu même bien développé (~75% chance, ~24%
   évac). Butin Périple sur héros développé (~785 or) dépasse enfin le haut de fourchette
   d'une quête secondaire (400-800 or, adventure-quests.js), justifiant le risque maximal. */
var SCENE_INTENSITY = {
  /* v3.198.0 (recalibrage Seb, "encore trop facile") : les diffMult 0.70/1.00/1.15 avaient ete
     calibres en v3.195.0 contre un joueur qui choisit au GAIN. Simulation Monte-Carlo de
     session contre un joueur qui choisit a la MEILLEURE CHANCE (ce que fait tout le monde,
     l'estimation est ecrite sur la carte, corde jouee) : 0.2 a 0.6 % d'echec a TOUS les
     stades. Nouveaux multiplicateurs calibres sur ce joueur-la, cible Seb "Periple = pari".
     lootMult remonte en consequence : le Periple perd la moitie de son butin sur un run sur
     trois, il doit rapporter davantage quand il passe. */
  /* v3.199.0 : diffMult redescendu (0.95/1.70/2.60 -> 0.85/1.30/1.85). Le Souffle devenu
     mordant apporte sa part de difficulte en interdisant la mono-strategie ; sans ce
     reajustement le Peripe montait a 50 % d'echec. La cible v3.198.0 (~35 % au Periple) est
     tenue, mais la difficulte vient desormais davantage des choix et moins des des. lootMult
     ajuste a la baisse pour la meme raison : le joueur joue plus souvent la voie de
     puissance, qui rapporte 2.6x, donc l'or moyen par run montait tout seul. */
  sentier: { id: "sentier", label: "Sentier", icon: "🌿", depthMax: 6, diffMult: 0.85, lootMult: 1.0, desc: "Court et sûr. Butin standard." },
  chemin: { id: "chemin", label: "Chemin", icon: "🌲", depthMax: 8, diffMult: 1.30, lootMult: 2.4, desc: "Le format habituel. Exigeant. Butin x2.4." },
  periple: { id: "periple", label: "Périple", icon: "⛰️", depthMax: 10, diffMult: 1.85, lootMult: 5.4, desc: "Un pari. Beaucoup en reviennent les mains vides. Butin x5.4." }
};
window.SCENE_INTENSITY = SCENE_INTENSITY;

/* v3.196.0 (lot C2 "répétitivité", mutateurs de run) : tiré UNE FOIS au lancement du run
   (juste après chooseIntensity, avant preparation), annoncé au joueur, jamais recalculé.
   ORTHOGONAL au profil ET à l'intensité — un 3e axe de variabilité, purement additif par
   rapport au système du lot v3.195.0 (chaque effet se branche sur un multiplicateur déjà
   existant, aucun nouveau sous-système). "aucun" inclus dans les poids (20% chacun, y
   compris aucun) pour ne pas mutater 100% des runs — décision Seb. */
var SCENE_MUTATORS = {
  aucun: { id: "aucun", label: "Rien à signaler", icon: "🌤️", weight: 20, desc: "Un run sans particularité." },
  brouillard: {
    id: "brouillard", label: "Brouillard", icon: "🌫️", weight: 20,
    desc: "Horizon de visibilité nul, même avec la torche — tu avances à l'aveugle.",
    horizonOverride: 0 // consommé par SceneRunManager.getVisibilityHorizon()
  },
  pluie: {
    id: "pluie", label: "Pluie battante", icon: "🌧️", weight: 20,
    desc: "L'Endurance est renforcée (+15%), mais l'effort fatigue davantage (coût en Souffle +50%).",
    enduranceStatMult: 1.15, // consommé par SceneRunManager.statEffective()
    breathCostMult: 1.5 // consommé par SceneRunManager._obstacleFactors()
  },
  nuit: {
    id: "nuit", label: "Nuit noire", icon: "🌙", weight: 20,
    desc: "Un danger de plus t'attend sur le chemin, mais le butin est meilleur (+15%).",
    extraDangerNode: true, // consommé par SceneRunManager._ensureMinCombat() (génération de carte)
    lootMult: 1.15 // consommé par SceneRunManager._runLootMult()/_obstacleFactors()
  }
};
window.SCENE_MUTATORS = SCENE_MUTATORS;

var SCENE_TEMPLATES = {
  expedition_faille: {
    id: "expedition_faille",
    mode: "generative",
    title: "Expédition en profondeur",
    icon: "🕳️",

    depthMax: 8,
    firstDepthType: "obstacle", // v1 : premier palier toujours lisible, pas de mystère d'entrée
    gatesPerDepth: [2, 3],

    /* v3.199.0 : expedition_faille etait le dernier canevas jamais calibre (point ouvert
       depuis la session du 09/09). Mesure avant ce lot, joueur optimise : 0.0 a 0.2 %
       d'echec, 100 % des choix en voie d'endurance, Souffle minimum 98/100. Exactement l'etat
       dont sortait la Petite Aventure. Il recoit les memes leviers, calibres pour le placer
       au niveau du Chemin (~10 %) et non du Periple : ses 2 a 3 portes par palier sont son
       identite, il doit rester le format large ou l'on choisit son chemin.
       Il ne recoit PAS optionProfiles : il garde le triangle par defaut de SCENE_NODES, plus
       doux, pour que ses lootRanges (calibres v3.121.0) n'aient pas a etre refaits. */
    optionsPerNode: 2,
    maxInjuries: 2,
    heroScaling: { ref: 21, coef: 0.60, max: 3.5 },
    breathPerDepth: 5,
    // Multiplicateur de difficulte propre au canevas, lu par _obstacleFactors quand le run
    // n'a pas d'intensite (SCENE_INTENSITY est reserve a la Petite Aventure).
    diffMult: 2.6,

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
    // v3.198.0 : doublon retire — provisions devient un objet reellement actif (voir
    // SceneRunManager.useSceneProvision), deux exemplaires desequilibreraient le canevas.
    loadoutOffer: ["torche", "corde", "provisions", "amulette"],
    loadoutSlots: 3,

    items: {
      torche: { id: "torche", name: "🔥 Torche", desc: "Révèle le détail des portes du niveau courant (3 charges).", charges: 3 },
      corde: { id: "corde", name: "🪢 Corde", desc: "Passe un obstacle compatible sans jet (1 usage, gain réduit).", charges: 1 },
      provisions: { id: "provisions", name: "🥖 Provisions", desc: "Soigne la blessure la plus grave (1 usage).", charges: 1 },
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

    // v3.131.0 : seul canevas sans boardRequires (oubli) — disponible dès le lancement d'une
    // nouvelle partie, avant même Le Bosquet Silencieux. Gate désormais sur sawmillUnlocked
    // (débloqué par bosquet_silencieux), pour arriver après la toute première petite quête.
    boardRequires: { progressFlag: "sawmillUnlocked" },

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
  },

  /* ================= v3.125.0 (Petites Aventures, Lot PA1/PA2) =================
     Concept Seb (Aethervale_Concept_Petites_Aventures.docx, 01/09/2026) : quête répétable
     à profil (Bourrin/Prudent), parcours à points 5-10, butin final IDENTIQUE entre profils
     (la différence se joue sur le chemin, pas la récompense — décision actée §2), drops
     exclusifs au mode (Lot PA3). Contrairement aux canevas de déblocage (Lot S2a/b), pas de
     unlockOnSuccess : mission répétable, gating par cap journalier (voir
     PetiteAventureManager.canStartToday(), village-quest-system.js pour le pattern de cap).
     mode "generative" comme expedition_faille (depthMax fixe à 8, dans la plage 5-10 visée —
     gatesPerDepth [1,1] : contrairement à expedition_faille, pas de choix de PORTE par palier,
     le profil choisi en amont détermine déjà la nature du parcours ; le "choix" du concept
     (§3) se joue aux nœuds obstacle eux-mêmes (options power/precision/endurance), comme les
     canevas Lot S2. */
  petite_aventure_foret: {
    id: "petite_aventure_foret",
    mode: "generative",
    title: "Petite aventure — Forêt",
    icon: "🍃",

    // v3.195.0 : depthMax devient la valeur par défaut/repli — le run réel utilise
    // SCENE_INTENSITY[run.intensity].depthMax (choisi en préparation, voir
    // SceneRunManager.chooseIntensity). gatesPerDepth [2,2] (au lieu de [1,1]) : réactive le
    // choix de PORTE déjà codé dans SceneEngine.buildCard (riskMod par porte, indices de gain
    // gainHints) — mort faute de second choix jusqu'ici, cohérent avec expedition_faille qui
    // l'utilise déjà. Bascule automatiquement l'UI de la fiche solo vers la grille de cartes
    // (scene-view.js:SCENE_PATH_TEMPLATE_IDS ne matche plus que si level.length===1).
    depthMax: 8,
    firstDepthType: "obstacle",
    // v3.198.0 : [1, 2] au lieu de [2, 2]. Avec 2 portes x 3 voies le joueur disposait de 6
    // candidats par palier et trouvait toujours une sortie a ~90 % : la difficulte du jet
    // n'avait plus aucune prise. Un palier sur deux n'offre desormais qu'un seul passage.
    gatesPerDepth: [1, 2],

    // v3.198.0 : un noeud-obstacle n'expose que 2 des 3 voies de son gabarit, tirees a la
    // generation de la carte et memorisees dans slot.voies (SceneEngine.buildCard). Les
    // gabarits gardent leurs 3 options en donnee : c'est le RUN qui en cache une, donc les
    // autres canevas (expedition_faille, quetes de deblocage migrees) ne bougent pas. Effet
    // recherche : le joueur ne peut plus systematiquement jouer sa meilleure stat.
    optionsPerNode: 2,

    // v3.198.0 : evacuation a 2 blessures au lieu de 3 (defaut du moteur, voir
    // SceneRunManager.getMaxInjuries). Levier de difficulte le plus efficace mesure en
    // simulation, et le moins couteux en code.
    maxInjuries: 2,

    // v3.198.0 : difficulte indexee sur le developpement du heros. Indexee sur le BONUS DE
    // CHANCE reellement gagne (moyenne des min(55, stat*0.40), voir SceneCheckSystem) et NON
    // sur la stat brute : la stat brute continue de monter apres que le bonus a plafonne a
    // 55, ce qui creusait un trou de difficulte au stade intermediaire (mesure : 20 % d'echec
    // a mi-parcours contre 27 % pour un heros neuf). ref 21 = heros neuf non entraine.
    // Champ de TEMPLATE, pas de moteur : expedition_faille et les quetes migrees ne le
    // declarent pas et gardent leur calibrage.
    heroScaling: { ref: 21, coef: 0.60, max: 3.5 },

    // v3.198.0 : triangle des voies elargi, en surcharge locale de SCENE_NODES.optionProfiles
    // (qui reste le defaut des autres canevas). L'endurance etait a la fois la moins
    // difficile, la moins chere en Souffle et la moins blessante, pour seulement -20 % de
    // butin : ce n'etait pas un triangle mais une droite avec un peage symbolique. Elle
    // rapporte desormais la moitie d'un passage normal, la puissance 2.6 fois plus.
    optionProfiles: {
      power: { diffMod: 1.12, lootMod: 2.60, breathCost: 10, injurySeverity: "grave" },
      precision: { diffMod: 1.0, lootMod: 1.15, breathCost: 5, injurySeverity: "normale" },
      endurance: { diffMod: 0.95, lootMod: 0.50, breathCost: 20, injurySeverity: "legere" }
    },

    // v3.199.0 : cout fixe pour franchir un palier, quel que soit le noeud. Donne au Souffle
    // un plancher indexe sur la LONGUEUR du run (Sentier 30, Chemin 40, Periple 50 sur un
    // budget de 100) : c'est ce plancher qui rend le format long structurellement plus tendu,
    // sans toucher a la difficulte des jets. Absent d'un canevas = 0 (les quetes de
    // deblocage migrees font 2 paliers, aucune pression de Souffle : ce sont des tutoriels).
    breathPerDepth: 5,

    // v3.125.0 : profileWeights remplace slotWeights à la génération (voir SceneEngine.buildCard
    // slotWeightsOverride) — Bourrin : plus de combats (Lot PA2), aucun bloqueur (concept §2,
    // "aucun bloqueur de temps"). Prudent : peu/pas de combat, 1-2 bloqueurs sur les 8 paliers
    // (≈15% de poids sur 8 tirages ≈ 1-2 attendus, calibré à ajuster au harness si besoin).
    slotWeights: { obstacle: 56, autel: 10, decouverte: 12, source: 8, mystere: 14 }, // repli si profil absent (ne devrait pas arriver, run toujours profilé avant génération)
    profileWeights: {
      bourrin: { obstacle: 38, combat: 32, autel: 6, decouverte: 10, source: 4, mystere: 10 },
      prudent: { obstacle: 46, combat: 4, autel: 10, decouverte: 14, source: 10, bloqueur: 16 }
    },

    pools: {
      obstacle: ["eboulis", "gouffre", "porte_scellee", "paroi", "riviere", "racines"],
      // v3.125.0 (Lot PA2) : gabaritId d'un slot combat pointe ici, pas dans SCENE_NODES —
      // groupes d'ennemis de la Forêt (world "forest"), résolus par QuestEnemyManager.spawnFor
      // via un enemyFilter. "boss" absent : pas de boss en Petite Aventure (réservé Donjon/Histoire).
      combat: ["gobelins_foret", "loups_foret", "araignees_foret"]
    },
    riskModRange: [0.6, 1.5],

    // v3.132.0 (audit Forêt) : au plus 2 nœuds combat par run (les slots au-delà retombent en
    // obstacle, SceneEngine.buildCard) et vagues de 4-6 ennemis (finale incluse, + boss).
    // Sim Monte-Carlo (Acte II, Lisière) : 3 vagues 6-10 = 0-5 % de réussite ; 2 vagues 4-6
    // = 97-100 %. Bourrin garde ~8× plus de combat que Prudent (32 % vs 4 % de poids).
    // v3.143.0 (variance des runs, audit Forêt) : bloqueur plafonné à 2 aussi, même mécanisme
    // — sim 3000 runs Prudent : sans plafond, 9.9 % des runs cumulaient ≥3 bloqueurs (jusqu'à
    // 45 min d'attente cumulée observés), largement au-delà du concept d'origine ("1 à 2
    // bloqueurs"). Décision Seb 04/09/2026 : plafond 2 (≤ 15 min cumulées typique).
    maxSlotsPerRun: { combat: 2, bloqueur: 2 },
    combatWaveRange: [4, 6],

    // Durée d'un nœud bloqueur (Prudent uniquement) — concept §2 : "1 à 2 points avec un
    // bloqueur de temps réel de 5 à 10 minutes". Tourne en fond (timestamp readyAt comparé à
    // Date.now() à l'affichage, PAS un setInterval/hook game-loop — voir scene-run-system.js).
    blockerDurationRange: [300000, 600000], // 5-10 min en ms

    // v3.195.0 : gourde ajoutée (item lié au Souffle, voir SCENE_NODES.optionProfiles) —
    // seul nouvel objet de ce lot, décision Seb : le reste de l'enrichissement du choix
    // d'objets (objets thématiques par option/profil) part en lot séparé après retour sur le
    // Souffle en jeu réel. Réutilisable comme la corde (pas de charges) : restaure au premier
    // usage plutôt que de forcer un choix cornélien dès la préparation sur un système neuf.
    // v3.198.0 : doublon de provisions retire. Mesure en simulation : deux provisions sur un
    // budget de 2 blessures absorbent tous les echecs et ramenent le taux d'echec de 34 % a
    // 0.3 %. Le doublon annulait a lui seul le plafond de blessures. Corde en un seul
    // exemplaire pour la meme raison (un second achetait 6 points de securite en ne
    // deplacant que l'amulette : case gratuite, pas un arbitrage).
    loadoutOffer: ["torche", "corde", "provisions", "gourde", "amulette"],
    loadoutSlots: 3,

    items: {
      torche: { id: "torche", name: "🔥 Torche", desc: "Révèle le détail des portes du niveau courant (3 charges).", charges: 3 },
      // v3.198.0 : la corde n'est plus reutilisable a l'infini. Elle etait une reussite
      // garantie, gratuite en Souffle, sans limite d'usage, sur 3 des 6 gabarits du pool
      // (gouffre, paroi, riviere) : 3.8 obstacles passes sans jeter un de par Periple.
      corde: { id: "corde", name: "🪢 Corde", desc: "Passe un obstacle compatible sans jet (1 usage, gain réduit).", charges: 1 },
      // v3.198.0 : enfin implementee. L'objet etait offert depuis v3.120.0 mais AUCUN code ne
      // le lisait (le mot "provisions" n'existait que dans ce fichier). Soigne la blessure la
      // plus GRAVE, ce qui en fait la seule reponse a un echec en voie de puissance : autel
      // et source ne retirent que les blessures legeres depuis ce lot.
      provisions: { id: "provisions", name: "🥖 Provisions", desc: "Soigne la blessure la plus grave (1 usage).", charges: 1 },
      gourde: { id: "gourde", name: "🍶 Gourde", desc: "Restaure 30 Souffle (consommable, à utiliser quand tu veux)." },
      amulette: { id: "amulette", name: "🧿 Amulette", desc: "Relance automatiquement le premier jet raté (1 fois).", }
    },

    entryCost: { resourceId: "petite_ration", amount: 1 },

    // Toujours visible au tableau dès le Village ouvert (pas de progressFlag additionnel —
    // c'est le cap journalier, pas boardRequires, qui limite le lancement répété).
    boardRequires: { tabUnlocked: "village" },

    lootResource: "gold",
    lootRanges: {
      obstacleSuccess: [6, 14],
      obstacleRope: [3, 7],
      obstacleSetback: [1, 3],
      decouverte: [8, 16],
      finalSafe: [20, 20],
      finalRiskyBase: [0, 0]
    },
    autelCostRatio: 0.2,

    // v3.125.0 (Lot PA3, à peupler) : table de drop exclusive par profil — ingrédients rares
    // + équipement dédié (décision Seb), résolue à la chambre finale, en plus du loot chiffré
    // identique entre profils (§4 du concept). Vide en PA1/PA2 : aucun tirage tant que non défini.
    // v3.127.0 (Lot PA3) : Sève d'Aeswyn (data/hunt-quests.js:WAREHOUSE_RESOURCES) — décision
    // affinée en cours de lot : ressource COMMUNE aux deux profils (pas un drop exclusif par
    // profil comme envisagé au départ, voir exclusiveLoot ci-dessous à l'état d'origine),
    // seul le TAUX de drop varie. Bourrin > Prudent (compense le risque du combat, décision
    // Seb 03/09/2026). Deux points de tirage (voir SceneRunManager._rollSeveAeswyn) :
    // - chance faible à chaque nœud résolu (obstacle/combat/autel/découverte/source/bloqueur)
    // - 1 garantie à la résolution de la chambre finale, quel que soit le choix de coffre
    seveAeswyn: {
      resourceId: "seve_aeswyn",
      perNodeChancePct: { bourrin: 6, prudent: 3 }, // à calibrer (run_sim.js) avant fixation définitive
      perNodeAmount: [1, 1],
      finaleGuaranteedAmount: { bourrin: 2, prudent: 1 } // à calibrer
    },

    // v3.125.0 (Lot PA3, à peupler) : table de drop exclusive par profil — ingrédients rares
    // + équipement dédié (décision Seb), résolue à la chambre finale, en plus du loot chiffré
    // identique entre profils (§4 du concept). Vide en PA1/PA2 : aucun tirage tant que non défini.
    exclusiveLoot: { bourrin: [], prudent: [] }
  }
};

window.SCENE_TEMPLATES = SCENE_TEMPLATES;
