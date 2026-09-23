"use strict";
/* systems/apothecary-system.js — v3.215.0 (lot V-4) : ApothecaryManager.

   Fabrication de potions contre des ressources, en alternative à l'achat en or
   (data/apothecary-recipes.js). Le stock de potions vit dans game.potionsOwned /
   game.healingPotionsOwned (PotionManager) : ce manager ne fait que le pont.

   v3.291.0 : le niveau donne la CAPACITÉ (plafond quotidien), la recette se gagne
   par COMMANDE. État propre dans game.village.apothecary = { learned: {id: true},
   dailyKey, dailyCount } — game.village est déjà sauvegardé tel quel et conservé à
   l'Ascension : aucune modification de save-system.js.

   Toute écriture de ressource passe par WarehouseManager. */

var ApothecaryManager = {

  getLevel: function () {
    return (window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function")
      ? VillageBuildingManager.getLevel("apothecary")
      : 0;
  },

  /* ---------- état (v3.291.0) ---------- */

  ensureState: function () {
    if (!game.village || typeof game.village !== "object") game.village = {};
    var st = game.village.apothecary;
    if (!st || typeof st !== "object") st = game.village.apothecary = {};
    if (!st.learned || typeof st.learned !== "object") st.learned = {};
    if (typeof st.dailyCount !== "number") st.dailyCount = 0;
    if (typeof st.dailyKey !== "string") st.dailyKey = "";
    /* Migration « déjà en jeu = acquis » : une partie d'avant v3.291.0 garde les recettes
       que son niveau ouvrait (les N premières). Une seule fois ; à niveau 0, rien. */
    if (!st.migrated) {
      st.migrated = true;
      var n = Math.min(this.getLevel(), (APOTHECARY_RECIPES || []).length);
      for (var i = 0; i < n; i++) st.learned[APOTHECARY_RECIPES[i].potionId] = true;
    }
    return st;
  },

  /* Jour civil, comme l'Arbre-mère (LivingMapManager._todayKey). */
  _todayKey: function () { return new Date().toDateString(); },

  /* ---------- recettes et commandes ---------- */

  isLearned: function (potionId) {
    var r = this.getRecipe(potionId);
    if (!r) return false;
    if (r.known) return true;
    return !!this.ensureState().learned[potionId];
  },

  /* Recettes utilisables : bâtiment construit ET recette acquise. */
  getUnlockedRecipes: function () {
    if (this.getLevel() <= 0) return [];
    var self = this;
    return (APOTHECARY_RECIPES || []).filter(function (r) { return self.isLearned(r.potionId); });
  },

  /* La commande est visible une fois son monde atteint (WorldCaps). */
  isOrderOpen: function (potionId) {
    var r = this.getRecipe(potionId);
    if (!r || !r.order || this.isLearned(potionId)) return false;
    var reached = window.WorldCaps ? WorldCaps.getReachedWorldIndex() : 0;
    return reached >= Number(r.worldIndex || 0);
  },

  canDeliver: function (potionId) {
    var r = this.getRecipe(potionId);
    if (!r || !this.isOrderOpen(potionId) || this.getLevel() <= 0) return false;
    return Object.keys(r.order).every(function (k) { return WarehouseManager.getAmount(k) >= r.order[k]; });
  },

  /* Livre la commande : ingrédients retirés, recette acquise pour toujours. */
  deliverOrder: function (potionId) {
    var r = this.getRecipe(potionId);
    if (!r || !r.order) return false;
    if (this.getLevel() <= 0) { showToast("Construis d'abord l'Apothicaire", 1400); return false; }
    if (!this.isOrderOpen(potionId)) return false;
    if (!this.canDeliver(potionId)) { showToast("Ingrédients manquants", 1300); return false; }

    Object.keys(r.order).forEach(function (k) { WarehouseManager.removeResource(k, r.order[k]); });
    this.ensureState().learned[potionId] = true;

    var potion = this._getPotion(r);
    addLog("⚗️ Commande livrée : l'Apothicaire sait préparer " + (potion ? potion.name : potionId) + ".", "event");
    showToast("⚗️ Recette acquise", 1500);
    if (typeof renderAll === "function") renderAll();
    saveGame();
    return true;
  },

  /* Raison courte d'une recette non utilisable, pour l'écran des potions. */
  getLockReason: function (potionId) {
    var r = this.getRecipe(potionId);
    if (!r) return "";
    if (this.isLearned(potionId)) return "";
    if (!this.isOrderOpen(potionId)) {
      return "S'ouvre " + (window.WorldCaps ? WorldCaps.withPrep(Number(r.worldIndex || 0)) : "plus tard");
    }
    return "Commande à l'Apothicaire";
  },

  _getPotion: function (recipe) {
    return (recipe.kind === "healing")
      ? PotionManager.getHealingPotion(recipe.potionId)
      : PotionManager.getPotion(recipe.potionId);
  },

  /* ---------- plafond quotidien ---------- */

  /* 4 au niveau 1, +2 par niveau suivant (APOTHECARY_DAILY_CAP_*). */
  getDailyCap: function (level) {
    var lvl = (typeof level === "number") ? level : this.getLevel();
    if (lvl <= 0) return 0;
    return APOTHECARY_DAILY_CAP_BASE + APOTHECARY_DAILY_CAP_PER_LEVEL * (lvl - 1);
  },

  getDailyUsed: function () {
    var st = this.ensureState();
    if (st.dailyKey !== this._todayKey()) return 0;
    return st.dailyCount;
  },

  getDailyRemaining: function () {
    return Math.max(0, this.getDailyCap() - this.getDailyUsed());
  },

  _countDaily: function () {
    var st = this.ensureState();
    var today = this._todayKey();
    if (st.dailyKey !== today) { st.dailyKey = today; st.dailyCount = 0; }
    st.dailyCount += 1;
  },

  getRecipe: function (potionId) {
    return (APOTHECARY_RECIPES || []).find(function (r) { return r.potionId === potionId; }) || null;
  },

  isUnlocked: function (potionId) {
    return this.getUnlockedRecipes().some(function (r) { return r.potionId === potionId; });
  },

  /* v3.291.0 : les niveaux n'ouvrent plus de recette. Conservé pour tout appelant
     ancien : 1 (le bâtiment suffit), 0 si la recette n'existe pas. */
  getRequiredLevel: function (potionId) {
    return this.getRecipe(potionId) ? 1 : 0;
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
      showToast(this.getLevel() <= 0 ? "Construis d'abord l'Apothicaire" : "Recette à gagner par commande à l'Apothicaire", 1600);
      return false;
    }

    // v3.291.0 : plafond quotidien, Soin mineur libre
    if (recipe.capped && this.getDailyRemaining() <= 0) {
      showToast("L'Apothicaire a fini pour aujourd'hui (" + this.getDailyCap() + " max)", 1600);
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
      var cap = typeof getPotionStockCap === "function" ? getPotionStockCap() : 9; // v3.322.0
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

    if (recipe.capped) this._countDaily();

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
