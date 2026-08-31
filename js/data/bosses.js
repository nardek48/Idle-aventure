"use strict";
/* data/bosses.js — boss par monde (voir worlds.js) + config bonus bestiaire. Détail : COMMENTAIRES_ORIGINAUX.md */

var BOSS_DB = {
  slimeking: {
    name: "Roi Slime géant",
    asset: "slimeking",
    image: "./images/Boss/Lord_Slim.jpg",
    resists: ["magic"],
    weak: ["sword"],
    stats: makeRpgStats(30, 58, 16, 18, 22)
  },

  orcwarlord: {
    // v3.104.0 (P5) : boss du Cœur de la forêt (forest_2) — profil martial/brutal plutôt que visqueux : moins
    // d'endurance que le Roi Slime (40 vs 58) mais plus offensif (RPM plus court). Calibré via sim/combat-round-sim.js
    // sur le pool Cœur à 6 (avec Troll/Ronce), profil Acte III : Chevalier/Mage 100 %, Rôdeur 73 % (jouable, cf. P1 §C
    // où le Rôdeur est déjà structurellement le point faible face aux boss).
    name: "Seigneur de guerre orc",
    asset: "orcwarlord",
    image: "./images/Boss/Lord_OrcWarlord.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(26, 40, 20, 24, 26)
  },

  djinn: {
    name: "Djinn des dunes",
    asset: "djinn",
    image: "./images/Boss/Lord_Djinn.jpg",
    resists: ["magic", "bow"],
    weak: ["sword"],
    stats: makeRpgStats(44, 66, 42, 30, 46)
  },

  skeletonlord: {
    name: "Seigneur squelette",
    asset: "skeletonlord",
    image: "./images/Boss/Lord_Skelette.jpg",
    resists: ["sword"],
    weak: ["magic"],
    stats: makeRpgStats(54, 82, 18, 26, 36)
  },

  necrosupreme: {
    name: "Nécromancien suprême",
    asset: "necrosupreme",
    image: "./images/Boss/Lord_Necro.jpg",
    resists: ["magic"],
    weak: ["sword", "bow"],
    stats: makeRpgStats(62, 76, 30, 40, 62)
  },

  ancientdragon: {
    name: "Dragon ancien",
    asset: "ancientdragon",
    image: "./images/Boss/Lord_Dragon.jpg",
    resists: ["bow"],
    weak: ["magic"],
    stats: makeRpgStats(74, 96, 28, 38, 50)
  },

  archmage: {
    name: "Archimage",
    asset: "archmage",
    image: "./images/Boss/Lord_Archimage.jpg",
    resists: ["magic"],
    weak: ["sword", "bow"],
    stats: makeRpgStats(84, 92, 34, 48, 74)
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
