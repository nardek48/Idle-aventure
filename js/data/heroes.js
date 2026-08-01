"use strict";
/* ============================================================
QUEST IDLE — data/heroes.js
Base des héros jouables. Le joueur en choisit un à la création du
personnage (voir js/ui/modal-view.js) ; ce choix est définitif tant
qu'il ne relance pas une nouvelle partie.
============================================================ */

/* makeRpgStats(power, endurance, celerity, precision, will) — attention
   à l'ordre des arguments, il est positionnel et ne peut pas se deviner
   à la lecture d'une ligne isolée :
   - power     -> dégâts (tap/auto)
   - endurance -> PV max du héros (x6) + défense contre la riposte ennemie
   - celerity  -> auto DPS
   - precision -> chance de critique
   - will      -> multiplicateur de critique
   Voir js/systems/stats-system.js pour les coefficients exacts. */
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

/* Courbe d'XP du héros : chaque niveau demande baseXp * xpGrowth^(niveau-1)
   XP, voir getHeroXpRequiredForLevel() dans systems/progression-system.js.
   Chaque niveau gagné donne 1 point de talent. */
var HERO_LEVELING = {
  baseXp: 10,
  xpGrowth: 1.35
};