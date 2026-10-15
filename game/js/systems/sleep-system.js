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
    var pool = list.filter(function (e) { return !e.isBoss && !e.isElite; });
    var n = list.length > 1 ? Math.min(this.countFor(list), pool.length) : (this._planned = null, 0);
    for (var i = pool.length - 1; i > 0; i--) { var j = randInt(0, i), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    for (var k = 0; k < n; k++) {
      pool[k].asleep = true;
      pool[k].wakeIn = randInt(SLEEP_WAKE_ROUNDS_MIN, SLEEP_WAKE_ROUNDS_MAX);
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
    if (!this.isAsleep(e)) return false;
    e.wakeIn = Number(e.wakeIn || 0) - 1;
    if (e.wakeIn <= 0) this.wake(e, false);
    return true;
  },

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
  onHit: function (foe) { if (this.isAsleep(foe)) this.wake(foe, true); },

  /* Butin d'un ennemi vaincu : bonus s'il a été réveillé par ton camp. */
  wakeBonus: function () {
    var soi = !!(window.StoryQuestManager && typeof StoryQuestManager.getChoice === "function" && StoryQuestManager.getChoice("portent") === "soi");
    return soi ? SLEEP_GOLD_BONUS_SOI : SLEEP_GOLD_BONUS;
  },
  goldMult: function (e) { return (e && e.wokenByHero) ? 1 + this.wakeBonus() : 1; },

  /* Garde de killEnemy : le dernier éveillé tombe — les dormeurs restent couchés et quittent le
     combat, qui se termine comme sur un ennemi seul. Renvoie le nombre de dormeurs laissés. */
  onKill: function (enemy) {
    if (!window.CombatActors) return 0;
    var self = this;
    var others = CombatActors.aliveEnemies().filter(function (e) { return e !== enemy; });
    if (!others.length || others.some(function (e) { return !self.isAsleep(e); })) return 0;
    others.forEach(function (e) { CombatActors.removeEnemy(e); });
    game.combatSleepersLeft = others.length;   // dernier combat gagné : dormeurs laissés (choix `portent`, lot C-2) ; non sauvegardé
    addLog("🌫️ " + _tn(others.length, "Les éveillés sont tombés. Un mort dort encore.", "Les éveillés sont tombés. {n} morts dorment encore."), "normal");
    return others.length;
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
