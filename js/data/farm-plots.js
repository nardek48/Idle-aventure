"use strict";
/* data/farm-plots.js — système de parcelles des Champs (Production), inspiré du prototype
   "Champs dépliés et améliorations". Choix d'évolution libre à chaque niveau atteint
   (indépendant du coût d'amélioration, voir production-buildings.js), 3 actions cumulables
   par parcelle. Logique : systems/farm-plots-system.js. Détail : COMMENTAIRES_ORIGINAUX.md */

var FARM_PLOTS_CONFIG = {
  totalPlots: 9,
  startingOpenPlots: 4, // cohérent avec le prototype (4/9 actives au départ)
  bonusPerImprovement: {
    fertile: 0.08,
    irrigated: 0.10
  }
};

/* Les 3 actions proposées à chaque choix de palier. "open" cible une parcelle locked,
   "fertile"/"irrigated"/"enriched" ciblent une parcelle déjà open n'ayant pas encore
   cette amélioration précise (cumulable avec les 2 autres). */
var FARM_UPGRADE_CHOICES = {
  open: { id: "open", icon: "🌱", label: "Préparer un sillon", desc: "Débloque une nouvelle parcelle cultivable." },
  fertile: { id: "fertile", icon: "🌿", label: "Enrichir la terre", desc: "Augmente durablement le rendement d'une parcelle (+" + Math.round(FARM_PLOTS_CONFIG.bonusPerImprovement.fertile * 100) + "% Blé)." },
  irrigated: { id: "irrigated", icon: "💧", label: "Creuser une rigole", desc: "Irrigue une parcelle grâce au Puits (+" + Math.round(FARM_PLOTS_CONFIG.bonusPerImprovement.irrigated * 100) + "% Blé)." }
};

window.FARM_PLOTS_CONFIG = FARM_PLOTS_CONFIG;
window.FARM_UPGRADE_CHOICES = FARM_UPGRADE_CHOICES;
