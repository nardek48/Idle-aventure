"use strict";
/* ============================================================
QUEST IDLE — data/heroes.js
Base des héros jouables.
============================================================ */

var HEROES_DB = {
  knight: {
    id: "knight",
    name: "Chevalier",
    image: "./images/Heroes/knight.jpg",
    stats: makeRpgStats(58, 74, 30, 38, 48)
  },
  ranger: {
    id: "ranger",
    name: "Rôdeur",
    image: "./images/Heroes/ranger.jpg",
    stats: makeRpgStats(46, 38, 72, 68, 40)
  },
  mage: {
    id: "mage",
    name: "Mage",
    image: "./images/Heroes/mage.jpg",
    stats: makeRpgStats(64, 34, 40, 50, 82)
  },
  chaosKnight: {
    id: "chaosKnight",
    name: "Chevalier du Chaos",
    image: "./images/Heroes/ChaosNight.jpg",
    stats: makeRpgStats(72, 58, 44, 56, 46)
  },
  chaosRanger: {
    id: "chaosRanger",
    name: "Rôdeur du chaos",
    image: "./images/Heroes/ChaosRanger.jpg",
    stats: makeRpgStats(52, 46, 64, 60, 44)
  },
  chaosMage: {
    id: "chaosMage",
    name: "Sorcier du Chaos",
    image: "./images/Heroes/ChaosSorcier.jpg",
    stats: makeRpgStats(70, 36, 34, 48, 88)
  }
};

var HERO_LEVELING = {
  baseXp: 10,
  xpGrowth: 1.35
};
