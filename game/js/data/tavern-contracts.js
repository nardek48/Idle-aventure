"use strict";
/* data/tavern-contracts.js — v3.217.0 (lot V-6) : contrats de livraison de la Taverne.

   CE QUE C'EST : un débouché pour le surplus de Production. Le joueur livre des
   ressources, il est payé mieux qu'en les vendant à l'Entrepôt. C'est le seul
   endroit du jeu où produire beaucoup d'une même chose rapporte plus que la
   vente au détail.

   POURQUOI PAS UNE QUÊTE : les contrats se renouvellent et se répètent, ils n'ont
   ni narration ni progression. Les mettre au tableau de missions les mélangerait
   à des quêtes qui, elles, racontent quelque chose.

   ÉQUILIBRAGE : la récompense se calcule sur le prix de vente réel des
   ressources demandées (TAVERN_REWARD_MULT), donc elle suit automatiquement
   l'économie sans table parallèle à maintenir. Une ressource fabriquée vaut
   déjà plus cher qu'une brute : un contrat de Pain paie davantage qu'un contrat
   de Blé, sans qu'on ait rien à écrire.

   Logique : systems/tavern-system.js. */

/* Ce que le contrat paie, en multiple de la valeur de vente des ressources
   livrées. 2,2 = livrer vaut nettement mieux que vendre, sans rendre la vente
   au détail absurde. */
var TAVERN_REWARD_MULT = 2.2;

/* Renouvellement du tableau, aligné sur celui de l'échoppe d'équipement (6 h) :
   un seul rythme à retenir pour le joueur. */
var TAVERN_REFRESH_MS = 6 * 3600 * 1000;

/* Modèles de contrats. `tier` est le rang de Taverne à partir duquel le modèle
   peut sortir : les contrats de ressources fabriquées (plus rentables, mais qui
   supposent des ateliers) n'apparaissent qu'ensuite. */
var TAVERN_CONTRACT_TEMPLATES = [
  /* --- Ressources brutes --- */
  { id: "bois", resourceId: "bois", min: 40, max: 90, tier: 1, title: "Charpente à refaire" },
  { id: "pierre", resourceId: "pierre", min: 40, max: 90, tier: 1, title: "Muret du chemin creux" },
  { id: "ble", resourceId: "ble", min: 50, max: 110, tier: 1, title: "Réserve de grain" },
  { id: "eau", resourceId: "eau", min: 50, max: 110, tier: 1, title: "Citernes du bourg" },
  { id: "viande", resourceId: "viande", min: 30, max: 70, tier: 1, title: "Table des veilleurs" },
  { id: "fer", resourceId: "fer", min: 25, max: 60, tier: 2, title: "Ferrures et clous" },

  /* --- Ressources fabriquées --- */
  { id: "planche", resourceId: "planche", min: 10, max: 25, tier: 2, title: "Planches pour l'appentis" },
  { id: "farine", resourceId: "farine", min: 10, max: 24, tier: 2, title: "Sacs pour le moulin" },
  { id: "lingot", resourceId: "lingot", min: 8, max: 18, tier: 3, title: "Commande du forgeron" },
  { id: "pain", resourceId: "pain", min: 6, max: 15, tier: 3, title: "Fournée pour la route" },
  { id: "viande_sechee", resourceId: "viande_sechee", min: 6, max: 15, tier: 3, title: "Vivres de chasse" },
  { id: "ration", resourceId: "ration", min: 3, max: 8, tier: 4, title: "Paquetage d'expédition" }
];

window.TAVERN_REWARD_MULT = TAVERN_REWARD_MULT;
window.TAVERN_REFRESH_MS = TAVERN_REFRESH_MS;
window.TAVERN_CONTRACT_TEMPLATES = TAVERN_CONTRACT_TEMPLATES;
