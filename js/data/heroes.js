"use strict";
/* data/heroes.js — héros jouables, choix définitif à la création. Détail : COMMENTAIRES_ORIGINAUX.md */

/* makeRpgStats(power, endurance, celerity, precision, will) — ordre positionnel, voir stats-system.js. */
var HEROES_DB = {
  knight: {
    id: "knight",
    name: "Chevalier",
    image: "./images/Heroes/knight.jpg",
    weaponType: "sword",
    stats: makeRpgStats(60, 62, 32, 40, 52)
  },
  ranger: {
    id: "ranger",
    name: "Rôdeur",
    image: "./images/Heroes/ranger.jpg",
    weaponType: "bow",
    stats: makeRpgStats(46, 44, 70, 60, 40)
  },
  mage: {
    id: "mage",
    name: "Mage",
    image: "./images/Heroes/mage.jpg",
    weaponType: "magic",
    stats: makeRpgStats(62, 40, 40, 42, 76)
  },
  chaosKnight: {
    id: "chaosKnight",
    name: "Chevalier du Chaos",
    image: "./images/Heroes/ChaosNight.jpg",
    weaponType: "sword",
    stats: makeRpgStats(63, 56, 42, 52, 47)
  },
  chaosRanger: {
    id: "chaosRanger",
    name: "Rôdeur du chaos",
    image: "./images/Heroes/ChaosRanger.jpg",
    weaponType: "bow",
    stats: makeRpgStats(50, 46, 62, 58, 44)
  },
  chaosMage: {
    id: "chaosMage",
    name: "Sorcier du Chaos",
    image: "./images/Heroes/ChaosSorcier.jpg",
    weaponType: "magic",
    stats: makeRpgStats(66, 44, 30, 44, 78)
  }
};

var HERO_LEVELING = {
  baseXp: 10,
  xpGrowth: 1.35
};
