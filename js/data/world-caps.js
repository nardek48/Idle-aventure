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
    // v3.316.0 (W-4b) : forge 2 -> 3, le palier de l'étape 13 se paie en Verre trempé.
    village: { workshop: 7, training: 9, hall: 7, warehouse: 6, palisade: 7, tavern: 5, apothecary: 6, forge: 3, enchanter: 1 },
    zoneRows: 2,
    zoneLevel: 5,
    workshopLevel: 3,
    petiteAventureCap: 4 // D10 : 4 au Désert — une seconde ressource exclusive (Verre des dunes)
  }
];

/* v3.325.0 (plan C-1, décision Seb 23/09/2026) — PLAFOND DU TERRAIN PAR ACTE.
   Le plafond par monde ouvrait 110 d'entraînement dès la première étape du Désert : deux
   joueurs au même point de l'Histoire pouvaient avoir 30 ou 110. Le Terrain d'entraînement
   est désormais plafonné aussi par l'acte atteint (étape de début d'acte, lue sur
   StoryQuestManager.isStepReached). Seules les entrées du plus haut monde atteint comptent ;
   un monde sans entrée n'a pas de plafond d'acte. Rien de déjà construit n'est repris. */
var TRAINING_CAP_BY_ACT = [
  { worldIndex: 0, stepId: "forest_01", act: "I", terrain: 0 },       // entraînement 20
  { worldIndex: 0, stepId: "forest_06", act: "II", terrain: 2 },      // 40
  { worldIndex: 0, stepId: "forest_crossing", act: "III", terrain: 4 }, // 60, acte IV compris
  { worldIndex: 1, stepId: "desert_01", act: "I", terrain: 5 },       // 70
  { worldIndex: 1, stepId: "desert_06", act: "II", terrain: 7 },      // 90
  { worldIndex: 1, stepId: "desert_11", act: "III", terrain: 9 }      // 110
];

/* v3.327.0 (conception Talents v1.1, T2 option B) — PLAFOND DE POINTS DE TALENT PAR ACTE.
   Même lecture que le Terrain : plus haut monde atteint, étape de début d'acte. Un monde sans
   entrée n'a pas de plafond. Valeurs provisoires, réglées au banc (lot T-3). */
var TALENT_CAP_BY_ACT = [
  { worldIndex: 0, stepId: "forest_01", act: "I", points: 0 },
  { worldIndex: 0, stepId: "forest_crossing", act: "III", points: 5 },  // acte IV compris
  { worldIndex: 1, stepId: "desert_01", act: "I", points: 7 },
  { worldIndex: 1, stepId: "desert_06", act: "II", points: 9 },
  { worldIndex: 1, stepId: "desert_11", act: "III", points: 11 }
];

/* « de la Forêt enchantée », « du Désert oublié » : pour « l'acte II du Désert oublié ». */
var WORLD_CAPS_DE = ["de la", "du", "des", "de la", "de la", "de la"];

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
    var cap = (!e || !e.village || typeof e.village[id] !== "number") ? Infinity : e.village[id];
    if (id === "training") cap = Math.min(cap, this.getTrainingActCap()); // v3.325.0
    return cap;
  },

  /* v3.325.0 : niveau de Terrain permis par l'acte atteint dans le plus haut monde atteint.
     Infinity si ce monde n'a pas d'entrée dans TRAINING_CAP_BY_ACT. */
  getTrainingActCap: function () {
    var world = this.getReachedWorldIndex(), cap = Infinity;
    var SQ = window.StoryQuestManager;
    TRAINING_CAP_BY_ACT.forEach(function (a) {
      if (a.worldIndex !== world) return;
      if (cap === Infinity) cap = a.terrain; // premier acte du monde : toujours permis
      if (SQ && typeof SQ.isStepReached === "function" && SQ.isStepReached(a.stepId)) cap = Math.max(cap === Infinity ? 0 : cap, a.terrain);
    });
    return cap;
  },

  /* v3.327.0 : points de talent permis par l'acte atteint (Infinity hors table). */
  getTalentActCap: function () {
    var world = this.getReachedWorldIndex(), cap = Infinity;
    var SQ = window.StoryQuestManager;
    TALENT_CAP_BY_ACT.forEach(function (a) {
      if (a.worldIndex !== world) return;
      if (cap === Infinity) cap = a.points; // premier acte du monde : toujours permis
      if (SQ && typeof SQ.isStepReached === "function" && SQ.isStepReached(a.stepId)) cap = Math.max(cap, a.points);
    });
    return cap;
  },

  /* v3.325.0 : où s'ouvre le niveau `level` d'un bâtiment. Pour le Terrain, le premier acte
     pas encore atteint qui l'ouvre (« à l'acte II du Désert oublié ») ; sinon le monde. */
  getCapOpening: function (id, level) {
    if (id === "training") {
      var SQ = window.StoryQuestManager, world = this.getReachedWorldIndex();
      for (var i = 0; i < TRAINING_CAP_BY_ACT.length; i++) {
        var a = TRAINING_CAP_BY_ACT[i];
        if (a.worldIndex < world || a.terrain < level) continue;
        if (a.worldIndex === world && SQ && SQ.isStepReached(a.stepId)) continue;
        var w = (typeof WORLDS !== "undefined") ? WORLDS[a.worldIndex] : null;
        if (w) return "à l'acte " + a.act + " " + (WORLD_CAPS_DE[a.worldIndex] || "de") + " " + w.name;
      }
    }
    return this.getWorldOpening(id, level);
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
window.TRAINING_CAP_BY_ACT = TRAINING_CAP_BY_ACT;
window.TALENT_CAP_BY_ACT = TALENT_CAP_BY_ACT;
window.WorldCaps = WorldCaps;
