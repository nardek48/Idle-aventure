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
  }
};

window.EXPLORATION_QUESTS = EXPLORATION_QUESTS;
