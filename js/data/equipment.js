"use strict";
/* ============================================================
QUEST IDLE — data/equipment.js
Base équipement, raretés et bonus de set.
============================================================ */

function formatSetBonusEffect(effect) {
  if (!effect) return "";

  var parts = [];

  if (effect.tapDamage != null) parts.push("+" + formatNumber(effect.tapDamage) + " dégâts/tap");
  if (effect.tapMult != null) parts.push("+" + Math.round(effect.tapMult * 100) + "% dégâts");
  if (effect.goldMult != null) parts.push("+" + Math.round(effect.goldMult * 100) + "% or");
  if (effect.critChance != null) parts.push("+" + formatNumber(effect.critChance) + "% critique");
  if (effect.critMult != null) parts.push("+" + formatNumber(effect.critMult) + "x dégâts crit");
  if (effect.autoDps != null) parts.push("+" + formatNumber(effect.autoDps) + " auto DPS");

  return parts.join(" • ");
}

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

/* Raretés disponibles au drop selon le monde en cours (index dans WORLDS).
   Cumulatif : chaque palier ajoute une rareté à celles déjà débloquées.
   Si le joueur est en plein cycle (a déjà bouclé tous les mondes une fois),
   toutes les raretés sont disponibles dès le premier monde. */
var WORLD_RARITY_UNLOCKS = [
  ["common"],                                        // Forêt (monde 0)
  ["common", "green"],                                // Désert (monde 1)
  ["common", "green", "rare"],                        // Ruines (monde 2)
  ["common", "green", "rare", "epic"],                // Crypte (monde 3)
  ["common", "green", "rare", "epic"],                // Montagne (monde 4)
  ["common", "green", "rare", "epic", "legendary"]     // Tour (monde 5)
];

var SET_BONUS_CONFIG = {
  sameRarityCount: 3,
  bonuses: {
    common: {
      name: "Panoplie commune",
      apply: function () {
        return { tapDamage: 2 };
      }
    },
    green: {
      name: "Panoplie inhabituelle",
      apply: function () {
        return { tapMult: 0.05, goldMult: 0.05 };
      }
    },
    rare: {
      name: "Panoplie rare",
      apply: function () {
        return { tapMult: 0.10, goldMult: 0.10 };
      }
    },
    epic: {
      name: "Panoplie épique",
      apply: function () {
        return { tapMult: 0.20, critChance: 5 };
      }
    },
    legendary: {
      name: "Panoplie légendaire",
      apply: function () {
        return { tapMult: 0.35, critChance: 10, goldMult: 0.20 };
      }
    }
  }
};

/* Colle ici EQUIPMENT_DB exactement tel qu'il existe dans data.js */
var EQUIPMENT_DB = {
  weapon: [
    { name: "Dague rouillée", icon: "sword", rarity: "common", stat: "tapDmg", value: 3 },
    { name: "Épée de fer", icon: "sword", rarity: "common", stat: "tapDmg", value: 8 },
    { name: "Massette ébréchée", icon: "axe", rarity: "common", stat: "tapDmg", value: 12 },
    { name: "Bâton de bois", icon: "staff", rarity: "common", stat: "tapDmg", value: 5 },
    { name: "Arc de chasseur", icon: "bow", rarity: "common", stat: "tapMult", value: 0.15 },
    { name: "Poignard rouillé", icon: "sword", rarity: "common", stat: "tapDmg", value: 6 },
    { name: "Épée de jade", icon: "sword", rarity: "green", stat: "tapDmg", value: 16 },
    { name: "Hachette émeraude", icon: "axe", rarity: "green", stat: "tapDmg", value: 18 },
    { name: "Arc sylvestre", icon: "bow", rarity: "green", stat: "tapMult", value: 0.30 },
    { name: "Dague véloce", icon: "sword", rarity: "green", stat: "autoDps", value: 3 },
    { name: "Hache de guerre", icon: "axe", rarity: "rare", stat: "tapDmg", value: 25 },
    { name: "Épée runique", icon: "sword", rarity: "rare", stat: "tapDmg", value: 35 },
    { name: "Arc elfe", icon: "bow", rarity: "rare", stat: "tapMult", value: 0.5 },
    { name: "Lame vive-argent", icon: "sword", rarity: "rare", stat: "autoDps", value: 9 },
    { name: "Lame envoûtée", icon: "sword", rarity: "epic", stat: "tapMult", value: 1.0 },
    { name: "Bâton ardent", icon: "staff", rarity: "epic", stat: "tapDmg", value: 100 },
    { name: "Griffe implacable", icon: "axe", rarity: "epic", stat: "autoDps", value: 22 },
    { name: "Tranche-démon", icon: "sword", rarity: "legendary", stat: "tapMult", value: 2.0 },
    { name: "Fléau éternel", icon: "axe", rarity: "legendary", stat: "autoDps", value: 45 }
  ],
  armor: [
    { name: "Tunique usée", icon: "armor", rarity: "common", stat: "goldMult", value: 0.05 },
    { name: "Armure de cuir", icon: "armor", rarity: "common", stat: "goldMult", value: 0.10 },
    { name: "Vieille cape", icon: "robe", rarity: "common", stat: "goldMult", value: 0.08 },
    { name: "Bouclier de bois", icon: "shield", rarity: "common", stat: "goldMult", value: 0.06 },
    { name: "Armure de jade", icon: "armor", rarity: "green", stat: "goldMult", value: 0.16 },
    { name: "Cape sylvestre", icon: "robe", rarity: "green", stat: "goldMult", value: 0.14 },
    { name: "Manteau des bois", icon: "robe", rarity: "green", stat: "goldMult", value: 0.20 },
    { name: "Cotte de mailles", icon: "shield", rarity: "rare", stat: "goldMult", value: 0.25 },
    { name: "Armure renforcée", icon: "armor", rarity: "rare", stat: "goldMult", value: 0.30 },
    { name: "Bouclier runique", icon: "shield", rarity: "rare", stat: "goldMult", value: 0.35 },
    { name: "Cape des ombres", icon: "robe", rarity: "rare", stat: "autoDps", value: 10 },
    { name: "Armure runique", icon: "armor", rarity: "epic", stat: "goldMult", value: 0.50 },
    { name: "Plastron astral", icon: "armor", rarity: "epic", stat: "goldMult", value: 0.65 },
    { name: "Plastron du gardien", icon: "armor", rarity: "epic", stat: "autoDps", value: 25 },
    { name: "Bouclier légendaire", icon: "shield", rarity: "legendary", stat: "goldMult", value: 1.0 },
    { name: "Égide immortelle", icon: "shield", rarity: "legendary", stat: "goldMult", value: 1.2 }
  ],
  amulet: [
    { name: "Pendentif simple", icon: "amulet", rarity: "common", stat: "critChance", value: 2 },
    { name: "Anneau de cuivre", icon: "ring", rarity: "common", stat: "critMult", value: 0.3 },
    { name: "Charme fêlé", icon: "amulet", rarity: "common", stat: "critChance", value: 1 },
    { name: "Perle terne", icon: "ring", rarity: "common", stat: "critMult", value: 0.2 },
    { name: "Amulette de jade", icon: "amulet", rarity: "green", stat: "critChance", value: 3 },
    { name: "Anneau émeraude", icon: "ring", rarity: "green", stat: "critMult", value: 0.45 },
    { name: "Talisman des bois", icon: "amulet", rarity: "green", stat: "autoDps", value: 4 },
    { name: "Amulette sombre", icon: "amulet", rarity: "rare", stat: "critChance", value: 5 },
    { name: "Bague affûtée", icon: "ring", rarity: "rare", stat: "critMult", value: 0.6 },
    { name: "Médaillon d'ombre", icon: "amulet", rarity: "rare", stat: "critChance", value: 7 },
    { name: "Bague véloce", icon: "ring", rarity: "rare", stat: "autoDps", value: 11 },
    { name: "Bague de sang", icon: "ring", rarity: "epic", stat: "critMult", value: 1.0 },
    { name: "Pendentif des étoiles", icon: "amulet", rarity: "epic", stat: "critChance", value: 10 },
    { name: "Cœur d'orage", icon: "amulet", rarity: "epic", stat: "autoDps", value: 26 },
    { name: "Collier divin", icon: "amulet", rarity: "legendary", stat: "critChance", value: 15 },
    { name: "Diadème infini", icon: "crown", rarity: "legendary", stat: "autoDps", value: 50 }
  ]
};