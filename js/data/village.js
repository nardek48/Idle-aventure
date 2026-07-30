"use strict";
/* ============================================================
QUEST IDLE — data/village.js
Village et paramètres hors-ligne.
============================================================ */

var VILLAGE_CONFIG = {
  goldMine: {
    name: "Mine d'or",
    desc: "Augmente les gains d'or hors-ligne.",
    baseCost: 250,
    costMult: 1.65,
    maxLevel: 25
  },
  essenceWell: {
    name: "Puits d'essence",
    desc: "Ajoute de l'essence gagnée hors-ligne.",
    baseCost: 400,
    costMult: 1.75,
    maxLevel: 20
  },
  barracks: {
    name: "Caserne",
    desc: "Améliore l'efficacité hors-ligne.",
    baseCost: 600,
    costMult: 1.8,
    maxLevel: 20
  },
  timeRelay: {
    name: "Relais du temps",
    desc: "Augmente la durée maximale des gains hors-ligne.",
    baseCost: 900,
    costMult: 2,
    maxLevel: 10
  }
};

var OFFLINE_CONFIG = {
  baseCapHours: 2,
  baseGoldPerSec: 1
};