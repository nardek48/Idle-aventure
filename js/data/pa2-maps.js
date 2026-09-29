"use strict";
/* data/pa2-maps.js — v3.381.0 (Petites Aventures v2, lot PA2-0) : tracés des cartes illustrées.
   Conception Petites Aventures v2 v1.1, décisions V3-V5 et Q9 : tracé FIXE par carte, contenu tiré
   à chaque run. Coordonnées en pixels de l'image (width × height), posées par détection des
   sentiers peints (densité de pixels « terre » autour du point) ; à ajuster à l'écran au lot PA2-1.

   Rangées : 0-2 acte I · 3 camp · 4-6 acte II · 7 seuil · 8 acte III · 9 destinations.
   Un nœud sans type reçoit le sien au tirage (PA2_NODE_WEIGHTS, data/pa2-content.js).
   links : nœud -> nœuds atteignables à la rangée suivante. dests : nœud -> destination. */

var PA2_MAPS = {
  foret_1: {
    id: "foret_1",
    worldId: "forest",
    image: "images/Maps/pa2/foret_1.jpg",
    width: 848,
    height: 1264,
    start: "S",
    nodes: {
      S:  { row: -1, x: 400, y: 1005, type: "depart" },
      L0: { row: 0, x: 299, y: 920 }, C0: { row: 0, x: 419, y: 925 }, R0: { row: 0, x: 560, y: 858 },
      L1: { row: 1, x: 178, y: 774 }, C1: { row: 1, x: 435, y: 813 }, R1: { row: 1, x: 702, y: 776 },
      L2: { row: 2, x: 232, y: 715 }, R2: { row: 2, x: 709, y: 672 },
      CAMP: { row: 3, x: 440, y: 690, type: "camp" },
      L4: { row: 4, x: 324, y: 654 }, C4: { row: 4, x: 405, y: 538 }, R4: { row: 4, x: 671, y: 556 },
      L5: { row: 5, x: 143, y: 516 }, C5: { row: 5, x: 403, y: 481 }, R5: { row: 5, x: 706, y: 493 },
      L6: { row: 6, x: 276, y: 474 }, R6: { row: 6, x: 595, y: 417 },
      SEUIL: { row: 7, x: 487, y: 372, type: "seuil" },       // le pont
      L8: { row: 8, x: 355, y: 302 }, C8: { row: 8, x: 383, y: 226 }, R8: { row: 8, x: 609, y: 304 },
      BOSS: { row: 9, x: 255, y: 125, type: "boss" },          // la colline aux rochers
      CLAIRIERE: { row: 9, x: 125, y: 275, type: "clairiere" }, // la cabane de l'ouest
      TERTRE: { row: 9, x: 665, y: 228, type: "tertre" }       // le cercle de pierres de l'est
    },
    links: {
      S: ["L0", "C0", "R0"],
      L0: ["L1", "C1"], C0: ["L1", "C1", "R1"], R0: ["C1", "R1"],
      L1: ["L2"], C1: ["L2", "R2"], R1: ["R2"],
      L2: ["CAMP"], R2: ["CAMP"],
      CAMP: ["L4", "C4", "R4"],
      L4: ["L5", "C5"], C4: ["L5", "C5", "R5"], R4: ["C5", "R5"],
      L5: ["L6"], C5: ["L6", "R6"], R5: ["R6"],
      L6: ["SEUIL"], R6: ["SEUIL"],
      SEUIL: ["L8", "C8", "R8"],
      L8: ["CLAIRIERE", "BOSS"], C8: ["BOSS", "TERTRE"], R8: ["TERTRE"]
    }
  }
};

/* Cartes proposées par monde (tirage au lancement). La carte du Désert viendra avec le lot PA2-5. */
var PA2_MAPS_BY_WORLD = {
  forest: ["foret_1"]
};

window.PA2_MAPS = PA2_MAPS;
window.PA2_MAPS_BY_WORLD = PA2_MAPS_BY_WORLD;
