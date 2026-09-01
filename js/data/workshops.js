"use strict";
/* data/workshops.js — v3.98.0 : ateliers de craft LOCAUX à chaque bâtiment de Production
   (6 bâtiments × 2 ateliers), remplace le craft générique de l'Entrepôt (RECIPES/
   game.craftQueue, voir data/recipes.js — supprimé). Chaque atelier a sa PROPRE file de
   craft indépendante (voir systems/workshops-system.js), persistée dans
   game.production[buildingId].workshops[workshopId] — même bloc opaque déjà traité par
   save-system.js pour game.production, donc aucune modification de ce fichier protégé.
   Certains ateliers sont marqués `active: false` ("bientôt") : visibles dans l'UI avec un
   nom et une icône, mais sans recette ni file — Carrière et Puits n'ont encore aucun débouché
   utile de craft, décision explicite de montrer la structure plutôt que de les cacher.

   v3.98.6 : niveau d'atelier (1 à 5), remplace le "niveau fixe" de v3.98.0 — décisions
   validées avec Seb :
   - Niveau INDÉPENDANT par atelier (Moulin et Boulangerie n'ont pas le même niveau,
     même s'ils sont tous deux dans "farm").
   - Chaque niveau améliore 2 choses à la fois :
     · Vitesse : craftTimeMs effectif = base × (1 - WORKSHOP_LEVEL_CONFIG.speedBonusPerLevel
       × (niveau-1)), linéaire, -8%/niveau -> -32% au niveau max (5).
     · Taille de file : le nombre d'entrées max en file = niveau actuel de l'atelier
       (remplace l'ancienne constante WORKSHOP_MAX_QUEUE_LENGTH globale, qui devient la
       valeur au niveau MAX plutôt qu'une limite fixe pour tous — voir workshops-system.js).
   - Coût en Planche + Lingot (ressources "tier 1 craftées" choisies par Seb plutôt que
     du brut, pour créer une dépendance inter-ateliers : améliorer suppose d'être passé
     par la Scierie fine et/ou la Fonderie). Accepté explicitement que la Scierie fine et
     la Fonderie paient en partie avec leur propre extrant (Planche/Lingot) — pas un
     problème pour Seb, contrairement à la règle "jamais la propre PRODUCTION BRUTE du
     bâtiment" qui s'applique elle aux zones (bois/blé/etc.), pas aux ressources craftées.
   - Multiplicateur de coût par niveau ×1.40, identique à PRODUCTION_PLOTS_SHARED.
     upgradeCostMultPerLevel (cohérence avec le système de zones déjà en place).
   Détail : COMMENTAIRES_ORIGINAUX.md */

var WORKSHOP_LEVEL_CONFIG = {
  maxLevel: 5,
  speedBonusPerLevel: 0.08,       // -8%/niveau, linéaire, sur craftTimeMs
  upgradeCostMultPerLevel: 1.40,  // identique à PRODUCTION_PLOTS_SHARED, même courbe
  upgradeCost: { resources: ["planche", "lingot"] }
};

var WORKSHOPS_CONFIG = {
  // ===== Champs =====
  moulin: {
    buildingId: "farm", name: "Moulin", icon: "⚙️", active: true,
    upgradeCostBase: { planche: 3, lingot: 2 },
    recipes: [
      { id: "farine", inputs: [{ resourceId: "ble", quantity: 5 }], outputs: [{ resourceId: "farine", quantity: 1 }], craftTimeMs: 3000 }
    ]
  },
  boulangerie: {
    buildingId: "farm", name: "Boulangerie", icon: "🥖", active: true,
    upgradeCostBase: { planche: 4, lingot: 3 },
    recipes: [
      { id: "pain", inputs: [{ resourceId: "farine", quantity: 3 }, { resourceId: "eau", quantity: 5 }], outputs: [{ resourceId: "pain", quantity: 1 }], craftTimeMs: 5000 }
    ]
  },

  // ===== Chasse =====
  sechoir: {
    buildingId: "hunt", name: "Séchoir", icon: "🥩", active: true,
    upgradeCostBase: { planche: 3, lingot: 2 },
    recipes: [
      { id: "viande_sechee", inputs: [{ resourceId: "viande", quantity: 5 }], outputs: [{ resourceId: "viande_sechee", quantity: 1 }], craftTimeMs: 3000 }
    ]
  },
  cuisine_de_camp: {
    buildingId: "hunt", name: "Cuisine de camp", icon: "🎒", active: true,
    upgradeCostBase: { planche: 4, lingot: 3 },
    // v3.107.13 : Ration moyenne restaurée sur viande séchée + pain (recette d'origine, retour arrière
    // du passage v3.106.0 sur viande+eau brutes — non voulu pour cette recette précise, décision Seb).
    // Petite ration reste sur viande+eau brutes (accessible dès le début de l'Acte II, décision confirmée).
    recipes: [
      { id: "petite_ration", inputs: [{ resourceId: "viande", quantity: 8 }, { resourceId: "eau", quantity: 4 }], outputs: [{ resourceId: "petite_ration", quantity: 1 }], craftTimeMs: 3000 },
      { id: "ration", inputs: [{ resourceId: "viande_sechee", quantity: 10 }, { resourceId: "pain", quantity: 1 }], outputs: [{ resourceId: "ration", quantity: 1 }], craftTimeMs: 8000 }
    ]
  },

  // ===== Scierie =====
  scierie_fine: {
    buildingId: "sawmill", name: "Scierie fine", icon: "🪚", active: true,
    upgradeCostBase: { planche: 3, lingot: 2 },
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
    upgradeCostBase: { planche: 3, lingot: 2 },
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

/* Coût pour faire passer l'atelier `workshopId` DE `level` À `level+1`. */
function getWorkshopUpgradeCost(workshopId, level) {
  var def = WORKSHOPS_CONFIG[workshopId];
  if (!def || !def.upgradeCostBase) return null;
  var mult = Math.pow(WORKSHOP_LEVEL_CONFIG.upgradeCostMultPerLevel, level - 1);
  var result = {};
  WORKSHOP_LEVEL_CONFIG.upgradeCost.resources.forEach(function (key) {
    result[key] = Math.floor(def.upgradeCostBase[key] * mult);
  });
  return result;
}

window.WORKSHOP_LEVEL_CONFIG = WORKSHOP_LEVEL_CONFIG;
window.WORKSHOPS_CONFIG = WORKSHOPS_CONFIG;
window.getWorkshopsForBuilding = getWorkshopsForBuilding;
window.getWorkshopUpgradeCost = getWorkshopUpgradeCost;
