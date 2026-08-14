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
v2.20 : attaque spéciale propre à chaque héros — bouton dédié sur
l'écran de combat (voir ui/combat-view.js), temps de recharge commun
de 10s sauf mention contraire. Voir systems/special-attack-system.js
pour la logique d'utilisation.

Champs :
  - multiplier      dégâts = tapDamage effectif × multiplier, en un
                     seul coup (absent si hits>1 ou minMult/maxMult utilisés)
  - hits             nombre de coups (chacun à `multiplier`) — Rôdeur
  - minMult/maxMult  dégâts aléatoires entre les deux — Rôdeur du Chaos
  - ignoreAffinity   ignore résistance/faiblesse d'arme — Mage
  - buffPct/buffDurationMs  bonus de dégâts temporaire après le coup — Chevalier du Chaos
  - cooldownMs       temps de recharge avant réutilisation
============================================================ */
var HERO_SPECIAL_ATTACKS = {
  knight: {
    name: "Coup fracassant",
    icon: "./images/Icons/special_attacks/smashing_blow.png",
    desc: "Assène un coup titanesque à 6× tes dégâts de tap habituels.",
    multiplier: 6,
    cooldownMs: 10000
  },
  ranger: {
    name: "Tir groupé",
    icon: "./images/Icons/special_attacks/multishot.png",
    desc: "Décoche 3 flèches rapides, chacune à 2.5× tes dégâts de tap.",
    multiplier: 2.5,
    hits: 3,
    cooldownMs: 10000
  },
  mage: {
    name: "Explosion arcanique",
    icon: "./images/Icons/special_attacks/arcane_blast.png",
    desc: "Libère une explosion de magie pure (8× dégâts) qui ignore toute résistance ou faiblesse d'arme.",
    multiplier: 8,
    ignoreAffinity: true,
    cooldownMs: 10000
  },
  chaosKnight: {
    name: "Fureur du Chaos",
    icon: "./images/Icons/special_attacks/chaos_fury.png",
    desc: "Frappe à 6× tes dégâts, puis enrage ton héros (+10% dégâts) pendant 10 secondes.",
    multiplier: 6,
    buffPct: 0.10,
    buffDurationMs: 10000,
    cooldownMs: 10000
  },
  chaosRanger: {
    name: "Tir chaotique",
    icon: "./images/Icons/special_attacks/chaotic_shot.png",
    desc: "Un tir à la puissance imprévisible : entre 3× et 12× tes dégâts de tap, au hasard.",
    minMult: 3,
    maxMult: 12,
    cooldownMs: 10000
  },
  chaosMage: {
    name: "Cataclysme",
    icon: "./images/Icons/special_attacks/cataclysm.png",
    desc: "Déchaîne 10× tes dégâts de tap en un seul coup dévastateur — la capacité la plus puissante, mais qui recharge plus lentement.",
    multiplier: 10,
    cooldownMs: 16000
  }
};

window.HERO_SPECIAL_ATTACKS = HERO_SPECIAL_ATTACKS;

/* ============================================================
v2.21 : capacité défensive, universelle (pas propre à un héros,
contrairement à l'attaque spéciale) — un vrai bouton "panique" pour
encaisser un pic de riposte, notamment utile dans les hauts paliers
de donjon. Voir systems/special-attack-system.js (DefenseManager).
============================================================ */
var DEFENSE_ABILITY = {
  name: "Posture défensive",
  icon: "./images/Icons/special_attacks/defensive_stance.png",
  desc: "+35% de réduction des dégâts de riposte pendant 8 secondes.",
  defenseBonusPct: 0.35,
  durationMs: 8000,
  cooldownMs: 15000,
  // Plafond de défense TOTALE pendant que le bouclier est actif (plus
  // haut que le plafond normal de 60%, pour que le bonus reste utile
  // même avec beaucoup d'Endurance déjà investie).
  maxTotalDefensePct: 0.85
};

window.DEFENSE_ABILITY = DEFENSE_ABILITY;