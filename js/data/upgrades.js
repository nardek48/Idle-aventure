"use strict";
/* data/upgrades.js — 2 boutiques : UPGRADES (or, apply(lvl) fixe la valeur au niveau TOTAL) et AETHER_SHOP (Aether, bonus calculés à la volée dans getAetherBonuses()).
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
    baseCost: 4,
    costStep: 0.055,   // v3.248.0 : courbe linéaire, base proportionnelle au gain

    maxLevel: 120,
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

    maxLevel: 60,
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

    maxLevel: 80,
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
  {
    id: "u_gold",
    name: "Bourse lourde",
    icon: "images/Icons/gold_icon.png",
    desc: "+3% or gagné par niveau.",
    baseCost: 55,
    costMult: 1.10,
    maxLevel: 200,
    unlockWorld: 0,
    apply: function (lvl) { game.goldMult = 1 + lvl * 0.03; }
  },
    {
    id: "u_bounty",
    name: "Contrats lucratifs",
    icon: "images/Icons/quests/quest_story.png",
    desc: "+10% or sur boss par niveau.",
    baseCost: 260,
    costMult: 1.30,
    maxLevel: 50,
    unlockWorld: 2,
    apply: function (lvl) { game.bossGoldBonusPct = lvl * 0.10; }
  }
];

function getUpgradeById(id) {
  for (var i = 0; i < UPGRADES.length; i++) {
    if (UPGRADES[i].id === id) return UPGRADES[i];
  }
  return null;
}

var AETHER_SHOP = [
  {
    id: "a_tap",
    name: "Puissance ancestrale",
    icon: "images/Icons/ascension/puissance_ancestrale.png",
    desc: "+10% dégâts globaux par niveau.",
    baseCost: 15,
    costMult: 1.18,
    maxLevel: 20
  },
  {
    id: "a_gold",
    name: "Fortune astrale",
    icon: "images/Icons/ascension/fortune_astrale.png",
    desc: "+10% or global par niveau.",
    baseCost: 15,
    costMult: 1.18,
    maxLevel: 20
  },
  {
    id: "a_loot",
    name: "Main du destin",
    icon: "images/Icons/ascension/main_du_destin.png",
    desc: "+3% chance de loot boss par niveau.",
    baseCost: 20,
    costMult: 1.15,
    maxLevel: 15
  },
  {
    id: "a_essence",
    name: "Noyau d'essence",
    icon: "images/Icons/ascension/noyau_essence.png",
    desc: "+1 essence boss tous les 2 niveaux.",
    baseCost: 20,
    costMult: 1.23,
    maxLevel: 12
  },
  {
    id: "a_vitality",
    name: "Vitalité éthérée",
    icon: "images/Icons/ascension/vitalite_etheree.png",
    desc: "+10% PV max globaux par niveau.",
    baseCost: 15,
    costMult: 1.18,
    maxLevel: 20
  }
];

function getAetherUpgradeById(id) {
  return (AETHER_SHOP || []).find(function (u) {
    return u.id === id;
  }) || null;
}
