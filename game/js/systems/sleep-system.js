"use strict";
/* systems/sleep-system.js — v3.451.0 (Crypte, lot C-1) : LES MORTS QUI DORMENT.
   Conception Crypte v1.0, CR2 (validé par Seb le 15/10/2026 après l'atelier morts-qui-dorment.html).

   LA RÈGLE :
     - à l'ouverture d'un combat de groupe, un ou deux ennemis DORMENT (asleep) : ils ne jouent pas,
       ton camp ne les vise pas par défaut (CombatActors.standingEnemies les écarte) ;
     - le combat est gagné quand les ÉVEILLÉS sont tombés : les dormeurs restent couchés (onKill) ;
     - un coup qui touche un dormeur le RÉVEILLE (dealDamage), coup de zone compris ;
     - un dormeur réveillé par ton camp puis vaincu rapporte +50 % d'or (+75 % avec le choix
       `portent` = « soi », acte I étape 5) ;
     - un dormeur laissé se lève SEUL au bout de 3 à 5 rounds (compte à rebours visible), sans bonus.
   Combien dorment : planNext(n) (un parcours le pose avant son combat), sinon `sleepers` de la
   rencontre d'aventure en cours, sinon la règle de la Crypte (1 à 2 dans un groupe), ailleurs 0.
   Branchement : lignes de garde dans combat-engine.js (accord de Seb du 15/10/2026), comme la relève.
   Rien n'est sauvegardé : tout vit sur l'ennemi, le temps du combat. */

var SLEEP_WAKE_ROUNDS_MIN = 3;     // réveil seul : décision Seb (15/10), 3 à 5 rounds
var SLEEP_WAKE_ROUNDS_MAX = 5;
var SLEEP_GOLD_BONUS = 0.5;        // réveillé puis vaincu : +50 % d'or
var SLEEP_GOLD_BONUS_SOI = 0.75;   // choix `portent` = « soi » (Le dû des morts) : +75 %, au banc
var SLEEP_MAX_PER_GROUP = 2;
var SLEEP_VIGIL_WAX = 1;           // v3.452.0 : La veillée d'Aeswyn, Cire par dormeur laissé (au banc)
var CHAIN_ROUNDS = 2;              // v3.456.0 (acte IV) : une chaîne tient 2 rounds
var CHAIN_BREAK_PCT = 0.15;        // ou cède quand son poseur perd 15 % de ses PV max (au banc)
var GARDE_ROUNDS = 3;              // v3.456.0 (choix « bat » = réveiller) : le monté frappe 3 rounds
var GARDE_PCT = 0.03;              // 3 % des PV max du boss ou de l'élite par coup (au banc)

var SleepSystem = {

  _planned: null,

  /* Nombre de dormeurs imposé au prochain combat de groupe (parcours, harnais). Consommé une fois. */
  planNext: function (n) { this._planned = (typeof n === "number" && n >= 0) ? n : null; },

  /* Rencontre d'aventure en cours : son champ `sleepers`, ou null s'il n'est pas déclaré. */
  encounterSleepers: function () {
    var run = game.adventureQuestRun, AQ = window.AdventureQuestManager;
    if (!run || !run.active || !run.questId || !AQ || typeof AQ._encounterIndex !== "function") return null;
    var q = window.ADVENTURE_QUESTS && ADVENTURE_QUESTS[run.questId];
    if (!q || !Array.isArray(q.encounters)) return null;
    var e = q.encounters[Math.min(AQ._encounterIndex(q), q.encounters.length - 1)];
    return (e && typeof e.sleepers === "number") ? e.sleepers : null;
  },

  /* Règle du monde : seule la Crypte endort ses morts. */
  worldSleeps: function () {
    var w = (typeof WORLDS !== "undefined" && window.WorldManager) ? WORLDS[WorldManager.worldIndex] : null;
    return !!(w && w.id === "crypt");
  },

  countFor: function (list) {
    var n = this._planned;
    this._planned = null;
    if (n === null) n = this.encounterSleepers();
    if (n === null) n = this.worldSleeps() ? randInt(1, SLEEP_MAX_PER_GROUP) : 0;
    return Math.max(0, Math.min(n, list.length - 1, SLEEP_MAX_PER_GROUP)); // au moins un éveillé
  },

  /* Garde de spawnGroup : endort n membres du groupe, au hasard (jamais un boss ni une élite). */
  onGroupSpawn: function (list) {
    if (!Array.isArray(list)) return 0;
    list.forEach(function (e) { e.asleep = false; e.wokenByHero = false; e.wakeIn = 0; });
    game._sleepRelapseUsed = false; // v3.453.0 : Personne ne se lève, une fois par combat
    game._chainHeldFull = false;    // v3.456.6 : « Personne ne reste », une chaîne a-t-elle tenu jusqu'au bout
    var pool = list.filter(function (e) { return !e.isBoss && !e.isElite; });
    var n = list.length > 1 ? Math.min(this.countFor(list), pool.length) : (this._planned = null, 0);
    for (var i = pool.length - 1; i > 0; i--) { var j = randInt(0, i), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    for (var k = 0; k < n; k++) {
      pool[k].asleep = true;
      pool[k].wakeIn = randInt(SLEEP_WAKE_ROUNDS_MIN, SLEEP_WAKE_ROUNDS_MAX) + this.mem("sommeil_lourd", "sommeil_lourd_rounds") // v3.453.0 : Sommeil lourd
        + (this.wearsQuiver() ? 1 : 0); // v3.455.0 : le carquois d'Ysolt
    }
    if (n) addLog("🌫️ " + _tn(n, "Un des morts dort encore.", "{n} des morts dorment encore."), "event");
    this.encounterLine();
    this.gardeStart(list);
    return n;
  },

  isAsleep: function (e) { return !!(e && e.asleep && Number(e.hp || 0) > 0); },

  sleepers: function () {
    if (!window.CombatActors) return [];
    var self = this;
    return CombatActors.aliveEnemies().filter(function (e) { return self.isAsleep(e); });
  },

  /* Garde de enemyTurn : true si l'ennemi dort (il ne joue pas). Le compte à rebours du réveil
     seul descend à son tour ; à zéro, il se lève, et joue au round suivant. */
  onEnemyTurn: function (e) {
    if (e && Number(e.halfSleepRounds || 0) > 0) return this.halfSleepTurn(e); // v3.455.0 : la Liche à moitié couchée
    if (e) e._crownReady = true; // v3.455.0 : le Porte-couronne peut de nouveau réveiller (une fois par round)
    this.gardeStrike(e);
    if (!this.isAsleep(e) && this.onLull(e)) return false;
    if (!this.isAsleep(e)) { this.checkChains(); this.onChain(e); return this.onCall(e); } // v3.456.0 : la chaîne ne coûte pas son coup
    e.wakeIn = Number(e.wakeIn || 0) - 1;
    if (e.wakeIn <= 0 && this.has("personne_ne_se_leve") && !game._sleepRelapseUsed) { // v3.453.0 : ligne Garder du jalon 16
      game._sleepRelapseUsed = true;
      e.wakeIn = randInt(SLEEP_WAKE_ROUNDS_MIN, SLEEP_WAKE_ROUNDS_MAX);
      addLog("🌫️ " + _t("{x} allait se lever. Il se rendort.", { x: _td(e.name) }), "event");
    }
    if (e.wakeIn <= 0) this.wake(e, false);
    return true;
  },

  /* v3.454.0 (Crypte, acte II) — L'APPEL : un ennemi qui porte `calls` (le Nécromancien) annonce un appel
     s'il reste un dormeur, puis, à son tour suivant, réveille celui qui allait se lever le premier, sans
     bonus d'or ; ce tour-là il ne frappe pas. Le tuer avant coupe l'appel. Renvoie true s'il a appelé. */
  callerDef: function (e) { return (e && window.ENEMY_DB && ENEMY_DB[e.id]) || null; },
  onCall: function (e) {
    var def = this.callerDef(e);
    if (!def || !def.calls || !e || Number(e.hp || 0) <= 0 || e.downed) return false;
    if (this.chainRule(e)) return false; // v3.456.0 : dans « Les maillons », il enchaîne au lieu d'appeler
    // l'appel s'apprend à crypte_08 (tutoriel) : avant, le Nécromancien des Sépulcres ne réveille personne
    if (!window.StoryQuestManager || !StoryQuestManager.isStepReached("crypte_08")) return false;
    var sl = this.sleepers();
    if (!sl.length) { e.callArmed = false; return false; }
    if (!e.callArmed) {
      e.callArmed = true;
      addLog("🗣️ " + _t("{x} commence à appeler.", { x: _td(e.name) }), "event");
      return false; // il frappe quand même ce tour-ci
    }
    e.callArmed = false;
    sl.sort(function (a, b) { return Number(a.wakeIn || 0) - Number(b.wakeIn || 0); });
    addLog("🗣️ " + _t("{x} dit un nom.", { x: _td(e.name) }), "event");
    this.wake(sl[0], false);
    return true;
  },

  /* ---------- v3.456.0 (Crypte, acte IV) : LES CHAÎNES ----------
     Un ennemi qui enchaîne l'annonce, puis, au tour suivant, prend un compagnon (jamais le héros) :
     le compagnon perd ses tours 2 rounds, ou moins si le poseur perd 15 % de ses PV max entre-temps.
     Qui enchaîne : les Nécromanciens d'une quête `chains`, le boss d'une quête `bossChains`. Non sauvegardé. */
  questDef: function () {
    var run = game.adventureQuestRun;
    return (run && run.active && run.questId && window.ADVENTURE_QUESTS && ADVENTURE_QUESTS[run.questId]) || null;
  },
  chainRule: function (e) {
    var q = this.questDef();
    if (!q || !e || e.downed) return null;
    if (e.isBoss && q.bossChains) return { every: Number(q.bossChains.every || 3) };
    var def = this.callerDef(e);
    return (!e.isBoss && q.chains && def && def.calls) ? { every: 3 } : null;
  },
  chainTargets: function () {
    if (!window.CombatActors) return [];
    return CombatActors.aliveAllies().filter(function (a) { return a && a.companionId && !a.chained; });
  },
  onChain: function (e) {
    var rule = this.chainRule(e);
    if (!rule || Number(e.hp || 0) <= 0) return false;
    if (typeof e.chainIn !== "number") e.chainIn = e.isBoss ? rule.every : 2;
    e.chainIn -= 1;
    if (e.chainIn > 1) return false;
    if (!this.chainTargets().length) { e.chainIn = 2; e.chainArmed = false; return false; }
    if (e.chainIn === 1) {
      e.chainArmed = true;
      var ys = e.isBoss && CombatActors.aliveAllies().some(function (a) { return a && a.companionId === "ysolt"; });
      addLog("⛓️ " + (ys ? _t("Ysolt : « Il lève la main gauche. »") : _t("{x} lève une chaîne.", { x: _td(e.name) })), "event");
      return false;
    }
    e.chainArmed = false;
    e.chainIn = rule.every;
    var pool = this.chainTargets(), n = e.chainBoth ? 2 : 1;
    for (var i = pool.length - 1; i > 0; i--) { var j = randInt(0, i), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    pool.slice(0, n).forEach(function (a) {
      a.chained = { rounds: CHAIN_ROUNDS, by: e, mark: Number(e.hp || 0) };
      addLog("⛓️ " + _t("{x} est enchaîné.", { x: _td(a.name) }), "event");
    });
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    return true;
  },
  /* Une chaîne cède si son poseur est tombé, ou a perdu sa part de PV depuis la pose. */
  chainHolds: function (c) {
    var by = c && c.by;
    if (!by || Number(by.hp || 0) <= 0) return false;
    return Number(by.hp || 0) > c.mark - Number(by.maxHp || 0) * CHAIN_BREAK_PCT;
  },
  checkChains: function () {
    if (!window.CombatActors) return;
    var self = this;
    CombatActors.allies().forEach(function (a) {
      if (!a || !a.chained || self.chainHolds(a.chained)) return;
      a.chained = null;
      addLog("⛓️ " + _t("La chaîne de {x} cède.", { x: _td(a.name) }), "event");
    });
  },
  /* Garde de CompanionManager.takeTurn : true si le compagnon est enchaîné (il ne joue pas). */
  chainedTurn: function (a) {
    this.checkChains();
    if (!a || !a.chained) return false;
    a.chained.rounds -= 1;
    addLog("⛓️ " + _t("{x} tire sur sa chaîne.", { x: _td(a.name) }), "normal");
    if (a.chained.rounds <= 0) { a.chained = null; game._chainHeldFull = true; } // v3.456.6 : elle a tenu ses 2 rounds
    return true;
  },
  anyChained: function () {
    return !!(window.CombatActors && CombatActors.aliveAllies().some(function (a) { return a && a.chained; }));
  },

  /* v3.456.0 (« Les maillons ») : une ligne du carnet de Wenna au début des rencontres 2 et suivantes. */
  encounterLine: function () {
    var q = this.questDef(), AQ = window.AdventureQuestManager;
    if (!q || !Array.isArray(q.encounterLines) || !AQ || typeof AQ._encounterIndex !== "function") return;
    var i = AQ._encounterIndex(q), line = i > 0 ? q.encounterLines[i - 1] : null;
    if (line) addLog("📓 " + _td(line), "event");
  },

  /* v3.456.0 (choix « bat » = réveiller) — LA GARDE DES MONTÉS : dans un combat de boss ou d'élite, un monté
     se lève au premier round et frappe 3 rounds, au tour du boss ou de l'élite. Il ne l'achève jamais. */
  gardeStart: function (list) {
    game._gardeRounds = 0;
    if (!window.StoryQuestManager || StoryQuestManager.getChoice("bat") !== "reveiller") return;
    if (!list.some(function (e) { return e && (e.isBoss || e.isElite); })) return;
    game._gardeRounds = GARDE_ROUNDS;
    addLog("💀 " + _t("Un monté se lève à tes côtés."), "event");
  },
  gardeStrike: function (e) {
    if (!e || !(e.isBoss || e.isElite) || !(Number(game._gardeRounds || 0) > 0) || Number(e.hp || 0) <= 1) return 0;
    game._gardeRounds -= 1;
    var dmg = Math.min(Math.floor(Number(e.maxHp || 0) * GARDE_PCT), Number(e.hp || 0) - 1);
    if (dmg <= 0) return 0;
    e.hp -= dmg;
    addLog("💀 " + _t("Le monté frappe {x} (−{n}).", { x: _td(e.name), n: formatNumber(dmg) }), "event");
    if (!game._gardeRounds) addLog("💀 " + _t("Le monté se recouche."), "normal");
    if (typeof renderEnemyHp === "function") renderEnemyHp();
    return dmg;
  },

  /* ---------- v3.455.0 (Crypte, acte III) : l'Ossuaire ---------- */
  eliteDef: function (e) { return (e && e.isElite && window.ELITE_DB && ELITE_DB[e.id]) || null; },
  wakeSoonest: function (byHero) {
    var sl = this.sleepers();
    if (!sl.length) return null;
    sl.sort(function (a, b) { return Number(a.wakeIn || 0) - Number(b.wakeIn || 0); });
    this.wake(sl[0], !!byHero);
    return sl[0];
  },
  /* Le Porte-couronne : frappé, il réveille un dormeur de son escorte (sans bonus d'or), une fois par round. */
  onCrownHit: function (foe) {
    var def = this.eliteDef(foe);
    if (!def || !def.wakesOnHit || foe._crownReady === false || Number(foe.hp || 0) <= 0) return;
    if (!this.sleepers().length) return;
    foe._crownReady = false;
    addLog("👑 " + _t("{x} se redresse sous le coup. Derrière lui, quelqu'un se lève.", { x: _td(foe.name) }), "event");
    this.wakeSoonest(false);
  },
  /* La Pleureuse : elle annonce, puis endort un compagnon un round (CompanionManager.takeTurn le saute).
     Renvoie true le tour où elle endort (elle frappe quand même). */
  onLull: function (e) {
    var def = this.eliteDef(e);
    if (!def || !def.lulls || Number(e.hp || 0) <= 0 || !window.CombatActors) return false;
    var allies = CombatActors.aliveAllies().filter(function (a) { return a && a.companionId && !(a.lulled > 0); });
    if (!allies.length) { e.lullArmed = false; return false; }
    if (!e.lullArmed) { e.lullArmed = true; addLog("😢 " + _t("{x} commence à pleurer.", { x: _td(e.name) }), "event"); return false; }
    e.lullArmed = false;
    var a = allies[Math.floor(Math.random() * allies.length)];
    a.lulled = 1;
    addLog("😢 " + _t("{x} s'endort en l'écoutant.", { x: _td(a.name) }), "event");
    return true;
  },
  /* Phases de boss propres à la Crypte, appelées par BossMomentManager.onPhase (checkPhases). */
  onBossPhase: function (e, ph) {
    if (!e || !ph) return;
    if (ph.wakeAll) { var self = this; this.sleepers().forEach(function (x) { self.wake(x, false); }); } // v3.456.0 : avant les nouveaux venus
    if (Array.isArray(ph.sleepAdds) && ph.sleepAdds.length && window.CombatEngine && window.CombatActors) {
      var avant = CombatActors.enemies().slice();
      CombatEngine.summonAdds(e, { adds: ph.sleepAdds, addsHpMult: ph.addsHpMult, addsPowerMult: ph.addsPowerMult });
      CombatActors.enemies().filter(function (x) { return avant.indexOf(x) < 0; }).forEach(function (x) {
        x.asleep = true; x.wokenByHero = false; x.wakeIn = randInt(SLEEP_WAKE_ROUNDS_MIN, SLEEP_WAKE_ROUNDS_MAX);
      });
    }
    if (ph.chainBoth) e.chainBoth = true; // v3.456.0 : le Nécromancien suprême, sous 25 %
    if (ph.halfSleep) { e.halfSleepRounds = Number(ph.halfSleep.rounds || 2); e.halfSleepHeal = Number(ph.halfSleep.healPct || 0); }
  },
  /* Demi-sommeil : il ne frappe pas, il se soigne d'une part de ses PV max. */
  halfSleepTurn: function (e) {
    e.halfSleepRounds -= 1;
    var soin = Math.floor(Number(e.maxHp || 0) * Number(e.halfSleepHeal || 0) * uniquePowerMult("dun_sepulcre")); // v3.470.0 : Sépulcre
    if (soin > 0) e.hp = Math.min(Number(e.maxHp || 0), Number(e.hp || 0) + soin);
    addLog("💤 " + _t("{x} se recouche à moitié et se soigne (+{n}).", { x: _td(e.name), n: formatNumber(soin) }), "event");
    if (typeof renderEnemyHp === "function") renderEnemyHp();
    return true;
  },
  /* Le carquois d'Ysolt porté (choix « ysolt » = garder) : les dormeurs se lèvent un round plus tard. */
  wearsQuiver: function () {
    var am = game.equipped && game.equipped.amulet;
    return !!(am && am.eliteId === "carquois_ysolt");
  },

  /* v3.453.0 : choix de Mémoire (niveaux 13 et 16). */
  has: function (id) { return !!(window.MemoryManager && MemoryManager.has(id)); },
  mem: function (id, key) { return this.has(id) ? MemoryManager.V(key) : 0; },

  wake: function (e, byHero) {
    if (!e || !e.asleep) return;
    e.asleep = false;
    e.wakeIn = 0;
    e.wokenByHero = !!byHero;
    var msg = byHero ? _t("{x} se réveille.", { x: _td(e.name) }) : _t("{x} se lève tout seul.", { x: _td(e.name) });
    addLog("🌫️ " + msg, "event");
    if (typeof showToast === "function") showToast("🌫️ " + msg, 1200);
    if (typeof renderEnemyHp === "function") renderEnemyHp();
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

  /* Garde de dealDamage : un coup réveille le dormeur qu'il touche. */
  /* v3.453.0 : Réveil brutal (Mémoire 13) — ce coup-là seulement, par la vulnérabilité que lit
     dealDamage juste après ; elle est rendue à son état d'avant dès le coup suivant. */
  onHit: function (foe) {
    this.checkChains(); // v3.456.0 : le coup d'avant a pu faire céder une chaîne
    this.onCrownHit(foe); // v3.455.0 : le Porte-couronne frappé réveille un dormeur
    var b = this._brutal;
    if (b) { this._brutal = null; b.e.vulnerableRounds = b.r; b.e.vulnerableMult = b.m; }
    if (!this.isAsleep(foe)) return;
    this.wake(foe, true);
    if (this.has("reveil_brutal")) {
      this._brutal = { e: foe, r: foe.vulnerableRounds, m: foe.vulnerableMult };
      foe.vulnerableMult = (Number(foe.vulnerableRounds || 0) > 0 ? Number(foe.vulnerableMult || 0) : 0) + MemoryManager.V("reveil_brutal_mult");
      foe.vulnerableRounds = Math.max(1, Number(foe.vulnerableRounds || 0));
    }
  },

  /* Butin d'un ennemi vaincu : bonus s'il a été réveillé par ton camp. */
  wakeBonus: function () {
    var soi = !!(window.StoryQuestManager && typeof StoryQuestManager.getChoice === "function" && StoryQuestManager.getChoice("portent") === "soi");
    return (soi ? SLEEP_GOLD_BONUS_SOI : SLEEP_GOLD_BONUS) + this.mem("butin_des_morts", "butin_des_morts"); // v3.453.0 : Mémoire 16
  },
  goldMult: function (e) { return (e && e.wokenByHero) ? 1 + this.wakeBonus() : 1; },

  /* Garde de killEnemy : le dernier éveillé tombe — les dormeurs restent couchés et quittent le
     combat, qui se termine comme sur un ennemi seul. Renvoie le nombre de dormeurs laissés. */
  onKill: function (enemy) {
    if (enemy && enemy.wokenByHero) this.deadLoot();
    if (!window.CombatActors) return 0;
    var self = this;
    this.checkChains(); // v3.456.0 : il tombe, ses chaînes tombent
    var others = CombatActors.aliveEnemies().filter(function (e) { return e !== enemy; });
    if (!others.length || others.some(function (e) { return !self.isAsleep(e); })) return 0;
    others.forEach(function (e) { CombatActors.removeEnemy(e); });
    game.combatSleepersLeft = others.length;
    this.aeswynVigil(others.length);
    if (window.AchievementManager) AchievementManager.bump("sleepersLeft", others.length); // v3.456.6 : « Laisse-les dormir »   // dernier combat gagné : dormeurs laissés (choix `portent`, lot C-2) ; non sauvegardé
    addLog("🌫️ " + _tn(others.length, "Les éveillés sont tombés. Un mort dort encore.", "Les éveillés sont tombés. {n} morts dorment encore."), "normal");
    return others.length;
  },

  /* v3.453.0 : Rien ne dort pour rien (ligne Donner du jalon 16) — un objet, parfois. */
  deadLoot: function () {
    if (!this.has("rien_ne_dort") || !window.LootSystem || !window.CombatEngine || !chance(MemoryManager.V("rien_ne_dort_pct"))) return null;
    var drop = LootSystem.rollDrop();
    if (!drop || !CombatEngine.grantDrop(drop)) return null;
    addLog("🎁 " + _t("Rien ne dort pour rien : {x}", { x: _td(drop.name) }), "event");
    return drop;
  },

  /* v3.452.0 (crypte_05, La veillée d'Aeswyn) : chaque dormeur laissé rapporte de la Cire au village. */
  aeswynVigil: function (n) {
    if (!n || !window.StoryQuestManager || StoryQuestManager.getChoice("portent") !== "aeswyn" || !window.WarehouseManager) return 0;
    var q = n * SLEEP_VIGIL_WAX;
    WarehouseManager.addResource("cire_sepulcre", q, true);
    addLog("🕯️ " + _t("La veillée d'Aeswyn : +{n} Cire de sépulcre.", { n: q }), "event");
    return q;
  },

  /* Action automatique : la règle « Un ennemi dort » vise un dormeur (le réveiller est une décision). */
  aim: function (matchedConditionId) {
    if (matchedConditionId === "allyChained" && window.CombatActors) { // v3.456.0 : vise celui qui tient la chaîne
      var ch = CombatActors.aliveAllies().filter(function (a) { return a && a.chained && a.chained.by && Number(a.chained.by.hp || 0) > 0; })[0];
      var cc = CombatActors.ensure();
      if (ch && cc) cc.targetId = ch.chained.by.actorId;
      return;
    }
    if (matchedConditionId !== "enemySleeping" || !window.CombatActors) return;
    var s = this.sleepers()[0], c = CombatActors.ensure();
    if (s && c) c.targetId = s.actorId;
  },

  /* Ysolt, Pas encore (lot C-2) : repousse le réveil seul d'un dormeur. */
  delay: function (e, rounds) {
    if (!this.isAsleep(e)) return false;
    e.wakeIn = Number(e.wakeIn || 0) + Number(rounds || 0);
    return true;
  }
};

window.SleepSystem = SleepSystem;
window.SLEEP_WAKE_ROUNDS_MIN = SLEEP_WAKE_ROUNDS_MIN;
window.SLEEP_WAKE_ROUNDS_MAX = SLEEP_WAKE_ROUNDS_MAX;
window.SLEEP_GOLD_BONUS = SLEEP_GOLD_BONUS;
window.CHAIN_ROUNDS = CHAIN_ROUNDS;
window.CHAIN_BREAK_PCT = CHAIN_BREAK_PCT;
