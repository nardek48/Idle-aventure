"use strict";
/* ============================================================
Quest Idle — systems/dungeon-system.js
Le premier donjon : gauntlet de 15 vagues + boss, séparé de la
progression normale des mondes (voir data/dungeon.js pour la config,
et combat-engine.js pour les deux points de branchement :
killEnemy()/onHeroDefeated() détectent game.dungeonRun.active et
délèguent ici plutôt que d'exécuter leur logique habituelle).
============================================================ */

var DungeonManager = {
  ensure: function () {
    if (typeof game.dungeonTickets !== "number") game.dungeonTickets = DUNGEON_CONFIG.freeTicketsPerDay;
    if (typeof game.dungeonTicketResetTime !== "number") game.dungeonTicketResetTime = 0;
    if (!game.dungeonRun || typeof game.dungeonRun !== "object") {
      game.dungeonRun = { active: false, wave: 0 };
    }
    if (typeof game.dungeonBestWave !== "number") game.dungeonBestWave = 0;
  },

  /* Comme les quêtes journalières : régénère les tickets gratuits une
     fois le délai écoulé. Appelée avant chaque affichage de l'écran
     Donjon et avant chaque tentative de démarrage. */
  checkTicketReset: function () {
    this.ensure();
    var now = Date.now();
    if (now >= (game.dungeonTicketResetTime || 0)) {
      game.dungeonTickets = DUNGEON_CONFIG.freeTicketsPerDay;
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

  buyTicket: function () {
    this.ensure();
    var cost = DUNGEON_CONFIG.ticketCostEssence;
    if ((game.essence || 0) < cost) return showToast("Pas assez d'essence", 1000);

    game.essence -= cost;
    game.dungeonTickets = (game.dungeonTickets || 0) + 1;
    addLog("🎟️ Ticket de donjon acheté (" + cost + " essence)", "event");
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* Construit l'ennemi d'une vague (1..waveCount = vagues normales,
     waveCount+1 = boss). Pioche dans TOUS les mondes déjà débloqués
     (pas juste le monde courant), avec des stats gonflées par la
     config (voir data/dungeon.js) — plus dur qu'un combat classique
     dès la vague 1, et de plus en plus dur jusqu'au boss. */
  buildWaveEnemy: function (wave) {
    var isBossWave = wave > DUNGEON_CONFIG.waveCount;
    var unlockedWorldIndex = Math.max(0, (window.WorldManager && WorldManager.worldIndex) || 0);
    var worldScale = 1 + unlockedWorldIndex * 0.6;
    var waveProgress = Math.min(1, wave / DUNGEON_CONFIG.waveCount);
    var premium = isBossWave ? DUNGEON_CONFIG.bossPremiumMult : DUNGEON_CONFIG.basePremiumMult;
    var scale = worldScale * (1 + waveProgress * DUNGEON_CONFIG.waveRampMult) * premium;

    var id, data;

    if (isBossWave) {
      var bossIds = Object.keys(BOSS_DB);
      id = bossIds[randInt(0, bossIds.length - 1)];
      data = BOSS_DB[id];
    } else {
      var pool = [];
      for (var w = 0; w <= unlockedWorldIndex && w < WORLDS.length; w++) {
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
    var hpCoef = isBossWave ? 2 : 1.2;
    var hp = Math.max(1, Math.floor((stats.endurance || 0) * hpCoef * scale));

    return {
      id: id,
      name: (isBossWave ? "👑 " : "") + (data ? data.name : "Ennemi") + " (Donjon)",
      asset: data ? data.asset : "slime",
      isBoss: isBossWave,
      hp: hp,
      maxHp: hp,
      goldReward: Math.floor((isBossWave ? 60 : 8) * scale),
      essenceReward: isBossWave ? 5 : 1,
      resists: (data && data.resists) || [],
      weak: (data && data.weak) || [],
      // Stats de riposte gonflées progressivement avec la vague (pas
      // l'endurance, qui ne sert qu'au calcul des PV ci-dessus).
      stats: {
        power: Math.floor((stats.power || 0) * (1 + waveProgress)),
        endurance: stats.endurance || 0,
        celerity: Math.floor((stats.celerity || 0) * (1 + waveProgress * 0.5)),
        precision: Math.floor((stats.precision || 0) * (1 + waveProgress * 0.5)),
        will: stats.will || 0
      }
    };
  },

  spawnWave: function (wave) {
    this.ensure();
    game.dungeonRun.wave = wave;
    game.enemy = this.buildWaveEnemy(wave);
    game._enemyAttackTimer = 0;
    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
  },

  /* Démarre une tentative : consomme 1 ticket, lance la vague 1, et
     bascule sur l'écran de combat. */
  start: function () {
    this.ensure();
    this.checkTicketReset();

    if ((game.dungeonTickets || 0) <= 0) return showToast("Aucun ticket de donjon", 1200);
    if (game.dungeonRun.active) return showToast("Donjon déjà en cours", 1200);

    game.dungeonTickets -= 1;
    game.dungeonRun = { active: true, wave: 0 };
    addLog("🏰 Entrée dans le donjon !", "event");
    this.spawnWave(1);
    if (typeof switchTab === "function") switchTab("combat");
    saveGame();
  },

  /* Appelée par CombatEngine.killEnemy() quand un ennemi de donjon
     meurt : passe à la vague suivante, ou termine le donjon si le
     boss (vague waveCount+1) vient de tomber. */
  onEnemyKilled: function () {
    this.ensure();
    var clearedWave = game.dungeonRun.wave;
    if (clearedWave > (game.dungeonBestWave || 0)) game.dungeonBestWave = clearedWave;

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

  /* Appelée par CombatEngine.onHeroDefeated() quand les PV tombent à
     0 pendant une tentative : arrête le donjon avec une récompense
     partielle basée sur les vagues déjà passées. */
  onDefeat: function () {
    this.ensure();
    var clearedWave = Math.max(0, (game.dungeonRun.wave || 1) - 1);
    if (clearedWave > (game.dungeonBestWave || 0)) game.dungeonBestWave = clearedWave;

    game.heroHp = game.heroMaxHp || 1;
    addLog("💀 Tentative de donjon interrompue à la vague " + (game.dungeonRun.wave || 1) + " !", "event");
    vibrate([80, 40, 80]);

    this.finish(false, clearedWave);
  },

  /* Abandon volontaire (bouton dans l'écran Donjon) — même calcul de
     récompense qu'une défaite, sans le message "terrassé". */
  forfeit: function () {
    this.ensure();
    if (!game.dungeonRun.active) return;

    var clearedWave = Math.max(0, (game.dungeonRun.wave || 1) - 1);
    if (clearedWave > (game.dungeonBestWave || 0)) game.dungeonBestWave = clearedWave;

    addLog("🏳️ Donjon abandonné à la vague " + (game.dungeonRun.wave || 1) + ".", "event");
    this.finish(false, clearedWave);
  },

  /* Distribue la récompense de fin de tentative (succès ou échec) et
     remet un ennemi normal en jeu. En succès : or/essence complets +
     butin GARANTI à la meilleure rareté débloquée. En échec : or/
     essence proportionnels aux vagues passées + chance de butin
     (rareté aléatoire parmi celles débloquées, pas garantie). */
  finish: function (success, clearedWave) {
    this.ensure();
    var wavesTotal = DUNGEON_CONFIG.waveCount;
    var progress = Math.max(0, Math.min(1, clearedWave / wavesTotal));

    var worldBonus = 1 + ((window.WorldManager && WorldManager.worldIndex) || 0) * 0.5;
    var goldReward, essenceReward, grantLoot, lootRarity;
    var allowed = typeof getAllowedRarities === "function" ? getAllowedRarities() : ["common"];

    if (success) {
      goldReward = Math.floor(DUNGEON_CONFIG.fullClearGoldBase * worldBonus);
      essenceReward = Math.floor(DUNGEON_CONFIG.fullClearEssenceBase * worldBonus);
      grantLoot = true;
      lootRarity = allowed[allowed.length - 1];
    } else {
      goldReward = Math.floor(DUNGEON_CONFIG.fullClearGoldBase * worldBonus * progress * 0.6);
      essenceReward = Math.floor(DUNGEON_CONFIG.fullClearEssenceBase * worldBonus * progress * 0.6);
      grantLoot = chance(DUNGEON_CONFIG.partialLootChance);
      lootRarity = allowed[randInt(0, allowed.length - 1)];
    }

    game.gold += goldReward;
    game.essence += essenceReward;
    game.totalGoldEarned += goldReward;

    var lootedItem = null;
    if (grantLoot && window.LootSystem && typeof LootSystem.rollDropAtRarity === "function") {
      var drop = LootSystem.rollDropAtRarity(lootRarity);
      if (drop && addLootToInventory(drop)) lootedItem = drop;
    }

    game.dungeonRun = { active: false, wave: 0 };

    var msg = success
      ? "🏆 Donjon terminé ! +" + formatNumber(goldReward) + " or, +" + essenceReward + " essence"
      : "🏰 Donjon interrompu (vague " + clearedWave + "/" + wavesTotal + ") : +" + formatNumber(goldReward) + " or, +" + essenceReward + " essence";
    if (lootedItem) msg += " + " + lootedItem.name;

    addLog(msg, success ? "boss" : "event");
    showToast(success ? "🏆 Donjon terminé !" : "🏰 Donjon interrompu", 2200);

    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
      CombatEngine.spawnEnemy();
    }

    if (typeof renderAll === "function") renderAll();
    saveGame();
  }
};

window.DungeonManager = DungeonManager;
