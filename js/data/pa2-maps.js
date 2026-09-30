"use strict";
/* data/pa2-maps.js — v3.381.0 (Petites Aventures v2, lot PA2-0) : tracés des cartes illustrées.
   Conception Petites Aventures v2 v1.1, décisions V3-V5 et Q9 : tracé FIXE par carte, contenu tiré
   à chaque run. Coordonnées en pixels de l'image (width × height), posées par détection des
   sentiers peints (densité de pixels « terre » autour du point) ; à ajuster à l'écran au lot PA2-1.

   Rangées (foret_1) : 0-2 acte I · 3 camp · 4-6 acte II · 7 seuil · 8 acte III · 9 destinations.
   v3.386.0 : un tracé peut déclarer les siennes (rows: { camp, seuil, dest }), voir foret_2.
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
  },
  /* v3.386.0 (PA2-4, E1) : deuxième carte de la Forêt (image de Seb 29/09/2026, recadrée sur la
     zone jouable). Plus longue : 3 rangées à l'acte I, 4 à l'acte II, 2 à l'acte III, soit 12
     nœuds joués. Au seuil (le pont), on choisit sa fin : le col à l'ouest (gardien), le lac au
     nord (clairière), le fort à l'est (tertre). Positions posées sur les sentiers peints. */
  foret_2: {
    id: "foret_2",
    worldId: "forest",
    image: "images/Maps/pa2/foret_2.jpg",
    width: 1024,
    height: 1461,
    start: "S",
    rows: { camp: 3, seuil: 8, dest: 11 },
    nodes: {
      S: { row: -1, x: 444, y: 1272, type: "depart" },
      L0: { row: 0, x: 354, y: 1205 },
      C0: { row: 0, x: 504, y: 1152 },
      R0: { row: 0, x: 617, y: 1129 },
      L1: { row: 1, x: 230, y: 1077 },
      C1: { row: 1, x: 520, y: 1024 },
      R1: { row: 1, x: 727, y: 1035 },
      L2: { row: 2, x: 132, y: 1001 },
      C2: { row: 2, x: 493, y: 919 },
      R2: { row: 2, x: 840, y: 983 },
      CAMP: { row: 3, x: 437, y: 828, type: "camp" },
      L4: { row: 4, x: 230, y: 745 },
      C4: { row: 4, x: 497, y: 757 },
      R4: { row: 4, x: 934, y: 892 },
      L5: { row: 5, x: 177, y: 629 },
      C5: { row: 5, x: 478, y: 625 },
      R5: { row: 5, x: 919, y: 738 },
      L6: { row: 6, x: 207, y: 501 },
      C6: { row: 6, x: 489, y: 546 },
      R6: { row: 6, x: 885, y: 584 },
      L7: { row: 7, x: 184, y: 388 },
      C7: { row: 7, x: 410, y: 425 },
      R7: { row: 7, x: 945, y: 437 },
      SEUIL: { row: 8, x: 600, y: 318, type: "seuil" },
      W9: { row: 9, x: 312, y: 346 },
      N9: { row: 9, x: 523, y: 230 },
      E9: { row: 9, x: 734, y: 309 },
      W10: { row: 10, x: 203, y: 297, type: "source" },   // la source du col, avant le gardien
      N10: { row: 10, x: 505, y: 148, type: "trouvaille" }, // la rive du lac
      E10: { row: 10, x: 802, y: 218, type: "obstacle" },  // la montée au fort
      BOSS: { row: 11, x: 90, y: 233, type: "boss" },
      CLAIRIERE: { row: 11, x: 497, y: 64, type: "clairiere" },
      TERTRE: { row: 11, x: 858, y: 94, type: "tertre" }
    },
    links: {
      S: ["L0", "C0", "R0"],
      L0: ["L1", "C1"], C0: ["L1", "C1", "R1"], R0: ["C1", "R1"],
      L1: ["L2", "C2"], C1: ["L2", "C2", "R2"], R1: ["C2", "R2"],
      L2: ["CAMP"], C2: ["CAMP"], R2: ["CAMP"],
      CAMP: ["L4", "C4", "R4"],
      L4: ["L5", "C5"], C4: ["L5", "C5", "R5"], R4: ["C5", "R5"],
      L5: ["L6", "C6"], C5: ["L6", "C6", "R6"], R5: ["C6", "R6"],
      L6: ["L7", "C7"], C6: ["L7", "C7", "R7"], R6: ["C7", "R7"],
      L7: ["SEUIL"], C7: ["SEUIL"], R7: ["SEUIL"],
      SEUIL: ["W9", "N9", "E9"],
      W9: ["W10"], N9: ["N10"], E9: ["E10"],
      W10: ["BOSS"], N10: ["CLAIRIERE"], E10: ["TERTRE"]
    }
  },
  /* v3.387.0 (PA2-5, F1) : la carte du Désert (image de Seb, même format que foret_1). Même
     structure : le camp à l'oasis du canyon, le seuil au pont de l'oued. Au nord : le plateau
     (gardien), le campement de tentes (fin sans combat), les colonnes ensablées (coffre scellé). */
  desert_1: {
    id: "desert_1",
    worldId: "desert",
    image: "images/Maps/pa2/desert_1.jpg",
    width: 848,
    height: 1264,
    start: "S",
    tune: { foeMult: 0.85 }, // v3.387.0 : ennemis du Désert adoucis (banc : KO 11 / 23 / 24 % avant)
    nodes: {
      S: { row: -1, x: 395, y: 1025, type: "depart" },
      L0: { row: 0, x: 300, y: 965 }, C0: { row: 0, x: 405, y: 925 }, R0: { row: 0, x: 560, y: 955 },
      L1: { row: 1, x: 215, y: 860 }, C1: { row: 1, x: 395, y: 835 }, R1: { row: 1, x: 690, y: 875 },
      L2: { row: 2, x: 250, y: 760 }, R2: { row: 2, x: 640, y: 770 },
      CAMP: { row: 3, x: 435, y: 700, type: "camp" }, // l'oasis au creux du canyon
      L4: { row: 4, x: 310, y: 650 }, C4: { row: 4, x: 410, y: 590 }, R4: { row: 4, x: 655, y: 665 },
      L5: { row: 5, x: 150, y: 560 }, C5: { row: 5, x: 355, y: 530 }, R5: { row: 5, x: 640, y: 520 },
      L6: { row: 6, x: 300, y: 440 }, R6: { row: 6, x: 590, y: 425 },
      SEUIL: { row: 7, x: 485, y: 375, type: "seuil" }, // le pont sur l'oued
      L8: { row: 8, x: 370, y: 320 }, C8: { row: 8, x: 330, y: 195 }, R8: { row: 8, x: 600, y: 320 },
      BOSS: { row: 9, x: 255, y: 95, type: "boss" }, // le plateau du nord
      CLAIRIERE: { row: 9, x: 125, y: 280, type: "clairiere" }, // le campement de tentes
      TERTRE: { row: 9, x: 660, y: 225, type: "tertre" } // les colonnes du nord-est
    },
    links: {
      S: ["L0", "C0", "R0"],
      L0: ["L1", "C1"],
      C0: ["L1", "C1", "R1"],
      R0: ["C1", "R1"],
      L1: ["L2"],
      C1: ["L2", "R2"],
      R1: ["R2"],
      L2: ["CAMP"],
      R2: ["CAMP"],
      CAMP: ["L4", "C4", "R4"],
      L4: ["L5", "C5"],
      C4: ["L5", "C5", "R5"],
      R4: ["C5", "R5"],
      L5: ["L6"],
      C5: ["L6", "R6"],
      R5: ["R6"],
      L6: ["SEUIL"],
      R6: ["SEUIL"],
      SEUIL: ["L8", "C8", "R8"],
      L8: ["CLAIRIERE", "BOSS"],
      C8: ["BOSS", "CLAIRIERE"],
      R8: ["TERTRE"]
    }
  }
};

/* Cartes proposées par monde (tirage au lancement). */
var PA2_MAPS_BY_WORLD = {
  forest: ["foret_1", "foret_2"], // v3.386.0 : tirée au lancement, comme l'accroche
  desert: ["desert_1"]             // v3.387.0 (PA2-5)
};

/* v3.390.0 (chantier P, lot P-2) : fonds illustrés des parcours (images de Seb du 29/09/2026).
   Chaque fond déclare ses pistes : des points posés sur le chemin peint, du sud vers le nord.
   Un canevas les choisit par template.parcours = { image, track, points: [indices] }. */
var PA2_PARCOURS_IMAGES = {
  foret_quetes: {
    image: "images/Maps/parcours/foret_quetes.jpg", width: 1024, height: 1536, start: [512, 1245],
    tracks: { sentier: [[460, 1160], [505, 1015], [440, 870], [495, 720], [460, 590], [485, 480], [585, 455], [530, 320], [515, 210]] }
  },
  desert_route: {
    image: "images/Maps/parcours/desert_route.jpg", width: 1024, height: 1536, start: [520, 1270],
    tracks: {
      route: [[520, 1150], [560, 1000], [560, 860], [575, 700], [540, 560], [470, 420], [520, 260]], // la piste de sable
      oued: [[760, 1180], [700, 1030], [640, 880], [690, 730], [640, 560], [600, 400], [560, 260]]    // le lit asséché
    }
  },
  // v3.392.0 : du village au pied du Temple ensablé, la piste jusqu'aux marches de la porte
  desert_temple: {
    image: "images/Maps/parcours/desert_temple.jpg", width: 1024, height: 1536, start: [528, 1290],
    tracks: { allee: [[546, 1140], [590, 880], [505, 710], [545, 590], [465, 460], [528, 318], [540, 215]] }
  }
};

window.PA2_MAPS = PA2_MAPS;
window.PA2_PARCOURS_IMAGES = PA2_PARCOURS_IMAGES;
window.PA2_MAPS_BY_WORLD = PA2_MAPS_BY_WORLD;
