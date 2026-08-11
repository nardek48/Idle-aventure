"use strict";
/* ============================================================
Quest Idle — systems/loot-system.js
Génération des drops d'objets (uniquement au kill d'un boss, voir
CombatEngine.killEnemy en combat-engine.js).

v2.83.55 : génération PROCÉDURALE — un objet est maintenant construit
à la volée (type, nom, icône tirés dans les pools d'EQUIPMENT_SLOT_CONFIG,
valeur tirée aléatoirement dans la plage bornée par la rareté), au
lieu d'être choisi dans une liste de 51 objets écrits à la main.
============================================================ */

/* Construit un objet d'équipement PROCÉDURAL pour un emplacement et
   une rareté donnés : nom/icône tirés au hasard dans les pools du
   slot (flavor uniquement), valeur tirée aléatoirement dans la plage
   bornée par la rareté (voir EQUIPMENT_SLOT_CONFIG en data/equipment.js),
   arrondie à config.decimals décimales. */
function generateEquipmentItem(slot, rarity) {
  var config = EQUIPMENT_SLOT_CONFIG[slot];
  if (!config) return null;

  var range = config.ranges[rarity] || config.ranges.common;
  var raw = randFloat(range[0], range[1]);
  var decimals = config.decimals || 0;
  var factor = Math.pow(10, decimals);
  var value = Math.round(raw * factor) / factor;

  var icon = config.icons[randInt(0, config.icons.length - 1)];
  var name = config.names[randInt(0, config.names.length - 1)];

  return {
    uid: "itm_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
    slot: slot,
    name: name,
    icon: icon,
    rarity: rarity,
    stat: config.stat,
    value: value
  };
}

/* Renvoie la liste des raretés actuellement tirables, selon le monde en
   cours. En plein cycle (le joueur a bouclé tous les mondes une fois
   sans ascensionner), toutes les raretés sont débloquées dès le monde 0
   — mais SEULEMENT si la questline de la Tour est terminée (v2.83.1).

   Avant le système de questlines (v2.83), "cycleCount > 0" impliquait
   forcément d'avoir fait beaucoup d'ascensions (seul moyen d'atteindre
   la Tour), donc ce déblocage anticipé était implicitement réservé aux
   joueurs très avancés. Depuis que les mondes se débloquent par
   questline indépendamment de l'ascension, un joueur pouvait boucler
   un cycle sans avoir ascensionné une seule fois et se retrouver à
   looter du Légendaire dès la Forêt avec un perso encore très faible.
   On re-conditionne donc explicitement à la questline de la Tour
   (voir data/world-quests.js / WorldQuestManager), qui reste le signe
   fiable d'avoir vraiment fini le contenu, peu importe l'ascension. */
function getAllowedRarities() {
  var worldIndex = (window.WorldManager && WorldManager.worldIndex) || 0;
  var towerQuestDone = !!(window.WorldQuestManager && WorldQuestManager.isWorldUnlocked(5));
  var isCycling = (game.cycleCount || 0) > 0 && towerQuestDone;
  var maxTier = WORLD_RARITY_UNLOCKS.length - 1;
  var tierIndex = isCycling ? maxTier : Math.min(Math.max(0, worldIndex), maxTier);
  return WORLD_RARITY_UNLOCKS[tierIndex] || ["common"];
}

var LootSystem = {
  /* Tire un objet aléatoire : un emplacement au hasard parmi les 7
     (EQUIPMENT_SLOTS), une rareté pondérée par RARITY_DROP_RATES MAIS
     restreinte aux raretés débloquées (getAllowedRarities), puis
     génère l'objet procéduralement pour ce couple slot/rareté. */
  rollDrop: function () {
    var slot = EQUIPMENT_SLOTS[randInt(0, EQUIPMENT_SLOTS.length - 1)];

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

    return generateEquipmentItem(slot, rarity);
  },

  /* Comme rollDrop(), mais avec une rareté imposée plutôt que tirée au
     sort — utilisé pour les récompenses garanties (voir
     systems/dungeon-system.js). */
  rollDropAtRarity: function (rarity) {
    var slot = EQUIPMENT_SLOTS[randInt(0, EQUIPMENT_SLOTS.length - 1)];
    return generateEquipmentItem(slot, rarity);
  }
};

window.LootSystem = LootSystem;
window.generateEquipmentItem = generateEquipmentItem;
window.getAllowedRarities = getAllowedRarities;