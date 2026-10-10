"use strict";
/* data/combat-items.js — v3.441.0 : OBJETS DE COMBAT (décisions Seb, docs/pistes-combat.md).
   Préparations de l'Apothicaire (recettes : data/apothecary-recipes.js), rangées dans l'Entrepôt
   comme les rations : leur stock est déjà sauvegardé. Une place par sortie, deux à l'Apothicaire
   niveau 4. Chacun tient un trait ennemi avec les chiffres du contre d'une règle du Grimoire,
   posé seul et reposé quand il retombe. Logique : systems/combat-item-system.js.
   Icônes à dessiner : le chemin définitif est gardé, l'icône générique s'affiche en attendant. */

var COMBAT_ITEM_SLOTS_BASE = 1;
var COMBAT_ITEM_SECOND_SLOT_APOTHECARY_LEVEL = 4;
var COMBAT_ITEM_CORRUPTION_PURGE_STACKS = 3;   // l'Encens purge dès 3 charges (à caler au banc)

var COMBAT_ITEMS = {
  baume_froid: {
    id: "baume_froid", name: "Baume froid", trait: "enraged",
    icon: "images/Icons/combat_items/baume_froid.png",
    desc: "Contre l'Enragé : sa rage retombe de 20 points et reste figée 4 rounds, de nouveau à chaque fois."
  },
  encens_amer: {
    id: "encens_amer", name: "Encens amer", trait: "corrupted",
    icon: "images/Icons/combat_items/encens_amer.png",
    desc: "Contre le Corrupteur : sa corruption est purgée dès 3 charges."
  },
  huile_de_lame: {
    id: "huile_de_lame", name: "Huile de lame", trait: "armored",
    icon: "images/Icons/combat_items/huile_de_lame.png",
    desc: "Contre le Blindé : son armure se fissure (−5 % au lieu de −10 %), de nouveau tous les 4 rounds."
  },
  sel_de_fer: {
    id: "sel_de_fer", name: "Sel de fer", trait: "vampiric",
    icon: "images/Icons/combat_items/sel_de_fer.png",
    desc: "Contre le Vampirique : son vol de vie est bloqué, de nouveau tous les 4 rounds."
  },
  /* v3.442.0 : objet à contrepartie (besace des Petites Aventures). Rendue si elle n'a pas servi. */
  fiole_noire: {
    id: "fiole_noire", name: "Fiole noire", trait: null, returnIfUnused: true,
    icon: "images/Icons/scene/items/item_black_vial.png",   // la Fiole de la besace des Petites Aventures : même objet, même image
    desc: "À 0 PV, tu te relèves avec 40 % des PV, une fois par sortie.",
    con: "Si elle sert : butin de la sortie divisé par deux. Rendue si elle n'a pas servi."
  }
};
var COMBAT_ITEM_ORDER = ["baume_froid", "encens_amer", "huile_de_lame", "sel_de_fer", "fiole_noire"];
var COMBAT_ITEM_FIOLE_HP_PCT = 0.40;
var COMBAT_ITEM_FIOLE_LOOT_MULT = 0.5;

/* Rangés dans l'Entrepôt (fabriqués, plafond 999 comme les rations) : ni caravane ni vente. */
COMBAT_ITEM_ORDER.forEach(function (id) {
  var it = COMBAT_ITEMS[id];
  WAREHOUSE_RESOURCES[id] = { id: id, name: it.name, icon: it.icon, desc: it.desc + (it.con ? " " + it.con : ""), sellPrice: 0, tier: "crafted", cap: 999 };
});

window.COMBAT_ITEMS = COMBAT_ITEMS;
window.COMBAT_ITEM_ORDER = COMBAT_ITEM_ORDER;
window.COMBAT_ITEM_SLOTS_BASE = COMBAT_ITEM_SLOTS_BASE;
window.COMBAT_ITEM_SECOND_SLOT_APOTHECARY_LEVEL = COMBAT_ITEM_SECOND_SLOT_APOTHECARY_LEVEL;
window.COMBAT_ITEM_CORRUPTION_PURGE_STACKS = COMBAT_ITEM_CORRUPTION_PURGE_STACKS;
window.COMBAT_ITEM_FIOLE_HP_PCT = COMBAT_ITEM_FIOLE_HP_PCT;
window.COMBAT_ITEM_FIOLE_LOOT_MULT = COMBAT_ITEM_FIOLE_LOOT_MULT;
