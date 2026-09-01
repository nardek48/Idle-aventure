"use strict";
/* data/upgrades.js — 2 boutiques : UPGRADES (or, apply(lvl) fixe la valeur au niveau TOTAL) et AETHER_SHOP (Aether, bonus calculés à la volée dans getAetherBonuses()).
   unlockWorld = index de monde minimum. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var UPGRADES = [
  {
    id: "utrain_power",
    name: "AMELIORATION DE FORCE",
    icon: "./images/Icons/improvement_icons/power.png",
    desc: "Augmente les dégâts de ton attaque de base.",
    baseCost: 15,
    costMult: 1.15,
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
    baseCost: 45,
    costMult: 1.18,
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
    baseCost: 50,
    costMult: 1.22,
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
    baseCost: 60,
    costMult: 1.18,
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
    baseCost: 60,
    costMult: 1.14,
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
    icon: "📜",
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
