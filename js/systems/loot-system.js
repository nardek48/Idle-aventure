"use strict";
/* ============================================================
Quest Idle — systems/loot-system.js
Génération des drops d'objets (uniquement au kill d'un boss, voir
CombatEngine.killEnemy en combat-engine.js).
============================================================ */

/* Duplique un objet du catalogue (EQUIPMENT_DB) en une instance
   possédée par le joueur, avec un identifiant unique (uid) pour
   pouvoir la retrouver dans l'inventaire/l'équipé. */
function cloneItem(template, slot) {
  return {
    uid: "itm_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
    slot: slot,
    name: template.name,
    icon: template.icon,
    rarity: template.rarity,
    stat: template.stat,
    value: template.value
  };
}

/* Renvoie la liste des raretés actuellement tirables, selon le monde en
   cours. En plein cycle (le joueur a déjà bouclé tous les mondes une fois
   sans ascensionner), toutes les raretés sont débloquées dès le monde 0. */
function getAllowedRarities() {
  var worldIndex = (window.WorldManager && WorldManager.worldIndex) || 0;
  var isCycling = (game.cycleCount || 0) > 0;
  var maxTier = WORLD_RARITY_UNLOCKS.length - 1;
  var tierIndex = isCycling ? maxTier : Math.min(Math.max(0, worldIndex), maxTier);
  return WORLD_RARITY_UNLOCKS[tierIndex] || ["common"];
}

var LootSystem = {
  /* Tire un objet aléatoire : d'abord un emplacement (arme/armure/
     amulette) au hasard, puis une rareté pondérée par RARITY_DROP_RATES
     MAIS restreinte aux raretés débloquées (getAllowedRarities), puis un
     objet au hasard parmi ceux du catalogue ayant cette rareté. */
  rollDrop: function () {
    var slot = ["weapon", "armor", "amulet"][randInt(0, 2)];
    var pool = EQUIPMENT_DB[slot] || [];
    if (!pool.length) return null;

    var allowed = getAllowedRarities();
    var weights = allowed.map(function (r) { return RARITY_DROP_RATES[r] || 0; });
    var totalWeight = weights.reduce(function (a, b) { return a + b; }, 0);

    if (totalWeight <= 0) {
      allowed = ["common"];
      weights = [1];
      totalWeight = 1;
    }

    // Tirage pondéré classique : on accumule les poids et on regarde
    // dans quelle "tranche" tombe le nombre aléatoire.
    var roll = Math.random() * totalWeight;
    var rarity = allowed[allowed.length - 1];
    var acc = 0;
    for (var i = 0; i < allowed.length; i++) {
      acc += weights[i];
      if (roll < acc) {
        rarity = allowed[i];
        break;
      }
    }

    var candidates = pool.filter(function (item) {
      return item.rarity === rarity;
    });

    // Filets de sécurité si jamais aucun objet de cette rareté exacte
    // n'existe dans ce catalogue (ne devrait pas arriver en pratique).
    if (!candidates.length) {
      candidates = pool.filter(function (item) {
        return allowed.indexOf(item.rarity) !== -1;
      });
    }
    if (!candidates.length) candidates = pool;
    return cloneItem(candidates[randInt(0, candidates.length - 1)], slot);
  }
};

window.LootSystem = LootSystem;
window.cloneItem = cloneItem;
window.getAllowedRarities = getAllowedRarities;