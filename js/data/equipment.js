"use strict";
/* data/equipment.js — base équipement procédural (7 emplacements), raretés, bonus de set. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var RARITY_COLORS = {
  common: "#9ca3af",
  green: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b"
};

var RARITY_LABELS = {
  common: "Commun",
  green: "Inhabituel",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire"
};

var RARITY_ORDER = ["common", "green", "rare", "epic", "legendary"];

var RARITY_DROP_RATES = {
  common: 55,
  green: 25,
  rare: 15,
  epic: 4,
  legendary: 1
};

var WORLD_RARITY_UNLOCKS = [
  ["common"],
  ["common", "green"],
  ["common", "green", "rare"],
  ["common", "green", "rare", "epic"],
  ["common", "green", "rare", "epic"],
  ["common", "green", "rare", "epic", "legendary"]
];

var SET_BONUS_CONFIG = {
  tiers: [
    {
      count: 3,
      bonuses: {
        common: { name: "Panoplie commune (3)", apply: function () { return { tapDamage: 2 }; } },
        green: { name: "Panoplie inhabituelle (3)", apply: function () { return { tapMult: 0.05, goldMult: 0.05 }; } },
        rare: { name: "Panoplie rare (3)", apply: function () { return { tapMult: 0.10, goldMult: 0.10 }; } },
        epic: { name: "Panoplie épique (3)", apply: function () { return { tapMult: 0.20, critChance: 5 }; } },
        legendary: { name: "Panoplie légendaire (3)", apply: function () { return { tapMult: 0.35, critChance: 10, goldMult: 0.20 }; } }
      }
    },
    {
      count: 7,
      bonuses: {
        common: { name: "Panoplie commune complète (7)", apply: function () { return { tapDamage: 4, autoDps: 2 }; } },
        green: { name: "Panoplie inhabituelle complète (7)", apply: function () { return { tapMult: 0.08, goldMult: 0.08, critChance: 3 }; } },
        rare: { name: "Panoplie rare complète (7)", apply: function () { return { tapMult: 0.15, goldMult: 0.15, critChance: 5 }; } },
        epic: { name: "Panoplie épique complète (7)", apply: function () { return { tapMult: 0.25, critChance: 8, critMult: 0.3 }; } },
        legendary: { name: "Panoplie légendaire complète (7)", apply: function () { return { tapMult: 0.40, critChance: 15, critMult: 0.5, goldMult: 0.25 }; } }
      }
    }
  ],
  sameRarityCount: 3
};

var EQUIPMENT_SLOTS = ["weapon", "armor", "helmet", "gloves", "boots", "ring", "amulet"];

var EQUIPMENT_SLOT_LABELS = {
  weapon: "Arme",
  armor: "Armure",
  helmet: "Casque",
  gloves: "Gants",
  boots: "Bottes",
  ring: "Anneau",
  amulet: "Amulette"
};

var EQUIPMENT_SLOT_EMOJI = {
  weapon: "⚔️",
  armor: "🛡️",
  helmet: "🪖",
  gloves: "🧤",
  boots: "👢",
  ring: "💍",
  amulet: "📿"
};

var EQUIPMENT_SLOT_CONFIG = {
  weapon: {
    stat: "tapDmg",
    decimals: 0,
    icons: ["bow", "sword", "axe", "staff"],
    names: ["Épée", "Hache", "Bâton", "Arc", "Dague", "Lame"],
    namesByIcon: {
      bow: ["Arc"],
      sword: ["Épée", "Lame", "Dague"],
      axe: ["Hache"],
      staff: ["Bâton"]
    },
    ranges: {
      common: [10, 25],
      green: [26, 35],
      rare: [40, 60],
      epic: [75, 110],
      legendary: [140, 200]
    }
  },
  armor: {
    stat: "defense",
    decimals: 2,
    icons: ["armor"],
    names: ["Armure", "Cuirasse", "Plastron"],
    ranges: {
      common: [0.01, 0.03],
      green: [0.03, 0.05],
      rare: [0.05, 0.08],
      epic: [0.08, 0.12],
      legendary: [0.12, 0.18]
    }
  },
  helmet: {
    stat: "critMult",
    decimals: 2,
    icons: ["casque"],
    names: ["Casque", "Heaume"],
    ranges: {
      common: [0.10, 0.20],
      green: [0.20, 0.35],
      rare: [0.35, 0.55],
      epic: [0.55, 0.85],
      legendary: [0.85, 1.30]
    }
  },
  gloves: {
    stat: "tapMult",
    decimals: 2,
    icons: ["gants"],
    names: ["Gants"],
    ranges: {
      common: [0.10, 0.20],
      green: [0.20, 0.35],
      rare: [0.35, 0.55],
      epic: [0.55, 0.90],
      legendary: [0.90, 1.50]
    }
  },
  boots: {
    stat: "autoDps",
    decimals: 0,
    icons: ["bottes"],
    names: ["Bottes"],
    ranges: {
      common: [2, 5],
      green: [5, 9],
      rare: [9, 15],
      epic: [15, 28],
      legendary: [28, 50]
    }
  },
  ring: {
    stat: "goldMult",
    decimals: 2,
    icons: ["ring"],
    names: ["Anneau", "Bague", "Chevalière"],
    ranges: {
      common: [0.05, 0.10],
      green: [0.10, 0.18],
      rare: [0.18, 0.30],
      epic: [0.30, 0.50],
      legendary: [0.50, 0.80]
    }
  },
  amulet: {
    stat: "critChance",
    decimals: 0,
    icons: ["amulet"],
    names: ["Amulette", "Pendentif", "Collier", "Talisman", "Médaillon"],
    ranges: {
      common: [1, 3],
      green: [3, 5],
      rare: [5, 8],
      epic: [8, 13],
      legendary: [13, 20]
    }
  }
};

window.EQUIPMENT_SLOTS = EQUIPMENT_SLOTS;
window.EQUIPMENT_SLOT_LABELS = EQUIPMENT_SLOT_LABELS;
window.EQUIPMENT_SLOT_EMOJI = EQUIPMENT_SLOT_EMOJI;
window.EQUIPMENT_SLOT_CONFIG = EQUIPMENT_SLOT_CONFIG;
