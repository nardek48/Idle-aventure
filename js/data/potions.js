"use strict";
/* data/potions.js — v3.115.0 : REFONTE per-run (décision Seb). Les potions à bonus ne durent
   plus 30 min : bues, elles sont ARMÉES et s'appliquent au prochain run de MISSION (sortie
   de chasse/quête/donjon — jamais le farm libre, cohérence P4), consommées à la fin du run.
   Prix recalés consommable (~1 sortie de gain Forêt), cumulables (1 de chaque type par run),
   stock libre plafonné. Distribuables en récompense de quête (reward.potions). Logique :
   systems/potion-system.js. Ancien format (durationMin) : COMMENTAIRES_ORIGINAUX.md */

var POTION_STOCK_CAP = 9;

var POTIONS_DB = [
  {
    id: "potion_power",
    name: "Potion de Force",
    icon: "images/Icons/potions/potion_force.png",
    desc: "+20% Force (dégâts de l'attaque de base) pour la prochaine mission.",
    stat: "power",
    bonus: 0.20,
    perRun: true,
    cost: 120,
    rarity: "common"
  },
  {
    id: "potion_celerity",
    name: "Potion de Célérité",
    icon: "images/Icons/potions/potion_celerite.png",
    desc: "+20% Célérité (jauge de frappe bonus) pour la prochaine mission.",
    stat: "celerity",
    bonus: 0.20,
    perRun: true,
    cost: 120,
    rarity: "common"
  },
  {
    id: "potion_precision",
    name: "Potion de Précision",
    icon: "images/Icons/potions/potion_precision.png",
    desc: "+15% chance de critique pour la prochaine mission.",
    stat: "critChance",
    bonus: 15,
    perRun: true,
    cost: 200,
    rarity: "green"
  },
  {
    id: "potion_endurance",
    name: "Potion d'Endurance",
    icon: "images/Icons/potions/potion_endurance.png",
    desc: "+30% PV max et défense pour la prochaine mission.",
    stat: "endurance",
    bonus: 0.30,
    perRun: true,
    cost: 200,
    rarity: "green"
  },
  {
    id: "elixir_fortune",
    name: "Élixir de Fortune",
    icon: "images/Icons/potions/potion_fortune.png",
    desc: "+25% or gagné pendant la prochaine mission.",
    stat: "gold",
    bonus: 0.25,
    perRun: true,
    cost: 350,
    rarity: "rare"
  },
  {
    id: "elixir_aether",
    name: "Élixir d'Aether",
    icon: "images/Icons/potions/potion_aether.png",
    desc: "+10% Aether au prochain gain d'ascension (se consomme à la prochaine ascension, sans lien avec les runs).",
    stat: "aetherNext",
    bonus: 0.10,
    perRun: false,
    cost: 10000,
    costMult: 2.5,
    rarity: "rare"
  }
];

window.POTIONS_DB = POTIONS_DB;
window.POTION_STOCK_CAP = POTION_STOCK_CAP;

const HEALING_POTIONS_DB = [
  {
    id: "potion_soin_mineur",
    name: "Potion de soin mineur",
    icon: "images/Icons/potions/potion_soin_mineur_icone.png",
    healPercent: 0.35, // v3.101.0 : 25 → 35 % (LIGNE_DIRECTRICE §10 n°10)
    cost: 150 // v3.101.0 : 1000 → 150, accessible dès l'Acte I (le soin complet reste le Repas)
  },
  {
    id: "potion_soin_majeur",
    name: "Potion de soin majeur",
    icon: "images/Icons/potions/potion_soin_majeur_icone.png",
    healPercent: 0.60,
    cost: 400 // v3.115.0 : 3000 → 400, recalé sur l'économie active post-village (grille v3.114)
  }
];

var HEALING_POTION_COOLDOWN_MS = 4000;

window.HEALING_POTIONS_DB = HEALING_POTIONS_DB;
window.HEALING_POTION_COOLDOWN_MS = HEALING_POTION_COOLDOWN_MS;
