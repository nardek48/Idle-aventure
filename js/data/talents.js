"use strict";
/* data/talents.js — arbre de talents à 3 niveaux/nœud, exclusivité gauche/droite par palier (tier), reset global uniquement.
   Effets réels câblés à la main dans js/systems/*.js (game.talents.<id>). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var TALENTTREE = {
  combat: [
    { id: "t_sharpened_blades", name: "Lames affûtées", icon: "🗡️", img: "images/Icons/talents/t_sharpened_blades.png", slot: "top", tier: null, side: null, maxLevel: 3, perLevel: 0.05, effect: "+5% dégâts d'Attaque finaux, par niveau." },

    { id: "t_war_instinct", name: "Instinct de guerre", icon: "🔥", img: "images/Icons/talents/t_war_instinct.png", slot: "upper_left", tier: "upper", side: "left", requires: "t_sharpened_blades", maxLevel: 3, perLevel: 0.05, effect: "+5% dégâts contre les boss, par niveau." },
    { id: "t_auto_tap", name: "Main spectrale", icon: "👆", img: "images/Icons/talents/t_auto_tap.png", slot: "upper_right", tier: "upper", side: "right", requires: "t_sharpened_blades", maxLevel: 3, perLevel: 0.15, effect: "+15% de remplissage de la jauge de célérité par niveau (frappes bonus plus fréquentes)." },

    { id: "t_precise_strike", name: "Frappe précise", icon: "🎯", img: "images/Icons/talents/t_precise_strike.png", slot: "mid_left", tier: "mid", side: "left", requires: "t_war_instinct", maxLevel: 3, perLevel: 0.06, effect: "+6% chance de critique sur tes attaques, par niveau." },
    { id: "t_battle_trance", name: "Transe de bataille", icon: "⚡", img: "images/Icons/talents/t_battle_trance.png", slot: "mid_right", tier: "mid", side: "right", requires: "t_auto_tap", maxLevel: 3, perLevel: 0.12, effect: "Les frappes bonus (jauge de célérité pleine) infligent +12% dégâts, par niveau." },

    { id: "t_boss_slayer", name: "Tueur de boss", icon: "👑", img: "images/Icons/talents/t_boss_slayer.png", slot: "inner_left", tier: "inner", side: "left", requires: "t_precise_strike", maxLevel: 3, perLevel: 0.08, effect: "+8% dégâts finaux contre les boss, par niveau.", capstone: true },
    { id: "t_assault_frenzy", name: "Frénésie d'assaut", icon: "💥", img: "images/Icons/talents/t_assault_frenzy.png", slot: "inner_right", tier: "inner", side: "right", requires: "t_battle_trance", maxLevel: 3, perLevel: 0.25, effect: "Toutes les 8 Attaques, la suivante inflige +25% dégâts, par niveau.", capstone: true },

    { id: "t_bloodlust", name: "Soif de sang", icon: "🩸", img: "images/Icons/talents/t_bloodlust.png", slot: "lower_left", tier: "lower", side: "left", requires: "t_boss_slayer", maxLevel: 3, perLevel: 0.03, perLevelCap: 0.15, effect: "+3% dégâts contre les boss par ascension (plafond 15%), par niveau.", capstone: true },
    { id: "t_perfect_execution", name: "Exécution parfaite", icon: "☠️", img: "images/Icons/talents/t_perfect_execution.png", slot: "lower_right", tier: "lower", side: "right", requires: "t_assault_frenzy", maxLevel: 3, perLevel: 0.15, effect: "Les boss sous 20% PV subissent +15% dégâts finaux, par niveau.", capstone: true }
  ],

  fortune: [
    { id: "t_interest", name: "Intérêt composé", icon: "💰", img: "images/Icons/talents/t_interest.png", slot: "top", tier: null, side: null, maxLevel: 3, perLevel: 1, effect: "Gain d'or passif toutes les 10 secondes, augmente par niveau." },

    { id: "t_scavenger", name: "Charognard", icon: "🧰", img: "images/Icons/talents/t_scavenger.png", slot: "upper_left", tier: "upper", side: "left", requires: "t_interest", maxLevel: 3, perLevel: 0.08, effect: "+8% or gagné sur les ennemis normaux, par niveau." },
    { id: "t_treasure_hunter", name: "Chasseur de trésors", icon: "🎁", img: "images/Icons/talents/t_treasure_hunter.png", slot: "upper_right", tier: "upper", side: "right", requires: "t_interest", maxLevel: 3, perLevel: 1, effect: "+1 progression bonus pour les quêtes trésor, par niveau." },

    { id: "t_deep_pockets", name: "Bourse profonde", icon: "👛", img: "images/Icons/talents/t_deep_pockets.png", slot: "mid_left", tier: "mid", side: "left", requires: "t_scavenger", maxLevel: 3, perLevel: 0.10, effect: "+10% or sur les coffres et récompenses fixes, par niveau." },
    { id: "t_merchant_instinct", name: "Instinct marchand", icon: "📜", img: "images/Icons/talents/t_merchant_instinct.png", slot: "mid_right", tier: "mid", side: "right", requires: "t_treasure_hunter", maxLevel: 3, perLevel: 5, effect: "+5% de chance d'une récompense bonus, par niveau." },

    { id: "t_golden_touch", name: "Toucher doré", icon: "✨", img: "images/Icons/talents/t_golden_touch.png", slot: "inner_left", tier: "inner", side: "left", requires: "t_deep_pockets", maxLevel: 3, perLevel: 0.12, effect: "+12% or global, par niveau.", capstone: true },
    { id: "t_astral_prospecting", name: "Prospection astrale", icon: "🌠", img: "images/Icons/talents/t_astral_prospecting.png", slot: "inner_right", tier: "inner", side: "right", requires: "t_merchant_instinct", maxLevel: 3, perLevel: 5, effect: "+5% de chance de doubler un butin gagné, par niveau.", capstone: true },

    { id: "t_rich_ritual", name: "Rituel opulent", icon: "🏆", img: "images/Icons/talents/t_rich_ritual.png", slot: "lower_left", tier: "lower", side: "left", requires: "t_golden_touch", maxLevel: 3, perLevel: 1, effect: "+1 Aether supplémentaire lors des grosses ascensions, par niveau.", capstone: true },
    { id: "t_sovereign_treasure", name: "Trésor souverain", icon: "👑", img: "images/Icons/talents/t_sovereign_treasure.png", slot: "lower_right", tier: "lower", side: "right", requires: "t_astral_prospecting", maxLevel: 3, perLevel: 0.20, effect: "+20% or global et bonus sur les récompenses rares, par niveau.", capstone: true }
  ],

  survival: [
    { id: "t_regenerate", name: "Cœur vaillant", icon: "❤️", img: "images/Icons/talents/t_regenerate.png", slot: "top", tier: null, side: null, maxLevel: 3, perLevel: 0.05, effect: "+5% PV max, par niveau." },

    { id: "t_thick_skin", name: "Bouclier renforcé", icon: "🛡️", img: "images/Icons/talents/t_thick_skin.png", slot: "upper_left", tier: "upper", side: "left", requires: "t_regenerate", maxLevel: 3, perLevel: 1, effect: "L'action defense de ta classe (Garde/Esquive/Barrière) dure +1 round, par niveau." },
    { id: "t_second_wind", name: "Peau de pierre", icon: "🪨", img: "images/Icons/talents/t_second_wind.png", slot: "upper_right", tier: "upper", side: "right", requires: "t_regenerate", maxLevel: 3, perLevel: 0.02, effect: "+2% défense passive (hors action defense de classe), par niveau." },

    { id: "t_calm_breath", name: "Riposte du bouclier", icon: "🍃", img: "images/Icons/talents/t_calm_breath.png", slot: "mid_left", tier: "mid", side: "left", requires: "t_thick_skin", maxLevel: 3, perLevel: 0.05, effect: "+5% de réduction/absorption/évasion supplémentaire pendant l'action defense de ta classe, par niveau (en plus de sa valeur de base)." },
    { id: "t_tenacious_will", name: "Vitalité tenace", icon: "🌬️", img: "images/Icons/talents/t_tenacious_will.png", slot: "mid_right", tier: "mid", side: "right", requires: "t_second_wind", maxLevel: 3, perLevel: 0.08, effect: "+8% PV max, par niveau." },

    { id: "t_essence_bloom", name: "Sang-froid", icon: "🔮", img: "images/Icons/talents/t_essence_bloom.png", slot: "inner_left", tier: "inner", side: "left", requires: "t_calm_breath", maxLevel: 3, perLevel: 0.10, effect: "Tu te relèves avec 10% de tes PV max après une défaite, par niveau." /* v3.101.0 : plus de pénalité d'or */, capstone: true },
    { id: "t_vital_anchor", name: "Constitution de fer", icon: "⚓", img: "images/Icons/talents/t_vital_anchor.png", slot: "inner_right", tier: "inner", side: "right", requires: "t_tenacious_will", maxLevel: 3, perLevel: 0.05, effect: "+5% PV max ET +5% défense passive, par niveau.", capstone: true },

    { id: "t_last_stand", name: "Repos du guerrier", icon: "🕯️", img: "images/Icons/talents/t_last_stand.png", slot: "lower_left", tier: "lower", side: "left", requires: "t_essence_bloom", maxLevel: 3, perLevel: 0.10, effect: "+25% de vitesse de régénération au Campement, par niveau." /* v3.101.0 : plus de repos à horloge */, capstone: true },
    { id: "t_immutable_guardian", name: "Gardien immuable", icon: "🌳", img: "images/Icons/talents/t_immutable_guardian.png", slot: "lower_right", tier: "lower", side: "right", requires: "t_vital_anchor", maxLevel: 3, perLevel: 0.10, effect: "+10% PV max et +5% défense passive, par niveau.", capstone: true }
  ]
};

var TALENT_TREE = TALENTTREE;
