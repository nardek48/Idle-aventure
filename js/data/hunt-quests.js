"use strict";
/* data/hunt-quests.js — chasses "de boucle" (lots de kills relancés automatiquement) + catalogue ressources Entrepôt.
   Logique : systems/hunt-quest-system.js. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var WAREHOUSE_RESOURCES = {
  viande: { id: "viande", name: "Viande", icon: "images/Icons/resources/meat_icon.png", desc: "Butin de chasse, obtenu en Forêt ou au bâtiment Chasse.", sellPrice: 3, tier: "raw" },
  viande_sechee: { id: "viande_sechee", name: "Viande séchée", icon: "images/Icons/resources/meat_icon.png", desc: "Séchée au Séchoir (atelier de Chasse) à partir de Viande.", sellPrice: 8, tier: "crafted", cap: 999 },
  ble: { id: "ble", name: "Blé", icon: "images/Icons/resources/wheat_icon.png", desc: "Récolté au bâtiment Champs.", sellPrice: 2, tier: "raw" },
  bois: { id: "bois", name: "Bois", icon: "images/Icons/resources/wood_icon.png", desc: "Coupé à la Scierie — réservé aux futures constructions.", sellPrice: 2, tier: "raw" },
  fer: { id: "fer", name: "Fer", icon: "images/Icons/resources/iron_icon.png", desc: "Extrait à la Mine — réservé aux futures améliorations.", sellPrice: 5, tier: "raw" },
  pierre: { id: "pierre", name: "Pierre", icon: "images/Icons/resources/stone_icon.png", desc: "Extraite à la Carrière — réservée aux futures constructions.", sellPrice: 2, tier: "raw" },
  eau: { id: "eau", name: "Eau", icon: "images/Icons/resources/water_icon.png", desc: "Puisée au Puits — ressource la moins chère du village.", sellPrice: 1, tier: "raw" },
  planche: { id: "planche", name: "Planche", icon: "images/Icons/resources/plank_icon.png", desc: "Fabriquée à partir de Bois.", sellPrice: 7, tier: "crafted", cap: 999 },
  lingot: { id: "lingot", name: "Lingot", icon: "images/Icons/resources/ingot_icon.png", desc: "Fabriqué à partir de Fer.", sellPrice: 10, tier: "crafted", cap: 999 },
  farine: { id: "farine", name: "Farine", icon: "images/Icons/resources/flour_icon.png", desc: "Moulue à partir de Blé.", sellPrice: 7, tier: "crafted", cap: 999 },
  pain: { id: "pain", name: "Pain", icon: "images/Icons/resources/bread_icon.png", desc: "Cuit à l'Atelier de Construction à partir d'Eau et de Farine.", sellPrice: 19, tier: "crafted", cap: 999 },
  ration: { id: "ration", name: "Ration moyenne", icon: "images/Icons/resources/ration_icon.png", desc: "Préparée à l'Atelier de Construction à partir de Viande et de Pain — pour les expéditions les plus exigeantes.", sellPrice: 36, tier: "crafted", cap: 999 },
  petite_ration: { id: "petite_ration", name: "Petite ration", icon: "images/Icons/resources/ration_icon.png", desc: "Préparée directement à l'Entrepôt à partir de Viande et d'Eau, sans Atelier — pour les expéditions simples de début de monde.", sellPrice: 18, tier: "crafted", cap: 999 }
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
    resourceKey: "viande",
    dropChancePct: 20,
    lotSize: 10
  }
};

window.WAREHOUSE_RESOURCES = WAREHOUSE_RESOURCES;
window.HUNT_QUESTS = HUNT_QUESTS;
