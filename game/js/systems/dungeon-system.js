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
    if (!game.dungeonLevelBest || typeof game.dungeonLevelBest !== "object") game.dungeonLevelBest = {}; // v3.460.0 : meilleur niveau terminé, par donjon
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

  /* ---------- Niveaux (v3.460.0, Conception Niveaux de donjon v0.3) ---------- */
  // Meilleur niveau terminé ; un donjon fini avant les niveaux compte pour le niveau 1
  getLevelBest: function (dungeonId) {
    this.ensure();
    var id = Number(dungeonId);
    return Math.max(Number(game.dungeonLevelBest[id] || 0), game.dungeonTierCleared[id] ? 1 : 0);
  },

  // Plus haut niveau jouable : un de plus que le meilleur terminé (N4, sans maximum)
  getMaxLevel: function (dungeonId) {
    return this.getLevelBest(dungeonId) + 1;
  },

  getRunLevel: function () {
    var run = game.dungeonRun;
    return Math.max(1, Math.floor(Number(run && run.level) || 1));
  },

  // Multiplicateurs composés du niveau (N-B) : PV et puissance des ennemis
  getLevelMult: function (level) {
    var n = Math.max(1, Math.floor(Number(level) || 1)) - 1;
    return { hp: Math.pow(1 + (DUNGEON_CONFIG.levelHpPct || 0), n), power: Math.pow(1 + (DUNGEON_CONFIG.levelPowerPct || 0), n) };
  },

  /* Donjon dont le butin s'applique à ce niveau (N-A) : le dernier palier atteint dont le donjon
     visé est débloqué, sinon le donjon lui-même. Donne la rareté maximale et le monde d'objet. */
  getLevelLootSource: function (dungeon, level) {
    var src = dungeon, self = this;
    (dungeon && dungeon.levelSteps || []).forEach(function (st) {
      if (level >= st.level && self.isUnlocked(st.dungeonId)) src = self.getById(st.dungeonId);
    });
    return src;
  },

  // Plafond : niveau du dernier palier dont le donjon visé est débloqué (1 si aucun)
  getCapLevel: function (dungeon) {
    var cap = 1, self = this;
    (dungeon && dungeon.levelSteps || []).forEach(function (st) {
      if (self.isUnlocked(st.dungeonId)) cap = Math.max(cap, st.level);
    });
    return cap;
  },

  // Niveaux au-delà du plafond : ils donnent or, Éclats et objets supérieurs (N-I, N-J, N-K)
  getLevelBeyond: function (dungeon, level) {
    return Math.max(0, Math.floor(Number(level) || 1) - this.getCapLevel(dungeon));
  },

  // Plancher du tirage des objets à ce niveau (fraction de la fourchette)
  getLevelFloor: function (dungeon, level) {
    var beyond = this.getLevelBeyond(dungeon, level);
    if (beyond > 0) beyond += this.getShardEffect("floorBonus"); // v3.463.0 : Main sûre, un cran de plus
    return Math.min(DUNGEON_CONFIG.beyondFloorMax || 0, beyond * (DUNGEON_CONFIG.beyondFloorPct || 0));
  },

  // v3.473.1 (point 7, choix Seb) : bonus au-delà du plafond EN CUMUL, comme la difficulté (1,10^n au lieu de 1 + 0,10 × n)
  getBeyondMult: function (pct, beyond) {
    return Math.pow(1 + (Number(pct) || 0), Math.max(0, Math.floor(Number(beyond) || 0)));
  },

  // Or du run (vagues et fin) : +10 % par niveau au-delà du plafond, en cumul (N-I), ÷ 4 en mode libre (N-H)
  getRunGoldMult: function () {
    var run = game.dungeonRun;
    if (!run || !run.active) return 1;
    var beyond = this.getLevelBeyond(this.getById(run.dungeonId), this.getRunLevel());
    return this.getBeyondMult(DUNGEON_CONFIG.beyondGoldPct, beyond) * (run.free ? (DUNGEON_CONFIG.freeGoldMult || 1) : 1);
  },

  // Butin du run en cours (lu par getDungeonDropContext) ; null hors run
  getRunDropSource: function () {
    var run = game.dungeonRun;
    if (!run || !run.active) return null;
    return this.getLevelLootSource(this.getById(run.dungeonId), this.getRunLevel());
  },

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

  // v3.460.0 : toute vague (élite, escorte, boss) passe ici, mise au niveau du run
  buildWaveEnemy: function (wave) {
    var built = this.buildWaveEnemyBase(wave), m = this.getLevelMult(this.getRunLevel()), gm = this.getRunGoldMult();
    // v3.472.0 : PV des cartes de halte (Pacte de sang, Rempart ; Autel brisé sur le boss)
    var bh = this.getBoonEnemyHpMult(false), bb = wave > DUNGEON_CONFIG.waveCount ? this.getBoonEnemyHpMult(true) : bh;
    if (m.hp === 1 && m.power === 1 && gm === 1 && bh === 1 && bb === 1) return built;
    [].concat(built).forEach(function (e, i) {
      var hb = (i === 0 && e.isBoss && !e.isElite) ? bb : bh;
      e.hp = e.maxHp = Math.max(1, Math.floor(e.maxHp * m.hp * hb));
      if (e.stats) e.stats.power = Math.max(1, Math.floor((e.stats.power || 0) * m.power));
      if (e.goldReward) e.goldReward = Math.max(1, Math.floor(e.goldReward * gm)); // v3.462.0 : l'or des vagues suit le run
    });
    return built;
  },

  // noGroup (v3.471.0) : un seul ennemi, même sur une vague de groupe (membres de buildGroupWave)
  buildWaveEnemyBase: function (wave, noGroup) {
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

    /* v3.471.0 (décision Seb, option 1) : vague de groupe (groupWaves). Sous Traque, chaque vague reste une élite seule. */
    var groupN = (!isBossWave && !noGroup && !traque && dungeon.groupWaves) ? Math.floor(Number(dungeon.groupWaves[wave]) || 0) : 0;
    if (groupN >= 2) return this.buildGroupWave(wave, groupN);

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

  /* v3.471.0 (option 1 de Seb) : la vague en cours est-elle une vague de groupe ? Elle continue alors le
     combat (companion-system : pas de relève, recharges et charges gardées), comme une vague seule. */
  isGroupWaveNow: function () {
    var run = game.dungeonRun;
    if (!run || !run.active || !(Number(run.wave) > 1)) return false;
    var d = this.getById(run.dungeonId);
    return !!(d && d.groupWaves && Number(d.groupWaves[run.wave]) >= 2 && !this.hasRunMark("aff_elite"));
  },

  /* v3.471.0 : n ennemis de vague tirés dans le pool (mélangés), PV, puissance et or réduits
     (DUNGEON_CONFIG.groupWave) pour une usure proche d'une vague seule. */
  buildGroupWave: function (wave, n) {
    var max = (typeof COMBAT_MAX_ENEMIES === "number") ? COMBAT_MAX_ENEMIES : 3;
    n = Math.min(n, max);
    var mult = (DUNGEON_CONFIG.groupWave || {})[n] || { hp: 1 / n, power: 1 / n };
    var out = [];
    for (var i = 0; i < n; i++) {
      var e = this.buildWaveEnemyBase(wave, true);
      e.hp = e.maxHp = Math.max(1, Math.floor(e.maxHp * mult.hp));
      if (e.stats) e.stats.power = Math.max(1, Math.floor((e.stats.power || 0) * mult.power));
      e.goldReward = Math.max(1, Math.floor((e.goldReward || 0) * mult.hp));
      out.push(e);
    }
    return out;
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
    if (this.isHaltPending() && typeof openDungeonHaltSheet === "function") setTimeout(openDungeonHaltSheet, 0); // v3.472.0
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
    if (!run.free && dungeon.specialResourceId && camp.stoneAmount > 0 && window.WarehouseManager && typeof WarehouseManager.addResource === "function") {
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

  // PV rendus par « Souffler » : ceux du campement, + Second souffle (boutique d'Éclats, v3.463.0)
  getCampHealPct: function (camp) {
    return (Number(camp && camp.healPct) || 0.4) + this.getShardEffect("campHealPct");
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
      var pct = this.getCampHealPct(camp);
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

  /* v3.474.0 (point 4 du bilan, option A de Seb) : une élite de données vaincue met le butin des vagues en sûreté
     (SortieManager.secure, comme le campement) : une mort ne coûte plus que ce qui a été gagné depuis. À la vague du
     campement, c'est lui qui s'en charge (il l'affiche). Cumul dans run.eliteLoot, pour le rapport de fin. */
  secureAfterElite: function (clearedWave) {
    var run = game.dungeonRun, dungeon = this.getById(run.dungeonId), camp = this.getCamp(dungeon);
    if (!dungeon.eliteWaves || !dungeon.eliteWaves[clearedWave] || !window.SortieManager) return false;
    if (camp && Number(camp.afterWave) === clearedWave) return false;
    var kept = SortieManager.secure() || {}, items = kept.items || [];
    if (!run.eliteLoot) run.eliteLoot = { gold: 0, items: [] };
    run.eliteLoot.gold += Number(kept.gold || 0);
    items.forEach(function (it) { run.eliteLoot.items.push({ name: it.name, rarity: it.rarity }); });
    if (Number(kept.gold || 0) > 0 || items.length) {
      addLog("🛡️ " + _tn(items.length, "L'élite tombe : le butin des vagues est en sûreté (+{g} or, {n} objet).", "L'élite tombe : le butin des vagues est en sûreté (+{g} or, {n} objets).", { g: formatNumber(Number(kept.gold || 0)) }), "event");
    }
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
    // v3.482.0 (refonte de l'économie RE-5, accord Seb) : offert jusqu'à ce que l'étape soit réussie, plus de boucle gratuite ensuite
    return !!(step && steps.indexOf(step.id) >= 0 && StoryQuestManager.isCurrentStepAccepted(chapterId) && !StoryQuestManager.isCurrentStepReady(chapterId));
  },

  /* ---------- Les haltes (v3.472.0, atelier/halte-donjon.html, décisions Seb) ----------
     1 à 3 haltes par run, tirées au lancement parmi les haltSlots du donjon. Après la vague, la vague suivante
     attend derrière la feuille (comme le campement) ; on prend une carte ou on passe. Aucune ne soigne.
     État dans game.dungeonRun (sauvegardé en entier) : halts, halt = "pending", haltDraw, boons. */
  drawHalts: function (dungeon) {
    var camp = this.getCamp(dungeon), slots = (dungeon && dungeon.haltSlots || []).filter(function (w) {
      return w >= 1 && w < DUNGEON_CONFIG.waveCount && !(camp && Number(camp.afterWave) === w);
    });
    var weights = DUNGEON_CONFIG.haltCountWeights || {}, total = 0, roll, n = 0;
    Object.keys(weights).forEach(function (k) { total += Number(weights[k] || 0); });
    roll = Math.random() * total;
    Object.keys(weights).some(function (k) { roll -= Number(weights[k] || 0); if (roll < 0) { n = Number(k); return true; } return false; });
    var pool = slots.slice(), out = [];
    while (out.length < Math.min(n, slots.length) && pool.length) out.push(pool.splice(randInt(0, pool.length - 1), 1)[0]);
    return out.sort(function (a, b) { return a - b; });
  },

  isHaltPending: function () {
    return !!(game.dungeonRun && game.dungeonRun.active && game.dungeonRun.halt === "pending");
  },

  getHaltCard: function (id) {
    return (window.DUNGEON_HALT_CARDS || []).filter(function (c) { return c.id === id; })[0] || null;
  },

  // Cartes prises sur le run en cours (vide hors run)
  getRunBoons: function () {
    var run = game.dungeonRun, self = this;
    if (!run || !run.active || !Array.isArray(run.boons)) return [];
    return run.boons.map(function (id) { return self.getHaltCard(id); }).filter(Boolean);
  },

  getBoonProduct: function (field) {
    return this.getRunBoons().reduce(function (p, c) { return p * (typeof c[field] === "number" ? c[field] : 1); }, 1);
  },

  getBoonEnemyHpMult: function (isBoss) {
    return this.getBoonProduct("enemyHpMult") * (isBoss ? this.getBoonProduct("bossHpMult") : 1);
  },

  // Râtelier : l'objet de combat qui contre le trait du boss, s'il n'est pas déjà emporté
  getCounterItemId: function (dungeon) {
    var trait = dungeon && dungeon.boss && dungeon.boss.archetype;
    if (!trait || !window.COMBAT_ITEMS || !window.CombatItems) return null;
    if (CombatItems.holds(trait)) return null;
    var ids = Object.keys(COMBAT_ITEMS).filter(function (id) { return COMBAT_ITEMS[id].trait === trait; });
    return ids.length ? ids[0] : null;
  },

  // Trois cartes différentes, jamais une déjà prise ; le Râtelier seulement s'il a un objet à donner
  drawHaltCards: function () {
    var run = game.dungeonRun, dungeon = this.getById(run.dungeonId), self = this;
    var pool = (window.DUNGEON_HALT_CARDS || []).filter(function (c) {
      if ((run.boons || []).indexOf(c.id) !== -1) return false;
      return !c.counterItem || !!self.getCounterItemId(dungeon);
    }).map(function (c) { return c.id; });
    var out = [];
    while (out.length < Number(DUNGEON_CONFIG.haltCardCount || 3) && pool.length) out.push(pool.splice(randInt(0, pool.length - 1), 1)[0]);
    return out;
  },

  /* Appelé par onEnemyKilled : true si une halte commence (la vague suivante attend derrière la feuille). */
  reachHalt: function (clearedWave) {
    var run = game.dungeonRun;
    if (!Array.isArray(run.halts) || run.halts.indexOf(clearedWave) === -1 || run.halt) return false;
    if (!Array.isArray(run.haltsDone)) run.haltsDone = [];
    if (run.haltsDone.indexOf(clearedWave) !== -1) return false;
    run.haltsDone.push(clearedWave);
    run.haltDraw = this.drawHaltCards();
    if (!run.haltDraw.length) return false;
    run.halt = "pending";
    addLog("🕯️ " + _t("Une halte : trois cartes t'attendent."), "event");
    this.spawnWave(clearedWave + 1);   // la vague suivante attend ; la feuille bloque le combat
    saveGame();
    return true;
  },

  /* cardId : une carte du tirage, ou null pour passer. La vague en attente est refaite avec la carte. */
  haltAction: function (cardId) {
    if (!this.isHaltPending()) return false;
    var run = game.dungeonRun, dungeon = this.getById(run.dungeonId);
    var card = cardId ? this.getHaltCard(cardId) : null;
    if (cardId && (!card || (run.haltDraw || []).indexOf(cardId) === -1)) return false;
    run.halt = null;
    run.haltDraw = [];
    if (!card) {
      addLog("🕯️ " + _t("Tu passes la halte."), "event");
    } else {
      run.boons.push(card.id);
      if (card.shards > 0) {
        game.dungeonShards = Number(game.dungeonShards || 0) + card.shards;
        run.shardsEarned = Number(run.shardsEarned || 0) + card.shards;
      }
      var itemId = card.counterItem ? this.getCounterItemId(dungeon) : null;
      if (itemId && game.sortie && game.sortie.active) {
        if (!Array.isArray(game.sortie.items)) game.sortie.items = [];
        game.sortie.items.push(itemId);
        run.ratelierItem = itemId;
      }
      if (card.modifiers && window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
        var hp = game.heroHp;
        StatsSystem.recalcStats();
        game.heroHp = Math.min(game.heroMaxHp, hp); // aucune halte ne soigne
      }
      addLog("🕯️ " + _t("Halte : {x}.", { x: _td(card.name) }), "event");
    }
    this.spawnWave(run.wave); // la vague en attente, refaite avec la carte (PV des ennemis)
    if (itemId && window.CombatItems) CombatItems.apply();
    if (typeof renderAll === "function") renderAll();
    saveGame();
    return true;
  },

  /* marks : tableau d'id de DUNGEON_MARKS choisis dans la feuille de lancement (figés pour le run).
     level (v3.460.0) : 1 par défaut, borné à getMaxLevel ; la sortie de l'Histoire se joue au niveau 1.
     free (v3.462.0, N6) : mode libre, hors quota du jour, pour un donjon déjà fini (N-M) ; jamais un ticket d'Histoire. */
  start: function (dungeonId, marks, level, free) {
    this.ensure();
    this.checkTicketReset();

    var dungeon = this.getById(dungeonId);
    if (!this.isUnlocked(dungeon.id)) return showToast(_t("Donjon verrouillé"), 1200);
    if ((game.heroHp || 0) <= 0) return showToast(_t("Héros à terre — repose-toi au Campement d'abord"), 1600);
    var freeRun = !!free;
    if (freeRun && !game.dungeonTierCleared[dungeon.id]) return showToast(_t("Mode libre : termine d'abord ce donjon une fois"), 1800);
    var storyFree = !freeRun && this.isStoryTicketFree(dungeon.id); // v3.136.0
    if (!storyFree && !freeRun && this.getRunsLeft(dungeon.id) <= 0) return showToast(_t("Plus de sortie aujourd'hui dans ce donjon — renouvellement dans {d}", { d: this.timeUntilTicketReset() }), 1800);
    if (game.dungeonRun.active) return showToast(_t("Donjon déjà en cours"), 1200);
    if (game.adventureQuestRun && game.adventureQuestRun.active) return showToast(_t("Termine ou abandonne ta quête en cours avant d'entrer en donjon"), 1600);
    if (game.huntRun && game.huntRun.active) return showToast(_t("Termine ou arrête ta chasse en cours avant d'entrer en donjon"), 1600);
    if (window.heroLockToast && heroLockToast()) return; // v3.307.0 : héros en expédition
    // v3.330.0 (E4) : vivres de sortie pour un donjon déjà fini une fois (jamais sur un ticket d'Histoire)
    if (window.ProvisionsManager) {
      var foodKind = freeRun ? "dungeonFree" : "dungeon"; // v3.462.0 (N-L) : Ration moyenne en mode libre
      var noFood = ProvisionsManager.check(foodKind, dungeon);
      if (noFood) return showToast(noFood, 2200);
      ProvisionsManager.consume(foodKind, dungeon);
    }

    if (!storyFree && !freeRun) game.dungeonRunsUsed[dungeon.id] = this.getRunsUsed(dungeon.id) + 1; // v3.358.0 (D7) : une sortie du jour ; celle de l'Histoire est offerte
    var runMarks = this.sanitizeMarks(marks, dungeon.id);
    var runLevel = storyFree ? 1 : Math.max(1, Math.min(this.getMaxLevel(dungeon.id), Math.floor(Number(level) || 1)));
    // v3.472.0 : haltes tirées au lancement, seulement sur un donjon déjà terminé et hors sortie de l'Histoire (option 1 de Seb)
    var halts = (!storyFree && game.dungeonTierCleared[dungeon.id]) ? this.drawHalts(dungeon) : [];
    game.dungeonRun = { active: true, wave: 0, dungeonId: dungeon.id, level: runLevel, free: freeRun, marks: runMarks, shardsEarned: 0, halts: halts, boons: [] };
    if (!game.dungeonTiersEntered || typeof game.dungeonTiersEntered !== "object") game.dungeonTiersEntered = {};
    game.dungeonTiersEntered[dungeon.id] = true;
    // v3.102.1 : le donjon est une sortie. SortieManager.start recalcule les stats : les Marques héros (Fragilité,
    // Ascétisme, Fléau) s'appliquent ici via AfflictionManager, dont la source est désormais dungeonRun.marks.
    if (window.SortieManager) { SortieManager.end("return"); SortieManager.start("dungeon"); }
    // v3.539.0 (Seb) : plus de soin gratuit à l'entrée ; on entre avec ses PV (même proportion après les Marques)
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
    this.secureAfterElite(clearedWave); // v3.474.0 : point 4 du bilan, une élite vaincue met le sac en sûreté

    var nextWave = clearedWave + 1;
    // v3.430.0 (RU13) : le campement, halte après la vague de la première étape
    if (this.reachCamp(clearedWave)) return;
    if (this.reachHalt(clearedWave)) return; // v3.472.0 : une halte, trois cartes
    if (nextWave > DUNGEON_CONFIG.waveCount) {
      addLog(_t("🏰 Vagues terminées ! Le boss du donjon apparaît..."), "event");
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

  /* v3.470.0 : unique du boss (boss.unique) — tirage à uniqueDropPct, sans garantie (décision Seb).
     Valeurs tirées comme un objet du niveau (plancher Aether compris) ; nom, icône et pouvoir fixes. */
  rollBossUnique: function (dungeon, rarity) {
    var def = dungeon && dungeon.boss && dungeon.boss.unique;
    if (!def || !rarity || typeof generateEquipmentItem !== "function") return null;
    if (this.getRunBoons().some(function (c) { return c.noUnique; })) return null; // v3.472.0 : Autel brisé
    if (!chance(Number(DUNGEON_CONFIG.uniqueDropPct || 0))) return null;
    var ctx = (typeof getDungeonDropContext === "function") ? getDungeonDropContext() : null;
    var item = generateEquipmentItem(def.slot, rarity, ctx ? ctx.world : undefined, ctx ? ctx.aether : null);
    if (!item) return null;
    item.name = def.name;
    item.icon = def.icon || item.icon;
    item.power = def.power;
    item.unique = true; // jamais offert d'office, comme les uniques d'élite
    item.dungeonUniqueId = def.id;
    if (!addLootToInventory(item)) return null;
    addLog("✦ " + _t("Objet unique : {x} !", { x: _td(item.name) }), "boss");
    return item;
  },

  /* outcome (échec) : "flee" = récompense partielle ÷ 2 ; "death" = aucune récompense partielle (v3.102.1, la mort coûte le butin) */
  finish: function (success, clearedWave, outcome) {
    this.ensure();
    var tier = this.getById(game.dungeonRun.dungeonId);
    var runMarks = (game.dungeonRun.marks || []).slice();
    var runBoons = (game.dungeonRun.boons || []).slice(); // v3.472.0 : cartes de halte, pour le rapport
    var markMult = this.getMarkRewardMult(runMarks.length); // v3.245.0 : cumul des Marques, appliqué ici (or et matériau de fin ne passent pas par goldMult)
    // v3.449.2 : Fiole noire bue, or de fin ÷ 2 ; lue avant la clôture (l'abandon a déjà clos la sortie : son résumé)
    var fioleMult = !window.CombatItems ? 1 : CombatItems.lootMultOf(game.sortie && game.sortie.active ? game.sortie : game.lastSortieSummary);
    if (success && window.SortieManager) SortieManager.end("success");
    if (outcome === "camp" && window.SortieManager) SortieManager.end("return"); // v3.430.0 : rien à perdre, le sac de l'étape 1 est banqué
    var campLoot = game.dungeonRun.campLoot || null; // v3.430.0 : pour le rapport de fin
    var eliteLoot = game.dungeonRun.eliteLoot || null; // v3.474.0 : mis en sûreté par les élites
    var wavesTotal = DUNGEON_CONFIG.waveCount;
    var progress = Math.max(0, Math.min(1, clearedWave / wavesTotal));

    var runLevel = this.getRunLevel(), beyond = this.getLevelBeyond(tier, runLevel); // v3.461.0 : or au-delà du plafond (N-I)
    var freeRun = !!game.dungeonRun.free, goldMult = this.getRunGoldMult(); // v3.462.0 : ÷ 4 en mode libre (N-H)
    var worldBonus = (1 + Math.max(0, tier.worldPower || 0) * 0.5 + Math.sqrt(Math.max(1, tier.difficultyMult || 1)) * 0.4) * markMult * goldMult
      * this.getBoonProduct("endGoldMult"); // v3.472.0 : Pacte de sang
    var goldReward, grantLoot, lootRarity; // v3.358.0 (D7) : l'essence de fin est fondue dans l'or (fullClearGoldBase)

    var rarityOrder = (typeof RARITY_ORDER !== "undefined" && RARITY_ORDER) || ["common", "green", "rare", "epic", "legendary"];
    var lootSrc = this.getLevelLootSource(tier, runLevel); // v3.460.0 : rareté du niveau (N-A)
    var tierMaxIndex = Math.max(0, rarityOrder.indexOf(lootSrc.maxRarity));
    var allowedForTier = rarityOrder.slice(0, tierMaxIndex + 1);

    if (success) {
      goldReward = Math.floor(DUNGEON_CONFIG.fullClearGoldBase * worldBonus);
      grantLoot = true;
      lootRarity = lootSrc.maxRarity;
      game.dungeonBossClears = Number(game.dungeonBossClears || 0) + 1;
      game.dungeonShards = Number(game.dungeonShards || 0) + (DUNGEON_CONFIG.shardsBossBonus || 10);
      game.dungeonRun.shardsEarned = Number(game.dungeonRun.shardsEarned || 0) + (DUNGEON_CONFIG.shardsBossBonus || 10);

      if (!game.dungeonTierCleared || typeof game.dungeonTierCleared !== "object") game.dungeonTierCleared = {};
      var wasAlreadyCleared = !!game.dungeonTierCleared[tier.id];
      game.dungeonTierCleared[tier.id] = true;
      game.dungeonLevelBest[tier.id] = Math.max(Number(game.dungeonLevelBest[tier.id] || 0), runLevel);
      if (!wasAlreadyCleared) {
        addLog("🔓 " + _t("{x} : première victoire — palier suivant débloqué !", { x: _td(tier.name) }), "event");
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

    // v3.461.0 (N-K) : Éclats du run +10 % par niveau au-delà du plafond, avant l'Écho de la faille
    var levelShards = Math.floor(Number(game.dungeonRun.shardsEarned || 0)
      * (this.getBeyondMult(DUNGEON_CONFIG.beyondShardPct, beyond) - 1 + this.getShardEffect("shardBonusPct"))); // v3.463.0 : + Résonance ; v3.473.1 : en cumul
    if (levelShards > 0) {
      game.dungeonShards = Number(game.dungeonShards || 0) + levelShards;
      game.dungeonRun.shardsEarned = Number(game.dungeonRun.shardsEarned || 0) + levelShards;
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
    // v3.462.0 (N-C) : mode libre, Éclats du run ÷ 2, en fin de calcul
    if (freeRun) {
      var cut = Number(game.dungeonRun.shardsEarned || 0) - Math.floor(Number(game.dungeonRun.shardsEarned || 0) * (DUNGEON_CONFIG.freeShardMult || 1));
      game.dungeonShards = Math.max(0, Number(game.dungeonShards || 0) - cut);
      game.dungeonRun.shardsEarned = Number(game.dungeonRun.shardsEarned || 0) - cut;
    }
    if (success && window.MemoryManager) MemoryManager.souvenir("dungeonClear", _t("Souvenir : {x}, sortie terminée", { x: tier && tier.name ? _td(tier.name) : _t("donjon") }));

    goldReward = Math.floor(goldReward * fioleMult);
    game.gold += goldReward;
    game.totalGoldEarned += goldReward;

    var lootedItem = null;
    if (grantLoot && window.LootSystem && typeof LootSystem.rollDropAtRarity === "function") {
      var drop = LootSystem.rollDropAtRarity(lootRarity);
      if (drop && addDropToInventory(drop)) lootedItem = drop;
    }
    // v3.463.0 (N-O) : Butin de faille, second objet de fin sur un run réussi
    var lootedItem2 = null;
    if (success && grantLoot && window.LootSystem && chance(this.getShardEffect("secondLootPct"))) {
      var drop2 = LootSystem.rollDropAtRarity(lootRarity);
      if (drop2 && addDropToInventory(drop2)) lootedItem2 = drop2;
    }

    // v3.470.0 : unique du boss, sur un run réussi (mode libre compris), à la rareté du butin de fin
    var lootedUnique = success ? this.rollBossUnique(tier, lootRarity) : null;

    /* v3.223.0 (périmètre confirmé par Seb) : matériau de monde, seconde source
       à côté des Petites Aventures. Réservé à la RÉUSSITE complète — une fuite
       ou une mort n'en donne pas, comme pour le butin d'équipement. Écriture par
       WarehouseManager, seul point d'entrée des ressources. */
    var specialGained = 0;
    var specialDef = null;
    if (success && !freeRun && tier.specialResourceId && tier.specialResourceAmount > 0 // v3.462.0 (N6) : rien en mode libre
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
        ? "🏰 " + (eliteLoot && (eliteLoot.gold > 0 || eliteLoot.items.length) // v3.474.0
          ? _t("{x} : tu tombes à la vague {a}/{b}. Le butin mis en sûreté par les élites est à toi ; le reste reste dans le donjon.", { x: _td(tier.name), a: clearedWave + 1, b: wavesTotal })
          : _t("{x} : tu tombes à la vague {a}/{b} — aucune récompense, le butin reste dans le donjon.", { x: _td(tier.name), a: clearedWave + 1, b: wavesTotal }))
        : "🏰 " + _t("{x} : sortie abandonnée (vague {a}/{b}) : +{g} or (moitié)", { x: _td(tier.name), a: clearedWave, b: wavesTotal, g: formatNumber(goldReward) }));
    if (lootedItem) msg += " + " + _td(lootedItem.name);
    if (lootedItem2) msg += " + " + _td(lootedItem2.name);
    if (lootedUnique) msg += " + " + _td(lootedUnique.name);
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
        lootedItem2: lootedItem2, // v3.463.0 : Butin de faille
        lootedUnique: lootedUnique, // v3.470.0 : unique du boss
        // v3.223.0 : matériau de monde gagné (0 si aucun), pour le rapport de fin
        specialGained: specialGained,
        specialName: specialInfo ? specialInfo.name : null,
        specialIcon: specialInfo ? specialInfo.icon : null, // v3.436.2 : l'icône du matériau, pas une image empruntée
        // v3.245.0 : Marques du run et multiplicateur, pour la ligne « Marques ×1,45 » du rapport
        marks: runMarks,
        markMult: markMult,
        boons: runBoons, // v3.472.0
        // v3.430.0 : sortie par le campement, et le butin de l'étape 1 mis en sûreté
        outcome: outcome || (success ? "success" : null),
        campLoot: campLoot,
        eliteLoot: eliteLoot, // v3.474.0
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

  /* v3.463.0 (N-N) : niveau de la Crypte demandé pour le prochain niveau de l'article, 0 si ouvert. */
  getShardShopLock: function (item) {
    var next = this.getShardShopLevel(item.id) + 1;
    var need = Number((item.palierLevels && item.palierLevels[next]) || item.palier || 0);
    return need > 0 && this.getLevelBest(DUNGEON_CONFIG.shopPalierDungeonId || 4) < need ? need : 0;
  },

  getShardShopLockText: function (need) {
    return _t("Palier : {x} niveau {n}", { n: need, x: _td(this.getById(DUNGEON_CONFIG.shopPalierDungeonId || 4).name) });
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
    var lock = this.getShardShopLock(item);
    if (lock) return showToast(this.getShardShopLockText(lock), 1600);

    var cost = this.getShardShopCost(item);
    if ((game.dungeonShards || 0) < cost) return showToast(_t("Pas assez d'Éclats"), 1000);

    game.dungeonShards -= cost;
    game.dungeonShopLevels[id] = level + 1;

    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }

    addLog("🔷 " + _t("Amélioration : {x} (niveau {n})", { x: _td(item.name), n: level + 1 }), "event");
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
