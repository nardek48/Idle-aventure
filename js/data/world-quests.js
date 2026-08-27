"use strict";
/* data/world-quests.js — questlines narratives de déblocage des mondes (index >= 2 ; Forêt/Désert libres d'office).
   Progression permanente (survit aux ascensions). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var WORLD_QUESTS = {
  ruins: {
    id: "wq_ruins",
    worldId: "ruins",
    worldIndex: 2,
    section: "worldexpedition",
    difficulty: "easy",
    progressionStage: "world_start",
    category: "main",
    name: "L'Appel des Ruines",
    icon: "./images/Icons/quest_icons/chapter_end/chapter_end1.png",
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
    section: "worldexpedition",
    difficulty: "medium",
    progressionStage: "world_mid",
    category: "main",
    name: "Le Repos Troublé",
    icon: "./images/Icons/quest_icons/chapter_end/chapter_end1.png",
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
    section: "worldexpedition",
    difficulty: "medium",
    progressionStage: "world_mid",
    category: "main",
    name: "Le Froid avant les Flammes",
    icon: "./images/Icons/quest_icons/chapter_end/chapter_end2.png",
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
    section: "worldexpedition",
    difficulty: "hard",
    progressionStage: "world_end",
    category: "main",
    name: "L'Ascension Arcanique",
    icon: "./images/Icons/quest_icons/chapter_end/chapter_end2.png",
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

var WORLD_QUESTS_BY_INDEX = {};
Object.keys(WORLD_QUESTS).forEach(function (key) {
  var q = WORLD_QUESTS[key];
  WORLD_QUESTS_BY_INDEX[q.worldIndex] = q;
});

window.WORLD_QUESTS = WORLD_QUESTS;
window.WORLD_QUESTS_BY_INDEX = WORLD_QUESTS_BY_INDEX;
