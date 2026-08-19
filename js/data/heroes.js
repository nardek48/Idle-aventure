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
    weaponType: "sword", // v3.8 : voir note sur getPlayerDamageType(), combat-engine.js
    stats: makeRpgStats(60, 76, 32, 40, 52)
  },
  ranger: {
    id: "ranger",
    name: "Rôdeur",
    image: "./images/Heroes/ranger.jpg",
    weaponType: "bow",
    stats: makeRpgStats(46, 38, 70, 66, 40)
  },
  mage: {
    id: "mage",
    name: "Mage",
    image: "./images/Heroes/mage.jpg",
    weaponType: "magic",
    stats: makeRpgStats(62, 34, 40, 48, 76)
  },
  chaosKnight: {
    id: "chaosKnight",
    name: "Chevalier du Chaos",
    image: "./images/Heroes/ChaosNight.jpg",
    weaponType: "sword",
    stats: makeRpgStats(63, 56, 42, 52, 47) // v2.90.22 : Puissance 66->63, Volonté 44->47 (voir doc équilibrage)
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
    stats: makeRpgStats(66, 36, 34, 46, 78)
  }
};

/* Courbe d'XP du héros : chaque niveau demande baseXp * xpGrowth^(niveau-1)
   XP, voir getHeroXpRequiredForLevel() dans systems/progression-system.js.
   Chaque niveau gagné donne 1 point de talent. */
var HERO_LEVELING = {
  baseXp: 10,
  xpGrowth: 1.35
};

/* ============================================================
v3.34.0 : HERO_SPECIAL_ATTACKS et DEFENSE_ABILITY (attaque spéciale
par héros + bouclier universel) ont été retirés — remplacés par le
système de classes (voir data/classes.js, data/class-skills.js,
systems/class-combat-system.js). Chaque classe (Chevalier/Rôdeur/
Mage) partage désormais 5 actions communes (basic/skill1/skill2/
skill3/defense) entre ses 2 héros (ex. Chevalier + Chevalier du
Chaos), au lieu d'une capacité unique par héros.
============================================================ */