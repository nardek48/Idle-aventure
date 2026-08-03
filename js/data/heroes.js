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
    icon: "💥",
    desc: "Assène un coup titanesque à 6× tes dégâts de tap habituels.",
    multiplier: 6,
    cooldownMs: 10000
  },
  ranger: {
    name: "Tir groupé",
    icon: "🏹",
    desc: "Décoche 3 flèches rapides, chacune à 2.5× tes dégâts de tap.",
    multiplier: 2.5,
    hits: 3,
    cooldownMs: 10000
  },
  mage: {
    name: "Explosion arcanique",
    icon: "🔮",
    desc: "Libère une explosion de magie pure (8× dégâts) qui ignore toute résistance ou faiblesse d'arme.",
    multiplier: 8,
    ignoreAffinity: true,
    cooldownMs: 10000
  },
  chaosKnight: {
    name: "Fureur du Chaos",
    icon: "🔥",
    desc: "Frappe à 6× tes dégâts, puis enrage ton héros (+10% dégâts) pendant 10 secondes.",
    multiplier: 6,
    buffPct: 0.10,
    buffDurationMs: 10000,
    cooldownMs: 10000
  },
  chaosRanger: {
    name: "Tir chaotique",
    icon: "🎲",
    desc: "Un tir à la puissance imprévisible : entre 3× et 12× tes dégâts de tap, au hasard.",
    minMult: 3,
    maxMult: 12,
    cooldownMs: 10000
  },
  chaosMage: {
    name: "Cataclysme",
    icon: "☄️",
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
  icon: "🛡️",
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