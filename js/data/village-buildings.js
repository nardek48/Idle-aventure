"use strict";
/* data/village-buildings.js — v3.213.0 (lot V-1) : socle des bâtiments du Village.
   Rapport de conception « Construction du village » du 11/09/2026.

   UN SEUL modèle pour tous les bâtiments : paliers de coût (costTiers),
   durée de chantier (VILLAGE_BUILD_SECONDS), effet passif (effect), rang
   requis à l'Atelier de Construction (rank). L'Atelier est le premier cas
   du socle : ses paliers reprennent À L'IDENTIQUE ceux de
   data/construction.js (v3.37) — aucun changement d'économie dans ce lot.

   CONVENTION DE COÛT (héritée de construction.js, ne pas inverser) :
   costTiers.minLevel/maxLevel portent sur le niveau ACTUEL, pas sur le
   niveau visé. Passer de 4 à 5 utilise donc le palier qui contient 4.

   `implemented: false` = le bâtiment s'affiche dans la grille, verrouillé,
   avec sa quête écrite dessus (décision : le mur n'est jamais silencieux),
   mais aucun chantier n'est possible tant que son lot n'est pas livré.
   V-2 passera `training` à true, V-4 `forge` et `apothecary`, etc.

   Logique : systems/village-building-system.js. Fiche : ui/village-building-view.js. */

/* Durée d'un chantier, en secondes, selon le niveau VISÉ (§5.2 du rapport).
   Identique pour tous les bâtiments : la difficulté vient des matériaux,
   pas du temps. Jamais au-delà de 15 min — les bâtiments hors-ligne à
   horloge ont été supprimés en v3.113, on ne les réintroduit pas. */
function getVillageBuildSeconds(targetLevel) {
  var lvl = Math.max(1, Math.floor(Number(targetLevel) || 1));
  if (lvl <= 5) return 30 * lvl;              // 30 s → 2 min 30
  if (lvl <= 10) return 60 * (lvl - 2);       // 4 min → 8 min
  var tail = [600, 720, 840, 900];            // 10, 12, 14, 15 min
  return tail[Math.min(tail.length - 1, lvl - 11)];
}
window.getVillageBuildSeconds = getVillageBuildSeconds;

/* Rang de l'Atelier de Construction requis pour ouvrir un chantier.
   Seuils actés : niveau 1 → rang 1, 3 → rang 2, 5 → rang 3, 7 → rang 4. */
var VILLAGE_RANK_THRESHOLDS = [1, 3, 5, 7];
window.VILLAGE_RANK_THRESHOLDS = VILLAGE_RANK_THRESHOLDS;

var VILLAGE_BUILDINGS = {
  workshop: {
    id: "workshop",
    name: "Atelier de Construction",
    icon: "images/Icons/workshops/masonry.png",
    iconImg: "images/Icons/construction_icon.png",
    rank: 0,                 // pas de prérequis : c'est lui qui donne les rangs
    maxLevel: 10,
    implemented: true,
    desc: "Le maître d'œuvre du village. Son niveau ouvre les chantiers des autres bâtiments, et chaque amélioration fait monter le prix de vente de l'Entrepôt.",
    /* Repris tel quel de data/construction.js (v3.37/v3.40) : mêmes
       ressources, mêmes bases, mêmes multiplicateurs. */
    /* v3.264.0 (décision Seb) : le NIVEAU 1 seul coûte 5 planches au lieu de 10 — exactement
       celles de l'étape « Fabriquer 5 planches » des Fondations. Attente estimée ~47 min -> ~11 min
       (bois : 50 -> 25 pour les planches, dont ~17 rapportés par le Bosquet silencieux). Les niveaux
       2 et suivants gardent le palier ci-dessous. Lu par VillageBuildingManager.getNextCost. */
    firstLevelCost: { gold: 25, planche: 5, pierre: 15 },
    costTiers: [
      {
        minLevel: 0, maxLevel: 4,
        resources: ["gold", "planche", "pierre"],
        baseCost: { gold: 25, planche: 10, pierre: 15 },
        costMult: 1.35
      },
      {
        minLevel: 5, maxLevel: 7,
        resources: ["gold", "planche", "pierre", "lingot"],
        baseCost: { gold: 120, planche: 45, pierre: 65, lingot: 8 },
        costMult: 1.40
      },
      /* v3.214.0 (lot V-3) : 3e palier au matériau de monde. Les niveaux 8 à 10
         de l'Atelier deviennent un objectif de fin de Forêt, pas une simple
         dépense d'or. Les paliers 0-7 n'ont pas bougé d'un chiffre. */
      {
        minLevel: 8, maxLevel: 9,
        resources: ["gold", "planche", "pierre", "lingot", "resine_durcie"],
        baseCost: { gold: 600, planche: 110, pierre: 140, lingot: 30, resine_durcie: 4 },
        costMult: 1.45
      }
    ],
    effectLabel: function (level) {
      return "+" + Math.round(level * 3) + " % de prix de vente à l'Entrepôt";
    },
    sellBonusAtLevel: function (level) {
      return 1 + 0.03 * level;
    }
  },

  training: {
    id: "training",
    name: "Terrain d'entraînement",
    icon: "images/Icons/combat_stats/stat_critical.png",
    iconImg: "images/Icons/village_buildings/training_grounds.png",
    rank: 1,
    /* v3.214.0 : 14 niveaux, soit le plafond historique de 150 par
       caractéristique. Les quatre derniers (11 à 14) exigent la Résine durcie,
       donc d'avoir farmé la Forêt en Petite Aventure — c'est le premier
       plafond par monde du jeu. */
    maxLevel: 14,
    implemented: true,
    lockLabel: "Atteins 20 dans une caractéristique",
    desc: "Chaque niveau ouvre 10 niveaux d'entraînement supplémentaires sur chacune des cinq caractéristiques. L'entraînement lui-même se paie en or, dans Personnage → Stats.",
    /* La porte d'entrée du Terrain n'est pas une quête du tableau : c'est le
       mur lui-même. Quand une caractéristique bute à 10, le bâtiment devient
       constructible — le joueur découvre le besoin avant l'objet. */
    unlockCheck: function () {
      var ids = window.HEROS_TRAINING_UPGRADE_IDS
        || ["utrain_power", "utrain_endurance", "utrain_celerity", "utrain_precision", "utrain_will"];
      return ids.some(function (id) {
        // v3.248.0 : le socle sans bâtiment est passé à 20 — le mur reste la porte d'entrée
        var seuil = (typeof TRAINING_BASE_CAP === "number") ? TRAINING_BASE_CAP : 20;
        return Number((game.upgrades && game.upgrades[id]) || 0) >= seuil;
      });
    },
    costTiers: [
      {
        minLevel: 0, maxLevel: 4,
        resources: ["gold", "planche", "pierre"],
        baseCost: { gold: 60, planche: 12, pierre: 16 },
        costMult: 1.35
      },
      {
        minLevel: 5, maxLevel: 9,
        resources: ["gold", "planche", "pierre", "lingot"],
        baseCost: { gold: 320, planche: 45, pierre: 60, lingot: 10 },
        costMult: 1.40
      },
      /* v3.214.0 : les niveaux 11 à 14 (paliers 10-13) passent par la Résine. */
      {
        minLevel: 10, maxLevel: 13,
        resources: ["gold", "planche", "pierre", "lingot", "resine_durcie"],
        baseCost: { gold: 1400, planche: 120, pierre: 150, lingot: 40, resine_durcie: 6 },
        costMult: 1.45
      }
    ],
    effectLabel: function (level) {
      // v3.248.0 : le socle sans bâtiment est passé à 20 (voir getTrainingCapLevels)
      var base = (typeof TRAINING_BASE_CAP === "number") ? TRAINING_BASE_CAP : 20;
      return "Plafond d'entraînement : " + Math.min(150, base + 10 * level) + " par caractéristique";
    }
  },

  forge: {
    id: "forge",
    name: "Forge",
    icon: "images/Icons/workshops/smithing_station.png",
    iconImg: "images/Icons/village_buildings/village_forge.png",
    rank: 2,
    /* Conception : 6 niveaux, un par monde, chacun ouvrant 5 niveaux de forge
       sur les pièces — soit 30 au total, c'est-à-dire EXACTEMENT un cran de
       rareté (voir systems/forge-system.js). Le palier de bâtiment et le
       matériau de monde sont donc le même verrou, exprimé une fois.

       v3.221.0 : limité à 2 pour l'instant (10 niveaux de forge). Les niveaux 3
       à 6 exigent les matériaux des mondes 2 à 5, qui n'existent pas encore —
       même règle que le Terrain d'entraînement en v3.213.1, relevé en v3.214.0
       quand son matériau est arrivé. */
    maxLevel: 2,
    implemented: true,
    lockLabel: "Atelier niveau 3",
    desc: "Reforge une pièce d'équipement. Le niveau appartient à l'emplacement, pas à l'objet : changer de pièce ne fait rien perdre.",
    costTiers: [
      {
        minLevel: 0, maxLevel: 0,
        resources: ["gold", "planche", "pierre", "acier"],
        baseCost: { gold: 600, planche: 30, pierre: 40, acier: 6 },
        costMult: 1.40
      },
      {
        minLevel: 1, maxLevel: 1,
        resources: ["gold", "planche", "pierre", "acier", "resine_durcie"],
        baseCost: { gold: 2400, planche: 70, pierre: 85, acier: 18, resine_durcie: 4 },
        costMult: 1.45
      }
    ],
    effectLabel: function (level) {
      var max = level * 5;
      return max <= 0 ? "Aucune reforge possible"
        : ("Reforge jusqu'au niveau " + max + " sur chaque emplacement");
    }
  },

  apothecary: {
    id: "apothecary",
    name: "Apothicaire",
    icon: "images/Icons/village_buildings/apothecary.png",
    iconImg: "images/Icons/village_buildings/apothecary.png",
    rank: 2,
    /* 6 niveaux : un par recette. Au-delà, il n'y aurait plus rien à ouvrir —
       un niveau qui ne débloque rien serait un piège à ressources. */
    maxLevel: 6,
    implemented: true,
    lockLabel: "Atelier niveau 3",
    desc: "Prépare les potions avec des ressources plutôt qu'avec de l'or. Chaque niveau ouvre une recette de plus.",
    costTiers: [
      {
        minLevel: 0, maxLevel: 2,
        resources: ["gold", "planche", "pierre"],
        baseCost: { gold: 200, planche: 20, pierre: 24 },
        costMult: 1.35
      },
      {
        minLevel: 3, maxLevel: 5,
        resources: ["gold", "planche", "pierre", "lingot"],
        baseCost: { gold: 900, planche: 60, pierre: 70, lingot: 14 },
        costMult: 1.40
      }
    ],
    effectLabel: function (level) {
      var n = Math.min(level, (window.APOTHECARY_RECIPES || []).length || 6);
      return n <= 0 ? "Aucune recette encore ouverte" : ("Recettes ouvertes : " + n);
    }
  },

  /* v3.229.0 (chantier Équipement multi-affixes, Lot 5) : puits à or et à Sève.
     Le niveau ouvre les raretés relançables, comme la Forge ouvre des niveaux.
     Limité à 2 : le Légendaire ne tombe qu'à la Tour, un niveau 3 n'ouvrirait
     rien d'atteignable (même règle que la Forge en v3.221.0). */
  enchanter: {
    id: "enchanter",
    name: "Enchanteresse",
    icon: "images/Icons/scene/node_discovery.png",
    iconImg: "images/Icons/village_buildings/enchantress_tower.png",
    rank: 2,
    maxLevel: 2,
    implemented: true,
    lockLabel: "Atelier niveau 3",
    desc: "Relance la valeur d'un bonus sur une pièce équipée. Le bonus ne change jamais de nature, et la pièce ne peut pas empirer.",
    costTiers: [
      {
        minLevel: 0, maxLevel: 0,
        resources: ["gold", "planche", "pierre", "seve_aeswyn"],
        baseCost: { gold: 800, planche: 35, pierre: 45, seve_aeswyn: 6 },
        costMult: 1.40
      },
      {
        minLevel: 1, maxLevel: 1,
        resources: ["gold", "planche", "pierre", "seve_aeswyn", "resine_durcie"],
        baseCost: { gold: 3000, planche: 80, pierre: 95, seve_aeswyn: 14, resine_durcie: 5 },
        costMult: 1.45
      }
    ],
    effectLabel: function (level) {
      var labels = (typeof ENCHANT_RARITY_BY_LEVEL !== "undefined") ? ENCHANT_RARITY_BY_LEVEL : null;
      if (level <= 0 || !labels) return "Aucune relance possible";
      var list = labels.slice(0, level).map(function (group) {
        return group.map(function (r) { return (RARITY_LABELS && RARITY_LABELS[r]) || r; }).join(", ");
      }).join(", ");
      return "Relance les bonus : " + list;
    }
  },

  hall: {
    id: "hall",
    name: "Halle marchande",
    icon: "images/Icons/subtabs/equipment_shop.png",
    iconImg: "images/Icons/village_buildings/merchant_hall.png",
    rank: 3,
    /* 10 niveaux : 5 emplacements de vitrine gagnés (un tous les deux niveaux)
       et une remise croissante sur le renouvellement. */
    maxLevel: 10,
    implemented: true,
    lockLabel: "Atelier niveau 5",
    desc: "Agrandit l'échoppe d'équipement : plus d'emplacements en vitrine, et un renouvellement moins cher. L'échoppe reste à sa place, dans Équipement → Échoppe.",
    costTiers: [
      {
        minLevel: 0, maxLevel: 4,
        resources: ["gold", "planche", "pierre"],
        baseCost: { gold: 800, planche: 40, pierre: 50 },
        costMult: 1.38
      },
      {
        minLevel: 5, maxLevel: 9,
        resources: ["gold", "planche", "pierre", "lingot"],
        baseCost: { gold: 4000, planche: 90, pierre: 110, lingot: 24 },
        costMult: 1.42
      }
    ],
    effectLabel: function (level) {
      var slots = (window.EquipShopManager && typeof EquipShopManager.getShopSize === "function")
        ? EquipShopManager.getShopSize(level)
        : 6;
      var remise = Math.round((1 - Math.pow(0.95, level)) * 100);
      return slots + " objets en vitrine" + (remise > 0 ? " · -" + remise + " % sur le renouvellement" : "");
    }
  },

  tavern: {
    id: "tavern",
    name: "Taverne",
    icon: "images/Icons/village_buildings/tavern.png",
    iconImg: "images/Icons/village_buildings/tavern.png",
    rank: 3,
    /* 5 niveaux, un contrat par niveau : chaque chantier se voit tout de suite
       sur le tableau. */
    maxLevel: 5,
    implemented: true,
    lockLabel: "Atelier niveau 5",
    desc: "Un tableau de contrats de livraison, renouvelé toutes les 6 heures. Livrer paie mieux que vendre à l'Entrepôt : c'est le débouché du surplus de Production.",
    costTiers: [
      {
        minLevel: 0, maxLevel: 2,
        resources: ["gold", "planche", "pierre"],
        baseCost: { gold: 700, planche: 35, pierre: 45 },
        costMult: 1.40
      },
      {
        minLevel: 3, maxLevel: 4,
        resources: ["gold", "planche", "pierre", "lingot"],
        baseCost: { gold: 3200, planche: 80, pierre: 95, lingot: 20 },
        costMult: 1.45
      }
    ],
    effectLabel: function (level) {
      var n = (window.TavernManager && typeof TavernManager.getSlotCount === "function")
        ? TavernManager.getSlotCount(level) : 0;
      return n <= 0 ? "Aucun contrat" : (n + (n > 1 ? " contrats simultanés" : " contrat à la fois"));
    }
  },

  warehouse: {
    id: "warehouse",
    name: "Entrepôt agrandi",
    icon: "images/Icons/system/warehouse_supplies.png",
    iconImg: "images/Icons/village_buildings/warehouse_expanded.png",
    rank: 4,
    maxLevel: 10,
    implemented: true,
    lockLabel: "Atelier niveau 7",
    desc: "Relève le plafond de stockage de toutes les ressources fabriquées. Les matières brutes n'ont pas de plafond et ne sont pas concernées.",
    costTiers: [
      {
        minLevel: 0, maxLevel: 4,
        resources: ["gold", "planche", "pierre"],
        baseCost: { gold: 1200, planche: 50, pierre: 65 },
        costMult: 1.38
      },
      {
        minLevel: 5, maxLevel: 9,
        resources: ["gold", "planche", "pierre", "lingot", "resine_durcie"],
        baseCost: { gold: 5000, planche: 110, pierre: 130, lingot: 30, resine_durcie: 3 },
        costMult: 1.42
      }
    ],
    effectLabel: function (level) {
      var par = (typeof WAREHOUSE_CAP_PER_LEVEL === "number") ? WAREHOUSE_CAP_PER_LEVEL : 250;
      var base = 999;
      return "Plafond des ressources fabriquées : " + (base + level * par)
        + (level > 0 ? " (+" + (level * par) + ")" : "");
    }
  },

  palisade: {
    id: "palisade",
    name: "Palissade",
    icon: "images/Icons/combat_stats/stat_defense.png",
    iconImg: "images/Icons/village_buildings/palisade.png",
    rank: 4,
    /* v3.257.0 (Cartes Vivantes, C-3) : 10 niveaux, paliers de l'Entrepôt agrandi (décision
       Seb 16/09/2026). Frein 7 %/niveau sur l'échec ; anneau 1 tenu au niveau 3, anneau 2 au
       7, anneau 3 au 10 — au 10, le Recouvrement ne reprend plus rien (immunité de plafond,
       décision Seb). Révèle le nom des secteurs au front dès le niveau 5. Valeurs lues sur
       LIVING_MAP_RULES.palisade par LivingMapManager. */
    maxLevel: 10,
    implemented: true,
    lockLabel: "Atelier niveau 7",
    desc: "Le mur d'Aeswyn sur la carte de la Forêt : chaque niveau freine le Recouvrement quand une expédition échoue, et les anneaux tenus survivent à l'Ascension.",
    costTiers: [
      {
        minLevel: 0, maxLevel: 4,
        resources: ["gold", "planche", "pierre"],
        baseCost: { gold: 1200, planche: 50, pierre: 65 },
        costMult: 1.38
      },
      {
        minLevel: 5, maxLevel: 9,
        resources: ["gold", "planche", "pierre", "lingot", "resine_durcie"],
        baseCost: { gold: 5000, planche: 110, pierre: 130, lingot: 30, resine_durcie: 3 },
        costMult: 1.42
      }
    ],
    effectLabel: function (level) {
      var LM = window.LivingMapManager;
      if (!LM) return "Frein du Recouvrement : niveau " + level;
      var pal = LM.getRules().palisade || {};
      var brake = Math.round(Number(pal.brakePerLevel || 0) * level * 100);
      var held = LM.getHeldRing(level);
      var txt = "Frein sur l'échec : " + brake + " %";
      if (held >= 3) txt += " · anneaux 1 à 3 tenus : le Recouvrement ne reprend plus rien";
      else if (held === 2) txt += " · anneaux 1 et 2 tenus à l'Ascension";
      else if (held === 1) txt += " · anneau 1 tenu à l'Ascension";
      else txt += " · niveau 3 : l'anneau 1 tiendra à l'Ascension";
      if (level >= Number(pal.revealLevel || 99)) txt += " · noms révélés au front";
      return txt;
    }
  }
};

/* Ordre d'affichage dans la grille — l'ordre d'arrivée du rapport. */
var VILLAGE_BUILDING_ORDER = [
  "workshop", "training", "forge", "apothecary",
  "enchanter", "hall", "tavern", "warehouse", "palisade"
];

window.VILLAGE_BUILDINGS = VILLAGE_BUILDINGS;
window.VILLAGE_BUILDING_ORDER = VILLAGE_BUILDING_ORDER;
