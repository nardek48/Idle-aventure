"use strict";
/* data/production-buildings.js — bâtiments à STOCK LOCAL plafonné (distinct de VILLAGE_CONFIG, bonus passifs sans stock).
   Récolte manuelle vers l'Entrepôt. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var PRODUCTION_CONFIG = {
  baseRatePerMin: 1,
  rateGrowthPerLevel: 1.25,
  baseCapacity: 25,
  capacityGrowthPerLevel: 0.10,
  baseCost: 200,
  costMult: 1.6,
  maxLevel: 15
};

var PRODUCTION_BUILDINGS = {
  hunt: { id: "hunt", name: "Chasse", resourceKey: "viande", icon: "images/Icons/resources/meat_icon.png", buildingImage: "images/Production/hunt.png", desc: "Produit de la viande en continu." },
  farm: { id: "farm", name: "Champs", resourceKey: "ble", icon: "images/Icons/resources/wheat_icon.png", buildingImage: "images/Production/farm.png", desc: "Produit du blé en continu." },
  sawmill: { id: "sawmill", name: "Scierie", resourceKey: "bois", icon: "images/Icons/resources/wood_icon.png", buildingImage: "images/Production/sawmill.png", desc: "Produit du bois en continu." },
  mine: { id: "mine", name: "Mine", resourceKey: "fer", icon: "images/Icons/resources/iron_icon.png", buildingImage: "images/Production/mine.png", desc: "Produit du fer en continu." },
  quarry: { id: "quarry", name: "Carrière", resourceKey: "pierre", icon: "images/Icons/resources/stone_icon.png", buildingImage: "images/Production/quarry.png", desc: "Produit de la pierre en continu." },
  well: { id: "well", name: "Puits", resourceKey: "eau", icon: "images/Icons/resources/water_icon.png", buildingImage: "images/Production/well.png", desc: "Produit de l'eau en continu." }
};

window.PRODUCTION_CONFIG = PRODUCTION_CONFIG;
window.PRODUCTION_BUILDINGS = PRODUCTION_BUILDINGS;
