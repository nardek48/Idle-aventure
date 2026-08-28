"use strict";
/* data/production-buildings.js — bâtiments à STOCK LOCAL plafonné (distinct de VILLAGE_CONFIG, bonus passifs sans stock).
   Récolte manuelle vers l'Entrepôt. v3.95.0 : coût d'amélioration multi-ressources par bâtiment
   (costTiers, même pattern que CONSTRUCTION_BUILDINGS.workshop dans data/construction.js) —
   remplace l'ancien coût en or pur partagé (PRODUCTION_CONFIG.baseCost/costMult). Un seul
   palier par bâtiment pour l'instant (niveaux 1-15), volontairement simple : d'autres paliers
   pourront être ajoutés plus tard (ex. liés à la progression de monde) sans migration de
   sauvegarde nécessaire, costPerLevel() étant recalculé à la volée à partir du seul niveau
   stocké. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var PRODUCTION_CONFIG = {
  baseRatePerMin: 1,
  rateGrowthPerLevel: 1.25,
  baseCapacity: 25,
  capacityGrowthPerLevel: 0.10,
  maxLevel: 15
};

var PRODUCTION_BUILDINGS = {
  hunt: {
    id: "hunt", name: "Chasse", resourceKey: "viande",
    icon: "images/Icons/resources/meat_icon.png", buildingImage: "images/Production/hunt.png",
    desc: "Produit de la viande en continu.",
    costTiers: [
      { minLevel: 1, maxLevel: 15, resources: ["gold", "bois", "fer"], baseCost: { gold: 90, bois: 8, fer: 5 }, costMult: 1.45 }
    ]
  },
  farm: {
    id: "farm", name: "Champs", resourceKey: "ble",
    icon: "images/Icons/resources/wheat_icon.png", buildingImage: "images/Production/farm.png",
    desc: "Produit du blé en continu.",
    // v3.96.0 : costTiers/niveau de bâtiment devenus INUTILISÉS pour Champs — remplacés
    // par 9 parcelles indépendantes, chacune son niveau/coût propre (voir
    // data/farm-plots.js, getFarmPlotUnlockCost/getFarmPlotUpgradeCost). Laissé en place
    // pour ne pas casser getProductionBuildingCost("farm", n) si jamais appelé ailleurs,
    // mais ProductionManager.buy("farm") est désormais un no-op (voir production-system.js).
    costTiers: [
      { minLevel: 1, maxLevel: 15, resources: ["gold", "bois", "eau"], baseCost: { gold: 80, bois: 8, eau: 6 }, costMult: 1.45 }
    ]
  },
  sawmill: {
    id: "sawmill", name: "Scierie", resourceKey: "bois",
    icon: "images/Icons/resources/wood_icon.png", buildingImage: "images/Production/sawmill.png",
    desc: "Produit du bois en continu.",
    costTiers: [
      { minLevel: 1, maxLevel: 15, resources: ["gold", "fer", "pierre"], baseCost: { gold: 90, fer: 5, pierre: 8 }, costMult: 1.45 }
    ]
  },
  mine: {
    id: "mine", name: "Mine", resourceKey: "fer",
    icon: "images/Icons/resources/iron_icon.png", buildingImage: "images/Production/mine.png",
    desc: "Produit du fer en continu.",
    costTiers: [
      { minLevel: 1, maxLevel: 15, resources: ["gold", "bois", "pierre"], baseCost: { gold: 100, bois: 8, pierre: 8 }, costMult: 1.45 }
    ]
  },
  quarry: {
    id: "quarry", name: "Carrière", resourceKey: "pierre",
    icon: "images/Icons/resources/stone_icon.png", buildingImage: "images/Production/quarry.png",
    desc: "Produit de la pierre en continu.",
    costTiers: [
      { minLevel: 1, maxLevel: 15, resources: ["gold", "bois", "fer"], baseCost: { gold: 90, bois: 8, fer: 5 }, costMult: 1.45 }
    ]
  },
  well: {
    id: "well", name: "Puits", resourceKey: "eau",
    icon: "images/Icons/resources/water_icon.png", buildingImage: "images/Production/well.png",
    desc: "Produit de l'eau en continu.",
    costTiers: [
      { minLevel: 1, maxLevel: 15, resources: ["gold", "pierre", "bois"], baseCost: { gold: 70, pierre: 6, bois: 8 }, costMult: 1.45 }
    ]
  }
};

/* Coût pour passer du niveau `level` à `level+1`, toutes ressources confondues (dont "gold").
   Même mécanique que CONSTRUCTION_BUILDINGS.workshop.costPerLevel() : cherche le palier
   contenant `level`, applique costMult^(level - minLevel) sur son baseCost. */
function getProductionBuildingCost(id, level) {
  var def = PRODUCTION_BUILDINGS[id];
  if (!def || !def.costTiers) return null;

  var tier = def.costTiers.find(function (t) { return level >= t.minLevel && level <= t.maxLevel; })
    || def.costTiers[def.costTiers.length - 1];

  var n = level - tier.minLevel;
  var mult = Math.pow(tier.costMult, n);

  var result = {};
  tier.resources.forEach(function (key) {
    result[key] = Math.floor(tier.baseCost[key] * mult);
  });
  return result;
}

window.PRODUCTION_CONFIG = PRODUCTION_CONFIG;
window.PRODUCTION_BUILDINGS = PRODUCTION_BUILDINGS;
window.getProductionBuildingCost = getProductionBuildingCost;
