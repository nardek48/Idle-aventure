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
var UPGRADES = [
  {
    id: "utrain_power",
    name: "AMELIORATION DE FORCE",
    icon: "./images/Icons/improvement_icons/power.png",
    desc: "Augmente les dégâts de ton attaque de base.",
    baseCost: 9,
    costStep: 0.055,   // v3.248.0 : courbe linéaire, base proportionnelle au gain

    maxLevel: 150,
    unlockWorld: 0,
    apply: function(lvl) {
      game.trainedStats.power = lvl;
    }
  },
  {
    id: "utrain_celerity",
    name: "AMELIORATION DE CELERITE",
    icon: "./images/Icons/improvement_icons/celerity.png",
    desc: "Augmente l'auto DPS.",
    baseCost: 5.5,     // v3.309.0 : 4 → 5,5, suit le coefficient du Rôdeur (0,09 → 0,12) pour garder l'iso-prix
    costStep: 0.055,   // v3.248.0 : courbe linéaire, base proportionnelle au gain

    maxLevel: 150, // v3.308.0 : plafond commun aux cinq entraînements
    unlockWorld: 0,
    apply: function(lvl) {
      game.trainedStats.celerity = lvl;
    }
  },
  {
    id: "utrain_precision",
    name: "AMELIORATION DE PRECISION",
    icon: "./images/Icons/improvement_icons/accuracy.png",
    desc: "Augmente la chance de critique.",
    baseCost: 7,
    costStep: 0.055,   // v3.248.0 : courbe linéaire, base proportionnelle au gain

    maxLevel: 150, // v3.308.0 : plafond commun aux cinq entraînements
    unlockWorld: 0,
    apply: function(lvl) {
      game.trainedStats.precision = lvl;
    }
  },
  {
    id: "utrain_will",
    name: "AMELIORATION DE VOLONTE",
    icon: "./images/Icons/improvement_icons/will.png",
    desc: "Améliore les critiques.",
    baseCost: 5,
    costStep: 0.055,   // v3.248.0 : courbe linéaire, base proportionnelle au gain

    maxLevel: 150, // v3.308.0 : plafond commun aux cinq entraînements
    unlockWorld: 0,
    apply: function(lvl) {
      game.trainedStats.will = lvl;
    }
  },
  {
    id: "utrain_endurance",
    name: "AMELIORATION D'ENDURANCE",
    icon: "./images/Icons/improvement_icons/endurance.png",
    desc: "Augmente les PV du héros.",
    baseCost: 7,
    costStep: 0.055,   // v3.248.0 : courbe linéaire, base proportionnelle au gain

    maxLevel: 150,
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
