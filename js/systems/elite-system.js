"use strict";
/* systems/elite-system.js — point d'entrée UNIQUE des créatures élite (data/elites.js).

   Pourquoi un module séparé plutôt qu'un spawn écrit en ligne dans
   adventure-quest-system.js : le jour où une élite devra ressusciter en phase 2
   (idée Seb) ou peupler un donjon de monde (refonte prévue), tout se passera
   ici, dans un fichier NON protégé. adventure-quest-system.js ne fait que
   déléguer.

   Séparation volontaire entre IDENTITÉ (nom, archétype, multiplicateurs
   relatifs — data/elites.js) et MISE À L'ÉCHELLE (contextuelle, calculée par
   l'appelant). C'est ce qui permettra au Donjon d'échelonner la même élite sur
   son palier au lieu du monde, sans redéfinir la créature. */

var EliteManager = {
  get: function (eliteId) {
    return (window.ELITE_DB && ELITE_DB[eliteId]) || null;
  },

  isElite: function (enemy) {
    return !!(enemy && enemy.isElite);
  },

  /* Échelle de PV/puissance d'une élite dans un MONDE donné. Reprend la branche
     boss de WorldManager.generateEnemy() : composante de monde + aventure.
     Un appelant d'un autre contexte (Donjon) fournira la sienne. */
  scaleFor: function (worldIndex, adventureIndex) {
    var mult = (window.WORLD_MULT_BY_WORLD && WORLD_MULT_BY_WORLD[worldIndex] != null)
      ? WORLD_MULT_BY_WORLD[worldIndex] * (window.BOSS_WORLD_MULT_RATIO || (1.3 / 0.90))
      : 1.3;
    var exp = (typeof ENEMY_PV_WORLD_EXP === "number") ? ENEMY_PV_WORLD_EXP : 1.45;
    var worldComponent = Math.pow(1 + worldIndex * mult, exp);
    return worldComponent + adventureIndex * 0.4 + (game.cycleCount || 0) * 0.7;
  },

  /* Fabrique l'objet ennemi d'une élite. Même FORME que WorldManager.generateEnemy()
     et DungeonManager.buildWaveEnemy() — le moteur ne voit aucune différence,
     hormis isElite qui pilote l'exaltation (combat-engine.js) et l'affichage. */
  build: function (eliteId, scale) {
    var def = this.get(eliteId);
    if (!def) return null;
    var base = (window.ENEMY_DB && ENEMY_DB[def.baseId]) || null;
    if (!base || !base.stats) return null;

    var s = scale;
    if (typeof s !== "number" || !isFinite(s) || s <= 0) s = 1;

    var mult = def.statMult || {};
    var stats = {
      power: Math.max(1, Math.floor(base.stats.power * (mult.power || 1))),
      endurance: Math.max(1, Math.floor(base.stats.endurance * (mult.endurance || 1))),
      celerity: Math.max(0, Math.floor(base.stats.celerity * (mult.celerity || 1))),
      precision: base.stats.precision,
      will: base.stats.will
    };

    var pvMult = (typeof BOSS_PV_MULT === "number") ? BOSS_PV_MULT : 3.1;
    var milestone = (window.WorldManager && typeof WorldManager.getCycleMilestoneMult === "function")
      ? WorldManager.getCycleMilestoneMult() : 1;
    var hp = Math.max(1, Math.floor(stats.endurance * pvMult * s * milestone));

    var powerExp = (typeof ENEMY_POWER_SCALE_EXP === "number") ? ENEMY_POWER_SCALE_EXP : 0.3;
    stats.power = Math.max(1, Math.floor(stats.power * Math.pow(s, powerExp) * milestone));

    return {
      id: def.id,
      name: def.name,
      asset: base.asset,
      image: base.image,          // portrait de la base : décision actée, icônes dédiées plus tard
      isBoss: true,               // hérite dégâts ×1,5, bouclier, immunité résist/faiblesse
      isElite: true,              // pilote l'exaltation (combat-engine.js) et la jauge élite
      archetype: def.archetype || null,
      hp: hp,
      maxHp: hp,
      goldReward: Math.floor(60 * s),
      essenceReward: 5 + (window.WorldManager ? WorldManager.worldIndex : 0),
      resists: base.resists || [],  // ignorés tant que isBoss (combat-engine.js), conservés pour le bestiaire
      weak: base.weak || [],
      stats: stats
    };
  },

  /* Spawn dans le combat courant. worldId/adventureIndex viennent de la quête. */
  spawn: function (eliteId, worldId, adventureIndex) {
    if (!window.WORLDS) return null;
    var worldIndex = WORLDS.findIndex(function (w) { return w.id === worldId; });
    if (worldIndex === -1) worldIndex = 0;

    var enemy = this.build(eliteId, this.scaleFor(worldIndex, adventureIndex || 0));
    if (!enemy) return null;

    game.enemy = enemy;
    if (window.CombatEngine && typeof CombatEngine.prepareEnemy === "function") {
      CombatEngine.prepareEnemy(enemy);
    }
    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
    return enemy;
  },

  /* Butin unique de l'élite, déclinée pour la classe du héros courant quand
     l'emplacement l'exige (armes seulement, voir data/elites.js). Même forme
     d'objet que generateEquipmentItem() : rien à changer côté inventaire,
     équipement ou affichage. `unique: true` empêche l'autovente de la liquider
     (voir EquipmentManager). */
  buildUniqueLoot: function (eliteId) {
    var def = (window.ELITE_UNIQUE_LOOT || {})[eliteId];
    if (!def) return null;

    var entry = def.item;
    if (!entry && def.byClass) {
      var cls = (typeof getClassByHeroId === "function") ? getClassByHeroId(game.heroId) : null;
      entry = def.byClass[cls ? cls.id : "knight"] || def.byClass.knight;
    }
    if (!entry) return null;

    return {
      uid: "itm_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
      slot: def.slot,
      name: entry.name,
      icon: entry.icon,
      rarity: def.rarity || "green",
      stat: def.stat,
      value: def.value,
      unique: true,
      eliteId: eliteId
    };
  },

  /* Butin d'une élite vaincue : l'objet unique + la Sève. Appelé par la quête. */
  grantReward: function (eliteId, seveAmount) {
    var rows = [];
    var loot = this.buildUniqueLoot(eliteId);
    if (loot && typeof addLootToInventory === "function") {
      addLootToInventory(loot);
      var labels = window.ELITE_UNIQUE_LOOT_LABELS || {};
      rows.push({ label: labels[loot.slot] || "Objet unique", value: loot.name });
    }
    var seve = Number(seveAmount || 0);
    if (seve > 0 && window.WarehouseManager && typeof WarehouseManager.addResource === "function") {
      WarehouseManager.addResource("seve_aeswyn", seve); // seul point d'écriture des ressources
      rows.push({ label: "Sève d'Aeswyn", value: seve });
    }
    return rows;
  }
};

window.EliteManager = EliteManager;
