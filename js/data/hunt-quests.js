"use strict";
/* ============================================================
Aethervale — data/hunt-quests.js
v3.30 : première ressource d'Entrepôt "de boucle" — contrairement aux
quêtes d'aventure (data/adventure-quests.js, complétées UNE FOIS puis
game.adventureQuestsCompleted[id]=true pour toujours), une "Chasse"
(HUNT_QUESTS) n'a pas de fin : chaque run traite un LOT fixe de kills
(voir lotSize) puis relance automatiquement un nouveau lot tant que le
joueur ne quitte pas explicitement (bouton Arrêter) — voir
systems/hunt-quest-system.js (HuntQuestManager, système séparé
d'AdventureQuestManager).

Chaque entrée décrit une chasse ciblée sur {worldId, adventureIndex},
même principe de génération d'ennemi que les quêtes d'aventure
(WorldManager.generateEnemy() sur un contexte temporaire).
============================================================ */

/* Catalogue des ressources d'Entrepôt (voir ui/warehouse-view.js) —
   séparé de RARITY_ORDER/equipment.js, ce ne sont pas des objets
   procéduraux mais des stacks simples (game.resources[key], un
   nombre). v3.31 : icônes dédiées fournies (images/Icons/resources/) —
   viande n'est plus en emoji 🍖 (placeholder v3.30). Blé/Bois/Fer
   ajoutés pour les bâtiments de production (voir
   data/production-buildings.js) — Bois/Fer réservés à de futures
   constructions/améliorations, Blé/Viande conservés en Entrepôt même
   sans usage immédiat (demande explicite).
   v3.35 : cap (capacité max de stock, optionnel — absent/undefined =
   illimité, comme avant pour les 4 ressources brutes). Générique et
   réutilisable pour N'IMPORTE QUELLE ressource de ce catalogue, pas
   seulement les ressources d'artisanat (voir data/recipes.js) —
   WarehouseManager.addResource() le respecte pour toute clé qui le
   définit. tier: "raw" | "crafted", sert uniquement au filtre
   Bruts/Tier 1 de ui/warehouse-view.js.
   v3.36 : Pierre (brute, bâtiment Carrière — voir
   data/production-buildings.js) et Farine (tier 1, recette Blé →
   Farine — voir data/recipes.js). Planche/Lingot ont maintenant un
   sellPrice réel (7/10 or) — volontairement inférieur à la valeur de
   revente des 5 intrants bruts nécessaires (Bois×5=10, Fer×5=15),
   pour que le craft reste motivé par la progression et non par
   l'arbitrage revente brute vs revente transformée. */
var WAREHOUSE_RESOURCES = {
  viande: { id: "viande", name: "Viande", icon: "images/Icons/resources/meat_icon.png", desc: "Butin de chasse, obtenu en Forêt ou au bâtiment Chasse.", sellPrice: 3, tier: "raw" },
  ble: { id: "ble", name: "Blé", icon: "images/Icons/resources/wheat_icon.png", desc: "Récolté au bâtiment Champs.", sellPrice: 2, tier: "raw" },
  bois: { id: "bois", name: "Bois", icon: "images/Icons/resources/wood_icon.png", desc: "Coupé à la Scierie — réservé aux futures constructions.", sellPrice: 2, tier: "raw" },
  fer: { id: "fer", name: "Fer", icon: "images/Icons/resources/iron_icon.png", desc: "Extrait à la Mine — réservé aux futures améliorations.", sellPrice: 5, tier: "raw" },
  pierre: { id: "pierre", name: "Pierre", icon: "images/Icons/resources/stone_icon.png", desc: "Extraite à la Carrière — réservée aux futures constructions.", sellPrice: 2, tier: "raw" },
  planche: { id: "planche", name: "Planche", icon: "images/Icons/resources/plank_icon.png", desc: "Fabriquée à partir de Bois.", sellPrice: 7, tier: "crafted", cap: 999 },
  lingot: { id: "lingot", name: "Lingot", icon: "images/Icons/resources/ingot_icon.png", desc: "Fabriqué à partir de Fer.", sellPrice: 10, tier: "crafted", cap: 999 },
  farine: { id: "farine", name: "Farine", icon: "images/Icons/resources/flour_icon.png", desc: "Moulue à partir de Blé.", sellPrice: 7, tier: "crafted", cap: 999 }
};

var HUNT_QUESTS = {
  hq_forest_boar: {
    id: "hq_forest_boar",
    worldId: "forest",
    adventureIndex: 0, // cible "Lisière de la forêt", même zone que aq_forest_scout
    name: "Chasse en Forêt",
    story: "Le gibier ne manque pas à la Lisière. Chaque bête abattue rapporte de la viande à stocker à l'Entrepôt — une chasse peut se répéter indéfiniment.",
    icon: "🍖",
    resourceKey: "viande",
    dropChancePct: 20,   // même taux que le Minerai rare (aq_forest_collect)
    lotSize: 10           // kills avant relance automatique du lot suivant
  }
};

window.WAREHOUSE_RESOURCES = WAREHOUSE_RESOURCES;
window.HUNT_QUESTS = HUNT_QUESTS;
