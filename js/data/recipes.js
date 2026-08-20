"use strict";
/* ============================================================
Aethervale — data/recipes.js
v3.35 : premier palier d'artisanat (tier 1) — Bois → Planche,
Fer → Lingot. Consomme le stock de l'Entrepôt (game.resources via
WarehouseManager), sans étape de retrait intermédiaire. Pas de
recette croisée (plusieurs ressources en entrée) pour l'instant.

v3.36 : Blé → Farine ajouté, même format exact.

v3.43 : craftTimeMs et station sont désormais ACTIFS (voir
WarehouseManager.enqueueCraft()/tickCraftQueue()/canCraft() en
systems/warehouse-system.js) — le craft passe par une file d'attente
FIFO au lieu d'être instantané. Les 3 recettes ci-dessous gardent
station: null (délibéré : elles doivent rester accessibles avant même
que l'Atelier existe, l'étape 2 de la chaîne de déblocage — "Fabriquer
5 Planches" — doit pouvoir se terminer AVANT l'étape 4 — "Construire
le niveau 1 de l'Atelier", voir data/workshop-unlock.js).

v3.45 : Pain et Ration — premières recettes CROISÉES (plusieurs
intrants différents) et premières à utiliser station: "workshop"
(exige ConstructionManager niveau >= 1, voir canCraft()). `inputs` est
déjà un TABLEAU depuis le début (pas un objet à clé unique) — aucune
extension de schéma nécessaire, la logique de craft (canCraft/
enqueueCraft/cancelCraft/refundAndClearCraftQueue, toutes basées sur
recipe.inputs.forEach/.every) fonctionnait déjà pour N intrants sans
modification. Seule ui/warehouse-view.js lisait en dur inputs[0]
(limitation d'AFFICHAGE des recettes à un seul intrant, pas du
schéma) — généralisé à cette occasion.
Prix/délais choisis pour rester sous la règle anti-arbitrage déjà en
place (vente séparée des intrants > vente du produit fini) :
  Pain    : 5 Eau (5 or) + 3 Farine (21 or) = 26 or bruts -> vendu 19 or
  Ration  : 10 Viande (30 or) + 1 Pain (19 or) = 49 or bruts -> vendu 36 or
craftTimeMs plus long que les recettes single-input (5000/8000 ms
contre 3000 ms) pour refléter la complexité croissante (2 intrants,
puis 2 intrants dont un déjà transformé). */
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

/* Index inverse : resourceId brut -> recette qui le consomme.
   Permet à ui/warehouse-view.js de savoir en O(1) si la ressource
   sélectionnée (Bois, Fer) a une recette à afficher, sans boucler sur
   RECIPES à chaque rendu.
   v3.45 : avec Pain (2 intrants) et Ration (dont Pain, déjà output
   d'une autre recette), cet index reste un mapping resourceId -> UNE
   SEULE recette (dernier assignant gagne en cas de collision). Aucune
   collision réelle à ce jour (Eau/Farine ne sont consommées que par
   Pain ; Pain n'est consommé que par Ration) mais c'est une
   limitation d'architecture à garder en tête si une ressource devient
   un jour l'intrant de DEUX recettes différentes — pas un problème
   pour cette session. */
var RECIPE_BY_INPUT = {};
Object.keys(RECIPES).forEach(function (key) {
  var r = RECIPES[key];
  r.inputs.forEach(function (input) {
    RECIPE_BY_INPUT[input.resourceId] = r;
  });
});

window.RECIPES = RECIPES;
window.RECIPE_BY_INPUT = RECIPE_BY_INPUT;
