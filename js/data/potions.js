"use strict";
/* ============================================================
Quest Idle — data/potions.js
Catalogue des potions achetables en or, dans le sous-onglet
"Potions" de la Boutique. Chaque potion a un effet TEMPORAIRE
(durationMin minutes), sauf l'Élixir d'Aether qui n'a pas de
minuteur : son bonus se consomme à la prochaine ascension.

Champs :
  - stat         clé d'effet lue par PotionManager.getActiveEffects()
                 (power/celerity/critChance/endurance/gold/aetherNext)
  - bonus        magnitude de l'effet (fraction, ex: 0.20 = +20%,
                 sauf critChance qui est en points de % directs)
  - durationMin  durée en minutes, ou null pour l'Élixir d'Aether
                 (pas de minuteur, consommé à l'ascension suivante)
Boire une potion déjà active prolonge sa durée (repart à zéro),
elle ne se cumule pas avec elle-même. Des potions DIFFÉRENTES
peuvent en revanche être actives en même temps.
============================================================ */

var POTIONS_DB = [
  {
    id: "potion_power",
    name: "Potion de Force",
    icon: "images/Icons/potions/potion_force.png",
    desc: "+20% Force (dégâts de tap) pendant 30 min.",
    stat: "power",
    bonus: 0.20,
    durationMin: 30,
    cost: 2000,
    rarity: "common"
  },
  {
    id: "potion_celerity",
    name: "Potion de Célérité",
    icon: "images/Icons/potions/potion_celerite.png",
    desc: "+20% Célérité (auto DPS) pendant 30 min.",
    stat: "celerity",
    bonus: 0.20,
    durationMin: 30,
    cost: 2000,
    rarity: "common"
  },
  {
    id: "potion_precision",
    name: "Potion de Précision",
    icon: "images/Icons/potions/potion_precision.png",
    desc: "+15% chance de critique pendant 30 min.",
    stat: "critChance",
    bonus: 15,
    durationMin: 30,
    cost: 3500,
    rarity: "green"
  },
  {
    id: "potion_endurance",
    name: "Potion d'Endurance",
    icon: "images/Icons/potions/potion_endurance.png",
    desc: "+30% PV max et défense pendant 30 min.",
    stat: "endurance",
    bonus: 0.30,
    durationMin: 30,
    cost: 3500,
    rarity: "green"
  },
  {
    id: "elixir_fortune",
    name: "Élixir de Fortune",
    icon: "images/Icons/potions/potion_fortune.png",
    desc: "+25% or gagné pendant 20 min.",
    stat: "gold",
    bonus: 0.25,
    durationMin: 20,
    cost: 6000,
    rarity: "rare"
  },
  {
    id: "elixir_aether",
    name: "Élixir d'Aether",
    icon: "images/Icons/potions/potion_aether.png",
    desc: "+10% Aether au prochain gain d'ascension (se consomme à la prochaine ascension, sans minuteur).",
    stat: "aetherNext",
    bonus: 0.10,
    durationMin: null,
    cost: 10000,
    costMult: 2.5,
    rarity: "rare"
  }
];

window.POTIONS_DB = POTIONS_DB;

/* ============================================================
v2.16 : potions de SOIN — mécanique différente des potions ci-dessus
(qui s'activent immédiatement à l'achat). Celles-ci s'achètent en
stock (game.healingPotionsOwned[id] = quantité) et se consomment à la
demande depuis le bouton dédié en bas d'écran (voir
ui/combat-view.js), avec un petit cooldown entre deux usages pour
éviter le spam pendant un donjon corsé.
============================================================ */
const HEALING_POTIONS_DB = [
  {
    id: "potion_soin_mineur",
    name: "Potion de soin mineur",
    icon: "images/Icons/potions/potion_soin_mineur_icone.png",
    healPercent: 0.25,
    cost: 1000
  },
  {
    id: "potion_soin_majeur",
    name: "Potion de soin majeur",
    icon: "images/Icons/potions/potion_soin_majeur_icone.png",
    healPercent: 0.60, 
    cost: 3000
  }
];

var HEALING_POTION_COOLDOWN_MS = 4000;

window.HEALING_POTIONS_DB = HEALING_POTIONS_DB;
window.HEALING_POTION_COOLDOWN_MS = HEALING_POTION_COOLDOWN_MS;
