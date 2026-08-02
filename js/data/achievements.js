"use strict";
/* ============================================================
Quest Idle — data/achievements.js
Catalogue des hauts faits : 5 catégories (Combat/Ascension/Bestiaire/
Équipement/Donjon), plusieurs paliers chacune. Chaque haut fait a une
fonction track() qui lit l'état courant du jeu, et un bonus permanent
minime accordé une fois réclamé (voir systems/achievement-system.js
pour l'agrégation des bonus, appliquée dans StatsSystem.recalcStats).
Volontairement de petits bonus cumulables plutôt qu'une grosse
récompense isolée — l'idée est de donner une raison de "cocher toutes
les cases" sur la durée, comme le bonus de bestiaire.
============================================================ */

function achievementBestiaryPercent() {
  if (typeof getAllBestiaryIds !== "function") return 0;
  var ids = getAllBestiaryIds();
  if (!ids.length) return 0;
  var found = ids.filter(function (id) { return (game.killCounts && game.killCounts[id]) > 0; }).length;
  return Math.round((found / ids.length) * 100);
}

function achievementHasRarityOwned(rarity) {
  var owned = (game.inventory || []).concat(
    game.equipped ? [game.equipped.weapon, game.equipped.armor, game.equipped.amulet] : []
  ).filter(Boolean);
  return owned.some(function (item) { return item.rarity === rarity; });
}

var ACHIEVEMENTS_DB = [
  // ---- Combat ----
  { id: "ach_kills_1", category: "combat", name: "Chasseur débutant", icon: "⚔️", desc: "Vaincre 100 ennemis.", target: 100, track: function () { return game.totalKills || 0; }, reward: { goldMult: 0.005 } },
  { id: "ach_kills_2", category: "combat", name: "Chasseur aguerri", icon: "⚔️", desc: "Vaincre 1 000 ennemis.", target: 1000, track: function () { return game.totalKills || 0; }, reward: { goldMult: 0.01 } },
  { id: "ach_kills_3", category: "combat", name: "Chasseur légendaire", icon: "⚔️", desc: "Vaincre 10 000 ennemis.", target: 10000, track: function () { return game.totalKills || 0; }, reward: { goldMult: 0.02 } },
  { id: "ach_crits_1", category: "combat", name: "Œil affûté", icon: "🎯", desc: "Infliger 100 coups critiques.", target: 100, track: function () { return (game.questProgress && game.questProgress.crits) || 0; }, reward: { tapMult: 0.01 } },
  { id: "ach_crits_2", category: "combat", name: "Précision mortelle", icon: "🎯", desc: "Infliger 1 000 coups critiques.", target: 1000, track: function () { return (game.questProgress && game.questProgress.crits) || 0; }, reward: { tapMult: 0.02 } },

  // ---- Ascension ----
  { id: "ach_ascend_1", category: "ascension", name: "Premier envol", icon: "🌀", desc: "Effectuer 1 ascension.", target: 1, track: function () { return game.ascensionCount || 0; }, reward: { goldMult: 0.02 } },
  { id: "ach_ascend_2", category: "ascension", name: "Cycle maîtrisé", icon: "🌀", desc: "Effectuer 5 ascensions.", target: 5, track: function () { return game.ascensionCount || 0; }, reward: { tapMult: 0.03 } },
  { id: "ach_ascend_3", category: "ascension", name: "Au-delà des mondes", icon: "🌀", desc: "Effectuer 15 ascensions.", target: 15, track: function () { return game.ascensionCount || 0; }, reward: { tapMult: 0.05, goldMult: 0.05 } },

  // ---- Bestiaire ----
  { id: "ach_bestiary_25", category: "bestiary", name: "Naturaliste amateur", icon: "📖", desc: "Rencontrer 25% des créatures du bestiaire.", target: 25, track: achievementBestiaryPercent, reward: { essenceGlobalMult: 0.01 } },
  { id: "ach_bestiary_50", category: "bestiary", name: "Naturaliste confirmé", icon: "📖", desc: "Rencontrer 50% des créatures du bestiaire.", target: 50, track: achievementBestiaryPercent, reward: { essenceGlobalMult: 0.02 } },
  { id: "ach_bestiary_100", category: "bestiary", name: "Bestiaire complet", icon: "📖", desc: "Rencontrer 100% des créatures du bestiaire.", target: 100, track: achievementBestiaryPercent, reward: { essenceGlobalMult: 0.05 } },

  // ---- Équipement ----
  { id: "ach_equip_epic", category: "equipment", name: "Premier éclat", icon: "🎁", desc: "Posséder un objet épique.", target: 1, track: function () { return achievementHasRarityOwned("epic") ? 1 : 0; }, reward: { goldMult: 0.01 } },
  { id: "ach_equip_legendary", category: "equipment", name: "Éclat légendaire", icon: "🎁", desc: "Posséder un objet légendaire.", target: 1, track: function () { return achievementHasRarityOwned("legendary") ? 1 : 0; }, reward: { tapMult: 0.03, goldMult: 0.02 } },
  { id: "ach_equip_set", category: "equipment", name: "Panoplie assortie", icon: "🎁", desc: "Avoir un bonus de panoplie actif (3 pièces de même rareté).", target: 1, track: function () { return (window.StatsSystem && StatsSystem.getSetBonus().config) ? 1 : 0; }, reward: { tapMult: 0.02 } },

  // ---- Donjon ----
  { id: "ach_dungeon_wave1", category: "dungeon", name: "Première incursion", icon: "🏰", desc: "Passer la 1ère vague d'un donjon.", target: 1, track: function () { return game.dungeonBestWave || 0; }, reward: { goldMult: 0.01 } },
  { id: "ach_dungeon_boss", category: "dungeon", name: "Vainqueur de donjon", icon: "🏰", desc: "Vaincre le boss d'un donjon.", target: 1, track: function () { return (game.dungeonBossClears || 0) >= 1 ? 1 : 0; }, reward: { tapMult: 0.03 } },
  { id: "ach_dungeon_3boss", category: "dungeon", name: "Habitué des donjons", icon: "🏰", desc: "Vaincre 3 boss de donjon.", target: 3, track: function () { return game.dungeonBossClears || 0; }, reward: { tapMult: 0.04, goldMult: 0.03 } }
];

var ACHIEVEMENT_CATEGORY_LABELS = {
  combat: "Combat",
  ascension: "Ascension",
  bestiary: "Bestiaire",
  equipment: "Équipement",
  dungeon: "Donjon"
};

window.ACHIEVEMENTS_DB = ACHIEVEMENTS_DB;
window.ACHIEVEMENT_CATEGORY_LABELS = ACHIEVEMENT_CATEGORY_LABELS;
