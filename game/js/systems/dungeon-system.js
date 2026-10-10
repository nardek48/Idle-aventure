"use strict";
/* systems/dungeon-system.js — gauntlet de 15 vagues + boss, séparé de la progression normale des mondes.
   Branché depuis combat-engine.js (killEnemy/onHeroDefeated délèguent ici si game.dungeonRun.active). Détail complet : COMMENTAIRES_ORIGINAUX.md
   v3.245.0 (refonte Donjons, doc v1.1) : un donjon par monde (DUNGEONS), Marques de run (DUNGEON_MARKS), élites de données
   aux vagues fixes, boss identitaire à trait signature. dungeonRun.tierId devient dungeonId (repli en lecture dans ensure). */

var DungeonManager = {
  ensure: function () {
    if (typeof game.dungeonTicketResetTime !== "number") game.dungeonTicketResetTime = 0;
    // v3.358.0 (D7) : sorties du jour, par donjon ({ id: n }) — remplacent les tickets
    if (!game.dungeonRunsUsed || typeof game.dungeonRunsUsed !== "object") game.dungeonRunsUsed = {};
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
    /* v3.315.0 (W-4a2, accord Seb) : verrou d'Histoire lu dans la donnée, même règle que les
       secteurs de carte (isStepReached). Renvoie "data" pour que la vue affiche lockedHint. */
    if (list[index].requiresStoryStep && window.StoryQuestManager
      && !StoryQuestManager.isStepReached(list[index].requiresStoryStep)) return "data";
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
    return Number(dungeon.specialResourceAmount) + Math.max(0, count || 0) * Number(DUNGEON_CONFIG.specialPerMark || 0)
      + this.getShardEffect("specialBonus"); // v3.321.0 : Sacoche du donjon
  },

  checkTicketReset: function () {
    this.ensure();
    var now = Date.now();
    if (now >= (game.dungeonTicketResetTime || 0)) {
      game.dungeonRunsUsed = {};
      game.dungeonTicketResetTime = now + DUNGEON_CONFIG.ticketResetHours * 3600 * 1000;
    }
  },

  /* v3.358.0 (D7) : sorties par jour et par donjon (Clé de faille comprise, 2 niveaux au plus). */
  getRunsPerDay: function () {
    var cle = (window.DUNGEON_SHOP || []).filter(function (it) { return it.effect === "runsBonus"; })[0];
    var bonus = cle ? Math.min(Number(cle.maxLevel || 0), this.getShardShopLevel(cle.id)) * Number(cle.perLevel || 0) : 0;
    return Number(DUNGEON_CONFIG.runsPerDay || 3) + bonus;
  },

  getRunsUsed: function (dungeonId) {
    this.ensure();
    return Number(game.dungeonRunsUsed[dungeonId] || 0);
  },

  getRunsLeft: function (dungeonId) {
    this.checkTicketReset();
    return Math.max(0, this.getRunsPerDay() - this.getRunsUsed(dungeonId));
  },

  /* Peut-on entrer ? Une sortie demandée par l'Histoire est toujours offerte. */
  hasRunLeft: function (dungeonId) {
    return this.isStoryTicketFree(dungeonId) || this.getRunsLeft(dungeonId) > 0;
  },

  timeUntilTicketReset: function () {
    this.ensure();
    var diff = Math.max(0, (game.dungeonTicketResetTime || 0) - Date.now());
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    return h + "h " + m + "m";
  },

  /* Échelle des vagues : formule inchangée (worldScale × rampe × premium × difficultyMult).
     Les mondes 2 à 6 seront rebasés sur l'échelle du monde avec leur monde (rapport D-0 §5). */
  getWaveScale: function (dungeon, wave) {
    var isBossWave = wave > DUNGEON_CONFIG.waveCount;
    var worldScale = 1 + Math.max(0, dungeon.worldPower || 0) * 0.6;
    var waveProgress = Math.min(1, wave / DUNGEON_CONFIG.waveCount);
    // v3.253.0 : les vagues normales suivent le donjon quand il le déclare (wavePremiumMult).
    var wavePremium = (typeof dungeon.wavePremiumMult === "number") ? dungeon.wavePremiumMult : DUNGEON_CONFIG.basePremiumMult;
    var premium = isBossWave ? DUNGEON_CONFIG.bossPremiumMult : wavePremium;
    return worldScale * (1 + waveProgress * DUNGEON_CONFIG.waveRampMult) * premium * Math.max(1, dungeon.difficultyMult || 1);
  },

  /* Élite de données à l'échelle du donjon (doc §4.5) : EliteManager.build calcule
     hp = endurance × statMult × BOSS_PV_MULT × s ; on veut endurance × statMult × 1,5 × scale,
     donc s = scale × 1,5 / BOSS_PV_MULT. Milestone de cycle neutre : le donjon n'est pas indexé dessus. */
  buildEliteWave: function (eliteId, dungeon, wave) {
    if (!window.EliteManager || typeof EliteManager.build !== "function") return null;
    var pvMult = (typeof BOSS_PV_MULT === "number") ? BOSS_PV_MULT : 3.1;
    var s = this.getWaveScale(dungeon, wave) * 1.5 / pvMult;
    /* v3.288.0 (accord Seb) : une élite de donjon vient escortée comme ailleurs. L'escorte
       est une propriété de l'élite (data/elites.js) ; ses membres sont mis à l'échelle de
       la VAGUE, pas du monde — un donjon avancé ne doit pas servir des ennemis de Lisière.
       Comme spawnWave fait `game.enemy = buildWaveEnemy(...)` et que l'accesseur accepte
       les tableaux depuis le lot L-3, renvoyer un tableau suffit : rien d'autre à changer. */
    var def = (window.ELITE_DB || {})[eliteId] || null;
    var spec = def && def.escort;
    var multSauve = null;
    if (spec && spec.eliteStatMult && def.statMult) {
      multSauve = def.statMult;
      def.statMult = Object.assign({}, def.statMult, spec.eliteStatMult);
    }
    var e;
    try {
      e = EliteManager.build(eliteId, s, { noMilestone: true });
    } finally {
      if (multSauve) def.statMult = multSauve;
    }
    if (!e) return null;
    e.name = "\u2604\ufe0f " + e.name;
    e.goldReward = Math.floor(16 * this.getWaveScale(dungeon, wave));

    var escorte = this.buildEscortWave(spec, dungeon, wave);
    return escorte.length ? [e].concat(escorte) : e;
  },

  /* Membres d'escorte d'une élite de donjon, à l'échelle de la vague. */
  buildEscortWave: function (spec, dungeon, wave) {
    if (!spec || !Array.isArray(spec.members) || !spec.members.length) return [];
    var max = (typeof COMBAT_MAX_ENEMIES === "number" ? COMBAT_MAX_ENEMIES : 3) - 1;
    var hpMult = Number(spec.hpMult);
    if (!isFinite(hpMult) || hpMult <= 0) hpMult = 0.25;
    var goldMult = Number(spec.goldMult);
    if (!isFinite(goldMult) || goldMult <= 0) goldMult = hpMult;

    /* Construit à part plutôt que via buildWaveEnemy() : celle-ci appelle ensure(), donc
       suppose un run en cours et touche l'état du jeu. Une escorte doit pouvoir se
       fabriquer à la demande, y compris hors run (banc, harnais). Les coefficients sont
       ceux d'un ennemi de vague ordinaire. */
    var scale = this.getWaveScale(dungeon, wave);
    var waveProgress = Math.min(1, wave / DUNGEON_CONFIG.waveCount);
    var difficultyMult = Math.max(1, (dungeon && dungeon.difficultyMult) || 1);

    return spec.members.slice(0, Math.max(0, max)).map(function (id) {
      var data = (window.ENEMY_DB || {})[id];
      if (!data) return null;
      var stats = data.stats || makeRpgStats(10, 10, 10, 10, 10);
      var hp = Math.max(1, Math.floor((stats.endurance || 0) * 1.5 * scale * hpMult));
      return {
        id: id,
        name: data.name || "Escorte",
        asset: data.asset || "slime",
        image: data.image,
        isBoss: false,
        isElite: false,
        archetype: (window.FIXED_ENEMY_ARCHETYPES && FIXED_ENEMY_ARCHETYPES[id]) || null, // v3.380.0 : trait fixe de la créature, comme hors donjon
        hp: hp,
        maxHp: hp,
        goldReward: Math.max(1, Math.floor(8 * scale * goldMult)),
        resists: data.resists || [],
        weak: data.weak || [],
        stats: {
          power: Math.floor((stats.power || 0) * (1 + waveProgress) * Math.sqrt(difficultyMult) * 0.4),
          endurance: stats.endurance || 0,
          celerity: Math.floor((stats.celerity || 0) * 0.65),
          precision: Math.floor((stats.precision || 0) * 0.75),
          will: stats.will || 0
        }
      };
    }).filter(Boolean);
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
      // v3.380.0 : vague normale → trait fixe de la créature (Troll, Ronce, Guerrier des sables), oublié depuis la refonte
      archetype: (isBossWave && bossDef && bossDef.archetype) ? bossDef.archetype : (!isBossWave && window.FIXED_ENEMY_ARCHETYPES && FIXED_ENEMY_ARCHETYPES[id]) || null,
      // v3.288.0 : seuils de phase du boss, lus par CombatEngine.checkPhases().
      phases: (isBossWave && bossDef && Array.isArray(bossDef.phases)) ? bossDef.phases : null,
      rises: !!(isBossWave && bossDef && bossDef.rises), // v3.430.0 : Varrek se relève une fois (rise-system.js)
      riseLine: (isBossWave && bossDef && bossDef.riseLine) || null, // v3.431.0 : sa ligne de journal à la relève
      hp: hp,
      maxHp: hp,
      goldReward: Math.floor((isBossWave ? 60 : 8) * scale),
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
    // v3.430.0 : run rechargé à la halte (save-system respawne la vague) : la feuille du campement revient
    if (this.isCampPending() && typeof openDungeonCampSheet === "function") setTimeout(openDungeonCampSheet, 0);
  },

  /* ---------- Le campement (v3.430.0, RU13 — Conception Ruines v1.4, validé le 09/10) ----------
     Donjon à `camp` : après la vague camp.afterWave, le run s'arrête au campement. Le butin de
     l'étape 1 est mis en sûreté (SortieManager.secure) avec camp.stoneAmount du matériau du donjon,
     puis UNE action : Souffler, Changer de compagnon, Sortir. État dans game.dungeonRun, déjà
     sauvegardé en entier : camp = "pending" (halte), "done" (étape 2), campLoot (affichage). */
  getCamp: function (dungeon) {
    var c = dungeon && dungeon.camp;
    return (c && Number(c.afterWave) > 0 && Number(c.afterWave) < DUNGEON_CONFIG.waveCount) ? c : null;
  },

  isCampPending: function () {
    return !!(game.dungeonRun && game.dungeonRun.active && game.dungeonRun.camp === "pending");
  },

  /* Appelé par onEnemyKilled : true si la halte commence (la vague suivante attend derrière la feuille). */
  reachCamp: function (clearedWave) {
    var run = game.dungeonRun, dungeon = this.getById(run.dungeonId), camp = this.getCamp(dungeon);
    if (!camp || run.camp || clearedWave !== Number(camp.afterWave)) return false;
    run.camp = "pending";
    var kept = window.SortieManager ? SortieManager.secure() : { gold: 0, items: [], resources: {} };
    var stone = 0;
    if (dungeon.specialResourceId && camp.stoneAmount > 0 && window.WarehouseManager && typeof WarehouseManager.addResource === "function") {
      stone = WarehouseManager.addResource(dungeon.specialResourceId, Number(camp.stoneAmount), true) || 0;
    }
    run.campLoot = {
      gold: Number(kept.gold || 0),
      items: (kept.items || []).map(function (it) { return { name: it.name, rarity: it.rarity }; }),
      shards: Number(run.shardsEarned || 0),
      stone: stone, stoneId: dungeon.specialResourceId || null
    };
    if (camp.storyFlag) {
      if (!game.explorationProgression || typeof game.explorationProgression !== "object") game.explorationProgression = {};
      game.explorationProgression[camp.storyFlag] = true;
    }
    addLog("🔥 " + _t("Le campement : le butin de la première étape est en sûreté."), "event");
    this.spawnWave(clearedWave + 1);   // la vague suivante attend ; la feuille bloque le combat
    saveGame();
    return true;
  },

  /* Compagnons qui peuvent descendre (débloqués, pas en patrouille). */
  campCandidates: function () {
    if (!window.CompanionManager) return [];
    return CompanionManager.unlockedIds().filter(function (id) {
      return !(window.PatrolManager && PatrolManager.isOnPatrol(id));
    });
  },

  /* action : "souffler" | "changer" (party : deux ids) | "sortir". Une seule par halte. */
  campAction: function (action, party) {
    if (!this.isCampPending()) return false;
    var run = game.dungeonRun, dungeon = this.getById(run.dungeonId), camp = this.getCamp(dungeon) || {};
    if (action === "sortir") {
      run.camp = "done";
      this.finish(false, Number(camp.afterWave) || (run.wave - 1), "camp");
      return true;
    }
    if (action === "souffler") {
      var pct = Number(camp.healPct) || 0.4;
      game.heroHp = Math.min(game.heroMaxHp || 1, Math.floor((game.heroHp || 0) + (game.heroMaxHp || 1) * pct));
      if (window.CompanionManager) CompanionManager.partyIds().forEach(function (id) {
        var st = CompanionManager.state(id), max = CompanionManager.maxHpOf(id);
        st.hp = Math.min(max, Math.floor(CompanionManager.hpOf(id) + max * pct));
      });
      addLog("🔥 " + _t("Le groupe souffle au campement."), "event");
    } else if (action === "changer") {
      var CM = window.CompanionManager, want = Array.isArray(party) ? party.slice(0, COMPANION_MAX_PRESENT) : [];
      var cand = this.campCandidates(), now = CM ? CM.partyIds() : [];
      if (!CM || want.length !== Math.min(COMPANION_MAX_PRESENT, cand.length) || want.some(function (id) { return cand.indexOf(id) === -1; })) return false;
      if (want.slice().sort().join() === now.slice().sort().join()) return false;
      // Ceux qui partent gardent le feu ; ceux qui arrivent descendent à PV pleins (validé à l'atelier)
      cand.forEach(function (id) {
        var st = CM.state(id), on = want.indexOf(id) !== -1;
        if (on && now.indexOf(id) === -1) st.hp = CM.maxHpOf(id);
        st.present = on;
      });
      CM.refreshParty();
      addLog("🔥 " + _t("Au campement, le groupe change : {x} descendent.", { x: want.map(function (id) { var d = getCompanionDef(id); return d ? _td(d.name) : id; }).join(", ") }), "event");
    } else return false;
    run.camp = "done";
    if (typeof renderAll === "function") renderAll();
    saveGame();
    return true;
  },

  /* v3.136.0 (audit Forêt §3.4) : ticket OFFERT par l'Histoire sur le Donjon I tant que l'étape forest_14
     « La tanière du Basilic » est en cours (acceptée, non réclamée) — un échec ne bloque plus la chaîne
     principale 24 h, ni ne consomme une sortie du jour (v3.358.0). Sans effet sur les autres paliers. */
  /* v3.245.0 : étendu à forest_13 (« Marques du corrompu » se joue désormais dans la Tanière). */
  /* v3.315.0 (W-4a2, accord Seb) : rendue générique — les étapes concernées vivent dans la
     donnée du donjon (storyChapterId, storyFreeSteps) au lieu d'être nommées ici. Comportement
     inchangé pour la Tanière ; la Cité engloutie offre l'entrée pendant l'étape 12. */
  isStoryTicketFree: function (dungeonId) {
    if (!window.StoryQuestManager) return false;
    var list = window.DUNGEONS || [], d = null;
    for (var i = 0; i < list.length; i++) { if (list[i].id === Number(dungeonId)) { d = list[i]; break; } }
    var steps = d && d.storyFreeSteps;
    if (!steps || !steps.length) return false;
    var chapterId = d.storyChapterId || "forest";
    var step = StoryQuestManager.getCurrentStep(chapterId);
    return !!(step && steps.indexOf(step.id) >= 0 && StoryQuestManager.isCurrentStepAccepted(chapterId));
  },

  /* marks : tableau d'id de DUNGEON_MARKS choisis dans la feuille de lancement (figés pour le run). */
  start: function (dungeonId, marks) {
    this.ensure();
    this.checkTicketReset();

    var dungeon = this.getById(dungeonId);
    if (!this.isUnlocked(dungeon.id)) return showToast(_t("Donjon verrouillé"), 1200);
    if ((game.heroHp || 0) <= 0) return showToast(_t("Héros à terre — repose-toi au Campement d'abord"), 1600);
    var storyFree = this.isStoryTicketFree(dungeon.id); // v3.136.0
    if (!storyFree && this.getRunsLeft(dungeon.id) <= 0) return showToast(_t("Plus de sortie aujourd'hui dans ce donjon — renouvellement dans {d}", { d: this.timeUntilTicketReset() }), 1800);
    if (game.dungeonRun.active) return showToast(_t("Donjon déjà en cours"), 1200);
    if (game.adventureQuestRun && game.adventureQuestRun.active) return showToast(_t("Termine ou abandonne ta quête en cours avant d'entrer en donjon"), 1600);
    if (game.huntRun && game.huntRun.active) return showToast(_t("Termine ou arrête ta chasse en cours avant d'entrer en donjon"), 1600);
    if (window.heroLockToast && heroLockToast()) return; // v3.307.0 : héros en expédition
    // v3.330.0 (E4) : vivres de sortie pour un donjon déjà fini une fois (jamais sur un ticket d'Histoire)
    if (window.ProvisionsManager) {
      var noFood = ProvisionsManager.check("dungeon", dungeon);
      if (noFood) return showToast(noFood, 2200);
      ProvisionsManager.consume("dungeon", dungeon);
    }

    if (!storyFree) game.dungeonRunsUsed[dungeon.id] = this.getRunsUsed(dungeon.id) + 1; // v3.358.0 (D7) : une sortie du jour ; celle de l'Histoire est offerte
    var runMarks = this.sanitizeMarks(marks, dungeon.id);
    game.dungeonRun = { active: true, wave: 0, dungeonId: dungeon.id, marks: runMarks, shardsEarned: 0 };
    if (!game.dungeonTiersEntered || typeof game.dungeonTiersEntered !== "object") game.dungeonTiersEntered = {};
    game.dungeonTiersEntered[dungeon.id] = true;
    game.heroHp = game.heroMaxHp || 1;
    // v3.102.1 : le donjon est une sortie. SortieManager.start recalcule les stats : les Marques héros (Fragilité,
    // Ascétisme, Fléau) s'appliquent ici via AfflictionManager, dont la source est désormais dungeonRun.marks.
    if (window.SortieManager) { SortieManager.end("return"); SortieManager.start("dungeon"); }
    game.heroHp = game.heroMaxHp || 1; // on entre à PV pleins, après le recalc des Marques
    addLog("🏰 " + (runMarks.length
      ? _tn(runMarks.length, "Entrée dans {x} sous {n} Marque !", "Entrée dans {x} sous {n} Marques !", { x: _td(dungeon.name) })
      : _t("Entrée dans {x} !", { x: _td(dungeon.name) })), "event");
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
    // v3.430.0 (RU13) : le campement, halte après la vague de la première étape
    if (this.reachCamp(clearedWave)) return;
    if (nextWave > DUNGEON_CONFIG.waveCount) {
      addLog(_t("🏰 Vagues terminées ! Le boss du donjon apparaît..."), "event");
      showToast(_t("👑 Le boss du donjon apparaît !"), 2000);
    }
    this.spawnWave(nextWave);
  },

  onDefeat: function () {
    this.ensure();
    var clearedWave = Math.max(0, (game.dungeonRun.wave || 1) - 1);
    if (clearedWave > (game.dungeonBestWave || 0)) game.dungeonBestWave = clearedWave;

    // v3.102.0 (P2) : même règle de mort qu'ailleurs (PV 0, Sang-froid, retour Campement)
    game.heroHp = 0; // v3.327.0 : Sang-froid retiré (décision T9)
    addLog("💀 " + _t("Tentative de donjon interrompue à la vague {n} ! Retour au Campement.", { n: game.dungeonRun.wave || 1 }), "event");
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
    addLog("🏳️ " + _t("Donjon abandonné à la vague {n}.", { n: game.dungeonRun.wave || 1 }), "event");
    this.finish(false, clearedWave, "flee");
  },

  /* outcome (échec) : "flee" = récompense partielle ÷ 2 ; "death" = aucune récompense partielle (v3.102.1, la mort coûte le butin) */
  finish: function (success, clearedWave, outcome) {
    this.ensure();
    var tier = this.getById(game.dungeonRun.dungeonId);
    var runMarks = (game.dungeonRun.marks || []).slice();
    var markMult = this.getMarkRewardMult(runMarks.length); // v3.245.0 : cumul des Marques, appliqué ici (or et matériau de fin ne passent pas par goldMult)
    if (success && window.SortieManager) SortieManager.end("success");
    if (outcome === "camp" && window.SortieManager) SortieManager.end("return"); // v3.430.0 : rien à perdre, le sac de l'étape 1 est banqué
    var campLoot = game.dungeonRun.campLoot || null; // v3.430.0 : pour le rapport de fin
    var wavesTotal = DUNGEON_CONFIG.waveCount;
    var progress = Math.max(0, Math.min(1, clearedWave / wavesTotal));

    var worldBonus = (1 + Math.max(0, tier.worldPower || 0) * 0.5 + Math.sqrt(Math.max(1, tier.difficultyMult || 1)) * 0.4) * markMult;
    var goldReward, grantLoot, lootRarity; // v3.358.0 (D7) : l'essence de fin est fondue dans l'or (fullClearGoldBase)

    var rarityOrder = (typeof RARITY_ORDER !== "undefined" && RARITY_ORDER) || ["common", "green", "rare", "epic", "legendary"];
    var tierMaxIndex = Math.max(0, rarityOrder.indexOf(tier.maxRarity));
    var allowedForTier = rarityOrder.slice(0, tierMaxIndex + 1);

    if (success) {
      goldReward = Math.floor(DUNGEON_CONFIG.fullClearGoldBase * worldBonus);
      grantLoot = true;
      lootRarity = tier.maxRarity;
      game.dungeonBossClears = Number(game.dungeonBossClears || 0) + 1;
      game.dungeonShards = Number(game.dungeonShards || 0) + (DUNGEON_CONFIG.shardsBossBonus || 10);
      game.dungeonRun.shardsEarned = Number(game.dungeonRun.shardsEarned || 0) + (DUNGEON_CONFIG.shardsBossBonus || 10);

      if (!game.dungeonTierCleared || typeof game.dungeonTierCleared !== "object") game.dungeonTierCleared = {};
      var wasAlreadyCleared = !!game.dungeonTierCleared[tier.id];
      game.dungeonTierCleared[tier.id] = true;
      if (!wasAlreadyCleared) {
        addLog("🔓 " + _t("{x} entièrement terminé — palier suivant débloqué !", { x: _td(tier.name) }), "event");
      }
    } else if (outcome === "death") {
      goldReward = 0;
      grantLoot = false;
      lootRarity = null;
    } else if (outcome === "camp") {
      // v3.430.0 (RU13) : Sortir au campement — la part de l'étape 1, sans la moitié de la fuite
      goldReward = Math.floor(DUNGEON_CONFIG.fullClearGoldBase * worldBonus * progress * 0.6);
      grantLoot = chance(DUNGEON_CONFIG.partialLootChance);
      lootRarity = allowedForTier[randInt(0, allowedForTier.length - 1)];
    } else {
      var fleeKeep = (typeof SORTIE_FLEE_KEEP_PCT === "number") ? SORTIE_FLEE_KEEP_PCT : 0.5;
      goldReward = Math.floor(DUNGEON_CONFIG.fullClearGoldBase * worldBonus * progress * 0.6 * fleeKeep);
      grantLoot = chance(DUNGEON_CONFIG.partialLootChance * fleeKeep);
      lootRarity = allowedForTier[randInt(0, allowedForTier.length - 1)];
    }

    /* v3.322.0 (Offrande) : Écho de la faille (Mémoire niveau 4) — +50 % des Éclats du run,
       ajoutés une fois ici ; et le Souvenir d'un run complet. */
    if (window.MemoryManager && MemoryManager.has("echo_faille")) {
      var echo = Math.floor(Number(game.dungeonRun.shardsEarned || 0) * 0.5);
      if (echo > 0) {
        game.dungeonShards = Number(game.dungeonShards || 0) + echo;
        game.dungeonRun.shardsEarned = Number(game.dungeonRun.shardsEarned || 0) + echo;
      }
    }
    if (success && window.MemoryManager) MemoryManager.souvenir("dungeonClear", _t("Souvenir : {x} terminé", { x: tier && tier.name ? _td(tier.name) : _t("donjon") }));

    game.gold += goldReward;
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
      ? "🏆 " + _t("{x} : sortie terminée ! +{g} or", { x: _td(tier.name), g: formatNumber(goldReward) })
      : outcome === "camp"
        ? "🔥 " + _t("{x} : tu remontes du campement (vague {a}/{b}) : +{g} or", { x: _td(tier.name), a: clearedWave, b: wavesTotal, g: formatNumber(goldReward) })
      : (outcome === "death"
        ? "🏰 " + _t("{x} : terrassé à la vague {a}/{b} — aucune récompense, le butin reste dans le donjon.", { x: _td(tier.name), a: clearedWave + 1, b: wavesTotal })
        : "🏰 " + _t("{x} abandonné (vague {a}/{b}) : +{g} or (moitié)", { x: _td(tier.name), a: clearedWave, b: wavesTotal, g: formatNumber(goldReward) }));
    if (lootedItem) msg += " + " + _td(lootedItem.name);
    if (specialGained > 0 && specialDef) msg += " + " + specialGained + " " + _td(specialDef.name);

    addLog(msg, success ? "boss" : "event");
    showToast(success ? "🏆 " + _t("Donjon terminé !") : "🏰 " + _t("Donjon interrompu"), 2200);

    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
      CombatEngine.spawnEnemy();
    }

    // v3.131.0 : succès/fuite ne repassaient jamais par switchTab (seul onDefeat() le faisait
    // pour la mort) — le joueur restait sur l'onglet Combat avec un ennemi normal déjà respawné,
    // donnant l'impression fausse de repartir directement en combat après un donjon.
    if (typeof switchTab === "function") switchTab("campement");

    if (typeof renderAll === "function") renderAll();

    if (typeof openDungeonSummary === "function") {
      var specialInfo = specialDef || (tier.specialResourceId && WAREHOUSE_RESOURCES[tier.specialResourceId]) || null; // la part du campement compte aussi en sortie
      var sortieKept = (game.lastSortieSummary && game.lastSortieSummary.context === "dungeon") ? game.lastSortieSummary.kept : null;
      openDungeonSummary({
        success: success,
        tierName: tier.name,
        clearedWave: clearedWave,
        wavesTotal: wavesTotal,
        goldReward: goldReward,
        shardsGained: shardsGained,
        lootedItem: lootedItem,
        // v3.223.0 : matériau de monde gagné (0 si aucun), pour le rapport de fin
        specialGained: specialGained,
        specialName: specialInfo ? specialInfo.name : null,
        specialIcon: specialInfo ? specialInfo.icon : null, // v3.436.2 : l'icône du matériau, pas une image empruntée
        // v3.245.0 : Marques du run et multiplicateur, pour la ligne « Marques ×1,45 » du rapport
        marks: runMarks,
        markMult: markMult,
        // v3.430.0 : sortie par le campement, et le butin de l'étape 1 mis en sûreté
        outcome: outcome || (success ? "success" : null),
        campLoot: campLoot,
        // v3.436.1 (bug Seb) : or et objets des vagues, banqués par SortieManager.end, absents du rapport jusqu'ici
        wavesGold: sortieKept ? Number(sortieKept.gold || 0) : 0,
        wavesItems: sortieKept ? (sortieKept.items || []).map(function (it) { return { name: it.name, rarity: it.rarity }; }) : []
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
    if (level >= item.maxLevel) return showToast(_t("Niveau maximum atteint"), 1200);

    var cost = this.getShardShopCost(item);
    if ((game.dungeonShards || 0) < cost) return showToast(_t("Pas assez d'Éclats"), 1000);

    game.dungeonShards -= cost;
    game.dungeonShopLevels[id] = level + 1;

    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }

    addLog("🔷 " + _t("{x} amélioré (niveau {n})", { x: _td(item.name), n: level + 1 }), "event");
    showToast(_td(item.name) + " +1", 1500);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* v3.321.0 (accord Seb) : bonus lus dans la DONNÉE. Seuls les articles présents dans
     DUNGEON_SHOP comptent : un niveau acheté d'un article retiré n'agit plus. */
  getShardEffect: function (effect) {
    var self = this, total = 0;
    (window.DUNGEON_SHOP || []).forEach(function (item) {
      if (item.effect === effect) total += self.getShardShopLevel(item.id) * Number(item.perLevel || 0);
    });
    return total;
  },

  getShardShopBonuses: function () {
    // v3.321.0 : plus de dégâts / or / essence / défense — stats-system.js lit des zéros
    return { power: 0, gold: 0, essence: 0, defense: 0 };
  }
};

window.DungeonManager = DungeonManager;
