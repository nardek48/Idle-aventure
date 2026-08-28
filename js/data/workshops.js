"use strict";
/* data/workshops.js — v3.98.0 : ateliers de craft LOCAUX à chaque bâtiment de Production
   (6 bâtiments × 2 ateliers), remplace le craft générique de l'Entrepôt (RECIPES/
   game.craftQueue, voir data/recipes.js — supprimé). Chaque atelier a sa PROPRE file de
   craft indépendante (voir systems/workshops-system.js), persistée dans
   game.production[buildingId].workshops[workshopId] — même bloc opaque déjà traité par
   save-system.js pour game.production, donc aucune modification de ce fichier protégé.
   v3.98.0 : niveau fixe (1), pas d'amélioration/vitesse variable pour cette 1ère passe —
   décision explicite validée avec Seb, à étendre plus tard si besoin. File illimitée
   (comme l'ancien craft Entrepôt).
   Certains ateliers sont marqués `active: false` ("bientôt") : visibles dans l'UI avec un
   nom et une icône, mais sans recette ni file — Carrière et Puits n'ont encore aucun débouché
   utile de craft, décision explicite de montrer la structure plutôt que de les cacher.
   Détail : COMMENTAIRES_ORIGINAUX.md */

var WORKSHOPS_CONFIG = {
  // ===== Champs =====
  moulin: {
    buildingId: "farm", name: "Moulin", icon: "⚙️", active: true,
    recipes: [
      { id: "farine", inputs: [{ resourceId: "ble", quantity: 5 }], outputs: [{ resourceId: "farine", quantity: 1 }], craftTimeMs: 3000 }
    ]
  },
  boulangerie: {
    buildingId: "farm", name: "Boulangerie", icon: "🥖", active: true,
    recipes: [
      { id: "pain", inputs: [{ resourceId: "farine", quantity: 3 }, { resourceId: "eau", quantity: 5 }], outputs: [{ resourceId: "pain", quantity: 1 }], craftTimeMs: 5000 }
    ]
  },

  // ===== Chasse =====
  sechoir: {
    buildingId: "hunt", name: "Séchoir", icon: "🥩", active: true,
    recipes: [
      { id: "viande_sechee", inputs: [{ resourceId: "viande", quantity: 5 }], outputs: [{ resourceId: "viande_sechee", quantity: 1 }], craftTimeMs: 3000 }
    ]
  },
  cuisine_de_camp: {
    buildingId: "hunt", name: "Cuisine de camp", icon: "🎒", active: true,
    // v3.98.0 : 2 recettes au choix dans le même atelier (décision Seb) — la Ration
    // moyenne migre elle aussi vers Viande séchée pour rester cohérente avec la nouvelle
    // chaîne (ancienne recette : Viande brute ×10 + Pain ×1, voir COMMENTAIRES_ORIGINAUX.md).
    recipes: [
      { id: "petite_ration", inputs: [{ resourceId: "viande_sechee", quantity: 5 }, { resourceId: "eau", quantity: 2 }], outputs: [{ resourceId: "petite_ration", quantity: 1 }], craftTimeMs: 3000 },
      { id: "ration", inputs: [{ resourceId: "viande_sechee", quantity: 10 }, { resourceId: "pain", quantity: 1 }], outputs: [{ resourceId: "ration", quantity: 1 }], craftTimeMs: 8000 }
    ]
  },

  // ===== Scierie =====
  scierie_fine: {
    buildingId: "sawmill", name: "Scierie fine", icon: "🪚", active: true,
    recipes: [
      { id: "planche", inputs: [{ resourceId: "bois", quantity: 5 }], outputs: [{ resourceId: "planche", quantity: 1 }], craftTimeMs: 3000 }
    ]
  },
  menuiserie: {
    buildingId: "sawmill", name: "Menuiserie", icon: "🧰", active: false
  },

  // ===== Mine =====
  fonderie: {
    buildingId: "mine", name: "Fonderie", icon: "🔥", active: true,
    recipes: [
      { id: "lingot", inputs: [{ resourceId: "fer", quantity: 5 }], outputs: [{ resourceId: "lingot", quantity: 1 }], craftTimeMs: 3000 }
    ]
  },
  forge: {
    buildingId: "mine", name: "Forge", icon: "⚒️", active: false
  },

  // ===== Carrière =====
  tailleur_de_pierre: {
    buildingId: "quarry", name: "Tailleur de pierre", icon: "🔨", active: false
  },
  maconnerie: {
    buildingId: "quarry", name: "Maçonnerie", icon: "🏗️", active: false
  },

  // ===== Puits =====
  reservoir: {
    buildingId: "well", name: "Réservoir", icon: "🏺", active: false
  },
  station_purification: {
    buildingId: "well", name: "Station de purification", icon: "✨", active: false
  }
};

/* Liste des ateliers d'un bâtiment donné, dans l'ordre de définition ci-dessus. */
function getWorkshopsForBuilding(buildingId) {
  return Object.keys(WORKSHOPS_CONFIG)
    .filter(function (id) { return WORKSHOPS_CONFIG[id].buildingId === buildingId; })
    .map(function (id) { return Object.assign({ id: id }, WORKSHOPS_CONFIG[id]); });
}

window.WORKSHOPS_CONFIG = WORKSHOPS_CONFIG;
window.getWorkshopsForBuilding = getWorkshopsForBuilding;
