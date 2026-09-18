"use strict";
/* data/apothecary-recipes.js — v3.215.0 (lot V-4) : préparations de l'Apothicaire.

   PRINCIPE (règle de fusion du rapport du 11/09/2026) : le bâtiment n'enlève
   jamais rien. L'achat en or des potions reste disponible dans la Boutique ;
   l'Apothicaire AJOUTE une seconde voie, payée en ressources.

   v3.291.0 (équilibrage Forêt, décisions Seb) : LE NIVEAU DONNE LA CAPACITÉ, LA
   RECETTE SE GAGNE PAR COMMANDE.
   - `known: true` : acquise à la construction (Soin mineur).
   - `order` : ingrédients à livrer UNE fois depuis l'Entrepôt, dans la fiche du
     bâtiment ; la recette est alors acquise pour toujours (survit à l'Ascension).
     Coût ≈ cinq préparations de la potion : un petit chantier, pas un péage.
   - `worldIndex` : monde à atteindre pour que la commande apparaisse (1 = Désert).
   - `capped` : compte dans le plafond quotidien (APOTHECARY_DAILY_CAP_*). Le Soin
     mineur est libre, son coût en ressources suffit comme frein.

   Toutes les recettes partent de l'Eau purifiée (Station de purification, Puits).
   La fabrication est INSTANTANÉE. Logique : systems/apothecary-system.js. */

/* Préparations plafonnées par jour civil : 4 au niveau 1, +2 par niveau suivant
   (décision Seb) — 6 en Forêt (niveau 2), 14 au Désert (niveau 6). */
var APOTHECARY_DAILY_CAP_BASE = 4;
var APOTHECARY_DAILY_CAP_PER_LEVEL = 2;

var APOTHECARY_RECIPES = [
  {
    potionId: "potion_soin_mineur",
    kind: "healing",                 // HEALING_POTIONS_DB
    inputs: { eau_purifiee: 3, ble: 4 },
    known: true,
    capped: false
  },
  {
    potionId: "potion_soin_majeur",
    kind: "healing",
    inputs: { eau_purifiee: 6, pain: 2 },
    order: { pain: 8, eau_purifiee: 20 },
    worldIndex: 0,
    capped: true
  },
  {
    potionId: "potion_power",
    kind: "run",                     // POTIONS_DB (per-run)
    inputs: { eau_purifiee: 4, viande: 5 },
    order: { viande: 40, eau_purifiee: 15 },
    worldIndex: 0,
    capped: true
  },
  {
    potionId: "potion_celerity",
    kind: "run",
    inputs: { eau_purifiee: 4, farine: 3 },
    order: { farine: 20, eau_purifiee: 15 },
    worldIndex: 0,
    capped: true
  },
  /* Commandes du Désert : chiffres provisoires (ingrédients de la Forêt), à refaire
     avec les matériaux du Désert quand ils existeront. */
  {
    potionId: "potion_precision",
    kind: "run",
    inputs: { eau_purifiee: 5, viande_sechee: 4 },
    order: { viande_sechee: 25, eau_purifiee: 25 },
    worldIndex: 1,
    capped: true
  },
  {
    potionId: "potion_endurance",
    kind: "run",
    inputs: { eau_purifiee: 6, pain: 2, viande_sechee: 3 },
    order: { pain: 10, viande_sechee: 15, eau_purifiee: 30 },
    worldIndex: 1,
    capped: true
  }
];

window.APOTHECARY_RECIPES = APOTHECARY_RECIPES;
window.APOTHECARY_DAILY_CAP_BASE = APOTHECARY_DAILY_CAP_BASE;
window.APOTHECARY_DAILY_CAP_PER_LEVEL = APOTHECARY_DAILY_CAP_PER_LEVEL;
