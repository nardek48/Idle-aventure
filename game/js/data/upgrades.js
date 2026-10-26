"use strict";
/* data/upgrades.js — UPGRADES (or, apply(lvl) fixe la valeur au niveau TOTAL).
   unlockWorld = index de monde minimum. Détail complet : COMMENTAIRES_ORIGINAUX.md */

/* v3.248.0 (décision Seb 15/09/2026) — PRIX DES CINQ ENTRAÎNEMENTS.
   Deux problèmes mesurés (sim/upgrade-economy-bench.js) :
     1. les prix ne tenaient pas compte du GAIN : la stat principale d'une classe rapporte
        0,20 dégât par point au Chevalier (Force), 0,11 au Mage (Volonté), 0,09 au Rôdeur
        (Célérité) — mais coûtait 15, 60 et 45 or de base. Le Mage payait 4× plus cher
        pour 55 % du résultat ;
     2. la courbe exponentielle (×1,14 à ×1,22) rendait l'entraînement sans intérêt face
        à l'équipement : 5 % de son efficacité par or dépensé.

   Correction : courbe LINÉAIRE (costStep, voir getUpgradeCost) et base PROPORTIONNELLE au
   gain, Force comme référence à 9. Résultat mesuré sur 20 niveaux (le nouveau plafond de
   départ), en pourcentage de l'efficacité de l'équipement par or dépensé :
     Chevalier 29 %   Rôdeur 29 %   Mage 29 %
   Cible posée par Seb : 25 à 35 %, et les trois classes au même niveau. L'équipement reste
   le meilleur achat — c'est voulu — mais l'entraînement cesse d'être un gouffre.

   Endurance et Précision ne produisent pas de dégâts directs : elles gardent un prix médian.
   La Précision (chance de critique, aucun effet mesurable en dégâts ou PV) reste à
   réexaminer avec son propre banc — point ouvert O11. */
/* Chantier du héros, lot H1 (décisions Seb 26/10/2026) : le plafond absolu passe à 200 (Terrain 18, acte IV
   de la Montagne) et chaque niveau au-delà de 150 coûte ×15 ; les niveaux 1 à 150 gardent le prix v3.248.0. */
var TRAINING_HARD_CAP = 200;
var TRAINING_PRICE_TRANCHES = [{ from: 150, mult: 15 }]; // niveau acheté >= from : prix × mult

var UPGRADES = [
  {
    id: "utrain_power",
    name: "AMÉLIORATION DE FORCE",
    icon: "./images/Icons/improvement_icons/power.webp",
    desc: "Augmente les dégâts de ton attaque de base.",
    baseCost: 9,
    costStep: 0.055,   // v3.248.0 : courbe linéaire, base proportionnelle au gain

    maxLevel: TRAINING_HARD_CAP,
    unlockWorld: 0,
    apply: function(lvl) {
      game.trainedStats.power = lvl;
    }
  },
  {
    id: "utrain_celerity",
    name: "AMÉLIORATION DE CÉLÉRITÉ",
    icon: "./images/Icons/improvement_icons/celerity.webp",
    desc: "Augmente l'auto DPS.",
    baseCost: 5.5,     // v3.309.0 : 4 → 5,5, suit le coefficient du Rôdeur (0,09 → 0,12) pour garder l'iso-prix
    costStep: 0.055,   // v3.248.0 : courbe linéaire, base proportionnelle au gain

    maxLevel: TRAINING_HARD_CAP, // v3.308.0 : plafond commun ; H1 : 200
    unlockWorld: 0,
    apply: function(lvl) {
      game.trainedStats.celerity = lvl;
    }
  },
  {
    id: "utrain_precision",
    name: "AMÉLIORATION DE PRÉCISION",
    icon: "./images/Icons/improvement_icons/accuracy.webp",
    desc: "Augmente la chance de critique.",
    baseCost: 7,
    costStep: 0.055,   // v3.248.0 : courbe linéaire, base proportionnelle au gain

    maxLevel: TRAINING_HARD_CAP, // v3.308.0 : plafond commun ; H1 : 200
    unlockWorld: 0,
    apply: function(lvl) {
      game.trainedStats.precision = lvl;
    }
  },
  {
    id: "utrain_will",
    name: "AMÉLIORATION DE VOLONTÉ",
    icon: "./images/Icons/improvement_icons/will.webp",
    desc: "Améliore les critiques.",
    baseCost: 5,
    costStep: 0.055,   // v3.248.0 : courbe linéaire, base proportionnelle au gain

    maxLevel: TRAINING_HARD_CAP, // v3.308.0 : plafond commun ; H1 : 200
    unlockWorld: 0,
    apply: function(lvl) {
      game.trainedStats.will = lvl;
    }
  },
  {
    id: "utrain_endurance",
    name: "AMÉLIORATION D'ENDURANCE",
    icon: "./images/Icons/improvement_icons/endurance.webp",
    desc: "Augmente les PV du héros.",
    baseCost: 7,
    costStep: 0.055,   // v3.248.0 : courbe linéaire, base proportionnelle au gain

    maxLevel: TRAINING_HARD_CAP,
    unlockWorld: 0,
    apply: function(lvl) {
      game.trainedStats.endurance = lvl;
    }
  },
  /* v3.313.0 (décision Seb 19/09/2026) : « Bourse lourde » (u_gold) et « Contrats lucratifs »
     (u_bounty) retirés. Elles ne touchaient que l'or des ennemis tués, devenu marginal sans farm
     libre (< 10 % de l'or d'une quête). L'or dépensé est rendu au chargement (core/state.js,
     RETIRED_UPGRADES). */
];

/* v3.355.0 : AETHER_SHOP et son achat retirés (boutique vide depuis la v3.322.0, remplacée par
   la Mémoire). v3.412.0 : game.aetherUpgrades n’est plus lu ni écrit. */
window.TRAINING_HARD_CAP = TRAINING_HARD_CAP;
window.TRAINING_PRICE_TRANCHES = TRAINING_PRICE_TRANCHES;
