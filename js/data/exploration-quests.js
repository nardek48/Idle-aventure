"use strict";
/* data/exploration-quests.js — quêtes du moteur d'Expéditions non-combat (jamais de CombatEngine).
   Logique : systems/exploration-engine.js + systems/exploration-check-system.js (module pur). Détail : COMMENTAIRES_ORIGINAUX.md */

var EXPLORATION_QUESTS = {
  blockedPath: {
    id: "blockedPath",
    title: "Le Sentier Obstrué",
    description: "Un tronc déraciné bloque le passage vers une clairière oubliée.",
    icon: "🌲",

    // Métadonnées d'affichage/filtrage (écran Quêtes) — même schéma unifié que les autres
    // systèmes de quêtes (adventure-quests.js/world-quests.js/hunt-quests.js) : champ "section"
    // (pas "type", déjà utilisé en interne ailleurs pour la logique de jeu).
    section: "expedition",
    difficulty: "easy",
    progressionStage: "world_start",
    category: "side",

    // Prérequis d'accès à la carte/au bouton "Préparer l'expédition".
    requirements: {
      heroSelected: true,
      minPetiteRation: 1
    },

    // v3.119.0 (retour Seb) : cette quête exige déjà 1 petite ration pour être LANCÉE (ci-dessus),
    // mais rien n'empêchait son AFFICHAGE avant même que la petite ration soit fabricable (Cuisine
    // de camp, bâtiment Chasse) — elle traînait au tableau sans qu'on puisse jamais la lancer.
    boardRequires: { progressFlag: "huntBuildingUnlocked" },

    // Provisions proposées à l'étape A du popup de préparation.
    provisionOptions: [
      { id: "light", label: "Voyage léger", startingRations: 1, reserveRations: 0 },
      { id: "prepared", label: "Voyage préparé", startingRations: 2, reserveRations: 1 }
    ],

    // Approches proposées à l'étape B — n'affecte que les textes affichés pour cette V1
    // (ne modifie jamais successChance, voir exploration-check-system.js).
    approachOptions: [
      { id: "careful", label: "Prudente" },
      { id: "balanced", label: "Équilibrée" },
      { id: "bold", label: "Audacieuse" }
    ],

    // Événement unique de cette V1 : le tronc sur le sentier.
    event: {
      id: "fallenTree",
      title: "Le tronc sur le sentier",
      text: "Un chêne déraciné bloque le passage. Derrière les branches, une faible lueur semble venir de la clairière.",
      choices: {
        power: {
          id: "power",
          label: "Déplacer le tronc",
          stat: "power",
          difficulty: 40,
          rewards: {
            perfect: { wood: 8, unlockClearing: true },
            success: { wood: 5, unlockClearing: true }
            // setback -> popup de secours (pas de récompense directe ici)
          }
        },
        precision: {
          id: "precision",
          label: "Chercher un passage étroit",
          stat: "precision",
          difficulty: 32,
          rewards: {
            perfect: { wood: 3, unlockClearing: true },
            success: { wood: 3, unlockClearing: true }
            // setback -> popup de secours
          }
        },
        bypass: {
          id: "bypass",
          label: "Installer un camp et contourner",
          requiresReserve: true,
          guaranteed: true,
          rewards: {
            success: { wood: 4, unlockClearing: true }
          }
        }
      }
    },

    // Popup de secours (après un "setback" sur power/precision).
    fallback: {
      title: "Contretemps",
      choices: {
        bypassWithReserve: {
          id: "bypassWithReserve",
          label: "Utiliser la ration de réserve et contourner",
          requiresReserve: true,
          rewards: { wood: 4, unlockClearing: true }
        },
        retreat: {
          id: "retreat",
          label: "Retourner au camp",
          rewards: { wood: 1, unlockClearing: false, questRemainsIncomplete: true }
        }
      }
    },

    // Récompense principale : déblocage persistant, une seule fois.
    unlockFlag: "forgottenClearingUnlocked",
    completionFlag: "blockedPathCompleted"
  },

  unstableVein: {
    id: "unstableVein",
    title: "La Veine Instable",
    description: "Au fond de la Clairière oubliée, une fissure révèle une veine de roche rare. Le filon semble fragile : il faut apprendre à le frapper avant qu'il ne se referme.",
    icon: "⛏️",

    section: "expedition",
    difficulty: "easy",
    progressionStage: "world_start",
    category: "main", // bloque le déblocage de la Carrière, donc structurellement principale

    // Prérequis d'accès : Sentier Obstrué terminé + Clairière découverte + héros + ration,
    // ET la Carrière ne doit pas déjà être débloquée (quête non répétable une fois réussie —
    // vérifié via ExplorationManager.isQuestCompleted côté moteur pour blockedPathCompleted/
    // forgottenClearingUnlocked, et via game.explorationProgression.quarryUnlocked ici).
    requirements: {
      heroSelected: true,
      minPetiteRation: 1,
      requiresQuestCompleted: "blockedPath",
      requiresUnlockFlag: "forgottenClearingUnlocked"
    },

    // Coût fixe : 1 petite ration, aucun choix de réserve (contrairement au Sentier Obstrué).
    cost: { petiteRation: 1 },

    // Minijeu de minage (jauge/timing), 3 coups. Logique : systems/mining-system.js +
    // systems/mining-check-system.js (module pur) — PAS ExplorationManager (mécanique trop
    // différente d'un test de stat à résultat unique).
    minigame: {
      hitCount: 3,
      rewardsByResult: {
        miss: { stone: 0 },
        correct: { stone: 2 },
        perfect: { stone: 4 }
      },
      perfectIronOreChancePct: 20
    },

    // Réussite si au moins 1 coup correct ou parfait sur les 3.
    successCondition: "atLeastOneHit",

    failureText: "La veine s\u2019est refermée avant que vous trouviez le bon angle. Préparez une nouvelle petite ration pour retenter l\u2019expédition.",

    // Récompense principale : déblocage persistant et définitif de la Carrière.
    unlockBuildingId: "quarry",
    unlockFlag: "quarryUnlocked",
    completionFlag: "unstableVeinDiscoveryCompleted"
  },

  driedSpring: {
    id: "driedSpring",
    title: "La Source Tarie",
    description: "Une ancienne source jaillit encore, mais son débit est irrégulier. Il faut apprendre à puiser l'eau sans la laisser s'échapper.",
    icon: "💧",

    section: "expedition",
    difficulty: "easy",
    progressionStage: "world_start",
    category: "main", // débloque le Puits, donc structurellement principale

    // Prérequis d'accès : héros sélectionné, Puits pas encore débloqué. Aucun coût de
    // ration (le Puits produit justement l'Eau, intrant de la petite ration elle-même —
    // demander une ration ici créerait un nouveau verrou circulaire, décision Seb).
    requirements: {
      heroSelected: true
    },

    // Aucun coût, aucun choix de réserve pour cette V1.
    cost: {},

    // Minijeu "maintenir puis relâcher" (jauge de remplissage), 3 tentatives. Logique :
    // systems/well-system.js + systems/well-check-system.js (module pur) — nouveau moteur
    // dédié, miroir de mining-system.js mais indépendant (pas de généralisation pour ne
    // pas risquer de régression sur la Carrière déjà en prod).
    minigame: {
      attemptCount: 3,
      rewardsByResult: {
        tooEarly: { water: 0 },
        correct: { water: 2 },
        perfect: { water: 4 },
        tooLate: { water: 0 }
      }
    },

    // Réussite si au moins 1 résultat correct ou parfait sur les 3.
    successCondition: "atLeastOneHit",

    failureText: "La source s\u2019est échappée avant que vous puissiez remplir votre outre. Tu peux retenter l\u2019expédition quand tu veux.",

    // Récompense principale : déblocage persistant et définitif du Puits.
    unlockBuildingId: "well",
    unlockFlag: "wellUnlocked",
    completionFlag: "driedSpringDiscoveryCompleted"
  },

  /* ================= v3.110.0 — déblocage des 3 derniers bâtiments =================
     Champs/Scierie/Mine sortent du "débloqué d'office" et passent derrière une quête,
     comme Chasse/Puits/Carrière (décision Seb). Ordre : Scierie (tôt Acte II, avant
     « Les fondations » qui exige bois+planches) -> Mine (après la Carrière, le fer
     prolonge la pierre) -> Champs (après le Puits, sans eau pas de culture).
     silentGrove/fallowField : moteur Expéditions (test de stat, exploration-engine.js,
     récompenses génériques `resources` + `unlockBuilding` — v3.110.0). ironLode :
     minijeu de minage généralisé (mining-system.js, ressource principale/bonus par
     quête). boardRequires = gating d'AFFICHAGE au tableau de missions (mission-board),
     distinct des requirements de lancement. */

  silentGrove: {
    id: "silentGrove",
    title: "Le Bosquet Silencieux",
    description: "Un bosquet dense pousse à flanc de colline, assez proche du village pour y établir une scierie. Encore faut-il s'y frayer un chemin et choisir les premiers arbres à abattre.",
    icon: "🪓",

    section: "expedition",
    difficulty: "easy",
    progressionStage: "world_start",
    category: "side", // ne bloque pas l'Histoire — bâtiment de confort économique

    // Aucune ration exigée : à l'ouverture du Village (forest_06), le Puits n'existe pas
    // encore -> la Petite ration (viande+eau) est infabricable, un coût créerait un verrou
    // circulaire (même décision que driedSpring).
    requirements: {
      heroSelected: true
    },

    // Affichage au tableau : dès que le Village est ouvert (forest_06).
    boardRequires: { tabUnlocked: "village" },

    // Une seule option, gratuite — le popup de préparation reste le même parcours que les
    // autres expéditions (cohérence d'UX), sans coût réel.
    provisionOptions: [
      { id: "light", label: "Repérage rapide", startingRations: 0, reserveRations: 0 }
    ],

    approachOptions: [
      { id: "careful", label: "Prudente" },
      { id: "balanced", label: "Équilibrée" },
      { id: "bold", label: "Audacieuse" }
    ],

    event: {
      id: "twinTrunks",
      icon: "🪓",
      title: "Les troncs jumeaux",
      text: "Deux chênes morts barrent l'entrée du bosquet. Derrière, des fûts droits à perte de vue — de quoi faire tourner une scierie pendant des saisons.",
      choices: {
        power: {
          id: "power",
          label: "Abattre les troncs morts",
          stat: "power",
          difficulty: 38,
          rewards: {
            perfect: { resources: { bois: 8 }, unlockBuilding: true },
            success: { resources: { bois: 5 }, unlockBuilding: true }
            // setback -> popup de secours (retraite uniquement, quête relançable gratuitement)
          }
        },
        precision: {
          id: "precision",
          label: "Marquer les meilleurs arbres",
          stat: "precision",
          difficulty: 30,
          rewards: {
            perfect: { resources: { bois: 4 }, unlockBuilding: true },
            success: { resources: { bois: 3 }, unlockBuilding: true }
          }
        }
        // pas de choix "bypass" : aucune réserve possible sans ration à ce stade du jeu —
        // exploration-view n'affiche le bouton de contournement que s'il est défini (v3.110.0)
      }
    },

    fallback: {
      title: "Contretemps",
      choices: {
        // pas de bypassWithReserve (aucune réserve possible), retraite seule — la quête
        // reste relançable sans coût, l'échec n'est qu'un contretemps.
        retreat: {
          id: "retreat",
          label: "Revenir au village",
          rewards: { resources: { bois: 1 }, questRemainsIncomplete: true }
        }
      }
    },

    // Libellés des cartes (quests-view) — les quêtes historiques gardent leurs textes en dur.
    rewardMainLabel: "🪚 Scierie déverrouillée",
    rewardPossibleLabel: "🪵 Bois",
    ui: {
      successIcon: "🪚",
      successRowLabel: "🪚 Scierie",
      completedLabel: "✔ Scierie déverrouillée",
      completedText: "Les Bosquets peuvent maintenant être exploités depuis la Scierie."
    },

    unlockBuildingId: "sawmill",
    unlockFlag: "sawmillUnlocked",
    completionFlag: "silentGroveDiscoveryCompleted"
  },

  ironLode: {
    id: "ironLode",
    title: "L'Éboulis Ferreux",
    description: "Sous la Carrière, un éboulis récent a mis au jour des reflets rougeâtres dans la roche. Le fer est là, mais la paroi est traître : frappe juste, ou la veine se dérobera.",
    icon: "⛏️",

    section: "expedition",
    difficulty: "easy",
    progressionStage: "world_start",
    category: "side",

    // Lancement : Carrière débloquée + 1 ration (le joueur a la Cuisine de camp à ce stade).
    requirements: {
      heroSelected: true,
      requiresProgressFlag: "quarryUnlocked",
      lockedReason: "Débloque d'abord la Carrière (La Veine Instable)"
    },

    boardRequires: { progressFlag: "quarryUnlocked" },

    cost: { petiteRation: 1 },

    // Même minijeu jauge/timing que la Veine Instable (mining-system.js), ressources
    // inversées : fer en principal, pierre en bonus de coup parfait (symétrie voulue).
    minigame: {
      hitCount: 3,
      primaryResourceId: "fer",
      bonusResourceId: "pierre",
      rewardsByResult: {
        miss: { amount: 0 },
        correct: { amount: 2 },
        perfect: { amount: 4 }
      },
      perfectBonusChancePct: 20
    },

    successCondition: "atLeastOneHit",

    failureText: "La veine s\u2019est dérobée avant que tu trouves le bon angle. Prépare une nouvelle petite ration pour retenter l\u2019expédition.",

    rewardMainLabel: "⛏️ Mine déverrouillée",
    rewardPossibleLabel: "⚙️ Fer · 🪨 Pierre",
    ui: {
      successIcon: "⛏️",
      successTitle: "Mine déverrouillée !",
      successText: "Les Galeries peuvent maintenant être creusées depuis la Mine.",
      failTitle: "Veine dérobée",
      primaryRowLabel: "⚙️ Fer obtenu",
      bonusRowLabel: "🪨 Pierre",
      buildingRowLabel: "⛏️ Mine",
      primaryIcon: "⚙️",
      bonusIcon: "🪨",
      completedLabel: "✔ Mine déverrouillée",
      completedText: "Les Galeries peuvent maintenant être creusées depuis la Mine."
    },

    unlockBuildingId: "mine",
    unlockFlag: "mineUnlocked",
    completionFlag: "ironLodeDiscoveryCompleted"
  },

  fallowField: {
    id: "fallowField",
    title: "La Terre en Friche",
    description: "Derrière le village, une friche s'étend jusqu'au ruisseau. Maintenant que l'eau coule à nouveau, cette terre pourrait nourrir Aeswyn — il faut la défricher et tracer les premiers sillons.",
    icon: "🌾",

    section: "expedition",
    difficulty: "easy",
    progressionStage: "world_start",
    category: "side",

    requirements: {
      heroSelected: true,
      minPetiteRation: 1,
      requiresProgressFlag: "wellUnlocked",
      lockedReason: "Débloque d'abord le Puits (La Source Tarie)"
    },

    // v3.119.0 (retour Seb) : ajout de huntBuildingUnlocked — cette quête exige aussi 1 petite
    // ration pour être lancée (ci-dessus), mais ne restait masquée que sur le Puits ; elle pouvait
    // réapparaître au tableau avant même que la petite ration soit fabricable (Cuisine de camp).
    boardRequires: { progressFlags: ["wellUnlocked", "huntBuildingUnlocked"] },

    // Même parcours de préparation que le Sentier Obstrué (léger/préparé + réserve).
    provisionOptions: [
      { id: "light", label: "Voyage léger", startingRations: 1, reserveRations: 0 },
      { id: "prepared", label: "Voyage préparé", startingRations: 2, reserveRations: 1 }
    ],

    approachOptions: [
      { id: "careful", label: "Prudente" },
      { id: "balanced", label: "Équilibrée" },
      { id: "bold", label: "Audacieuse" }
    ],

    event: {
      id: "tangledFallow",
      icon: "🌾",
      title: "La friche emmêlée",
      text: "Ronces et racines tiennent la terre depuis des années. Sous l'enchevêtrement, un sol noir et gras n'attend que la charrue.",
      choices: {
        power: {
          id: "power",
          label: "Arracher les ronces",
          stat: "power",
          difficulty: 42,
          rewards: {
            perfect: { resources: { ble: 8 }, unlockBuilding: true },
            success: { resources: { ble: 5 }, unlockBuilding: true }
          }
        },
        precision: {
          id: "precision",
          label: "Tracer les sillons au cordeau",
          stat: "precision",
          difficulty: 34,
          rewards: {
            perfect: { resources: { ble: 4 }, unlockBuilding: true },
            success: { resources: { ble: 3 }, unlockBuilding: true }
          }
        },
        bypass: {
          id: "bypass",
          label: "Camper et brûler la friche par carrés",
          requiresReserve: true,
          guaranteed: true,
          rewards: {
            success: { resources: { ble: 4 }, unlockBuilding: true }
          }
        }
      }
    },

    fallback: {
      title: "Contretemps",
      choices: {
        bypassWithReserve: {
          id: "bypassWithReserve",
          label: "Utiliser la ration de réserve et finir le défrichage",
          requiresReserve: true,
          rewards: { resources: { ble: 4 }, unlockBuilding: true }
        },
        retreat: {
          id: "retreat",
          label: "Retourner au village",
          rewards: { resources: { ble: 1 }, questRemainsIncomplete: true }
        }
      }
    },

    rewardMainLabel: "🌾 Champs déverrouillé",
    rewardPossibleLabel: "🌾 Blé",
    ui: {
      successIcon: "🌾",
      successRowLabel: "🌾 Champs",
      completedLabel: "✔ Champs déverrouillé",
      completedText: "Les Parcelles peuvent maintenant être cultivées depuis le Champs."
    },

    unlockBuildingId: "farm",
    unlockFlag: "farmUnlocked",
    completionFlag: "fallowFieldDiscoveryCompleted"
  }
};

window.EXPLORATION_QUESTS = EXPLORATION_QUESTS;
