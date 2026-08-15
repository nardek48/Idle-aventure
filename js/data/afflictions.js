"use strict";
/* ============================================================
Aethervale — data/afflictions.js
v3.20 : "Afflictions" — modificateurs optionnels, cumulables (jusqu'à
AFFLICTION_MAX_ACTIVE en même temps), qui altèrent le farm NORMAL
(mondes classiques) pendant qu'ils sont actifs. Toujours un vrai
compromis (jamais du pur malus ou du pur bonus) — l'idée est de
proposer des styles de jeu différents, pas juste "plus dur = plus de
loot" à plat.

Séparé du Donjon (activité à part, ses propres paliers) et du futur
mode Survie (activité à part elle aussi, voir roadmap) — les
afflictions ne touchent QUE la boucle de farm des 6 mondes.

Chaque entrée :
  - id      identifiant unique, lu par game.activeAfflictions[id] === true
  - name/icon/desc   affichage (voir ui/afflictions-view.js)
  - modifiers   effets réels, lus par AfflictionManager (voir
                systems/affliction-system.js) — PAS appliqués
                directement ici, cette table ne fait que déclarer les
                valeurs.
============================================================ */

var AFFLICTION_MAX_ACTIVE = 4;

// +10% à TOUTES les récompenses (or + essence) par affliction active,
// cumulé — récompense le cumul en lui-même, en plus de l'effet propre
// à chaque affliction. Voir AfflictionManager.getStackBonusMult().
var AFFLICTION_STACK_REWARD_BONUS = 0.10;

var AFFLICTIONS = [
  {
    id: "aff_colossus",
    name: "Colosses",
    icon: "👹",
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
    icon: "🚫",
    desc: "Potions interdites (achat et usage bloqués), +15% dégâts de tap en compensation.",
    modifiers: {
      tapMult: 0.15,
      forbidPotions: true
    }
  },
  {
    id: "aff_fragility",
    name: "Fragilité",
    icon: "💔",
    desc: "-30% PV max, +30% dégâts de tap — glass cannon.",
    modifiers: {
      heroMaxHpMult: 0.70,
      tapMult: 0.30
    }
  },
  {
    id: "aff_greed",
    name: "Avarice",
    icon: "🪙",
    desc: "Chance de trouver un objet divisée par 2, mais or gagné ×2.",
    modifiers: {
      lootChanceMult: 0.5,
      goldMult: 2
    }
  },
  {
    id: "aff_plague",
    name: "Fléau",
    icon: "☣️",
    desc: "Riposte ennemie +30%, +20% or global.",
    modifiers: {
      enemyPowerMult: 1.30,
      goldMult: 1.20
    }
  },
  {
    id: "aff_elite",
    name: "Élite",
    icon: "⚔️",
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
