"use strict";
/* systems/dungeon-system.js — gauntlet de 15 vagues + boss, séparé de la progression normale des mondes.
   Branché depuis combat-engine.js (killEnemy/onHeroDefeated délèguent ici si game.dungeonRun.active). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var DungeonManager = {
  ensure: function () {
    if (typeof game.dungeonTickets !== "number") game.dungeonTickets = DUNGEON_CONFIG.freeTicketsPerDay;
    if (typeof game.dungeonTicketResetTime !== "number") game.dungeonTicketResetTime = 0;
    if (typeof game.dungeonTicketsPurchasedToday !== "number") game.dungeonTicketsPurchasedToday = 0;
    if (!game.dungeonRun || typeof game.dungeonRun !== "object") {
      game.dungeonRun = { active: false, wave: 0, tierId: 1 };
    }
    if (typeof game.dungeonRun.tierId !== "number") game.dungeonRun.tierId = 1;
    if (typeof game.dungeonBestWave !== "number") game.dungeonBestWave = 0;
    if (typeof game.dungeonBossClears !== "number") game.dungeonBossClears = 0;
    if (typeof game.dungeonShards !== "number") game.dungeonShards = 0;
    if (!game.dungeonShopLevels || typeof game.dungeonShopLevels !== "object") game.dungeonShopLevels = {};
    if (!game.dungeonTierCleared || typeof game.dungeonTierCleared !== "object") game.dungeonTierCleared = {};
  },

  getTierById: function (tierId) {
    return (DUNGEON_TIERS || []).find(function (t) { return t.id === tierId; }) || DUNGEON_TIERS[0];
  },

  getDungeonForTier: function (tierId) {
    return (window.DUNGEONS || []).find(function (d) {
      return (d.tierIds || []).indexOf(tierId) !== -1;
    }) || null;
  },

  applyDungeonTheme: function (tierId) {
    var root = document.documentElement;
    if (!root) return;
    var dungeon = this.getDungeonForTier(tierId);
    if (dungeon && dungeon.combatMap) {
      root.style.setProperty("--world-combat-map", 'url("' + dungeon.combatMap + '")');
    }
  },

  isTierUnlocked: function (tierId) {
    var tiers = DUNGEON_TIERS || [];
    var index = -1;
    for (var i = 0; i < tiers.length; i++) {
      if (tiers[i].id === tierId) { index = i; break; }
    }
    if (index <= 0) return true;

    var previousTier = tiers[index - 1];
    this.ensure();
    return !!game.dungeonTierCleared[previousTier.id];
  },

  checkTicketReset: function () {
    this.ensure();
    var now = Date.now();
    if (now >= (game.dungeonTicketResetTime || 0)) {
      game.dungeonTickets = DUNGEON_CONFIG.freeTicketsPerDay;
      game.dungeonTicketsPurchasedToday = 0;
      game.dungeonTicketResetTime = now + DUNGEON_CONFIG.ticketResetHours * 3600 * 1000;
    }
  },

  timeUntilTicketReset: function () {
    this.ensure();
    var diff = Math.max(0, (game.dungeonTicketResetTime || 0) - Date.now());
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    return h + "h " + m + "m";
  },

  getTicketBuyCost: function () {
    this.ensure();
    var baseCost = DUNGEON_CONFIG.ticketCostEssence || 100;
    var boughtToday = game.dungeonTicketsPurchasedToday || 0;
    var growth = DUNGEON_CONFIG.ticketCostGrowth || 1.35;
    return Math.floor(baseCost * Math.pow(growth, boughtToday));
  },

  buyTicket: function () {
    this.ensure();
    this.checkTicketReset();

    var maxPerDay = DUNGEON_CONFIG.maxTicketPurchasesPerDay || 20;
    if ((game.dungeonTicketsPurchasedToday || 0) >= maxPerDay) {
      return showToast("Limite journalière atteinte (" + maxPerDay + "/jour)", 1600);
    }

    var cost = this.getTicketBuyCost();
    if ((game.essence || 0) < cost) return showToast("Pas assez d'essence", 1000);

    game.essence -= cost;
    game.dungeonTickets = (game.dungeonTickets || 0) + 1;
    game.dungeonTicketsPurchasedToday = (game.dungeonTicketsPurchasedToday || 0) + 1;
    addLog("🎟️ Ticket de donjon acheté (" + cost + " essence)", "event");
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  buildWaveEnemy: function (wave) {
    this.ensure();
    var tier = this.getTierById(game.dungeonRun.tierId);
    var isBossWave = wave > DUNGEON_CONFIG.waveCount;
    var tierWorldPower = Math.max(0, tier.worldPower || 0);
    var worldScale = 1 + tierWorldPower * 0.6;
    var waveProgress = Math.min(1, wave / DUNGEON_CONFIG.waveCount);
    var premium = isBossWave ? DUNGEON_CONFIG.bossPremiumMult : DUNGEON_CONFIG.basePremiumMult;
    var tierDifficultyMult = Math.max(1, tier.difficultyMult || 1);
    var scale = worldScale * (1 + waveProgress * DUNGEON_CONFIG.waveRampMult) * premium * tierDifficultyMult;

    var id, data;

    if (isBossWave) {
      var bossIds = Object.keys(BOSS_DB);
      id = bossIds[randInt(0, bossIds.length - 1)];
      data = BOSS_DB[id];
    } else {
      var pool = [];
      for (var w = 0; w <= tierWorldPower && w < WORLDS.length; w++) {
        (WORLDS[w].adventures || []).forEach(function (adv) {
          (adv.enemyPool || []).forEach(function (eid) {
            if (pool.indexOf(eid) === -1) pool.push(eid);
          });
        });
      }
      if (!pool.length) pool = Object.keys(ENEMY_DB);
      id = pool[randInt(0, pool.length - 1)];
      data = ENEMY_DB[id];
    }

    var stats = (data && data.stats) || makeRpgStats(10, 10, 10, 10, 10);

    var hpCoef = isBossWave ? 2.8 : 1.5;
    var damageScale = 0.4;
    var speedScale = 0.65;
    var precisionScale = 0.75;

    var hp = Math.max(1, Math.floor((stats.endurance || 0) * hpCoef * scale));

    return {
      id: id,
      name: (isBossWave ? "👑 " : "") + (data ? data.name : "Ennemi") + " (" + tier.name + ")",
      asset: data ? data.asset : "slime",
      isBoss: isBossWave,
      hp: hp,
      maxHp: hp,
      goldReward: Math.floor((isBossWave ? 60 : 8) * scale),
      essenceReward: isBossWave ? 5 : 1,
      resists: (data && data.resists) || [],
      weak: (data && data.weak) || [],
      stats: {
        power: Math.floor((stats.power || 0) * (1 + waveProgress) * Math.sqrt(tierDifficultyMult) * damageScale),
        endurance: stats.endurance || 0,
        celerity: Math.floor((stats.celerity || 0) * (1 + waveProgress * 0.5) * Math.sqrt(tierDifficultyMult) * speedScale),
        precision: Math.floor((stats.precision || 0) * (1 + waveProgress * 0.5) * precisionScale),
        will: stats.will || 0
      }
    };
  },

  spawnWave: function (wave) {
    this.ensure();
    game.dungeonRun.wave = wave;
    game.enemy = this.buildWaveEnemy(wave);
    if (window.CombatEngine && typeof CombatEngine.prepareEnemy === "function") CombatEngine.prepareEnemy(game.enemy);
    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
  },

  start: function (tierId) {
    this.ensure();
    this.checkTicketReset();

    var tier = this.getTierById(tierId);
    if (!this.isTierUnlocked(tier.id)) return showToast("Palier verrouillé", 1200);
    if ((game.heroHp || 0) <= 0) return showToast("Héros à terre — repose-toi au Campement d'abord", 1600);
    if ((game.dungeonTickets || 0) <= 0) return showToast("Aucun ticket de donjon", 1200);
    if (game.dungeonRun.active) return showToast("Donjon déjà en cours", 1200);
    if (game.adventureQuestRun && game.adventureQuestRun.active) return showToast("Termine ou abandonne ta quête en cours avant d'entrer en donjon", 1600);
    if (game.huntRun && game.huntRun.active) return showToast("Termine ou arrête ta chasse en cours avant d'entrer en donjon", 1600);

    game.dungeonTickets -= 1;
    game.dungeonRun = { active: true, wave: 0, tierId: tier.id, shardsEarned: 0 };
    if (!game.dungeonTiersEntered || typeof game.dungeonTiersEntered !== "object") game.dungeonTiersEntered = {};
    game.dungeonTiersEntered[tier.id] = true;
    game.heroHp = game.heroMaxHp || 1;
    if (window.SortieManager) { SortieManager.end("return"); SortieManager.start("dungeon"); } // v3.102.1 : le donjon est une sortie
    addLog("🏰 Entrée dans " + tier.name + " !", "event");
    this.applyDungeonTheme(tier.id);
    this.spawnWave(1);
    if (typeof switchTab === "function") switchTab("combat");
    saveGame();
  },

  onEnemyKilled: function () {
    this.ensure();
    var clearedWave = game.dungeonRun.wave;
    if (clearedWave > (game.dungeonBestWave || 0)) game.dungeonBestWave = clearedWave;

    game.dungeonShards = Number(game.dungeonShards || 0) + (DUNGEON_CONFIG.shardsPerWaveCleared || 1);
    game.dungeonRun.shardsEarned = Number(game.dungeonRun.shardsEarned || 0) + (DUNGEON_CONFIG.shardsPerWaveCleared || 1);

    if (clearedWave > DUNGEON_CONFIG.waveCount) {
      this.finish(true, clearedWave);
      return;
    }

    var nextWave = clearedWave + 1;
    if (nextWave > DUNGEON_CONFIG.waveCount) {
      addLog("🏰 Vagues terminées ! Le boss du donjon apparaît...", "event");
      showToast("👑 Le boss du donjon apparaît !", 2000);
    }
    this.spawnWave(nextWave);
  },

  onDefeat: function () {
    this.ensure();
    var clearedWave = Math.max(0, (game.dungeonRun.wave || 1) - 1);
    if (clearedWave > (game.dungeonBestWave || 0)) game.dungeonBestWave = clearedWave;

    // v3.102.0 (P2) : même règle de mort qu'ailleurs (PV 0, Sang-froid, retour Campement)
    var keptPct = (game.talents && game.talents.t_essence_bloom) ? game.talents.t_essence_bloom * 0.10 : 0;
    game.heroHp = Math.floor((game.heroMaxHp || 1) * keptPct);
    addLog("💀 Tentative de donjon interrompue à la vague " + (game.dungeonRun.wave || 1) + " ! Retour au Campement.", "event");
    vibrate([80, 40, 80]);

    this.finish(false, clearedWave, "death");
    game.justDied = true;
    if (typeof switchTab === "function") switchTab("campement");
  },

  forfeit: function () {
    this.ensure();
    if (!game.dungeonRun.active) return;

    var clearedWave = Math.max(0, (game.dungeonRun.wave || 1) - 1);
    if (clearedWave > (game.dungeonBestWave || 0)) game.dungeonBestWave = clearedWave;

    if (window.SortieManager) SortieManager.end("flee"); // v3.102.1 : abandon = fuite, 50 % du butin
    addLog("🏳️ Donjon abandonné à la vague " + (game.dungeonRun.wave || 1) + ".", "event");
    this.finish(false, clearedWave, "flee");
  },

  /* outcome (échec) : "flee" = récompense partielle ÷ 2 ; "death" = aucune récompense partielle (v3.102.1, la mort coûte le butin) */
  finish: function (success, clearedWave, outcome) {
    this.ensure();
    if (success && window.SortieManager) SortieManager.end("success");
    var tier = this.getTierById(game.dungeonRun.tierId);
    var wavesTotal = DUNGEON_CONFIG.waveCount;
    var progress = Math.max(0, Math.min(1, clearedWave / wavesTotal));

    var worldBonus = 1 + Math.max(0, tier.worldPower || 0) * 0.5 + Math.sqrt(Math.max(1, tier.difficultyMult || 1)) * 0.4;
    var goldReward, essenceReward, grantLoot, lootRarity;

    var rarityOrder = (typeof RARITY_ORDER !== "undefined" && RARITY_ORDER) || ["common", "green", "rare", "epic", "legendary"];
    var tierMaxIndex = Math.max(0, rarityOrder.indexOf(tier.maxRarity));
    var allowedForTier = rarityOrder.slice(0, tierMaxIndex + 1);

    if (success) {
      goldReward = Math.floor(DUNGEON_CONFIG.fullClearGoldBase * worldBonus);
      essenceReward = Math.floor(DUNGEON_CONFIG.fullClearEssenceBase * worldBonus);
      grantLoot = true;
      lootRarity = tier.maxRarity;
      game.dungeonBossClears = Number(game.dungeonBossClears || 0) + 1;
      game.dungeonShards = Number(game.dungeonShards || 0) + (DUNGEON_CONFIG.shardsBossBonus || 10);
      game.dungeonRun.shardsEarned = Number(game.dungeonRun.shardsEarned || 0) + (DUNGEON_CONFIG.shardsBossBonus || 10);

      if (!game.dungeonTierCleared || typeof game.dungeonTierCleared !== "object") game.dungeonTierCleared = {};
      var wasAlreadyCleared = !!game.dungeonTierCleared[tier.id];
      game.dungeonTierCleared[tier.id] = true;
      if (!wasAlreadyCleared) {
        addLog("🔓 " + esc(tier.name) + " entièrement terminé — palier suivant débloqué !", "event");
      }
    } else if (outcome === "death") {
      goldReward = 0;
      essenceReward = 0;
      grantLoot = false;
      lootRarity = null;
    } else {
      var fleeKeep = (typeof SORTIE_FLEE_KEEP_PCT === "number") ? SORTIE_FLEE_KEEP_PCT : 0.5;
      goldReward = Math.floor(DUNGEON_CONFIG.fullClearGoldBase * worldBonus * progress * 0.6 * fleeKeep);
      essenceReward = Math.floor(DUNGEON_CONFIG.fullClearEssenceBase * worldBonus * progress * 0.6 * fleeKeep);
      grantLoot = chance(DUNGEON_CONFIG.partialLootChance * fleeKeep);
      lootRarity = allowedForTier[randInt(0, allowedForTier.length - 1)];
    }

    game.gold += goldReward;
    game.essence += essenceReward;
    game.totalGoldEarned += goldReward;

    var lootedItem = null;
    if (grantLoot && window.LootSystem && typeof LootSystem.rollDropAtRarity === "function") {
      var drop = LootSystem.rollDropAtRarity(lootRarity);
      if (drop && addDropToInventory(drop)) lootedItem = drop;
    }

    var shardsGained = Number(game.dungeonRun.shardsEarned || 0);
    game.dungeonRun = { active: false, wave: 0 };

    var msg = success
      ? "🏆 " + tier.name + " terminé ! +" + formatNumber(goldReward) + " or, +" + essenceReward + " essence"
      : (outcome === "death"
        ? "🏰 " + tier.name + " : terrassé à la vague " + (clearedWave + 1) + "/" + wavesTotal + " — aucune récompense, le butin reste dans le donjon."
        : "🏰 " + tier.name + " abandonné (vague " + clearedWave + "/" + wavesTotal + ") : +" + formatNumber(goldReward) + " or, +" + essenceReward + " essence (moitié)");
    if (lootedItem) msg += " + " + lootedItem.name;

    addLog(msg, success ? "boss" : "event");
    showToast(success ? "🏆 Donjon terminé !" : "🏰 Donjon interrompu", 2200);

    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
      CombatEngine.spawnEnemy();
    }

    if (typeof renderAll === "function") renderAll();

    if (typeof openDungeonSummary === "function") {
      openDungeonSummary({
        success: success,
        tierName: tier.name,
        clearedWave: clearedWave,
        wavesTotal: wavesTotal,
        goldReward: goldReward,
        essenceReward: essenceReward,
        shardsGained: shardsGained,
        lootedItem: lootedItem
      });
    }

    saveGame();
  },

  getShardShopLevel: function (id) {
    this.ensure();
    return Number(game.dungeonShopLevels[id] || 0);
  },

  getShardShopCost: function (item) {
    var level = this.getShardShopLevel(item.id);
    return Math.floor(item.baseCost * Math.pow(item.costMult, level));
  },

  buyShardUpgrade: function (id) {
    this.ensure();
    var item = (DUNGEON_SHOP || []).find(function (u) { return u.id === id; });
    if (!item) return;

    var level = this.getShardShopLevel(id);
    if (level >= item.maxLevel) return showToast("Niveau maximum atteint", 1200);

    var cost = this.getShardShopCost(item);
    if ((game.dungeonShards || 0) < cost) return showToast("Pas assez d'Éclats", 1000);

    game.dungeonShards -= cost;
    game.dungeonShopLevels[id] = level + 1;

    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }

    addLog("🔷 " + item.name + " amélioré (niveau " + (level + 1) + ")", "event");
    showToast(item.name + " +1", 1500);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  getShardShopBonuses: function () {
    this.ensure();
    return {
      power: this.getShardShopLevel("d_power") * 0.02,
      gold: this.getShardShopLevel("d_gold") * 0.02,
      essence: this.getShardShopLevel("d_essence") * 0.02,
      defense: this.getShardShopLevel("d_defense") * 0.01
    };
  }
};

window.DungeonManager = DungeonManager;
