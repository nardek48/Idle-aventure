"use strict";
/* ============================================================
Aethervale — data/adventure-quests.js
v3.0 : première brique du système Quêtes/Ressources/Territoire
(voir Aethervale_Roadmap_Quetes_Ressources.md, Étapes 0+1+2 combinées,
limité au monde Forêt en preuve de concept).
v3.2 : la progression ne se fait plus en tâche de fond pendant le
farm normal — chaque quête se lance explicitement depuis l'onglet
Quêtes pour un run de combat dédié (voir
systems/adventure-quest-system.js). Structure de données ci-dessous
INCHANGÉE par ce passage, seul le mécanisme de suivi a changé.

Structure INDÉPENDANTE de data/world-quests.js (qui gère le déblocage
des mondes eux-mêmes) — ces quêtes sont scopées à une AVENTURE précise
d'un monde ({worldId, adventureIndex}), pas à un monde entier.

Un objectif (steps[]) reprend les types déjà existants de
data/world-quests.js ("kill"/"bossKill"), plus un nouveau type :
  - "collect" : suivre le cumul obtenu d'une ressource rare
                (game.resources[resourceKey]), incrémenté DIRECTEMENT
                par AdventureQuestManager.onEnemyKilled() pendant un
                run actif — voir systems/adventure-quest-system.js.

`type` (au niveau de la quête, pas du step) sert uniquement à
l'affichage/l'icône (Éclaireur/Collecte/Expédition) — la logique de
verrouillage ne regarde que `gatesTransitionTo`.

`gatesTransitionTo` (uniquement sur les quêtes de type "expedition") :
si présent, la COMPLÉTION de CETTE quête (fin de run réussie) est ce
qui débloque le passage adventureIndex -> gatesTransitionTo dans
WorldManager.advance() (voir AdventureQuestManager.isTransitionUnlocked,
appelé depuis progression-system.js). Aucune quête définie pour une
transition = comportement inchangé (toujours débloqué), donc aucune
régression sur les mondes/aventures qui n'ont pas encore de contenu ici.

`reward` est accordé automatiquement à la fin d'un run RÉUSSI (tous
les objectifs remplis, voir AdventureQuestManager.finish()) — pas de
bouton "Réclamer" manuel (contrairement à WORLD_QUESTS, qui garde ce
fonctionnement pour le déblocage des mondes).
============================================================ */

var ADVENTURE_QUESTS = {
  aq_forest_scout: {
    id: "aq_forest_scout",
    type: "kill", // Éclaireur
    worldId: "forest",
    adventureIndex: 0, // visible pendant "Lisière de la forêt"
    name: "Éclaireur de la Lisière",
    story: "La Lisière grouille de créatures curieuses, attirées par l'odeur de ton feu de camp. Le temps d'écarter quelques-unes d'entre elles avant qu'elles ne s'approchent davantage.",
    icon: "./images/Icons/quest_icons/exploration/exploration3.png", // v3.10 : lunette + carte étoilée, thème repérage
    steps: [
      {
        id: "kills_forest",
        type: "kill",
        worldId: "forest",
        target: 10,
        desc: "Vaincre {target} ennemis en Forêt"
      }
    ],
    reward: { gold: 400, essence: 8 }
  },

  aq_forest_expedition: {
    id: "aq_forest_expedition",
    type: "expedition", // Expédition — débloque l'aventure suivante
    worldId: "forest",
    adventureIndex: 0, // visible pendant "Lisière de la forêt"
    gatesTransitionTo: 1, // complétion du run = déblocage du passage vers l'aventure 1 (Cœur de la forêt)
    name: "Prouver sa valeur",
    story: "Le Roi Slime géant règne sur la Lisière depuis des lunes, gardant jalousement le passage vers le cœur de la forêt. Pour qu'on te laisse poursuivre, il faudra d'abord montrer que tu n'es pas qu'un simple aventurier de passage.",
    icon: "./images/Icons/quest_icons/exploration/exploration1.png", // v3.10 : clé + cadenas, thème déblocage de passage
    steps: [
      {
        id: "kills_expedition",
        type: "kill",
        worldId: "forest",
        target: 15,
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

  aq_forest_collect: {
    id: "aq_forest_collect",
    type: "collect", // Collecte
    worldId: "forest",
    adventureIndex: 1, // visible pendant "Cœur de la forêt" (zone à risque modéré)
    gatesNextWorld: true, // v3.3 : réclamation = déblocage du passage Forêt -> Désert (voir WorldManager.meetsAscensionRequirement)
    name: "Minerai des profondeurs",
    story: "Au-delà de la Lisière, l'air se fait plus lourd et les arbres plus anciens. On raconte qu'un minerai rare, teinté par l'Aether, affleure parfois sous les racines les plus profondes — à condition de survivre assez longtemps pour le trouver.",
    icon: "./images/Icons/quest_icons/resource/resource1.png", // v3.10 : enclume + lingots, thème minerai/forge
    steps: [
      {
        id: "collect_minerai",
        type: "collect",
        resourceKey: "mineraiRare",
        target: 5,
        desc: "Récupérer {target} Minerai rare en Cœur de la forêt"
      }
    ],
    reward: { gold: 600, essence: 12 }
  }
};

window.ADVENTURE_QUESTS = ADVENTURE_QUESTS;
