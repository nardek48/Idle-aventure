"use strict";
/* ============================================================
Aethervale — data/recipes.js
v3.35 : premier palier d'artisanat (tier 1) — Bois → Planche,
Fer → Lingot. Craft instantané au clic, consomme DIRECTEMENT le
stock de l'Entrepôt (game.resources via WarehouseManager), sans
étape de retrait intermédiaire. Pas de bâtiment Atelier ni de
recette croisée (plusieurs ressources en entrée) pour l'instant.

v3.36 : Blé → Farine ajouté, même format exact.

`station` (toujours null ici) : prévu pour conditionner plus tard
une recette à un bâtiment (ex. futur Atelier) sans casser ce schéma
— non exploité par la logique actuelle (voir WarehouseManager.craft()
en systems/warehouse-system.js, qui ignore ce champ pour l'instant).

`craftTimeMs` : prévu pour un futur temps de craft asynchrone/file
d'attente — non utilisé non plus, le craft reste instantané en V1.
============================================================ */
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
  }
};

/* Index inverse : resourceId brut -> recette qui le consomme.
   Permet à ui/warehouse-view.js de savoir en O(1) si la ressource
   sélectionnée (Bois, Fer) a une recette à afficher, sans boucler sur
   RECIPES à chaque rendu. Un seul niveau (pas de recette croisée
   multi-sources en V1) donc pas d'ambiguïté possible ici. */
var RECIPE_BY_INPUT = {};
Object.keys(RECIPES).forEach(function (key) {
  var r = RECIPES[key];
  r.inputs.forEach(function (input) {
    RECIPE_BY_INPUT[input.resourceId] = r;
  });
});

window.RECIPES = RECIPES;
window.RECIPE_BY_INPUT = RECIPE_BY_INPUT;
