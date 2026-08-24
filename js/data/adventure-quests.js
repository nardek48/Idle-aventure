"use strict";
/* data/adventure-quests.js — quêtes scopées à une aventure précise (worldId+adventureIndex), séparées de world-quests.js.
   Logique : systems/adventure-quest-system.js. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var ADVENTURE_QUESTS = {
  aq_forest_scout: {
    id: "aq_forest_scout",
    type: "kill",
    worldId: "forest",
    adventureIndex: 0,
    name: "Éclaireur de la Lisière",
    story: "La Lisière grouille de créatures curieuses, attirées par l'odeur de ton feu de camp. Le temps d'écarter quelques-unes d'entre elles avant qu'elles ne s'approchent davantage.",
    icon: "./images/Icons/quest_icons/exploration/exploration3.png",
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
    type: "expedition",
    worldId: "forest",
    adventureIndex: 0,
    gatesTransitionTo: 1,
    name: "Prouver sa valeur",
    story: "Le Roi Slime géant règne sur la Lisière depuis des lunes, gardant jalousement le passage vers le cœur de la forêt. Pour qu'on te laisse poursuivre, il faudra d'abord montrer que tu n'es pas qu'un simple aventurier de passage.",
    icon: "./images/Icons/quest_icons/exploration/exploration1.png",
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
    type: "collect",
    worldId: "forest",
    adventureIndex: 1,
    gatesNextWorld: true,
    name: "Minerai des profondeurs",
    story: "Au-delà de la Lisière, l'air se fait plus lourd et les arbres plus anciens. On raconte qu'un minerai rare, teinté par l'Aether, affleure parfois sous les racines les plus profondes — à condition de survivre assez longtemps pour le trouver.",
    icon: "./images/Icons/quest_icons/resource/resource1.png",
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
