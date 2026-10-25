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

   Toutes les recettes partent de l'Eau du Puits (v3.484.0, lot S : l'Eau purifiée est
   retirée, 1 Eau purifiée = 4 Eaux, 1 Farine = 5 Blés, 1 Viande séchée = 5 Viandes).
   La fabrication est INSTANTANÉE. Logique : systems/apothecary-system.js. */

/* Préparations plafonnées par jour civil : 4 au niveau 1, +2 par niveau suivant
   (décision Seb) — 6 en Forêt (niveau 2), 14 au Désert (niveau 6). */
var APOTHECARY_DAILY_CAP_BASE = 4;
var APOTHECARY_DAILY_CAP_PER_LEVEL = 2;

var APOTHECARY_RECIPES = [
  {
    potionId: "potion_soin_mineur",
    kind: "healing",                 // HEALING_POTIONS_DB
    inputs: { eau: 12, ble: 4 },
    known: true,
    capped: false
  },
  {
    potionId: "potion_soin_majeur",
    kind: "healing",
    inputs: { eau: 24, pain: 2 },
    order: { pain: 8, eau: 80 },
    worldIndex: 0,
    capped: true
  },
  {
    potionId: "potion_power",
    kind: "run",                     // POTIONS_DB (per-run)
    inputs: { eau: 16, viande: 5 },
    order: { viande: 40, eau: 60 },
    worldIndex: 0,
    capped: true
  },
  {
    potionId: "potion_celerity",
    kind: "run",
    inputs: { eau: 16, ble: 15 },
    order: { ble: 100, eau: 60 },
    worldIndex: 0,
    capped: true
  },
  /* Commandes du Désert : chiffres provisoires (ingrédients de la Forêt), à refaire
     avec les matériaux du Désert quand ils existeront. */
  {
    potionId: "potion_precision",
    kind: "run",
    inputs: { eau: 20, viande: 20 },
    order: { viande: 125, eau: 100 },
    worldIndex: 1,
    capped: true
  },
  {
    potionId: "potion_endurance",
    kind: "run",
    inputs: { eau: 24, pain: 2, viande: 15 },
    order: { pain: 10, viande: 75, eau: 120 },
    worldIndex: 1,
    capped: true
  },
  /* v3.441.0 : objets de combat (data/combat-items.js), rangés dans l'Entrepôt. Prix : le double
     d'une potion à bonus (décision Seb) ; la commande s'ouvre avec le monde de leur trait. */
  { potionId: "baume_froid", kind: "item", inputs: { eau: 32, ble: 12 }, order: { ble: 80, eau: 120 }, worldIndex: 0, capped: true },
  { potionId: "encens_amer", kind: "item", inputs: { eau: 32, bois: 12 }, order: { bois: 80, eau: 120 }, worldIndex: 0, capped: true },
  { potionId: "huile_de_lame", kind: "item", inputs: { eau: 40, fer: 8 }, order: { fer: 60, eau: 200 }, worldIndex: 1, capped: true },
  { potionId: "sel_de_fer", kind: "item", inputs: { eau: 48, lingot: 4 }, order: { lingot: 24, eau: 240 }, worldIndex: 2, capped: true },
  // v3.443.0 : contre les coups annoncés (Troll, Arbre-mère, Ronce animée : dès la Forêt)
  { potionId: "acide_mordant", kind: "item", inputs: { eau: 32, pierre: 12 }, order: { pierre: 80, eau: 120 }, worldIndex: 0, capped: true },
  { potionId: "pastille_de_miel", kind: "item", inputs: { eau: 32, ble: 60 }, order: { ble: 400, eau: 120 }, worldIndex: 0, capped: true },
  // v3.442.0 : la Fiole noire, au Désert (mur de Nezzam) ; la Chitine la rend rare, elle revient si elle n'a pas servi
  { potionId: "fiole_noire", kind: "item", inputs: { eau: 48, chitine_profondeurs: 2 }, order: { chitine_profondeurs: 6, eau: 240 }, worldIndex: 1, capped: true }
];

// v3.363.0 (acte IV) : le puits du roi (choix « roi » = rapporter) ajoute 2 préparations par jour
var APOTHECARY_PUITS_ROI_BONUS = 2;
window.APOTHECARY_PUITS_ROI_BONUS = APOTHECARY_PUITS_ROI_BONUS;
window.APOTHECARY_RECIPES = APOTHECARY_RECIPES;
window.APOTHECARY_DAILY_CAP_BASE = APOTHECARY_DAILY_CAP_BASE;
window.APOTHECARY_DAILY_CAP_PER_LEVEL = APOTHECARY_DAILY_CAP_PER_LEVEL;
