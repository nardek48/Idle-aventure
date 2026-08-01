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
    icon: "🧪",
    desc: "+20% Force (dégâts de tap) pendant 30 min.",
    stat: "power",
    bonus: 0.20,
    durationMin: 30,
    cost: 200,
    rarity: "common"
  },
  {
    id: "potion_celerity",
    name: "Potion de Célérité",
    icon: "⚡",
    desc: "+20% Célérité (auto DPS) pendant 30 min.",
    stat: "celerity",
    bonus: 0.20,
    durationMin: 30,
    cost: 200,
    rarity: "common"
  },
  {
    id: "potion_precision",
    name: "Potion de Précision",
    icon: "🎯",
    desc: "+15% chance de critique pendant 30 min.",
    stat: "critChance",
    bonus: 15,
    durationMin: 30,
    cost: 350,
    rarity: "green"
  },
  {
    id: "potion_endurance",
    name: "Potion d'Endurance",
    icon: "🛡️",
    desc: "+30% PV max et défense pendant 30 min.",
    stat: "endurance",
    bonus: 0.30,
    durationMin: 30,
    cost: 350,
    rarity: "green"
  },
  {
    id: "elixir_fortune",
    name: "Élixir de Fortune",
    icon: "💰",
    desc: "+25% or gagné pendant 20 min.",
    stat: "gold",
    bonus: 0.25,
    durationMin: 20,
    cost: 600,
    rarity: "rare"
  },
  {
    id: "elixir_aether",
    name: "Élixir d'Aether",
    icon: "🌀",
    desc: "+10% Aether au prochain gain d'ascension (se consomme à la prochaine ascension, sans minuteur).",
    stat: "aetherNext",
    bonus: 0.10,
    durationMin: null,
    cost: 1000,
    rarity: "rare"
  }
];

window.POTIONS_DB = POTIONS_DB;
