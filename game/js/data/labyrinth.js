"use strict";
/* data/labyrinth.js — v3.434.0 (Ruines, RU12) : le Labyrinthe aux leviers. Réglages et textes.
   Conception : « Labyrinthe aux leviers » v0.1 (décisions de Seb du 09/10/2026). Chiffres de l'atelier,
   à caler au banc (livraison 2). Logique : systems/labyrinth-run.js ; écran : ui/labyrinth-view.js. */

var LABYRINTH_CONFIG = {
  worldId: "ruins",
  adventureIndex: 1,                 // ennemis de référence : les Ruines, seconde aventure
  requiresStoryStep: "ruines_11",    // ouvert une fois l'étape 10 franchie
  reserve: 3,                        // descentes en réserve ; une revient toutes les rechargeMs
  rechargeMs: 4 * 3600e3,
  entryCost: { resourceId: "petite_ration", amount: 1 },

  /* Étages : grille qui grandit avec la profondeur, escalier à une distance cible */
  sizeBase: { w: 5, h: 6 }, sizeMax: { w: 6, h: 8 },
  stairsDist: { base: 9, perFloor: 1, max: 16 },
  loopPct: 0.12,                     // murs abattus dans une même zone (boucles)
  gatesFrom2: 2,                     // une porte-pan à l'étage 1, deux ensuite
  decoyFrom: 4,                      // un pan leurre à partir de cet étage
  costMaxBase: 44, costMaxPerGate: 10, // Souffle du plus court chemin, au plus (marge pour explorer)

  /* Souffle */
  breathStart: 100, step: 3, pull: 4, breathFloor: 30,
  springBreath: 25, springHealPct: 0.20,

  /* Combats résolus comme les Petites Aventures (CombatForecast, héros seul) */
  guardFoes: ["skeleton", "batisseur", "gargoyle"], guardPack: 2, guardMult: 1.8, guardPerFloor: 0.04,
  guardFoeMult: { skeleton: 1, batisseur: 1.2, gargoyle: 0.65 }, // banc : chaque garde vaut 12 à 20 % des PV
  foeEliteId: "contremaitre", foeFrom: 2, foeEvery: 3, foeEveryFast: 2, foeFastFrom: 4, foeStun: 4,
  foeHpMult: 0.55, foePowMult: 0.80,  // le Contremaître du labyrinthe : un coup (~30 % des PV), pas un combat d'élite entier
  bossEvery: 5, bossFoe: "skeleton", bossHpMult: 8, bossPowMult: 2.4, // le Gardien du plan : bâti comme le gardien des Petites Aventures des Ruines, un cran au-dessus (banc : ~40 % des PV)
  bossName: "Le Gardien du plan",

  /* Gains, provisoires (banc en livraison 2) */
  stairsStones: 1, stairsStonesPerFloor: 1, stairsGoldPerFloor: 150,
  chestStones: 1, chestStonesPerTwoFloors: 1, chestGoldPerFloor: 100,
  bossStones: 3,
  stoneResource: "pierre_errante"
};

/* Tuiles (images de Seb du 09/10/2026), vues de dessus */
var LABYRINTH_TILES = {
  rooms: ["images/Maps/labyrinthe/salle_1.jpg", "images/Maps/labyrinthe/salle_1.jpg", "images/Maps/labyrinthe/salle_2.jpg", "images/Maps/labyrinthe/salle_3.jpg"],
  corridor: "images/Maps/labyrinthe/couloir.jpg",
  pan: "images/Maps/labyrinthe/pan.png",
  lever: "images/Maps/labyrinthe/levier.jpg",
  stairsDown: ["images/Maps/labyrinthe/escalier_bas.jpg", "images/Maps/labyrinthe/escalier_bas_2.jpg"],
  stairsUp: "images/Maps/labyrinthe/escalier_haut.jpg",
  spring: "images/Maps/labyrinthe/source.jpg",
  chest: "images/Maps/labyrinthe/coffre.jpg",
  bossRoom: "images/Maps/labyrinthe/salle_gardien.jpg",
  paper: "images/Maps/labyrinthe/papier.jpg",
  bossPortrait: "images/Boss/gardien_du_plan.jpg",
  icon: "images/Icons/quest_icons/exploration/labyrinthe.png"
};

var LABYRINTH_TEXTS = {
  title: "Le Labyrinthe aux leviers",
  blurb: "Sous la ville, une autre ville. Elle se rebâtit à chaque descente. Edda a pris ses craies.",
  floorNames: ["La cour des fondations", "Les salles qu'on a oublié de finir", "Les citernes sèches", "La galerie des plans",
    "Le cœur qui n'est pas fini", "Les fondations sous les fondations", "Là où les pierres se taisent"],
  floorLines: ["Edda déroule une feuille vierge. « Ici, personne n'a jamais dessiné. Je dessine, tu marches. »",
    "Les murs sont plus hauts. Quelqu'un les a montés pour que tu ne voies pas par-dessus.",
    "De l'eau coulait ici. Il n'en reste que le bruit.",
    "Sur les dalles, des traits de craie. Pas ceux d'Edda.",
    "Le Gardien du plan attend devant l'escalier. Il ne bouge pas. Il n'en a pas besoin.",
    "Plus bas que la ville. Plus bas que la carte.",
    "Le Veilleur n'est jamais descendu jusqu'ici."],
  guardLines: ["Deux squelettes se lèvent devant le levier. Ils ne te regardent pas : ils regardent le mur.",
    "Un bâtisseur pose une pierre devant le levier. Puis une autre.",
    "Une gargouille descend du plafond et se pose sur le levier."],
  bossLine: "Il est fait des marches qu'il garde. Quand il bouge, l'escalier bouge avec lui."
};

window.LABYRINTH_CONFIG = LABYRINTH_CONFIG;
window.LABYRINTH_TILES = LABYRINTH_TILES;
window.LABYRINTH_TEXTS = LABYRINTH_TEXTS;
