"use strict";
/* systems/dungeon-system.js — gauntlet de 15 vagues + boss, séparé de la progression normale des mondes.
   Branché depuis combat-engine.js (killEnemy/onHeroDefeated délèguent ici si game.dungeonRun.active). Détail complet : COMMENTAIRES_ORIGINAUX.md
   v3.245.0 (refonte Donjons, doc v1.1) : un donjon par monde (DUNGEONS), Marques de run (DUNGEON_MARKS), élites de données
   aux vagues fixes, boss identitaire à trait signature. dungeonRun.tierId devient dungeonId (repli en lecture dans ensure). */

var DungeonManager = {
  ensure: function () {
    if (typeof game.dungeonTickets !== "number") game.dungeonTickets = DUNGEON_CONFIG.freeTicketsPerDay;
    if (typeof game.dungeonTicketResetTime !== "number") game.dungeonTicketResetTime = 0;
    if (typeof game.dungeonTicketsPurchasedToday !== "number") game.dungeonTicketsPurchasedToday = 0;
    if (!game.dungeonRun || typeof game.dungeonRun !== "object") {
      game.dungeonRun = { active: false, wave: 0, dungeonId: 1, marks: [] };
    }
    // v3.245.0 : sauvegarde d'avant la refonte — tierId devient dungeonId (mêmes numéros)
    if (typeof game.dungeonRun.dungeonId !== "number") game.dungeonRun.dungeonId = Number(game.dungeonRun.tierId) || 1;
    delete game.dungeonRun.tierId;
    if (!Array.isArray(game.dungeonRun.marks)) game.dungeonRun.marks = [];
    if (typeof game.dungeonBestWave !== "number") game.dungeonBestWave = 0;
    if (typeof game.dungeonBossClears !== "number") game.dungeonBossClears = 0;
    if (typeof game.dungeonShards !== "number") game.dungeonShards = 0;
    if (!game.dungeonShopLevels || typeof game.dungeonShopLevels !== "object") game.dungeonShopLevels = {};
    if (!game.dungeonTierCleared || typeof game.dungeonTierCleared !== "object") game.dungeonTierCleared = {};
    /* v3.245.0 : partie sauvegardée AVANT la refonte, en cours sur forest_13 (acceptée) — l'étape ouvre désormais
       le Donjon (unlockTabs appliqué à l'acceptation, déjà passée) : on ouvre l'onglet ici, une fois. */
    if (window.StoryQuestManager && game.unlockedTabs && !game.unlockedTabs.dungeon
        && typeof StoryQuestManager.getCurrentStep === "function") {
      var stepNow = StoryQuestManager.getCurrentStep("forest");
      if (stepNow && stepNow.id === "forest_13" && StoryQuestManager.isCurrentStepAccepted("forest")) game.unlockedTabs.dungeon = true;
    }
  },

  getById: function (dungeonId) {
    var id = Number(dungeonId);
    return (window.DUNGEONS || []).find(function (d) { return d.id === id; }) || DUNGEONS[0];
  },
  // alias historique (harnais, anciens appelants) : un palier = un donjon désormais
  getTierById: function (id) { return this.getById(id); },

  applyDungeonTheme: function (dungeonId) {
    var root = document.documentElement;
    if (!root) return;
    var dungeon = this.getById(dungeonId);
    if (dungeon && dungeon.combatMap) {
      root.style.setProperty("--world-combat-map", 'url("' + dungeon.combatMap + '")');
    }
  },

  /* v3.223.0 (périmètre confirmé par Seb) : plafond de palier par monde.
     Le monde retenu est le plus haut JAMAIS atteint — redescendre en Forêt ne
     referme pas un donjon déjà ouvert. */
  getHighestWorldReached: function () {
    var reached = (game.worldsEverReached && typeof game.worldsEverReached === "object")
      ? game.worldsEverReached : {};
    var best = Number((window.WorldManager && WorldManager.worldIndex) || 0);
    Object.keys(reached).forEach(function (key) {
      if (reached[key]) best = Math.max(best, Number(key) || 0);
    });
    return best;
  },

  isAllowedByWorld: function (dungeon) {
    if (!dungeon || typeof dungeon.worldRequired !== "number") return true;
    return this.getHighestWorldReached() >= dungeon.worldRequired;
  },

  /* Raison du verrou, pour que la carte dise quoi faire plutôt que « Verrouillé ».
     "data" (donjon déclaré locked) | "world" | "previous" | null */
  getLockReason: function (dungeonId) {
    var list = window.DUNGEONS || [];
    var index = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === Number(dungeonId)) { index = i; break; }
    }
    if (index === -1) return "previous";
    if (list[index].locked) return "data";
    if (!this.isAllowedByWorld(list[index])) return "world";
    if (index <= 0) return null;

    this.ensure();
    return game.dungeonTierCleared[list[index - 1].id] ? null : "previous";
  },

  isUnlocked: function (dungeonId) {
    return this.getLockReason(dungeonId) === null;
  },
  // alias historiques
  getTierLockReason: function (id) { return this.getLockReason(id); },
  isTierUnlocked: function (id) { return this.isUnlocked(id); },

  /* ---------- Marques (v3.245.0) ---------- */
  getMark: function (markId) {
    return (window.DUNGEON_MARKS || []).find(function (m) { return m.id === markId; }) || null;
  },

  /* Traque et Fléau demandent le donjon terminé une fois (unlock "cleared"). */
  isMarkUnlocked: function (markId, dungeonId) {
    var mark = this.getMark(markId);
    if (!mark) return false;
    if (!mark.unlock) return true;
    this.ensure();
    if (mark.unlock === "cleared") return !!game.dungeonTierCleared[Number(dungeonId)];
    return true;
  },

  /* Marques valides pour un lancement : connues, débloquées, dédoublonnées, plafonnées. */
  sanitizeMarks: function (marks, dungeonId) {
    var self = this, out = [];
    var max = Number(DUNGEON_CONFIG.maxMarks || 3);
    (Array.isArray(marks) ? marks : []).forEach(function (id) {
      if (out.length >= max || out.indexOf(id) !== -1) return;
      if (self.isMarkUnlocked(id, dungeonId)) out.push(id);
    });
    return out;
  },

  /* Définitions des Marques du run en cours (vide hors run). */
  getRunMarks: function () {
    this.ensure();
    if (!game.dungeonRun.active) return [];
    var self = this;
    return game.dungeonRun.marks.map(function (id) { return self.getMark(id); }).filter(Boolean);
  },

  hasRunMark: function (markId) {
    this.ensure();
    return !!game.dungeonRun.active && game.dungeonRun.marks.indexOf(markId) !== -1;
  },

  /* Multiplicateur de récompense pour n Marques : 1 + n × markStackBonus. */
  getMarkRewardMult: function (count) {
    var n = (typeof count === "number") ? count : (this.ensure(), game.dungeonRun.marks.length);
    return 1 + Math.max(0, n) * Number(DUNGEON_CONFIG.markStackBonus || 0);
  },

  /* Matériau projeté pour un donjon et n Marques : base + n × specialPerMark (décision 12.2). */
  getSpecialAmount: function (dungeon, count) {
    if (!dungeon || !dungeon.specialResourceId || !(dungeon.specialResourceAmount > 0)) return 0;
    return Number(dungeon.specialResourceAmount) + Math.max(0, count || 0) * Number(DUNGEON_CONFIG.specialPerMark || 0);
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

  /* Échelle des vagues : formule inchangée (worldScale × rampe × premium × difficultyMult).
     Les mondes 2 à 6 seront rebasés sur l'échelle du monde avec leur monde (rapport D-0 §5). */
  getWaveScale: function (dungeon, wave) {
    var isBossWave = wave > DUNGEON_CONFIG.waveCount;
    var worldScale = 1 + Math.max(0, dungeon.worldPower || 0) * 0.6;
    var waveProgress = Math.min(1, wave / DUNGEON_CONFIG.waveCount);
    var premium = isBossWave ? DUNGEON_CONFIG.bossPremiumMult : DUNGEON_CONFIG.basePremiumMult;
    return worldScale * (1 + waveProgress * DUNGEON_CONFIG.waveRampMult) * premium * Math.max(1, dungeon.difficultyMult || 1);
  },

  /* Élite de données à l'échelle du donjon (doc §4.5) : EliteManager.build calcule
     hp = endurance × statMult × BOSS_PV_MULT × s ; on veut endurance × statMult × 1,5 × scale,
     donc s = scale × 1,5 / BOSS_PV_MULT. Milestone de cycle neutre : le donjon n'est pas indexé dessus. */
  buildEliteWave: function (eliteId, dungeon, wave) {
    if (!window.EliteManager || typeof EliteManager.build !== "function") return null;
    var pvMult = (typeof BOSS_PV_MULT === "number") ? BOSS_PV_MULT : 3.1;
    var s = this.getWaveScale(dungeon, wave) * 1.5 / pvMult;
    var e = EliteManager.build(eliteId, s, { noMilestone: true });
    if (!e) return null;
    e.name = "\u2604\ufe0f " + e.name;
    e.goldReward = Math.floor(16 * this.getWaveScale(dungeon, wave));
    e.essenceReward = 2;
    return e;
  },

  buildWaveEnemy: function (wave) {
    this.ensure();
    var dungeon = this.getById(game.dungeonRun.dungeonId);
    var isBossWave = wave > DUNGEON_CONFIG.waveCount;
    var scale = this.getWaveScale(dungeon, wave);
    var waveProgress = Math.min(1, wave / DUNGEON_CONFIG.waveCount);
    var difficultyMult = Math.max(1, dungeon.difficultyMult || 1);
    var traque = this.hasRunMark("aff_elite");
    var colossus = this.hasRunMark("aff_colossus");

    /* Vague élite de données (positions fixes du donjon). Sous Traque, une vague déjà élite ne cumule pas. */
    if (!isBossWave && dungeon.eliteWaves && dungeon.eliteWaves[wave]) {
      var elite = this.buildEliteWave(dungeon.eliteWaves[wave], dungeon, wave);
      if (elite) return elite;
    }

    var id, data, bossDef = null, statMult = { endurance: 1, power: 1 };

    if (isBossWave) {
      /* Boss IDENTITAIRE du donjon (v3.245.0) : plus de tirage au hasard dans BOSS_DB. */
      bossDef = dungeon.boss || {};
      id = bossDef.baseId && BOSS_DB[bossDef.baseId] ? bossDef.baseId : Object.keys(BOSS_DB)[0];
      data = BOSS_DB[id];
      if (bossDef.statMult) statMult = { endurance: Number(bossDef.statMult.endurance) || 1, power: Number(bossDef.statMult.power) || 1 };
    } else {
      var pool = Array.isArray(dungeon.enemyPool) && dungeon.enemyPool.length ? dungeon.enemyPool.slice() : [];
      if (!pool.length) {
        for (var w = 0; w <= (dungeon.worldPower || 0) && w < WORLDS.length; w++) {
          (WORLDS[w].adventures || []).forEach(function (adv) {
            (adv.enemyPool || []).forEach(function (eid) {
              if (pool.indexOf(eid) === -1) pool.push(eid);
            });
          });
        }
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

    var hp = Math.max(1, Math.floor((stats.endurance || 0) * statMult.endurance * hpCoef * scale));
    if (isBossWave && colossus) hp = Math.floor(hp * 2); // Colosses : boss 2× PV (bossHpMult de la Marque)

    var enemy = {
      id: id,
      name: (isBossWave ? "\ud83d\udc51 " + (bossDef && bossDef.name ? bossDef.name : (data ? data.name : "Boss")) : (data ? data.name : "Ennemi")),
      asset: data ? data.asset : "slime",
      image: (isBossWave && bossDef && bossDef.image) ? bossDef.image : (data ? data.image : undefined),
      isBoss: isBossWave,
      archetype: (isBossWave && bossDef && bossDef.archetype) ? bossDef.archetype : null, // trait signature, lu tel quel par combat-engine.js
      hp: hp,
      maxHp: hp,
      goldReward: Math.floor((isBossWave ? 60 : 8) * scale),
      essenceReward: isBossWave ? 5 : 1,
      resists: (data && data.resists) || [],
      weak: (data && data.weak) || [],
      stats: {
        power: Math.floor((stats.power || 0) * statMult.power * (1 + waveProgress) * Math.sqrt(difficultyMult) * damageScale),
        endurance: stats.endurance || 0,
        celerity: Math.floor((stats.celerity || 0) * (1 + waveProgress * 0.5) * Math.sqrt(difficultyMult) * speedScale),
        precision: Math.floor((stats.precision || 0) * (1 + waveProgress * 0.5) * precisionScale),
        will: stats.will || 0
      }
    };

    /* Traque : chaque vague normale est une élite GÉNÉRIQUE (isBoss + multiplicateurs relatifs,
       sans archétype). Les élites de données gardent leurs vagues fixes, traitées plus haut. */
    if (!isBossWave && traque) {
      var gm = window.DUNGEON_GENERIC_ELITE_MULT || { endurance: 2.4, power: 1.1 };
      enemy.isBoss = true;
      enemy.name = "\u2604\ufe0f " + enemy.name;
      enemy.hp = Math.max(1, Math.floor(enemy.hp * (Number(gm.endurance) || 1)));
      enemy.maxHp = enemy.hp;
      enemy.stats.power = Math.max(1, Math.floor(enemy.stats.power * (Number(gm.power) || 1)));
    }

    return enemy;
  },

  spawnWave: function (wave) {
    this.ensure();
    game.dungeonRun.wave = wave;
    game.enemy = this.buildWaveEnemy(wave);
    if (window.CombatEngine && typeof CombatEngine.prepareEnemy === "function") CombatEngine.prepareEnemy(game.enemy);
    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
  },

  /* v3.136.0 (audit Forêt §3.4) : ticket OFFERT par l'Histoire sur le Donjon I tant que l'étape forest_14
     « La tanière du Basilic » est en cours (acceptée, non réclamée) — un échec ne bloque plus la chaîne
     principale 24 h (1 ticket gratuit/jour) ni ne coûte l'essence du joueur. Sans effet sur les autres paliers. */
  /* v3.245.0 : étendu à forest_13 (« Marques du corrompu » se joue désormais dans la Tanière). */
  isStoryTicketFree: function (dungeonId) {
    if (Number(dungeonId) !== 1 || !window.StoryQuestManager) return false;
    var step = StoryQuestManager.getCurrentStep("forest");
    return !!(step && (step.id === "forest_13" || step.id === "forest_14") && StoryQuestManager.isCurrentStepAccepted("forest"));
  },

  /* marks : tableau d'id de DUNGEON_MARKS choisis dans la feuille de lancement (figés pour le run). */
  start: function (dungeonId, marks) {
    this.ensure();
    this.checkTicketReset();

    var dungeon = this.getById(dungeonId);
    if (!this.isUnlocked(dungeon.id)) return showToast("Donjon verrouillé", 1200);
    if ((game.heroHp || 0) <= 0) return showToast("Héros à terre — repose-toi au Campement d'abord", 1600);
    var storyFree = this.isStoryTicketFree(dungeon.id); // v3.136.0
    if (!storyFree && (game.dungeonTickets || 0) <= 0) return showToast("Aucun ticket de donjon", 1200);
    if (game.dungeonRun.active) return showToast("Donjon déjà en cours", 1200);
    if (game.adventureQuestRun && game.adventureQuestRun.active) return showToast("Termine ou abandonne ta quête en cours avant d'entrer en donjon", 1600);
    if (game.huntRun && game.huntRun.active) return showToast("Termine ou arrête ta chasse en cours avant d'entrer en donjon", 1600);

    if (!storyFree) game.dungeonTickets -= 1; // v3.136.0 : ticket Histoire, rien à décompter
    var runMarks = this.sanitizeMarks(marks, dungeon.id);
    game.dungeonRun = { active: true, wave: 0, dungeonId: dungeon.id, marks: runMarks, shardsEarned: 0 };
    if (!game.dungeonTiersEntered || typeof game.dungeonTiersEntered !== "object") game.dungeonTiersEntered = {};
    game.dungeonTiersEntered[dungeon.id] = true;
    game.heroHp = game.heroMaxHp || 1;
    // v3.102.1 : le donjon est une sortie. SortieManager.start recalcule les stats : les Marques héros (Fragilité,
    // Ascétisme, Fléau) s'appliquent ici via AfflictionManager, dont la source est désormais dungeonRun.marks.
    if (window.SortieManager) { SortieManager.end("return"); SortieManager.start("dungeon"); }
    game.heroHp = game.heroMaxHp || 1; // on entre à PV pleins, après le recalc des Marques
    addLog("🏰 Entrée dans " + dungeon.name + (runMarks.length ? " sous " + runMarks.length + " Marque" + (runMarks.length > 1 ? "s" : "") : "") + " !", "event");
    this.applyDungeonTheme(dungeon.id);
    this.spawnWave(1);
    if (typeof switchTab === "function") switchTab("combat");
    saveGame();
  },

  onEnemyKilled: function () {
    this.ensure();
    var clearedWave = game.dungeonRun.wave;
    if (clearedWave > (game.dungeonBestWave || 0)) game.dungeonBestWave = clearedWave;

    var shards = Number(DUNGEON_CONFIG.shardsPerWaveCleared || 1);
    // v3.245.0 : une vague élite de données rapporte des éclats en plus (pas de butin unique en donjon)
    if (game.enemy && game.enemy.isElite && clearedWave <= DUNGEON_CONFIG.waveCount) shards += Number(DUNGEON_CONFIG.eliteShardsBonus || 0);
    game.dungeonShards = Number(game.dungeonShards || 0) + shards;
    game.dungeonRun.shardsEarned = Number(game.dungeonRun.shardsEarned || 0) + shards;

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
    var tier = this.getById(game.dungeonRun.dungeonId);
    var runMarks = (game.dungeonRun.marks || []).slice();
    var markMult = this.getMarkRewardMult(runMarks.length); // v3.245.0 : cumul des Marques, appliqué ici (or/essence/matériau de fin ne passent pas par goldMult)
    if (success && window.SortieManager) SortieManager.end("success");
    var wavesTotal = DUNGEON_CONFIG.waveCount;
    var progress = Math.max(0, Math.min(1, clearedWave / wavesTotal));

    var worldBonus = (1 + Math.max(0, tier.worldPower || 0) * 0.5 + Math.sqrt(Math.max(1, tier.difficultyMult || 1)) * 0.4) * markMult;
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

    /* v3.223.0 (périmètre confirmé par Seb) : matériau de monde, seconde source
       à côté des Petites Aventures. Réservé à la RÉUSSITE complète — une fuite
       ou une mort n'en donne pas, comme pour le butin d'équipement. Écriture par
       WarehouseManager, seul point d'entrée des ressources. */
    var specialGained = 0;
    var specialDef = null;
    if (success && tier.specialResourceId && tier.specialResourceAmount > 0
        && window.WarehouseManager && typeof WarehouseManager.addResource === "function") {
      specialDef = WAREHOUSE_RESOURCES[tier.specialResourceId] || null;
      if (specialDef) {
        // v3.245.0 : +specialPerMark par Marque active (décision 12.2)
        specialGained = WarehouseManager.addResource(tier.specialResourceId, this.getSpecialAmount(tier, runMarks.length), true) || 0;
      }
    }

    var shardsGained = Number(game.dungeonRun.shardsEarned || 0);
    game.dungeonRun = { active: false, wave: 0, dungeonId: tier.id, marks: [] };
    /* v3.245.0 : les Marques héros (Fragilité…) tombent avec le run. SortieManager.end() a recalculé les stats
       AVANT cette ligne, run encore actif : on recalcule ici, même ratio de PV conservé (0 reste 0 après une mort). */
    if (runMarks.length && window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      var hpRatio = (game.heroMaxHp > 0) ? Math.min(1, (game.heroHp || 0) / game.heroMaxHp) : 1;
      StatsSystem.recalcStats();
      game.heroHp = Math.max(0, Math.min(game.heroMaxHp, Math.floor(game.heroMaxHp * hpRatio)));
    }

    var msg = success
      ? "🏆 " + tier.name + " terminé ! +" + formatNumber(goldReward) + " or, +" + essenceReward + " essence"
      : (outcome === "death"
        ? "🏰 " + tier.name + " : terrassé à la vague " + (clearedWave + 1) + "/" + wavesTotal + " — aucune récompense, le butin reste dans le donjon."
        : "🏰 " + tier.name + " abandonné (vague " + clearedWave + "/" + wavesTotal + ") : +" + formatNumber(goldReward) + " or, +" + essenceReward + " essence (moitié)");
    if (lootedItem) msg += " + " + lootedItem.name;
    if (specialGained > 0 && specialDef) msg += " + " + specialGained + " " + specialDef.name;

    addLog(msg, success ? "boss" : "event");
    showToast(success ? "🏆 Donjon terminé !" : "🏰 Donjon interrompu", 2200);

    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
      CombatEngine.spawnEnemy();
    }

    // v3.131.0 : succès/fuite ne repassaient jamais par switchTab (seul onDefeat() le faisait
    // pour la mort) — le joueur restait sur l'onglet Combat avec un ennemi normal déjà respawné,
    // donnant l'impression fausse de repartir directement en combat après un donjon.
    if (typeof switchTab === "function") switchTab("campement");

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
        lootedItem: lootedItem,
        // v3.223.0 : matériau de monde gagné (0 si aucun), pour le rapport de fin
        specialGained: specialGained,
        specialName: specialDef ? specialDef.name : null,
        // v3.245.0 : Marques du run et multiplicateur, pour la ligne « Marques ×1,45 » du rapport
        marks: runMarks,
        markMult: markMult
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
