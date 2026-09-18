"use strict";
/* data/world-caps.js — v3.289.0 : PLAFONDS PAR MONDE du village et de la production.
   Conception Désert v1.3, §11 (décisions D11/D12, 17-18/09/2026).

   RÈGLES :
   - Le plafond se lit sur le PLUS HAUT monde jamais atteint (game.worldsEverReached,
     ou le monde courant s'il est plus haut), jamais sur le monde courant seul : une
     Ascension ou un voyage retour ne referme rien.
   - Un niveau déjà construit n'est jamais repris : le plafond ne vaut que pour les
     achats à venir.
   - Un index de monde absent de la table = pas de plafond (le max propre à l'objet).
   Les plafonds des mondes 3 et suivants seront fixés quand ces mondes seront travaillés.

   Lu par : VillageBuildingManager, ProductionPlotsSystem, WorkshopsSystem. */

var WORLD_CAPS = [
  /* 0 — Forêt enchantée */
  {
    village: { workshop: 4, training: 4, hall: 4, warehouse: 3, palisade: 3, tavern: 2, apothecary: 2, forge: 0, enchanter: 0 },
    zoneRows: 1,      // lignes de la grille 3×3 ouvrables (1 ligne = 3 zones)
    zoneLevel: 3,     // niveau max d'une zone
    workshopLevel: 2, // niveau max d'un atelier (« L'atelier bien huilé » exige 2)
    petiteAventureCap: 3 // v3.298.0 (D10) : Petites Aventures par jour civil, partagées entre canevas
  },
  /* 1 — Désert oublié */
  {
    village: { workshop: 7, training: 9, hall: 7, warehouse: 6, palisade: 7, tavern: 5, apothecary: 6, forge: 2, enchanter: 1 },
    zoneRows: 2,
    zoneLevel: 5,
    workshopLevel: 3,
    petiteAventureCap: 4 // D10 : 4 au Désert — une seconde ressource exclusive (Verre des dunes)
  }
];

/* Préposition devant chaque nom de monde : « s'ouvre au Désert », « aux Ruines ». */
var WORLD_CAPS_PREP = ["à la", "au", "aux", "à la", "à la", "à la"];

var WorldCaps = {
  /* « au Désert oublié », « aux Ruines anciennes » — index de monde -> texte prêt à lire. */
  withPrep: function (index) {
    var w = (typeof WORLDS !== "undefined") ? WORLDS[index] : null;
    if (!w) return "dans un prochain monde";
    return (WORLD_CAPS_PREP[index] || "à") + " " + w.name;
  },

  /* Plus haut monde atteint — même lecture que l'échoppe (getEquipShopWorldPriceMult). */
  getReachedWorldIndex: function () {
    var max = 0;
    var reached = (typeof game !== "undefined" && game.worldsEverReached && typeof game.worldsEverReached === "object")
      ? game.worldsEverReached : {};
    Object.keys(reached).forEach(function (k) {
      var idx = Number(k);
      if (reached[k] && idx > max) max = idx;
    });
    if (window.WorldManager && Number(WorldManager.worldIndex || 0) > max) max = Number(WorldManager.worldIndex || 0);
    return max;
  },

  /* Entrée de table du monde atteint, ou null au-delà de la table (aucun plafond). */
  getEntry: function () {
    return WORLD_CAPS[this.getReachedWorldIndex()] || null;
  },

  /* Plafond d'un bâtiment du village (Infinity si non plafonné). */
  getVillageCap: function (id) {
    var e = this.getEntry();
    if (!e || !e.village || typeof e.village[id] !== "number") return Infinity;
    return e.village[id];
  },

  getZoneRows: function () { var e = this.getEntry(); return e ? e.zoneRows : Infinity; },
  getZoneLevel: function () { var e = this.getEntry(); return e ? e.zoneLevel : Infinity; },
  getWorkshopLevel: function () { var e = this.getEntry(); return e ? e.workshopLevel : Infinity; },
  /* v3.298.0 : null au-delà de la table — SceneRunManager retombe alors sur sa valeur de base. */
  getPetiteAventureCap: function () { var e = this.getEntry(); return (e && typeof e.petiteAventureCap === "number") ? e.petiteAventureCap : null; },

  /* Premier monde dont la table ouvre au moins `level` pour ce bâtiment, avec sa
     préposition (« au Désert oublié ») : jamais de plafond muet. Au-delà de la table,
     le monde suivant le dernier plafonné. */
  getWorldOpening: function (id, level) {
    for (var i = 0; i < WORLD_CAPS.length; i++) {
      var cap = WORLD_CAPS[i].village && WORLD_CAPS[i].village[id];
      if (typeof cap !== "number" || cap >= level) return this.withPrep(i);
    }
    return this.withPrep(WORLD_CAPS.length);
  }
};

window.WORLD_CAPS = WORLD_CAPS;
window.WorldCaps = WorldCaps;
