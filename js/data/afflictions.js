"use strict";
/* data/afflictions.js — modificateurs optionnels cumulables, FARM LIBRE uniquement (v3.136.0 : enfin appliqué dans le code,
   voir AfflictionManager.isContextActive — neutres en donjon/quête/chasse/Petite Aventure). Détail : COMMENTAIRES_ORIGINAUX.md */

var AFFLICTION_MAX_ACTIVE = 4;

var AFFLICTION_STACK_REWARD_BONUS = 0.10;

var AFFLICTIONS = [
  {
    id: "aff_colossus",
    name: "Colosses",
    icon: "images/Icons/afflictions/aff_colossus.png",
    desc: "Les boss ont 2× plus de PV, mais rapportent +50% d'or et d'essence.",
    modifiers: {
      bossHpMult: 2,
      bossGoldBonusPct: 0.50,
      bossEssenceBonusPct: 0.50
    }
  },
  {
    id: "aff_asceticism",
    name: "Ascétisme",
    icon: "images/Icons/afflictions/aff_asceticism.png",
    desc: "Potions interdites (achat et usage bloqués), +15% dégâts en compensation.",
    modifiers: {
      tapMult: 0.15,
      forbidPotions: true
    }
  },
  {
    id: "aff_fragility",
    name: "Fragilité",
    icon: "images/Icons/afflictions/aff_fragility.png",
    desc: "-30% PV max, +30% dégâts — glass cannon.",
    modifiers: {
      heroMaxHpMult: 0.70,
      tapMult: 0.30
    }
  },
  {
    id: "aff_greed",
    name: "Avarice",
    icon: "images/Icons/afflictions/aff_greed.png",
    desc: "Chance de trouver un objet divisée par 2, mais or gagné ×2.",
    modifiers: {
      lootChanceMult: 0.5,
      goldMult: 2
    }
  },
  {
    id: "aff_plague",
    name: "Fléau",
    icon: "images/Icons/afflictions/aff_plague.png",
    desc: "Riposte ennemie +30%, +20% or global.",
    modifiers: {
      enemyPowerMult: 1.30,
      goldMult: 1.20
    }
  },
  {
    id: "aff_elite",
    // v3.205.0 (E5) : renommée — « Élite » désigne désormais une CRÉATURE
    // (data/elites.js). L'id ne bouge pas : aucune sauvegarde à migrer.
    name: "Traque",
    icon: "images/Icons/afflictions/aff_elite.png",
    desc: "Tous les ennemis rencontrés sont des boss, +20% or.",
    modifiers: {
      forceAllBosses: true,
      goldMult: 1.20
    }
  }
];

window.AFFLICTIONS = AFFLICTIONS;
window.AFFLICTION_MAX_ACTIVE = AFFLICTION_MAX_ACTIVE;
window.AFFLICTION_STACK_REWARD_BONUS = AFFLICTION_STACK_REWARD_BONUS;
