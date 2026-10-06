"use strict";
/* systems/construction-system.js — v3.213.0 : ALIAS MINCE vers
   VillageBuildingManager (systems/village-building-system.js).

   Historique : de la v3.37 à la v3.212.0, ce fichier portait le 4e système
   économique (améliorer l'Atelier de Construction contre or + ressources).
   Le lot V-1 de la construction du village en a fait le PREMIER CAS d'un
   socle générique : un bâtiment de village parmi d'autres. Le manager ne
   contient donc plus de logique, il redirige.

   Pourquoi le garder plutôt que le supprimer : warehouse-system.js,
   data/workshop-unlock.js et ui/warehouse-view.js appellent encore
   ConstructionManager.getSellBonus()/getLevel(). Une redirection d'une
   ligne vaut mieux qu'une chasse aux appels dans une même livraison.
   Ancien code complet : COMMENTAIRES_ORIGINAUX.md */

var ConstructionManager = {
  ensure: function () {
    VillageBuildingManager.ensure();
  },

  getLevel: function (id) {
    return VillageBuildingManager.getLevel(id);
  },

  isMaxLevel: function (id) {
    return VillageBuildingManager.isMaxLevel(id);
  },

  getNextCost: function (id) {
    return VillageBuildingManager.getNextCost(id);
  },

  getAffordability: function (id) {
    return VillageBuildingManager.getAffordability(id);
  },

  getCurrentBonusMultiplier: function (id) {
    if (id !== "workshop") return 1;
    return VillageBuildingManager.getSellBonus();
  },

  /* Le bonus de vente lu par warehouse-system.js — inchangé depuis la
     v3.37 (+3 % par niveau), seule la source du niveau a bougé. */
  getSellBonus: function () {
    return VillageBuildingManager.getSellBonus();
  }
};

window.ConstructionManager = ConstructionManager;
