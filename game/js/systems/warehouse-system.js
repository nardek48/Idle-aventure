"use strict";
/* systems/warehouse-system.js — Entrepôt : SEUL point d'écriture sur game.resources (addResource/removeResource/sellResource).
   v3.218.0 : et SEUL point de vérité du plafond, via getCap() — relevé par le bâtiment « Entrepôt agrandi ».
   v3.98.0 : le craft n'est plus géré ici — remplacé par des ateliers locaux par bâtiment
   (voir WorkshopsSystem, systems/workshops-system.js). v3.412.0 : game.craftQueue retiré.
   Détail : COMMENTAIRES_ORIGINAUX.md */

/* v3.484.0 (refonte de l'économie, lot S, RE-8) : ressources retirées -> équivalent brut.
   Sert aux stocks et files d'atelier des anciennes sauvegardes, et aux butins encore en route. */
var WAREHOUSE_LEGACY_RESOURCES = {
  farine: { ble: 5 },
  viande_sechee: { viande: 5 },
  eau_purifiee: { eau: 4 }
};
/* Ateliers retirés au même lot : produit de leur recette unique (×1) et coût d'amélioration de base. */
var WAREHOUSE_LEGACY_WORKSHOPS = {
  moulin: { buildingId: "farm", product: "farine" },
  sechoir: { buildingId: "hunt", product: "viande_sechee" },
  station_purification: { buildingId: "well", product: "eau_purifiee" }
};
var WAREHOUSE_LEGACY_WORKSHOP_UPGRADE_BASE = { planche: 3, lingot: 2 };

var WarehouseManager = {
  ensure: function () {
    if (!game.resources || typeof game.resources !== "object") game.resources = {};
    this._migrateLegacy();
    if (typeof WAREHOUSE_RESOURCES === "undefined") return;
    Object.keys(WAREHOUSE_RESOURCES).forEach(function (key) {
      if (typeof game.resources[key] !== "number") game.resources[key] = 0;
    });
  },

  /* v3.484.0 (lot S) : convertit sans plafond (déjà acquis) les stocks des ressources retirées,
     les lots en file des ateliers retirés et leurs niveaux payés, puis efface les clés. Idempotent. */
  _migrateLegacy: function () {
    var res = game.resources;
    var credit = function (key, n) { res[key] = Number(res[key] || 0) + Math.floor(n); };
    var creditLegacy = function (legacyKey, n) {
      var eq = WAREHOUSE_LEGACY_RESOURCES[legacyKey];
      Object.keys(eq).forEach(function (k) { credit(k, eq[k] * n); });
    };
    Object.keys(WAREHOUSE_LEGACY_RESOURCES).forEach(function (key) {
      if (!(key in res)) return;
      var n = Math.floor(Number(res[key] || 0));
      delete res[key];
      if (n > 0) creditLegacy(key, n);
    });
    if (!game.production || typeof game.production !== "object") return;
    Object.keys(WAREHOUSE_LEGACY_WORKSHOPS).forEach(function (id) {
      var info = WAREHOUSE_LEGACY_WORKSHOPS[id];
      var bucket = game.production[info.buildingId];
      var ws = bucket && bucket.workshops && bucket.workshops[id];
      if (!ws) return;
      (Array.isArray(ws.queue) ? ws.queue : []).forEach(function (job) {
        var times = Math.floor(Number(job && job.times || 0));
        if (times > 0) creditLegacy(info.product, times);
      });
      var mult = (typeof WORKSHOP_LEVEL_CONFIG !== "undefined") ? WORKSHOP_LEVEL_CONFIG.upgradeCostMultPerLevel : 1.4;
      for (var lv = 1; lv < Math.floor(Number(ws.level || 1)); lv++) {
        Object.keys(WAREHOUSE_LEGACY_WORKSHOP_UPGRADE_BASE).forEach(function (k) {
          credit(k, WAREHOUSE_LEGACY_WORKSHOP_UPGRADE_BASE[k] * Math.pow(mult, lv - 1));
        });
      }
      delete bucket.workshops[id];
    });
  },

  getAmount: function (key) {
    this.ensure();
    return Number((game.resources || {})[key] || 0);
  },

  /* v3.218.0 (lot V-7) — PLAFOND CENTRALISÉ.
     Le plafond d'une ressource fabriquée (999 par défaut) est relevé par le
     bâtiment « Entrepôt agrandi » du Village. Tous les appelants passent par
     ici : addResource ci-dessous, le calcul de lots des ateliers
     (workshops-system.js) et l'affichage (warehouse-view.js). Sans ce point
     unique, un atelier pourrait fabriquer vers un plafond que l'Entrepôt
     refuserait ensuite, et le lot serait perdu.

     Matières brutes sans `cap` : plafond de base RAW_STOCK_BASE (v3.330.0, E1),
     plus le bonus du bâtiment, comme les fabriquées. */
  getCap: function (key) {
    var def = (typeof WAREHOUSE_RESOURCES !== "undefined") ? WAREHOUSE_RESOURCES[key] : null;
    if (!def) return Infinity;
    // v3.330.0 (E1) : les ressources brutes ont leur propre plafond de base
    var base = (typeof def.cap === "number") ? def.cap
      : ((def.tier || "raw") === "raw" && typeof RAW_STOCK_BASE === "number") ? RAW_STOCK_BASE : null;
    if (base === null) return Infinity;

    var bonus = (window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function")
      ? getWarehouseCapBonus(VillageBuildingManager.getLevel("warehouse")) // option B : +500 au-delà du 10
      : 0;
    return base + bonus;
  },

  /* v3.330.0 (E1) : place libre avant le plafond (0 si un stock ancien le dépasse déjà). */
  getFreeSpace: function (key) {
    var cap = this.getCap(key);
    if (cap === Infinity) return Infinity;
    return Math.max(0, Math.floor(cap - Number((game.resources || {})[key] || 0)));
  },

  addResource: function (key, amount, silent) {
    this.ensure();
    amount = Math.floor(Number(amount || 0));
    if (amount <= 0) return 0;
    // v3.484.0 (lot S) : un butin parti avant la mise à jour arrive en équivalent brut
    if (WAREHOUSE_LEGACY_RESOURCES[key]) {
      var eq = WAREHOUSE_LEGACY_RESOURCES[key], total = 0, self = this;
      Object.keys(eq).forEach(function (k) { total += self.addResource(k, eq[k] * amount, silent); });
      return total;
    }
    if (typeof WAREHOUSE_RESOURCES === "undefined" || !WAREHOUSE_RESOURCES[key]) return 0;

    var def = WAREHOUSE_RESOURCES[key];
    var current = Number(game.resources[key] || 0);
    var cap = this.getCap(key);
    var applied = Math.max(0, Math.min(amount, cap - current));
    // v3.330.1 (E1) : ce qui ne rentre pas est perdu — on le dit au journal (chasses, sorties, récompenses)
    if (applied < amount && typeof addLog === "function") {
      addLog("📦 " + _t("Entrepôt plein : {n} {x} perdu(s)", { n: formatNumber(amount - applied), x: _td(def.name) }), "event");
    }
    if (applied <= 0) return 0;

    game.resources[key] = current + applied;

    if (!silent) {
      addLog(_t("{x} +{n} (Entrepôt)", { x: _td(def.name), n: formatNumber(applied) }), "event");
    }

    if ((key === "bois" || key === "pierre") && window.WorkshopUnlockManager && typeof WorkshopUnlockManager.checkCurrentStep === "function") {
      WorkshopUnlockManager.checkCurrentStep();
    }

    return applied;
  },

  removeResource: function (key, amount) {
    this.ensure();
    amount = Math.floor(Number(amount || 0));
    if (amount <= 0) return true;
    if (typeof WAREHOUSE_RESOURCES === "undefined" || !WAREHOUSE_RESOURCES[key]) return false;

    var current = Number(game.resources[key] || 0);
    if (current < amount) return false;

    game.resources[key] = current - amount;
    return true;
  },

  /* v3.355.0 : remboursement d'une commande d'atelier annulée. Sans plafond : ces
     ressources étaient déjà dans l'Entrepôt, les perdre serait une double peine. */
  refundResource: function (key, amount) {
    this.ensure();
    amount = Math.floor(Number(amount || 0));
    if (amount <= 0) return 0;
    if (typeof WAREHOUSE_RESOURCES === "undefined" || !WAREHOUSE_RESOURCES[key]) return 0;
    game.resources[key] = Number(game.resources[key] || 0) + amount;
    return amount;
  },

  getSellPriceMultiplier: function () {
    if (window.ConstructionManager && typeof ConstructionManager.getSellBonus === "function") {
      return ConstructionManager.getSellBonus();
    }
    return 1;
  },

  /* v3.330.0 (économie du village, décision E6 option C de Seb) : plus de vente à l'Entrepôt.
     La Taverne (contrats) et, depuis la v3.419.0, la caravane de la Halle sont les débouchés ; sellPrice reste la valeur de référence qui
     calcule les contrats. La fonction reste pour les anciens appelants et répond « non ». */
  SELLING_ENABLED: false,

  sellResource: function (key, amount) {
    this.ensure();
    if (!this.SELLING_ENABLED) {
      if (typeof showToast === "function") showToast(_t("L'Entrepôt ne rachète plus rien : livre tes ressources à la Taverne"), 2200);
      return 0;
    }
    if (typeof WAREHOUSE_RESOURCES === "undefined" || !WAREHOUSE_RESOURCES[key]) return 0;

    var available = this.getAmount(key);
    var qty = Math.floor(Math.min(available, Number(amount || 0)));
    if (qty <= 0) {
      showToast(_t("Rien à vendre"), 1000);
      return 0;
    }

    var def = WAREHOUSE_RESOURCES[key];
    var price = Number(def.sellPrice || 0);
    var goldGain = Math.floor(qty * price * this.getSellPriceMultiplier());

    game.resources[key] = available - qty;
    game.gold += goldGain;
    game.totalGoldEarned += goldGain;

    addLog(_t("{x} vendue ×{n} (+{g} or)", { x: _td(def.name), n: formatNumber(qty), g: formatNumber(goldGain) }), "event");
    showToast(_t("+{n} or", { n: formatNumber(goldGain) }), 1300);

    if (typeof renderPanel === "function") renderPanel();
    if (typeof renderHud === "function") renderHud();
    saveGame();

    return goldGain;
  }
};

window.WarehouseManager = WarehouseManager;
