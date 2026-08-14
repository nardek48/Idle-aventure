"use strict";
/* ============================================================
QUEST IDLE — data/world-quests.js
v2.83 : questlines de déblocage des mondes (remplace le verrou par
nombre d'ascensions pur — voir doc d'équilibrage §6/§22 pour le
contexte). L'ascension reste un système de puissance permanent
(voir data/ascension.js), mais ne conditionne plus l'accès aux
mondes : c'est désormais une questline narrative par monde.

Forêt (index 0) et Désert (index 1) restent accessibles dès le
début, pas de questline pour elles. Chaque entrée ci-dessous décrit
la questline à terminer pour débloquer le monde `worldIndex`, avec
des objectifs thématiquement liés au monde PRÉCÉDENT (on "mérite"
l'accès au monde suivant en s'illustrant dans celui d'avant).

Un objectif (steps[]) est un de ces types :
  - "kill"     : tuer `target` ennemis normaux dans le monde `worldId`
                 (WorldQuestManager.trackKill, appelé depuis
                 combat-engine.js à chaque kill hors donjon)
  - "loot"     : récupérer `target` objets de rareté >= `minRarity`
                 (WorldQuestManager.trackLoot, appelé depuis
                 addDropToInventory en equipment-system.js)
  - "bossKill" : vaincre `target` fois le boss `bossId`
                 (WorldQuestManager.trackBossKill, combat-engine.js)

La progression (game.worldQuestProgress) et la complétion
(game.worldQuestsCompleted) sont PERMANENTES : conservées à travers
les ascensions comme les Hauts faits ou le Codex (voir hardResetState
en systems/save-system.js), remises à zéro uniquement par le reset
complet des Paramètres.

reward: accordé une seule fois, au moment de la réclamation (bouton
sur l'écran Carte) — c'est CETTE réclamation qui débloque le monde,
pas la simple complétion des objectifs.
============================================================ */

var WORLD_QUESTS = {
  ruins: {
    id: "wq_ruins",
    worldId: "ruins",
    worldIndex: 2,
    name: "L'Appel des Ruines",
    icon: "./images/Icons/quest_icons/chapter_end/chapter_end1.png", // v3.10 : bannière crâne, thème fin de chapitre
    steps: [
      {
        id: "kills_desert",
        type: "kill",
        worldId: "desert",
        target: 50,
        text: "Des rumeurs parlent d'une cité engloutie sous le sable...",
        desc: "Vaincre {target} ennemis en Désert"
      },
      {
        id: "loot_green",
        type: "loot",
        minRarity: "green",
        target: 3,
        text: "Un éclaireur a rapporté un fragment de pierre gravée.",
        desc: "Récupérer {target} objets de rareté Inhabituelle ou plus"
      },
      {
        id: "boss_djinn",
        type: "bossKill",
        bossId: "djinn",
        target: 2,
        text: "Le Djinn garde l'entrée. Il faudra le soumettre.",
        desc: "Vaincre le boss Djinn {target} fois"
      }
    ],
    reward: { gold: 2500, essence: 15, equipmentRarity: "rare", equipmentCount: 1, aether: 0 }
  },

  crypt: {
    id: "wq_crypt",
    worldId: "crypt",
    worldIndex: 3,
    name: "Le Repos Troublé",
    icon: "./images/Icons/quest_icons/chapter_end/chapter_end1.png", // v3.10 : bannière crâne, thème fin de chapitre
    steps: [
      {
        id: "kills_ruins",
        type: "kill",
        worldId: "ruins",
        target: 80,
        text: "Les couloirs effondrés cachent bien plus que des pierres...",
        desc: "Vaincre {target} ennemis en Ruines"
      },
      {
        id: "loot_rare",
        type: "loot",
        minRarity: "rare",
        target: 3,
        text: "Une relique rare pourrait apaiser les gardiens de la crypte.",
        desc: "Récupérer {target} objets de rareté Rare ou plus"
      },
      {
        id: "boss_skeletonlord",
        type: "bossKill",
        bossId: "skeletonlord",
        target: 2,
        text: "Le Seigneur des Ossements ne cédera pas sans combattre.",
        desc: "Vaincre le boss Seigneur des Ossements {target} fois"
      }
    ],
    reward: { gold: 6000, essence: 30, equipmentRarity: "epic", equipmentCount: 1, aether: 0 }
  },

  mountain: {
    id: "wq_mountain",
    worldId: "mountain",
    worldIndex: 4,
    name: "Le Froid avant les Flammes",
    icon: "./images/Icons/quest_icons/chapter_end/chapter_end2.png", // v3.10 : variante, thème fin de chapitre
    steps: [
      {
        id: "kills_crypt",
        type: "kill",
        worldId: "crypt",
        target: 120,
        text: "Un froid glacial n'est rien comparé à ce qui gronde plus loin...",
        desc: "Vaincre {target} ennemis en Crypte"
      },
      {
        id: "loot_rare5",
        type: "loot",
        minRarity: "rare",
        target: 5,
        text: "L'ascension de la montagne exigera un équipement solide.",
        desc: "Récupérer {target} objets de rareté Rare ou plus"
      },
      {
        id: "boss_necrosupreme",
        type: "bossKill",
        bossId: "necrosupreme",
        target: 3,
        text: "Le Nécrosuprême refuse obstinément de reposer en paix.",
        desc: "Vaincre le boss Nécrosuprême {target} fois"
      }
    ],
    reward: { gold: 15000, essence: 60, equipmentRarity: "epic", equipmentCount: 1, aether: 5 }
  },

  tower: {
    id: "wq_tower",
    worldId: "tower",
    worldIndex: 5,
    name: "L'Ascension Arcanique",
    icon: "./images/Icons/quest_icons/chapter_end/chapter_end2.png", // v3.10 : variante, thème fin de chapitre
    steps: [
      {
        id: "kills_mountain",
        type: "kill",
        worldId: "mountain",
        target: 160,
        text: "La tour du sorcier se dresse au loin, indifférente aux flammes...",
        desc: "Vaincre {target} ennemis en Montagne"
      },
      {
        id: "loot_epic",
        type: "loot",
        minRarity: "epic",
        target: 2,
        text: "Seul un équipement d'exception franchira les défenses arcaniques.",
        desc: "Récupérer {target} objets de rareté Épique ou plus"
      },
      {
        id: "boss_ancientdragon",
        type: "bossKill",
        bossId: "ancientdragon",
        target: 3,
        text: "Le Dragon Ancien est le dernier gardien avant la tour.",
        desc: "Vaincre le boss Dragon Ancien {target} fois"
      }
    ],
    reward: { gold: 40000, essence: 120, equipmentRarity: "legendary", equipmentCount: 1, aether: 15 }
  }
};

/* Accès par index de monde (2->ruins, 3->crypt, 4->mountain, 5->tower),
   pratique pour WorldManager qui raisonne en index. */
var WORLD_QUESTS_BY_INDEX = {};
Object.keys(WORLD_QUESTS).forEach(function (key) {
  var q = WORLD_QUESTS[key];
  WORLD_QUESTS_BY_INDEX[q.worldIndex] = q;
});

window.WORLD_QUESTS = WORLD_QUESTS;
window.WORLD_QUESTS_BY_INDEX = WORLD_QUESTS_BY_INDEX;
