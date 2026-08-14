"use strict";
/* ============================================================
QUEST IDLE — data/upgrades.js
Deux boutiques distinctes :
  - UPGRADES    achats en or, dispo dès le début (voir shop-view.js
                pour l'écran "Boutique"). `apply(lvl)` est appelée
                à chaque achat avec le NIVEAU TOTAL (pas juste +1),
                donc chaque apply() doit fixer la valeur finale.
  - AETHER_SHOP achats en Aether (monnaie de prestige de l'ascension),
                voir ascension-view.js pour l'écran "Boutique d'Aether"
                et getAetherBonuses() en stats-system.js pour l'effet
                réel (contrairement à UPGRADES, ces items n'ont pas de
                fonction apply : leurs bonus sont calculés à la volée
                à partir du niveau, dans getAetherBonuses()).
unlockWorld = index de monde minimum pour que l'amélioration apparaisse
dans la boutique (0 = dispo depuis le début).
============================================================ */

var UPGRADES = [
  {
    id: "utrain_power",
    name: "AMELIORATION DE FORCE",
    icon: "./images/Icons/improvement_icons/power.png",
    desc: "Augmente les dégâts de tap.",
    baseCost: 15,
    costMult: 1.15,
    maxLevel: 150, // v2.90.22 : 400 -> 150 (dernier niveau à 400 coûtait ~25 septillions d'or, inatteignable)
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
    costMult: 1.18, // v2.90.24 : 1.20 -> 1.18 (voir doc équilibrage)
    maxLevel: 120, // v2.90.22 : 320 -> 120 (même raison, voir doc équilibrage)
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
    costMult: 1.22, // v2.90.24 : 1.20 -> 1.22 (voir doc équilibrage)
    maxLevel: 60, // v2.90.22 : 100 -> 60 (voir doc équilibrage)
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
    costMult: 1.18, // v2.90.24 : 1.22 -> 1.18 (voir doc équilibrage)
    maxLevel: 80, // v2.90.22 : 130 -> 80 (voir doc équilibrage)
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
    costMult: 1.14, // v2.90.24 : 1.22 -> 1.14 (voir doc équilibrage)
    maxLevel: 150, // v2.90.22 : 200 -> 150 (voir doc équilibrage)
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
    costMult: 1.10, // v2.90.24 : 1.20 -> 1.10 (voir doc équilibrage)
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
    // v2.90.19 : appliquait avant un goldMult global identique à "Bourse
    // lourde", contrairement à la description ("or DE BOSS uniquement").
    // Corrigé : stocke un bonus séparé (game.bossGoldBonusPct), consommé
    // uniquement à la mort d'un boss dans CombatEngine.killEnemy() —
    // voir combat-engine.js.
    apply: function (lvl) { game.bossGoldBonusPct = lvl * 0.10; }
  }
];

function getUpgradeById(id) {
  for (var i = 0; i < UPGRADES.length; i++) {
    if (UPGRADES[i].id === id) return UPGRADES[i];
  }
  return null;
}

/* getUpgradeCost() est définie dans systems/progression-system.js. */

var AETHER_SHOP = [
  {
    id: "a_tap",
    name: "Puissance ancestrale",
    icon: "images/Icons/ascension/puissance_ancestrale.png",
    desc: "+10% dégâts de tap globaux par niveau.",
    // v2.90.21 : coût cumulé pour maxer réduit de ~418k à ~2.2k Aether
    // (ancien ×1.9/niv, niveau 20 seul coûtait ~198k Aether à lui seul —
    // hors de portée à tout rythme d'ascension réaliste). Voir doc équilibrage.
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
    // v2.90.22 : nouvel item, même poids que Puissance ancestrale/Fortune
    // astrale (voir doc équilibrage — ajoute ~2 190 Aether au budget total,
    // qui passe de ~6 277 à ~8 467 Aether, soit ~169 ascensions au lieu
    // de ~125 pour tout maxer).
    baseCost: 15,
    costMult: 1.18,
    maxLevel: 20
  }
];

/* getAetherUpgradeCost() est définie dans systems/stats-system.js. */

function getAetherUpgradeById(id) {
  return (AETHER_SHOP || []).find(function (u) {
    return u.id === id;
  }) || null;
}