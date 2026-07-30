"use strict";
/* ============================================================
QUEST IDLE — data/talents.js
Arbre de talents.
============================================================ */

/* Garde le même nom que celui déjà utilisé par ton code */
var TALENTTREE = {
  combat: [
    { id: "t_sharpened_blades", name: "Lames affûtées", icon: "🗡️", slot: "top", effect: "+5% dégâts de tap finaux." },

    { id: "t_war_instinct", name: "Instinct de guerre", icon: "🔥", slot: "upper_left", requires: "t_sharpened_blades", effect: "+5% dégâts contre les boss." },
    { id: "t_auto_tap", name: "Main spectrale", icon: "👆", slot: "upper_right", requires: "t_sharpened_blades", effect: "Déclenche un auto-tap toutes les 2 secondes." },

    { id: "t_precise_strike", name: "Frappe précise", icon: "🎯", slot: "mid_left", requires: "t_war_instinct", effect: "+6% chance de critique sur les taps." },
    { id: "t_battle_trance", name: "Transe de bataille", icon: "⚡", slot: "mid_right", requires: "t_auto_tap", effect: "+12% vitesse d'attaque de l'auto-tap." },

    { id: "t_boss_slayer", name: "Tueur de boss", icon: "👑", slot: "inner_left", requires: "t_precise_strike", effect: "+8% dégâts finaux contre les boss.", capstone: true },
    { id: "t_assault_frenzy", name: "Frénésie d'assaut", icon: "💥", slot: "inner_right", requires: "t_battle_trance", effect: "Tous les 20 taps, le prochain inflige +25% dégâts.", capstone: true },

    { id: "t_bloodlust", name: "Soif de sang", icon: "🩸", slot: "lower_left", requires: "t_boss_slayer", effect: "+3% dégâts contre les boss par ascension, max 15%.", capstone: true },
    { id: "t_perfect_execution", name: "Exécution parfaite", icon: "☠️", slot: "lower_right", requires: "t_bloodlust", effect: "Les boss sous 20% PV subissent +15% dégâts finaux.", capstone: true }
  ],

  fortune: [
    { id: "t_interest", name: "Intérêt composé", icon: "💰", slot: "top", effect: "Petit gain d'or passif toutes les 10 secondes." },

    { id: "t_scavenger", name: "Charognard", icon: "🧰", slot: "upper_left", requires: "t_interest", effect: "+8% or gagné sur les ennemis normaux." },
    { id: "t_treasure_hunter", name: "Chasseur de trésors", icon: "🎁", slot: "upper_right", requires: "t_interest", effect: "+1 progression bonus pour les quêtes trésor lors des événements." },

    { id: "t_deep_pockets", name: "Bourse profonde", icon: "👛", slot: "mid_left", requires: "t_scavenger", effect: "+10% or sur les coffres et récompenses fixes." },
    { id: "t_merchant_instinct", name: "Instinct marchand", icon: "📜", slot: "mid_right", requires: "t_treasure_hunter", effect: "Petite chance d'obtenir une récompense bonus." },

    { id: "t_golden_touch", name: "Toucher doré", icon: "✨", slot: "inner_left", requires: "t_deep_pockets", effect: "+12% or global.", capstone: true },
    { id: "t_astral_prospecting", name: "Prospection astrale", icon: "🌠", slot: "inner_right", requires: "t_merchant_instinct", effect: "Petite chance de doubler un butin gagné.", capstone: true },

    { id: "t_rich_ritual", name: "Rituel opulent", icon: "🏆", slot: "lower_left", requires: "t_golden_touch", effect: "+1 Aether supplémentaire lors des grosses ascensions.", capstone: true },
    { id: "t_sovereign_treasure", name: "Trésor souverain", icon: "👑", slot: "lower_right", requires: "t_rich_ritual", effect: "+20% or global et bonus sur les récompenses rares.", capstone: true }
  ],

  survival: [
    { id: "t_regenerate", name: "Régénération", icon: "💚", slot: "top", effect: "+1 essence toutes les 5 secondes." },

    { id: "t_thick_skin", name: "Peau épaisse", icon: "🛡️", slot: "upper_left", requires: "t_regenerate", effect: "+5% essence gagnée sur les boss." },
    { id: "t_second_wind", name: "Second souffle", icon: "🌬️", slot: "upper_right", requires: "t_regenerate", effect: "+8% récompenses en fin de chapitre." },

    { id: "t_calm_breath", name: "Souffle calme", icon: "🍃", slot: "mid_left", requires: "t_thick_skin", effect: "+10% efficacité du hors-ligne." },
    { id: "t_tenacious_will", name: "Volonté tenace", icon: "🪨", slot: "mid_right", requires: "t_second_wind", effect: "+10% stabilité des gains sur les chapitres difficiles." },

    { id: "t_essence_bloom", name: "Floraison d'essence", icon: "🔮", slot: "inner_left", requires: "t_calm_breath", effect: "+15% essence globale.", capstone: true },
    { id: "t_vital_anchor", name: "Ancrage vital", icon: "⚓", slot: "inner_right", requires: "t_tenacious_will", effect: "+12% essence lors des boss vaincus.", capstone: true },

    { id: "t_last_stand", name: "Dernier rempart", icon: "🕯️", slot: "lower_left", requires: "t_essence_bloom", effect: "+20% efficacité du hors-ligne.", capstone: true },
    { id: "t_immutable_guardian", name: "Gardien immuable", icon: "🌳", slot: "lower_right", requires: "t_last_stand", effect: "+20% essence globale et +10% gains hors-ligne.", capstone: true }
  ]
};

var TALENT_TREE = TALENTTREE;

function getAllTalentNodes() {
  return [].concat(TALENTTREE.combat, TALENTTREE.fortune, TALENTTREE.survival);
}

function getTalentById(id) {
  var all = getAllTalentNodes();
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === id) return all[i];
  }
  return null;
}

/* Optionnel : alias de compatibilité si certains endroits utilisent TALENT_TREE */
var TALENT_TREE = TALENTTREE;