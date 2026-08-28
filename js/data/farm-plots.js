"use strict";
/* data/farm-plots.js — v3.96.0 : refonte complète, parcelles des Champs INDÉPENDANTES
   (chacune son niveau, son stock, sa capacité — plus de bonus % global sur un bâtiment
   unique). 9 parcelles réparties en 3 profils fixes en pattern alterné (rapide/équilibrée/
   lente), chaque profil ayant son propre compromis débit/stockage : une parcelle rapide se
   remplit vite mais plafonne vite (bonne pour qui joue souvent), une parcelle lente stocke
   beaucoup plus mais produit moins par minute (bonne pour l'AFK). La récolte reste globale
   (un seul bouton en haut de carte additionne tous les stocks de parcelles ouvertes).
   Niveaux 1-5 pour l'instant ; un palier 6+ lié à la progression de monde est prévu plus
   tard (nouvelle ressource de coût + meilleur rendement), pas encore implémenté ici.
   Logique : systems/farm-plots-system.js. Détail : COMMENTAIRES_ORIGINAUX.md */

var FARM_PLOTS_CONFIG = {
  totalPlots: 9,
  plotMaxLevel: 5,

  /* Pattern fixe assignant un profil à chaque index de parcelle (0-8). Alterné pour que
     le joueur ait un vrai choix dès le début plutôt qu'un ordre imposé (ex. "toutes les
     rapides d'abord"). */
  profilePattern: ["rapide", "equilibree", "lente", "rapide", "equilibree", "lente", "rapide", "equilibree", "lente"],

  /* Taux (blé/min) et capacité de stock LOCAL À LA PARCELLE, par profil. rateGrowthPerLevel
     identique aux 3 profils (progression ressentie cohérente), seule la base et la
     croissance de capacité changent pour créer le compromis débit/stockage. */
  profiles: {
    rapide: {
      label: "Parcelle rapide",
      desc: "Fort débit, petite réserve — à récolter souvent.",
      baseRatePerMin: 0.70,
      rateGrowthPerLevel: 1.78,
      baseCapacity: 15,
      capacityGrowthPerLevel: 1.35
    },
    equilibree: {
      label: "Parcelle équilibrée",
      desc: "Compromis entre débit et réserve.",
      baseRatePerMin: 0.50,
      rateGrowthPerLevel: 1.78,
      baseCapacity: 30,
      capacityGrowthPerLevel: 1.45
    },
    lente: {
      label: "Parcelle lente",
      desc: "Faible débit, grande réserve — tolère l'absence.",
      baseRatePerMin: 0.35,
      rateGrowthPerLevel: 1.78,
      baseCapacity: 60,
      capacityGrowthPerLevel: 1.55
    }
  },

  /* Bonus multiplicatifs des améliorations, cumulables entre elles (appliqués au taux
     de la parcelle uniquement, jamais à sa capacité). Inchangé par rapport à l'ancien
     système à bonus global. */
  bonusPerImprovement: {
    fertile: 0.08,
    irrigated: 0.10
  },

  /* Coût de DÉBLOCAGE d'une parcelle (locked -> open), en ressources brutes jamais
     produites par Champs lui-même. Croît avec l'index de parcelle (unlockCostMult par
     parcelle successive) pour inciter à améliorer l'existant avant d'ouvrir la suivante.
     La parcelle 0 est gratuite (offerte par la future quête d'introduction Champs, pas
     encore implémentée — ce coût n'est donc jamais consulté pour l'index 0). */
  unlockCost: {
    resources: ["bois", "pierre"],
    base: { bois: 15, pierre: 10 },
    costMultPerPlot: 1.55
  },

  /* Coût d'AMÉLIORATION de niveau (level -> level+1) d'une parcelle déjà ouverte. Même
     coût de base pour les 3 profils (simplicité), croît avec le niveau atteint. */
  upgradeCost: {
    resources: ["bois", "eau"],
    base: { bois: 8, eau: 6 },
    costMultPerLevel: 1.40
  },

  /* Coût des améliorations fertile/irriguée, fixe (ne dépend pas du niveau de la parcelle
     ni de son profil). desc affiché sous le bouton dans la zone d'actions (voir
     production-view.js) — texte court, la valeur exacte (%) est calculée dynamiquement
     depuis bonusPerImprovement pour rester cohérente si ces valeurs changent. */
  improvementCost: {
    fertile: { resources: ["bois", "eau"], cost: { bois: 20, eau: 15 }, desc: "Terre enrichie, rendement durablement amélioré." },
    irrigated: { resources: ["pierre", "eau"], cost: { pierre: 18, eau: 22 }, desc: "Sillon irrigué depuis le Puits, rendement durablement amélioré." }
  }
};

/* Coût pour débloquer la parcelle d'index `plotIndex` (0-based). Index 0 = gratuite. */
function getFarmPlotUnlockCost(plotIndex) {
  if (plotIndex <= 0) return null; // parcelle 0 gratuite, jamais de coût à afficher/payer
  var cfg = FARM_PLOTS_CONFIG.unlockCost;
  var mult = Math.pow(cfg.costMultPerPlot, plotIndex - 1);
  var result = {};
  cfg.resources.forEach(function (key) {
    result[key] = Math.floor(cfg.base[key] * mult);
  });
  return result;
}

/* Coût pour faire passer une parcelle DE `level` À `level+1`. */
function getFarmPlotUpgradeCost(level) {
  var cfg = FARM_PLOTS_CONFIG.upgradeCost;
  var mult = Math.pow(cfg.costMultPerLevel, level - 1);
  var result = {};
  cfg.resources.forEach(function (key) {
    result[key] = Math.floor(cfg.base[key] * mult);
  });
  return result;
}

window.FARM_PLOTS_CONFIG = FARM_PLOTS_CONFIG;
window.getFarmPlotUnlockCost = getFarmPlotUnlockCost;
window.getFarmPlotUpgradeCost = getFarmPlotUpgradeCost;
