"use strict";
/* data/construction.js — 4e système économique : améliore un bâtiment (Or+ressources) pour un bonus passif permanent. Détail : COMMENTAIRES_ORIGINAUX.md */

var CONSTRUCTION_BUILDINGS = {
  workshop: {
    id: "workshop",
    name: "Atelier de Construction",
    desc: "Améliore l'Atelier pour augmenter le prix de vente de toutes les ressources de l'Entrepôt.",
    icon: "images/Icons/construction_icon.png",
    maxLevel: 10,

    costTiers: [
      {
        minLevel: 0,
        maxLevel: 4,
        resources: ["gold", "planche", "pierre"],
        baseCost: { gold: 25, planche: 10, pierre: 15 },
        costMult: 1.35
      },
      {
        minLevel: 5,
        maxLevel: 9,
        resources: ["gold", "planche", "pierre", "lingot"],
        baseCost: { gold: 120, planche: 45, pierre: 65, lingot: 8 },
        costMult: 1.40
      }
    ],

    getCostTierForLevel: function (level) {
      for (var i = 0; i < this.costTiers.length; i++) {
        var tier = this.costTiers[i];
        if (level >= tier.minLevel && level <= tier.maxLevel) return tier;
      }
      return this.costTiers[this.costTiers.length - 1];
    },

    costPerLevel: function (level) {
      var tier = this.getCostTierForLevel(level);
      var n = level - tier.minLevel;
      var mult = Math.pow(tier.costMult, n);

      var result = {};
      tier.resources.forEach(function (key) {
        result[key] = Math.floor(tier.baseCost[key] * mult);
      });
      return result;
    },

    bonusMultiplierAtLevel: function (level) {
      return 1 + 0.03 * level;
    }
  }
};

window.CONSTRUCTION_BUILDINGS = CONSTRUCTION_BUILDINGS;
