"use strict";
/* ============================================================
Aethervale — systems/construction-system.js
v3.37 : ConstructionManager — logique du système de Construction
(voir data/construction.js pour le catalogue CONSTRUCTION_BUILDINGS).
Système INDÉPENDANT de ProductionManager et VillageManager : aucun
des trois ne connaît les deux autres. Consomme l'Entrepôt uniquement
via WarehouseManager.removeResource() (systems/warehouse-system.js,
SEUL point d'écriture sur game.resources) — jamais d'accès direct à
game.resources[key] ici. L'or reste débité en dur (game.gold -=),
même pattern que TOUS les autres systèmes d'achat du jeu (Production,
Village, Boutique...) — pas de GoldManager centralisé dans ce projet.
============================================================ */

var ConstructionManager = {
  /* Migration douce : une ancienne sauvegarde (ou le tout premier
     lancement) n'a pas game.construction ou pas l'entrée "workshop"
     — comblée ici au niveau 0, jamais rétroactivement en dur dans
     save-system.js (même principe que ProductionManager.ensure()). */
  ensure: function () {
    if (!game.construction || typeof game.construction !== "object") game.construction = {};
    Object.keys(CONSTRUCTION_BUILDINGS).forEach(function (id) {
      if (!game.construction[id] || typeof game.construction[id] !== "object") {
        game.construction[id] = { level: 0 };
      }
      if (typeof game.construction[id].level !== "number" || game.construction[id].level < 0) {
        game.construction[id].level = 0;
      }
    });
  },

  getLevel: function (id) {
    this.ensure();
    return Number((game.construction[id] || {}).level || 0);
  },

  isMaxLevel: function (id) {
    var def = CONSTRUCTION_BUILDINGS[id];
    if (!def) return true;
    return this.getLevel(id) >= def.maxLevel;
  },

  /* Coût du PROCHAIN niveau (niveau actuel -> niveau actuel + 1),
     objet { gold, planche, pierre, ... } — voir costPerLevel() dans
     data/construction.js. Renvoie null si déjà au niveau maximum. */
  getNextCost: function (id) {
    var def = CONSTRUCTION_BUILDINGS[id];
    if (!def) return null;
    if (this.isMaxLevel(id)) return null;
    return def.costPerLevel(this.getLevel(id));
  },

  getCurrentBonusMultiplier: function (id) {
    var def = CONSTRUCTION_BUILDINGS[id];
    if (!def) return 1;
    return def.bonusMultiplierAtLevel(this.getLevel(id));
  },

  getNextBonusMultiplier: function (id) {
    var def = CONSTRUCTION_BUILDINGS[id];
    if (!def) return 1;
    var nextLevel = Math.min(def.maxLevel, this.getLevel(id) + 1);
    return def.bonusMultiplierAtLevel(nextLevel);
  },

  /* Vérifie individuellement chaque ressource du coût (pas juste un
     booléen global) pour permettre à l'UI d'indiquer précisément
     laquelle manque (voir ui/construction-view.js). Renvoie un objet
     { gold: bool, planche: bool, pierre: bool, all: bool }. */
  getAffordability: function (id) {
    var cost = this.getNextCost(id);
    if (!cost) return { all: false };

    var result = { gold: Number(game.gold || 0) >= cost.gold };
    Object.keys(cost).forEach(function (key) {
      if (key === "gold") return;
      result[key] = WarehouseManager.getAmount(key) >= cost[key];
    });
    result.all = Object.keys(result).every(function (k) { return result[k]; });
    return result;
  },

  /* v3.37 : verrou anti-double-achat (un onClick rapide en double sur
     mobile peut déclencher deux appels avant le premier re-rendu —
     déjà vu sur d'autres boutons d'achat du projet). Libéré dans un
     `finally` implicite (return anticipé à chaque sortie). */
  _buying: false,

  buy: function (id) {
    var def = CONSTRUCTION_BUILDINGS[id];
    if (!def) return false;
    if (this._buying) return false;

    this.ensure();

    if (this.isMaxLevel(id)) {
      showToast("Niveau maximum", 1200);
      return false;
    }

    var cost = this.getNextCost(id);
    var afford = this.getAffordability(id);

    // v3.40 : généralisé pour supporter N'IMPORTE QUEL nombre de
    // ressources dans le coût (avant : "planche"/"pierre" codés en
    // dur, ignorait silencieusement une 4e ressource même si
    // costTiers en définissait une — voir data/construction.js). Un
    // seul message ciblé sur la PREMIÈRE ressource manquante
    // rencontrée, dans l'ordre naturel des clés de `cost` (gold en
    // premier car il vient toujours en tête de tier.resources dans
    // le catalogue).
    var missingKey = Object.keys(afford).find(function (key) {
      return key !== "all" && afford[key] === false;
    });
    if (missingKey) {
      var missingLabel = missingKey === "gold" ? "or" : (WAREHOUSE_RESOURCES[missingKey] ? WAREHOUSE_RESOURCES[missingKey].name : missingKey);
      showToast("Pas assez de " + missingLabel, 1000);
      return false;
    }

    this._buying = true;

    // Retrait effectif — l'or en dur (pattern du projet), TOUTES les
    // autres ressources du coût (planche/pierre/lingot/futures) via
    // WarehouseManager.removeResource(), génériquement plutôt que 2
    // lignes fixes. Les vérifications ci-dessus garantissent que ces
    // retraits réussissent tous (aucun état intermédiaire incohérent
    // possible).
    game.gold -= cost.gold;
    Object.keys(cost).forEach(function (key) {
      if (key === "gold") return;
      WarehouseManager.removeResource(key, cost[key]);
    });

    game.construction[id].level += 1;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", cost.gold);
    }

    // v3.38 : hook optionnel pour la chaîne de déblocage de l'Atelier
    // (voir systems/workshop-unlock-system.js) — détecte l'étape 4
    // (construction du niveau 1) immédiatement après cet achat, sans
    // attendre un autre événement. Même principe de hook générique
    // que ci-dessus (QuestManager.track).
    if (window.WorkshopUnlockManager && typeof WorkshopUnlockManager.checkCurrentStep === "function") {
      WorkshopUnlockManager.checkCurrentStep();
    }

    addLog(def.name + " amélioré (niv. " + game.construction[id].level + ")", "event");
    showToast(def.name + " niv. " + game.construction[id].level, 1200);

    if (typeof renderPanel === "function") renderPanel();
    if (typeof renderHud === "function") renderHud();
    saveGame();

    this._buying = false;
    return true;
  },

  /* Lu par WarehouseManager.getSellPriceMultiplier() (voir
     systems/warehouse-system.js) — multiplicateur appliqué à TOUTE
     vente de l'Entrepôt. 1 (neutre) si "workshop" n'existe pas encore
     dans le catalogue ou n'a aucun niveau investi. */
  getSellBonus: function () {
    if (!CONSTRUCTION_BUILDINGS.workshop) return 1;
    return this.getCurrentBonusMultiplier("workshop");
  }
};

window.ConstructionManager = ConstructionManager;
