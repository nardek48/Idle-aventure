"use strict";
/* ============================================================
QUEST IDLE — data/bosses.js
Boss et finalisation des bonus de bestiaire.
============================================================ */

var BOSS_DB = {
  slimeking: {
    name: "Roi Slime géant",
    asset: "slimeking",
    image: "./images/Boss/Lord_Slim.jpg",
    resists: ["magic"],
    weak: ["sword"],
    stats: makeRpgStats(32, 58, 16, 18, 22)
  },
  djinn: {
    name: "Djinn des dunes",
    asset: "djinn",
    image: "./images/Boss/Lord_Djinn.jpg",
    resists: ["magic", "bow"],
    weak: ["sword"],
    stats: makeRpgStats(58, 48, 54, 46, 72)
  },
  skeletonlord: {
    name: "Seigneur squelette",
    asset: "skeletonlord",
    image: "./images/Boss/Lord_Skelette.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(44, 72, 14, 26, 34)
  },
  necrosupreme: {
    name: "Nécromancien suprême",
    asset: "necrosupreme",
    image: "./images/Boss/Lord_Necro.jpg",
    resists: ["magic"],
    weak: ["sword", "bow"],
    stats: makeRpgStats(42, 34, 28, 46, 86)
  },
  ancientdragon: {
    name: "Dragon ancien",
    asset: "ancientdragon",
    image: "./images/Boss/Lord_Dragon.jpg",
    resists: ["bow"],
    weak: ["magic"],
    stats: makeRpgStats(68, 78, 26, 40, 48)
  },
  archmage: {
    name: "Archimage",
    asset: "archmage",
    image: "./images/Boss/Lord_Archimage.jpg",
    resists: ["magic"],
    weak: ["sword", "bow"],
    stats: makeRpgStats(48, 32, 30, 52, 90)
  }
};

(function () {
  var allIds = Object.keys(ENEMY_DB).concat(Object.keys(BOSS_DB));
  allIds.forEach(function (id) {
    var isBoss = !!BOSS_DB[id];
    BESTIARY_BONUS_CONFIG[id] = isBoss ? [
      { kills: 3, goldBonus: 0.02, essenceBonus: 0.02, lootBonus: 0 },
      { kills: 10, goldBonus: 0.05, essenceBonus: 0.05, lootBonus: 2 },
      { kills: 25, goldBonus: 0.10, essenceBonus: 0.10, lootBonus: 5 }
    ] : [
      { kills: 10, goldBonus: 0.01, essenceBonus: 0 },
      { kills: 50, goldBonus: 0.03, essenceBonus: 0.01 },
      { kills: 100, goldBonus: 0.05, essenceBonus: 0.02 }
    ];
  });
})();