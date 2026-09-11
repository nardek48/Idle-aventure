"use strict";
/* data/dungeon.js — donjon : 15 vagues + boss, 5 paliers à difficulté fixe. Logique : systems/dungeon-system.js. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var DUNGEON_CONFIG = {
  waveCount: 15,
  freeTicketsPerDay: 1,
  ticketResetHours: 24,
  ticketCostEssence: 100,
  ticketCostGrowth: 1.2,
  maxTicketPurchasesPerDay: 20,

  basePremiumMult: 1.3,
  waveRampMult: 1,
  bossPremiumMult: 1.8,

  fullClearGoldBase: 500,
  fullClearEssenceBase: 40,
  partialLootChance: 40,

  shardsPerWaveCleared: 1,
  shardsBossBonus: 10
};

/* v3.223.0 (retours Seb) — DEUX AJOUTS PAR PALIER.

   worldRequired : index du monde qu'il faut AVOIR ATTEINT pour ouvrir le
   palier. Un Donjon V donne du légendaire ; le proposer en Forêt, où la rareté
   maximale du loot est le commun, n'avait pas de sens. Le plafond suit le monde
   le plus haut JAMAIS atteint (worldsEverReached) et non le monde courant :
   redescendre en Forêt ne doit pas refermer un donjon déjà ouvert.

   specialResourceId : le donjon devient une SECONDE SOURCE de matériau de monde,
   à côté des Petites Aventures. Ça règle un manque de la v3.214.0 : la Sève
   d'Aeswyn n'avait qu'une source, que la Menuiserie et la Grande ration se
   disputaient déjà.

   Les paliers II à V n'ont pas encore de matériau : ceux des mondes 2 à 5
   n'existent pas. Ils arriveront avec eux, comme la Résine est arrivée avec la
   Menuiserie. */
var DUNGEON_TIERS = [
  { id: 1, name: "Donjon I",
    worldRequired: 0, specialResourceId: "seve_aeswyn", specialResourceAmount: 2,   maxRarity: "common",    worldPower: 0, difficultyMult: 1,
    icon: "images/Dungeons/Icone_base/palier1.jpg",
    story: "Les premières salles sentent la terre humide et la mousse. Des bruits de pas résonnent au loin — rien de bien effrayant, pour l'instant." },
  { id: 2, name: "Donjon II",
    worldRequired: 1, specialResourceId: null, specialResourceAmount: 0,  maxRarity: "green",     worldPower: 1, difficultyMult: 2.5,
    icon: "images/Dungeons/Icone_base/palier2.jpg",
    story: "Les couloirs se resserrent. Des ombres inhabituelles glissent entre les pierres, et l'air se charge d'une tension nouvelle." },
  { id: 3, name: "Donjon III",
    worldRequired: 2, specialResourceId: null, specialResourceAmount: 0, maxRarity: "rare",      worldPower: 2, difficultyMult: 6,
    icon: "images/Dungeons/Icone_base/palier3.jpg",
    story: "Un froid ancien s'infiltre jusque dans les os. Ces lieux ne sont pas laissés à l'abandon — quelque chose les garde, avec méthode." },
  { id: 4, name: "Donjon IV",
    worldRequired: 3, specialResourceId: null, specialResourceAmount: 0,  maxRarity: "epic",      worldPower: 3, difficultyMult: 14,
    icon: "images/Dungeons/Icone_base/palier4.jpg",
    story: "Les murs eux-mêmes semblent respirer. Peu de ceux qui s'aventurent ici en ressortent sans égratignures — et encore moins sans butin." },
  { id: 5, name: "Donjon V",
    worldRequired: 4, specialResourceId: null, specialResourceAmount: 0,   maxRarity: "legendary", worldPower: 5, difficultyMult: 30,
    icon: "images/Dungeons/Icone_base/palier5.jpg",
    story: "Le seuil du dernier palier. Une puissance oubliée sommeille dans l'obscurité — et elle sait déjà que tu es arrivé." }
];

var DUNGEON_SHOP = [
  { id: "d_power", name: "Lame du donjon", icon: "⚔️", desc: "+2% dégâts globaux par niveau.", baseCost: 5, costMult: 1.30, maxLevel: 20 },
  { id: "d_gold", name: "Trésor du donjon", icon: "💰", desc: "+2% or global par niveau.", baseCost: 5, costMult: 1.30, maxLevel: 20 },
  { id: "d_essence", name: "Essence du donjon", icon: "images/Icons/essence_icon.png", desc: "+2% essence globale par niveau.", baseCost: 5, costMult: 1.30, maxLevel: 20 },
  { id: "d_defense", name: "Armure du donjon", icon: "🛡️", desc: "+1% défense par niveau.", baseCost: 5, costMult: 1.30, maxLevel: 20 }
];

var DUNGEONS = [
  {
    id: "basilic",
    name: "Tanière du Basilic",
    icon: "images/Dungeons/donjon_poison/donjon_poison.jpg",
    banner: "images/Dungeons/donjon_poison/donjon_poison_baniere.jpg",
    combatMap: "../images/Dungeons/donjon_poison/donjon_poison.jpg",
    desc: "Un antre reptilien tapi sous la roche — cinq paliers de danger croissante, jusqu'au repaire du Basilic lui-même.",
    tierIds: [1, 2, 3, 4, 5],
    locked: false
  }
];

window.DUNGEONS = DUNGEONS;

window.DUNGEON_CONFIG = DUNGEON_CONFIG;
window.DUNGEON_TIERS = DUNGEON_TIERS;
window.DUNGEON_SHOP = DUNGEON_SHOP;
