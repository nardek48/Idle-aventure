"use strict";
/* systems/apothecary-system.js — v3.215.0 (lot V-4) : ApothecaryManager.

   Fabrication de potions contre des ressources, en alternative à l'achat en or
   (data/apothecary-recipes.js). Aucun état propre en sauvegarde : le niveau du
   bâtiment vit dans game.village (socle), le stock de potions dans
   game.potionsOwned / game.healingPotionsOwned (PotionManager). Ce manager ne
   fait que le pont, ce qui évite une troisième source de vérité sur le stock.

   Toute écriture de ressource passe par WarehouseManager. */

var ApothecaryManager = {

  getLevel: function () {
    return (window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function")
      ? VillageBuildingManager.getLevel("apothecary")
      : 0;
  },

  /* Les N premières recettes, N = niveau du bâtiment. */
  getUnlockedRecipes: function () {
    var n = Math.min(this.getLevel(), (APOTHECARY_RECIPES || []).length);
    return (APOTHECARY_RECIPES || []).slice(0, Math.max(0, n));
  },

  getRecipe: function (potionId) {
    return (APOTHECARY_RECIPES || []).find(function (r) { return r.potionId === potionId; }) || null;
  },

  isUnlocked: function (potionId) {
    return this.getUnlockedRecipes().some(function (r) { return r.potionId === potionId; });
  },

  /* Rang de déblocage d'une recette, pour dire au joueur ce qui lui manque
     plutôt que de masquer la ligne. 1-indexé, 0 si la recette n'existe pas. */
  getRequiredLevel: function (potionId) {
    var idx = (APOTHECARY_RECIPES || []).findIndex(function (r) { return r.potionId === potionId; });
    return idx === -1 ? 0 : idx + 1;
  },

  canAfford: function (potionId) {
    var recipe = this.getRecipe(potionId);
    if (!recipe) return false;
    return Object.keys(recipe.inputs).every(function (key) {
      return WarehouseManager.getAmount(key) >= recipe.inputs[key];
    });
  },

  getMissingInput: function (potionId) {
    var recipe = this.getRecipe(potionId);
    if (!recipe) return null;
    var missing = null;
    Object.keys(recipe.inputs).some(function (key) {
      if (WarehouseManager.getAmount(key) < recipe.inputs[key]) { missing = key; return true; }
      return false;
    });
    return missing;
  },

  _crafting: false,

  craft: function (potionId) {
    if (this._crafting) return false;

    var recipe = this.getRecipe(potionId);
    if (!recipe) return false;

    if (!this.isUnlocked(potionId)) {
      showToast("Recette non ouverte — améliore l'Apothicaire", 1600);
      return false;
    }

    /* Même interdit que l'achat : l'Ascétisme ferme TOUTES les voies, sinon
       l'affliction serait contournable en construisant un bâtiment. */
    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function"
        && AfflictionManager.arePotionsForbidden()) {
      showToast("🚫 Potions interdites (Ascétisme actif)", 1600);
      return false;
    }

    var potion = (recipe.kind === "healing")
      ? PotionManager.getHealingPotion(potionId)
      : PotionManager.getPotion(potionId);
    if (!potion) return false;

    /* Le plafond de stock des potions per-run s'applique à l'identique : la
       fabrication ne doit pas être une porte dérobée autour de lui. */
    if (potion.perRun) {
      var cap = typeof POTION_STOCK_CAP === "number" ? POTION_STOCK_CAP : 9;
      if (PotionManager.getStock(potionId) >= cap) {
        showToast("Stock plein (" + cap + " max)", 1400);
        return false;
      }
    }

    var missing = this.getMissingInput(potionId);
    if (missing) {
      var def = WAREHOUSE_RESOURCES[missing];
      showToast("Pas assez de " + (def ? def.name : missing), 1400);
      return false;
    }

    this._crafting = true;

    Object.keys(recipe.inputs).forEach(function (key) {
      WarehouseManager.removeResource(key, recipe.inputs[key]);
    });

    if (recipe.kind === "healing") {
      PotionManager.ensureHealing();
      game.healingPotionsOwned[potionId] = Number(game.healingPotionsOwned[potionId] || 0) + 1;
    } else {
      PotionManager.ensure();
      game.potionsOwned[potionId] = PotionManager.getStock(potionId) + 1;
    }

    addLog("⚗️ " + potion.name + " préparée à l'Apothicaire.", "event");
    showToast(potion.name + " +1", 1300);

    if (typeof renderAll === "function") renderAll();
    saveGame();

    this._crafting = false;
    return true;
  }
};

window.ApothecaryManager = ApothecaryManager;
