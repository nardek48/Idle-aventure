"use strict";
/* systems/caravan-system.js — v3.780.0 (simplification lot 6, Seb A) : les caravanes sont retirées.
   Il ne reste qu'un solde au chargement (boot.js) : une caravane encore en route dans une vieille
   sauvegarde est livrée tout de suite (or, matériau rare, objet), puis la liste est vidée.
   Les étapes ruines_04 et crypte_04 se font désormais par une livraison depuis la carte d'étape. */

var CaravanManager = {
  /* Livre d'un coup les caravanes d'une sauvegarde d'avant v3.780.0 ; renvoie l'or versé (0 si rien). */
  settleRetired: function () {
    var v = game.village;
    if (!v || typeof v !== "object") return 0;
    var list = Array.isArray(v.caravans) ? v.caravans.slice() : [];
    if (v.caravan && typeof v.caravan === "object") list.push(v.caravan); // forme d'avant v3.457.0
    delete v.caravan;
    v.caravans = [];
    var total = 0;
    list.forEach(function (c) {
      if (!c || typeof c !== "object") return;
      var gold = Math.max(0, Math.floor(Number(c.gold || 0)));
      if (window.GrandOuvrage) gold = GrandOuvrage.applyGold(gold);
      game.gold = Number(game.gold || 0) + gold;
      game.totalGoldEarned = Number(game.totalGoldEarned || 0) + gold;
      total += gold;
      if (c.rare && window.WAREHOUSE_RESOURCES && WAREHOUSE_RESOURCES[c.rare.key] && window.WarehouseManager) WarehouseManager.addResource(c.rare.key, c.rare.n, true);
      if (c.item && typeof addLootToInventory === "function") addLootToInventory(c.item);
      // l'étape du marché attendait cette caravane : elle compte comme livrée (check de ruines_04 / crypte_04)
      var ep = game.explorationProgression = (game.explorationProgression && typeof game.explorationProgression === "object") ? game.explorationProgression : {};
      if (Number(c.world) === 2) ep.ruinsMarketDone = true;
      if (Number(c.world) === 3) ep.cryptMarketDone = true;
    });
    if (list.length && typeof addLog === "function") addLog("🐪 " + _t("Les caravanes sont rentrées pour de bon : +{n} or", { n: formatNumber(total) }), "event");
    return total;
  }
};

window.CaravanManager = CaravanManager;
