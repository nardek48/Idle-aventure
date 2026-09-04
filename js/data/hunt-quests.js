"use strict";
/* data/hunt-quests.js — v3.135.0 : desc bois/fer/pierre réécrites (plus « réservé aux futures constructions », audit Forêt §3.5).
   Chasses "de boucle" (lots de kills relancés automatiquement) + catalogue ressources Entrepôt.
   v3.114.0 : sellPrice des ressources BRUTES abaissés (viande 3→2, blé/bois/pierre 2→1, fer 5→3) —
   la vente de production idle doit rester moins rentable que le jeu actif (décision Seb) ;
   les prix des ressources CRAFTÉES sont inchangés (la transformation reste valorisante).
   Logique : systems/hunt-quest-system.js. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var WAREHOUSE_RESOURCES = {
  viande: { id: "viande", name: "Viande", icon: "images/Icons/resources/meat_icon.png", desc: "Butin de chasse, obtenu en Forêt ou au bâtiment Chasse.", sellPrice: 2, tier: "raw" },
  viande_sechee: { id: "viande_sechee", name: "Viande séchée", icon: "images/Icons/resources/meat_icon.png", desc: "Séchée au Séchoir (atelier de Chasse) à partir de Viande.", sellPrice: 8, tier: "crafted", cap: 999 },
  ble: { id: "ble", name: "Blé", icon: "images/Icons/resources/wheat_icon.png", desc: "Récolté au bâtiment Champs.", sellPrice: 1, tier: "raw" },
  bois: { id: "bois", name: "Bois", icon: "images/Icons/resources/wood_icon.png", desc: "Coupé à la Scierie. Sert aux zones de production, aux planches et aux fondations du village.", sellPrice: 1, tier: "raw" },
  fer: { id: "fer", name: "Fer", icon: "images/Icons/resources/iron_icon.png", desc: "Extrait à la Mine. Sert aux zones de production et aux lingots de la Fonderie.", sellPrice: 3, tier: "raw" },
  pierre: { id: "pierre", name: "Pierre", icon: "images/Icons/resources/stone_icon.png", desc: "Extraite à la Carrière. Sert aux zones de production, aux sillons irrigués et aux fondations du village.", sellPrice: 1, tier: "raw" },
  eau: { id: "eau", name: "Eau", icon: "images/Icons/resources/water_icon.png", desc: "Puisée au Puits — ressource la moins chère du village.", sellPrice: 1, tier: "raw" },
  planche: { id: "planche", name: "Planche", icon: "images/Icons/resources/plank_icon.png", desc: "Fabriquée à partir de Bois.", sellPrice: 7, tier: "crafted", cap: 999 },
  lingot: { id: "lingot", name: "Lingot", icon: "images/Icons/resources/ingot_icon.png", desc: "Fabriqué à partir de Fer.", sellPrice: 10, tier: "crafted", cap: 999 },
  farine: { id: "farine", name: "Farine", icon: "images/Icons/resources/flour_icon.png", desc: "Moulue à partir de Blé.", sellPrice: 7, tier: "crafted", cap: 999 },
  pain: { id: "pain", name: "Pain", icon: "images/Icons/resources/bread_icon.png", desc: "Cuit à l'Atelier de Construction à partir d'Eau et de Farine.", sellPrice: 19, tier: "crafted", cap: 999 },
  ration: { id: "ration", name: "Ration moyenne", icon: "images/Icons/resources/ration_icon.png", desc: "Repas au Campement : restaure 60 % des PV max. Crafté à la Cuisine de camp à partir de Viande séchée et de Pain.", sellPrice: 36, tier: "crafted", cap: 999, healPct: 0.60 },
  petite_ration: { id: "petite_ration", name: "Petite ration", icon: "images/Icons/resources/petite_ration_icon.png", desc: "Repas au Campement : restaure 35 % des PV max. Crafté à la Cuisine de camp à partir de Viande et d'Eau.", sellPrice: 18, tier: "crafted", cap: 999, healPct: 0.35 },
  // v3.107.10 : Grande ration — icône dédiée fournie (Seb), toujours pas de recette de craft (décision antérieure).
  grande_ration: { id: "grande_ration", name: "Grande ration", icon: "images/Icons/resources/grande_ration_icon.png", desc: "Repas au Campement : restaure 100 % des PV max. Recette de craft à venir.", sellPrice: 60, tier: "crafted", cap: 999, healPct: 1.00 },
  // v3.127.0 (Petites Aventures, Lot PA3) : butin exclusif du scene-engine petite_aventure_foret
  // (voir data/scene-templates.js, exclusiveLoot) — nom + icône validés Seb 03/09/2026.
  // Ressource de collection (tier "special", distinct de raw/crafted) : pas de sellPrice
  // significatif (0, on ne veut pas encourager à la vendre), pas de cap (comme les ressources
  // brutes non plafonnées). Usage de craft prévu plus tard (ex. future recette de la Grande
  // ration, voir résumé de session) — n'existe pas encore, desc mise à jour le moment venu.
  seve_aeswyn: { id: "seve_aeswyn", name: "Sève d'Aeswyn", icon: "images/Icons/resources/seve_aeswyn_icon.png", desc: "Résine runique rare, trouvée en Petite Aventure. Un usage de craft viendra plus tard.", sellPrice: 0, tier: "special" }
};

var HUNT_QUESTS = {
  hq_forest_boar: {
    id: "hq_forest_boar",
    type: "resource",
    section: "resource",
    difficulty: "easy",
    progressionStage: "world_start",
    category: "side",
    worldId: "forest",
    adventureIndex: 0,
    name: "Chasse en Forêt",
    story: "Le gibier ne manque pas à la Lisière. Chaque bête abattue rapporte de la viande à stocker à l'Entrepôt — une chasse peut se répéter indéfiniment.",
    icon: "🍖",
    enemyFilter: ["wolf"], // v3.108.0 : le gibier, c'est le Loup (sorti du pool libre en 3.107.4) — plus de viande de slime
    resourceKey: "viande",
    dropChancePct: 50, // v3.100.3 : 20 -> 50 (chasse active = vraie source de viande en Acte II, décision Seb)
    lotSize: 10
  }
};

// v3.106.0 : ordre d'affichage des rations au Campement (petite -> grande).
var RATION_IDS = ["petite_ration", "ration", "grande_ration"];

window.WAREHOUSE_RESOURCES = WAREHOUSE_RESOURCES;
window.HUNT_QUESTS = HUNT_QUESTS;
window.RATION_IDS = RATION_IDS;
