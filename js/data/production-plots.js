"use strict";
/* data/production-plots.js — v3.97.0 : généralise le système de parcelles indépendantes de
   Champs (v3.96.0-3.96.4) aux 5 autres bâtiments de Production (Chasse, Scierie, Mine,
   Carrière, Puits). MÊME mécanique pour les 6 : 9 zones indépendantes par bâtiment,
   chacune son niveau (1-5), son stock local plafonné, son taux propre ; 3 profils fixes
   (rapide/équilibrée/lente) en pattern alterné ; mêmes formules de taux/capacité (identique
   à Champs). Seuls diffèrent, par bâtiment : le nom de section affiché (🌾 Parcelles,
   🌲 Territoires, 🪵 Bosquets, ⛏️ Galeries, 🪨 Filons, 💧 Réseau hydraulique) et les
   ressources de coût (jamais la propre production du bâtiment — voir grille validée avec
   Seb). Remplace data/farm-plots.js (supprimé).
   Logique : systems/production-plots-system.js. Détail : COMMENTAIRES_ORIGINAUX.md */

/* Profils et bonus d'amélioration : communs aux 6 bâtiments, valeurs identiques à Champs
   (décision validée avec Seb — même mécanique, mêmes formules, mêmes montants). */
var PRODUCTION_PLOTS_SHARED = {
  totalPlots: 9,
  plotMaxLevel: 5,
  profilePattern: ["rapide", "equilibree", "lente", "rapide", "equilibree", "lente", "rapide", "equilibree", "lente"],
  profiles: {
    rapide: {
      label: "Zone rapide",
      desc: "Fort débit, petite réserve — à récolter souvent.",
      baseRatePerMin: 0.70,
      rateGrowthPerLevel: 1.78,
      baseCapacity: 15,
      capacityGrowthPerLevel: 1.35
    },
    equilibree: {
      label: "Zone équilibrée",
      desc: "Compromis entre débit et réserve.",
      baseRatePerMin: 0.50,
      rateGrowthPerLevel: 1.78,
      baseCapacity: 30,
      capacityGrowthPerLevel: 1.45
    },
    lente: {
      label: "Zone lente",
      desc: "Faible débit, grande réserve — tolère l'absence.",
      baseRatePerMin: 0.35,
      rateGrowthPerLevel: 1.78,
      baseCapacity: 60,
      capacityGrowthPerLevel: 1.55
    }
  },
  bonusPerImprovement: {
    fertile: 0.08,
    irrigated: 0.10
  },
  /* Multiplicateurs de croissance de coût, communs aux 6 bâtiments — seules les
     ressources et montants de base varient (voir PRODUCTION_PLOTS_BUILDINGS). */
  unlockCostMultPerPlot: 1.55,
  upgradeCostMultPerLevel: 1.40
};

/* Config PAR BÂTIMENT : nom de section affiché, thème des icônes de zone, et ressources
   de coût — choisies pour ne JAMAIS chevaucher la propre production du bâtiment (règle
   validée avec Seb, déjà appliquée à Champs). Montants de base identiques à Champs pour
   les 6 bâtiments (décision explicite : même mécanique, mêmes valeurs). */
var PRODUCTION_PLOTS_BUILDINGS = {
  farm: {
    sectionLabel: "🌾 Parcelles",
    zoneNamePrefix: "Parcelle",
    unlockCost: { resources: ["bois", "pierre"], base: { bois: 15, pierre: 10 } },
    upgradeCost: { resources: ["bois", "eau"], base: { bois: 8, eau: 6 } },
    improvementCost: {
      fertile: { resources: ["bois", "eau"], cost: { bois: 20, eau: 15 }, label: "Terre enrichie", icon: "🌱", desc: "Rendement durablement amélioré." },
      irrigated: { resources: ["pierre", "eau"], cost: { pierre: 18, eau: 22 }, label: "Sillon irrigué", icon: "💧", desc: "Rendement durablement amélioré." }
    }
  },
  hunt: {
    sectionLabel: "🌲 Territoires",
    zoneNamePrefix: "Territoire",
    unlockCost: { resources: ["bois", "pierre"], base: { bois: 15, pierre: 10 } },
    upgradeCost: { resources: ["bois", "eau"], base: { bois: 8, eau: 6 } },
    improvementCost: {
      fertile: { resources: ["bois", "eau"], cost: { bois: 20, eau: 15 }, label: "Pièges entretenus", icon: "🪤", desc: "Rendement durablement amélioré." },
      irrigated: { resources: ["pierre", "eau"], cost: { pierre: 18, eau: 22 }, label: "Affût aménagé", icon: "🏕️", desc: "Rendement durablement amélioré." }
    }
  },
  sawmill: {
    sectionLabel: "🪵 Bosquets",
    zoneNamePrefix: "Bosquet",
    unlockCost: { resources: ["fer", "pierre"], base: { fer: 15, pierre: 10 } },
    upgradeCost: { resources: ["fer", "pierre"], base: { fer: 8, pierre: 6 } },
    improvementCost: {
      fertile: { resources: ["fer", "eau"], cost: { fer: 20, eau: 15 }, label: "Reboisement", icon: "🌱", desc: "Rendement durablement amélioré." },
      irrigated: { resources: ["pierre", "eau"], cost: { pierre: 18, eau: 22 }, label: "Bois préservé", icon: "🌳", desc: "Rendement durablement amélioré." }
    }
  },
  mine: {
    sectionLabel: "⛏️ Galeries",
    zoneNamePrefix: "Galerie",
    unlockCost: { resources: ["bois", "pierre"], base: { bois: 15, pierre: 10 } },
    upgradeCost: { resources: ["bois", "pierre"], base: { bois: 8, pierre: 6 } },
    improvementCost: {
      fertile: { resources: ["bois", "eau"], cost: { bois: 20, eau: 15 }, label: "Galerie étayée", icon: "⛏️", desc: "Rendement durablement amélioré." },
      irrigated: { resources: ["pierre", "eau"], cost: { pierre: 18, eau: 22 }, label: "Filon dégagé", icon: "🪨", desc: "Rendement durablement amélioré." }
    }
  },
  quarry: {
    sectionLabel: "🪨 Filons",
    zoneNamePrefix: "Filon",
    unlockCost: { resources: ["fer", "eau"], base: { fer: 15, eau: 10 } },
    upgradeCost: { resources: ["bois", "fer"], base: { bois: 8, fer: 6 } },
    improvementCost: {
      fertile: { resources: ["bois", "eau"], cost: { bois: 20, eau: 15 }, label: "Veine prospectée", icon: "💎", desc: "Rendement durablement amélioré." },
      irrigated: { resources: ["fer", "eau"], cost: { fer: 18, eau: 22 }, label: "Galerie consolidée", icon: "🧱", desc: "Rendement durablement amélioré." }
    }
  },
  well: {
    sectionLabel: "💧 Réseau hydraulique",
    zoneNamePrefix: "Point d'eau",
    unlockCost: { resources: ["viande", "pierre"], base: { viande: 15, pierre: 10 } },
    upgradeCost: { resources: ["bois", "fer"], base: { bois: 8, fer: 6 } },
    improvementCost: {
      fertile: { resources: ["bois", "fer"], cost: { bois: 20, fer: 15 }, label: "Bassin agrandi", icon: "🏺", desc: "Rendement durablement amélioré." },
      irrigated: { resources: ["pierre", "fer"], cost: { pierre: 18, fer: 22 }, label: "Pompe optimisée", icon: "⚙️", desc: "Rendement durablement amélioré." }
    }
  }
};

/* Coût pour débloquer la zone d'index `plotIndex` (0-based) du bâtiment `buildingId`.
   Index 0 = gratuite (offerte par la future quête d'introduction du bâtiment concerné,
   pas encore implémentée — comme pour Champs). */
function getProductionPlotUnlockCost(buildingId, plotIndex) {
  if (plotIndex <= 0) return null;
  var cfg = PRODUCTION_PLOTS_BUILDINGS[buildingId];
  if (!cfg) return null;
  var mult = Math.pow(PRODUCTION_PLOTS_SHARED.unlockCostMultPerPlot, plotIndex - 1);
  var result = {};
  cfg.unlockCost.resources.forEach(function (key) {
    result[key] = Math.floor(cfg.unlockCost.base[key] * mult);
  });
  return result;
}

/* Coût pour faire passer une zone DE `level` À `level+1`, pour le bâtiment `buildingId`. */
function getProductionPlotUpgradeCost(buildingId, level) {
  var cfg = PRODUCTION_PLOTS_BUILDINGS[buildingId];
  if (!cfg) return null;
  var mult = Math.pow(PRODUCTION_PLOTS_SHARED.upgradeCostMultPerLevel, level - 1);
  var result = {};
  cfg.upgradeCost.resources.forEach(function (key) {
    result[key] = Math.floor(cfg.upgradeCost.base[key] * mult);
  });
  return result;
}

window.PRODUCTION_PLOTS_SHARED = PRODUCTION_PLOTS_SHARED;
window.PRODUCTION_PLOTS_BUILDINGS = PRODUCTION_PLOTS_BUILDINGS;
window.getProductionPlotUnlockCost = getProductionPlotUnlockCost;
window.getProductionPlotUpgradeCost = getProductionPlotUpgradeCost;
