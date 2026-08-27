"use strict";
/* data/recipes.js — artisanat : intrants Entrepôt -> produit, file FIFO (craftTimeMs/station). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var RECIPES = {
  planche: {
    id: "planche",
    label: "Planche",
    inputs: [{ resourceId: "bois", quantity: 5 }],
    outputs: [{ resourceId: "planche", quantity: 1 }],
    station: null,
    craftTimeMs: 3000,
    unlockLevel: 1
  },
  lingot: {
    id: "lingot",
    label: "Lingot",
    inputs: [{ resourceId: "fer", quantity: 5 }],
    outputs: [{ resourceId: "lingot", quantity: 1 }],
    station: null,
    craftTimeMs: 3000,
    unlockLevel: 1
  },
  farine: {
    id: "farine",
    label: "Farine",
    inputs: [{ resourceId: "ble", quantity: 5 }],
    outputs: [{ resourceId: "farine", quantity: 1 }],
    station: null,
    craftTimeMs: 3000,
    unlockLevel: 1
  },
  pain: {
    id: "pain",
    label: "Pain",
    inputs: [{ resourceId: "eau", quantity: 5 }, { resourceId: "farine", quantity: 3 }],
    outputs: [{ resourceId: "pain", quantity: 1 }],
    station: "workshop",
    craftTimeMs: 5000,
    unlockLevel: 1
  },
  ration: {
    id: "ration",
    label: "Ration moyenne",
    inputs: [{ resourceId: "viande", quantity: 10 }, { resourceId: "pain", quantity: 1 }],
    outputs: [{ resourceId: "ration", quantity: 1 }],
    station: "workshop",
    craftTimeMs: 8000,
    unlockLevel: 1
  },
  petite_ration: {
    id: "petite_ration",
    label: "Petite ration",
    // v3.91.0 : recette réorganisée pour casser le verrou circulaire Atelier<->Carrière
    // (la petite ration doit rester accessible dès le début, sans Atelier, pour financer
    // la 1ère expédition qui elle-même mène à la découverte de la Carrière).
    inputs: [{ resourceId: "viande", quantity: 5 }, { resourceId: "eau", quantity: 2 }],
    outputs: [{ resourceId: "petite_ration", quantity: 1 }],
    station: null,
    craftTimeMs: 3000,
    unlockLevel: 1
  }
};

var RECIPE_BY_INPUT = {}; // conservé pour compat (1ère recette trouvée par ressource) — préférer RECIPES_BY_INPUT (liste complète)
var RECIPES_BY_INPUT = {};
Object.keys(RECIPES).forEach(function (key) {
  var r = RECIPES[key];
  r.inputs.forEach(function (input) {
    if (!RECIPE_BY_INPUT[input.resourceId]) RECIPE_BY_INPUT[input.resourceId] = r;
    if (!RECIPES_BY_INPUT[input.resourceId]) RECIPES_BY_INPUT[input.resourceId] = [];
    RECIPES_BY_INPUT[input.resourceId].push(r);
  });
});

window.RECIPES = RECIPES;
window.RECIPE_BY_INPUT = RECIPE_BY_INPUT;
window.RECIPES_BY_INPUT = RECIPES_BY_INPUT;
