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
    label: "Ration",
    inputs: [{ resourceId: "viande", quantity: 10 }, { resourceId: "pain", quantity: 1 }],
    outputs: [{ resourceId: "ration", quantity: 1 }],
    station: "workshop",
    craftTimeMs: 8000,
    unlockLevel: 1
  }
};

var RECIPE_BY_INPUT = {};
Object.keys(RECIPES).forEach(function (key) {
  var r = RECIPES[key];
  r.inputs.forEach(function (input) {
    RECIPE_BY_INPUT[input.resourceId] = r;
  });
});

window.RECIPES = RECIPES;
window.RECIPE_BY_INPUT = RECIPE_BY_INPUT;
