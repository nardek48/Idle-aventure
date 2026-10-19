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
    var pool = list.filter(function (e) { return !e.isBoss && !e.isElite; });
    var n = list.length > 1 ? Math.min(this.countFor(list), pool.length) : (this._planned = null, 0);
    for (var i = pool.length - 1; i > 0; i--) { var j = randInt(0, i), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    for (var k = 0; k < n; k++) {
      pool[k].asleep = true;
      pool[k].wakeIn = randInt(SLEEP_WAKE_ROUNDS_MIN, SLEEP_WAKE_ROUNDS_MAX) + this.mem("sommeil_lourd", "sommeil_lourd_rounds"); // v3.453.0 : Sommeil lourd
    }
    if (n) addLog("🌫️ " + _tn(n, "Un des morts dort encore.", "{n} des morts dorment encore."), "event");
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
    if (!this.isAsleep(e)) return this.onCall(e);
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
    var others = CombatActors.aliveEnemies().filter(function (e) { return e !== enemy; });
    if (!others.length || others.some(function (e) { return !self.isAsleep(e); })) return 0;
    others.forEach(function (e) { CombatActors.removeEnemy(e); });
    game.combatSleepersLeft = others.length;
    this.aeswynVigil(others.length);   // dernier combat gagné : dormeurs laissés (choix `portent`, lot C-2) ; non sauvegardé
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
