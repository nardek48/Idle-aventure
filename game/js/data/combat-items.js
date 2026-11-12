"use strict";
/* data/combat-items.js — v3.441.0 : OBJETS DE COMBAT (décisions Seb, docs/pistes-combat.md).
   Préparations de l'Apothicaire (recettes : data/apothecary-recipes.js), rangées dans l'Entrepôt
   comme les rations : leur stock est déjà sauvegardé. Une place par sortie, deux à l'Apothicaire
   niveau 4. Chacun tient un trait ennemi avec les chiffres du contre d'une règle du Grimoire,
   posé seul et reposé quand il retombe. Logique : systems/combat-item-system.js.
   Icônes à dessiner : le chemin définitif est gardé, l'icône générique s'affiche en attendant. */

var COMBAT_ITEM_SLOTS_BASE = 1;

/* v3.776.0 (simplification, Seb 12/11) : les 8 objets contre les traits sont retirés (le Grimoire contre les traits) ;
   seule la Fiole noire reste, jusqu'aux Bénédictions de la faille. Une place par sortie. */
var COMBAT_ITEMS = {
  /* v3.442.0 : objet à contrepartie (besace des Petites Aventures). Rendue si elle n'a pas servi. */
  fiole_noire: {
    id: "fiole_noire", name: "Fiole noire", trait: null, returnIfUnused: true,
    icon: "images/Icons/scene/items/item_black_vial.webp",   // la Fiole de la besace des Petites Aventures : même objet, même image
    desc: "À 0 PV, tu te relèves avec 40 % des PV, une fois par sortie.",
    con: "Si elle sert : butin de la sortie divisé par deux, or de fin de donjon aussi. Rendue si elle n'a pas servi."
  }
};
var COMBAT_ITEM_ORDER = ["fiole_noire"];
var COMBAT_ITEM_FIOLE_HP_PCT = 0.40;
var COMBAT_ITEM_FIOLE_LOOT_MULT = 0.5;   // v3.449.2 : aussi sur l'or de fin de donjon (dungeon-system.js)

/* Rangés dans l'Entrepôt (fabriqués, plafond 999 comme les rations) : ni caravane ni vente. */
COMBAT_ITEM_ORDER.forEach(function (id) {
  var it = COMBAT_ITEMS[id];
  WAREHOUSE_RESOURCES[id] = { id: id, name: it.name, icon: it.icon, desc: it.desc + (it.con ? " " + it.con : ""), sellPrice: 0, tier: "crafted", cap: 999 };
});

window.COMBAT_ITEMS = COMBAT_ITEMS;
window.COMBAT_ITEM_ORDER = COMBAT_ITEM_ORDER;
window.COMBAT_ITEM_SLOTS_BASE = COMBAT_ITEM_SLOTS_BASE;
window.COMBAT_ITEM_FIOLE_HP_PCT = COMBAT_ITEM_FIOLE_HP_PCT;
window.COMBAT_ITEM_FIOLE_LOOT_MULT = COMBAT_ITEM_FIOLE_LOOT_MULT;
