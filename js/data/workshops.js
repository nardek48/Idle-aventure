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
    buildingId: "farm", name: "Moulin", icon: "images/Icons/workshops/grain_mill.png", active: true,
    upgradeCostBase: { planche: 3, lingot: 2 },
    recipes: [
      { id: "farine", inputs: [{ resourceId: "ble", quantity: 5 }], outputs: [{ resourceId: "farine", quantity: 1 }], craftTimeMs: 3000 }
    ]
  },
  boulangerie: {
    buildingId: "farm", name: "Boulangerie", icon: "images/Icons/workshops/bakery.png", active: true,
    upgradeCostBase: { planche: 4, lingot: 3 },
    recipes: [
      { id: "pain", inputs: [{ resourceId: "farine", quantity: 3 }, { resourceId: "eau", quantity: 5 }], outputs: [{ resourceId: "pain", quantity: 1 }], craftTimeMs: 5000 }
    ]
  },

  // ===== Chasse =====
  sechoir: {
    buildingId: "hunt", name: "Séchoir", icon: "images/Icons/workshops/drying_rack.png", active: true,
    upgradeCostBase: { planche: 3, lingot: 2 },
    recipes: [
      { id: "viande_sechee", inputs: [{ resourceId: "viande", quantity: 5 }], outputs: [{ resourceId: "viande_sechee", quantity: 1 }], craftTimeMs: 3000 }
    ]
  },
  cuisine_de_camp: {
    buildingId: "hunt", name: "Cuisine de camp", icon: "images/Icons/workshops/camp_kitchen.png", active: true,
    upgradeCostBase: { planche: 4, lingot: 3 },
    // v3.107.13 : Ration moyenne restaurée sur viande séchée + pain (recette d'origine, retour arrière
    // du passage v3.106.0 sur viande+eau brutes — non voulu pour cette recette précise, décision Seb).
    // Petite ration reste sur viande+eau brutes (accessible dès le début de l'Acte II, décision confirmée).
    recipes: [
      { id: "petite_ration", inputs: [{ resourceId: "viande", quantity: 8 }, { resourceId: "eau", quantity: 4 }], outputs: [{ resourceId: "petite_ration", quantity: 1 }], craftTimeMs: 3000 },
      // v3.330.0 (E4) : 10 -> 3 viandes séchées — la ration moyenne devient les vivres du Désert
      { id: "ration", inputs: [{ resourceId: "viande_sechee", quantity: 3 }, { resourceId: "pain", quantity: 1 }], outputs: [{ resourceId: "ration", quantity: 1 }], craftTimeMs: 8000 },
      // v3.137.0 (option B validée Seb) : Grande ration = Ration moyenne + 3 Sève d'Aeswyn — escalade
      // visible sur la chaîne plutôt qu'un doublon des intrants de la Ration moyenne (option A).
      // Premier débouché de craft de la Sève (jusqu'ici uniquement l'offrande forest_15, ponctuelle).
      { id: "grande_ration", inputs: [{ resourceId: "ration", quantity: 1 }, { resourceId: "seve_aeswyn", quantity: 3 }], outputs: [{ resourceId: "grande_ration", quantity: 1 }], craftTimeMs: 12000 }
    ]
  },

  // ===== Scierie =====
  scierie_fine: {
    buildingId: "sawmill", name: "Scierie fine", icon: "images/Icons/workshops/fine_sawmill.png", active: true,
    upgradeCostBase: { planche: 3, lingot: 2 },
    recipes: [
      { id: "planche", inputs: [{ resourceId: "bois", quantity: 5 }], outputs: [{ resourceId: "planche", quantity: 1 }], craftTimeMs: 3000 }
    ]
  },
  /* v3.214.0 (lot V-3) : premier atelier de tier 2 activé. Il ne fabrique pas
     une ressource de plus à vendre : il transforme le matériau rare d'un monde
     (Sève d'Aeswyn, Petites Aventures et élites) en matériau de construction.
     C'est ce qui donne enfin une raison d'exister aux ateliers restés inactifs
     depuis la v3.98.0 — un par monde, activé avec son matériau. */
  menuiserie: {
    buildingId: "sawmill", name: "Menuiserie", icon: "images/Icons/workshops/carpentry.png", active: true,
    upgradeCostBase: { planche: 4, lingot: 3 },
    recipes: [
      { id: "resine_durcie", inputs: [{ resourceId: "seve_aeswyn", quantity: 2 }, { resourceId: "planche", quantity: 3 }], outputs: [{ resourceId: "resine_durcie", quantity: 1 }], craftTimeMs: 9000 }
    ]
  },

  // ===== Mine =====
  fonderie: {
    buildingId: "mine", name: "Fonderie", icon: "images/Icons/workshops/smelter.png", active: true,
    upgradeCostBase: { planche: 3, lingot: 2 },
    recipes: [
      { id: "lingot", inputs: [{ resourceId: "fer", quantity: 5 }], outputs: [{ resourceId: "lingot", quantity: 1 }], craftTimeMs: 3000 }
    ]
  },
  /* v3.221.0 (lot V-8) : troisième atelier de tier 2 activé, pour alimenter la
     reforge d'équipement du bâtiment Forge du village. */
  forge: {
    buildingId: "mine", name: "Forge", icon: "images/Icons/workshops/smithing_station.png", active: true,
    upgradeCostBase: { planche: 4, lingot: 4 },
    recipes: [
      { id: "acier", inputs: [{ resourceId: "lingot", quantity: 3 }, { resourceId: "bois", quantity: 6 }], outputs: [{ resourceId: "acier", quantity: 1 }], craftTimeMs: 8000 }
    ]
  },

  // ===== Carrière =====
  /* v3.312.0 (W-3c, acte II étape 9) : s'ouvre avec « Le verre des dunes ». Quantités provisoires. */
  tailleur_de_pierre: {
    buildingId: "quarry", name: "Tailleur de pierre", icon: "images/Icons/workshops/stonemason.png",
    openAtStoryStep: "desert_09",
    upgradeCostBase: { planche: 4, lingot: 3 },
    recipes: [
      { id: "verre_trempe", inputs: [{ resourceId: "verre_des_dunes", quantity: 2 }, { resourceId: "pierre", quantity: 10 }],
        outputs: [{ resourceId: "verre_trempe", quantity: 1 }], craftTimeMs: 30000, firstCraftFlag: "verreTrempe" }
    ]
  },
  /* v3.330.0 (économie du village, décision E3 de Seb) : la Maçonnerie s'ouvre à l'arrivée au
     Désert. Le Bloc taillé absorbe la pierre et le fer qui débordaient, et remplace la moitié
     des planches dans les paliers du Désert (data/village-buildings.js). */
  maconnerie: {
    buildingId: "quarry", name: "Maçonnerie", icon: "images/Icons/workshops/masonry.png",
    openAtStoryStep: "desert_01",
    upgradeCostBase: { planche: 3, lingot: 2 },
    recipes: [
      { id: "bloc", inputs: [{ resourceId: "pierre", quantity: 6 }, { resourceId: "fer", quantity: 2 }], outputs: [{ resourceId: "bloc", quantity: 1 }], craftTimeMs: 4000 }
    ]
  },

  // ===== Puits =====
  /* v3.215.0 (lot V-4) : le Réservoir restait inactif, faute d'une vraie raison d'exister.
     v3.303.0 (W-2, Désert D3) : la voilà — il remplit les Outres emportées au Désert. Il
     s'ouvre avec l'étape « L'outre » du chapitre 2 (openAtStoryStep, lu par le getter
     `active` posé en bas de ce fichier) ; avant, il reste « Bientôt ». Quantités provisoires. */
  reservoir: {
    buildingId: "well", name: "Réservoir", icon: "images/Icons/workshops/water_reservoir.png",
    openAtStoryStep: "desert_03",
    upgradeCostBase: { planche: 3, lingot: 2 },
    recipes: [
      { id: "outre_pleine", inputs: [{ resourceId: "eau_purifiee", quantity: 4 }, { resourceId: "viande", quantity: 2 }],
        outputs: [{ resourceId: "outre_pleine", quantity: 1 }], craftTimeMs: 20000, firstCraftFlag: "outreFilled" }
    ]
  },
  station_purification: {
    buildingId: "well", name: "Station de purification", icon: "images/Icons/workshops/purification_station.png", active: true,
    upgradeCostBase: { planche: 3, lingot: 2 },
    recipes: [
      { id: "eau_purifiee", inputs: [{ resourceId: "eau", quantity: 4 }], outputs: [{ resourceId: "eau_purifiee", quantity: 1 }], craftTimeMs: 4000 }
    ]
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

/* v3.303.0 : atelier ouvert par une étape d'Histoire. `active` devient une lecture : vrai dès
   que l'étape existe ET qu'elle est atteinte (StoryQuestManager.isStepReached). Une étape qui
   n'existe pas encore garde l'atelier fermé. Tous les lecteurs de def.active suivent sans
   modification (système d'ateliers, vue Production). */
Object.keys(WORKSHOPS_CONFIG).forEach(function (id) {
  var def = WORKSHOPS_CONFIG[id];
  if (!def.openAtStoryStep) return;
  Object.defineProperty(def, "active", {
    enumerable: true,
    get: function () {
      var q = window.STORY_QUESTS;
      if (!q || !window.StoryQuestManager) return false;
      var exists = Object.keys(q).some(function (c) { return q[c].steps.some(function (s) { return s.id === def.openAtStoryStep; }); });
      return exists && StoryQuestManager.isStepReached(def.openAtStoryStep);
    }
  });
});
