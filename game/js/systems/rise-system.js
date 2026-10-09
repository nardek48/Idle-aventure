"use strict";
/* systems/rise-system.js — v3.428.0 (Ruines, lot U-2) : LA RELÈVE et LE RÉGLAGE « CIBLE ».
   Document « Ruines — Acte I » v1.0, §4 (règle validée par Seb le 03/10/2026).

   LA RELÈVE (ennemis portant `rises`, ENEMY_DB / BOSS_DB) :
     - à sa première mort, l'ennemi reste À TERRE (downed) au lieu de mourir, avec 1 PV ;
     - il l'annonce, comme un télégraphe ; une frappe pendant ce temps l'ACHÈVE ;
     - sinon, au tour ennemi du round suivant, il se relève avec RISE_HP_PCT de ses PV max ;
     - il ne se relève qu'une fois. Un ennemi à terre ne frappe pas.
   Branchement : deux lignes de garde dans combat-engine.js (accord de Seb du 02/10/2026),
   en tête de killEnemy() et de enemyTurn(). Rien n'est sauvegardé : tout vit sur l'ennemi.

   LE SEUIL (choix `seuil` = « soi », étape ruines_05) : le héros se relève aussi, une fois par
   combat, avec HERO_RISE_HP_PCT de ses PV. Garde en tête de onHeroDefeated().
   Simplification assumée : il se relève aussitôt (pas de round à terre côté héros).

   LE RÉGLAGE « CIBLE » (Conception Ruines §4.4, point 3) : qui le héros vise en Grimoire,
   game.grimoireTarget (GRIMOIRE_TARGET_POLICIES, data/grimoire-conditions.js) — « proche » (la cible collante, comportement d'avant), « faible »
   (le moins de PV), « soutien » (un ennemi marqué `support`). Le toucher prime : une cible
   choisie au doigt tient jusqu'à ce qu'elle tombe. Les compagnons frappent la même cible. */

var RISE_HP_PCT = 0.5;          // décision Seb (03/10/2026) : il revient avec la moitié de ses PV
var RISE_DOWN_ROUNDS = 2;       // tour ennemi du round de la chute (1), puis celui du suivant (relève)
var HERO_RISE_HP_PCT = 0.25;    // Le seuil : banc à faire

var RiseSystem = {

  /* ---------- Données ---------- */

  defOf: function (e) {
    if (!e || !e.id) return null;
    return (e.isBoss && window.BOSS_DB && BOSS_DB[e.id]) || (window.ENEMY_DB && ENEMY_DB[e.id]) || null;
  },

  /* L'ennemi peut-il encore se relever ? Une fois relevé, ou porté par une donnée sans `rises`, non. */
  canRise: function (e) {
    if (!e || e.hasRisen || e.downed) return false;
    if (e.rises === false) return false;
    var def = this.defOf(e);
    return !!(e.rises || (def && def.rises));
  },

  isDowned: function (e) { return !!(e && e.downed); },

  downedEnemies: function () {
    if (!window.CombatActors) return [];
    return CombatActors.enemies().filter(function (e) { return e && e.downed && Number(e.hp || 0) > 0; });
  },

  /* ---------- Garde de killEnemy ---------- */

  /* Renvoie true si l'ennemi reste à terre au lieu de mourir (killEnemy s'arrête là). */
  tryRise: function (enemy) {
    if (!enemy) return false;
    if (enemy.downed) {            // achevé à terre : il meurt pour de bon
      enemy.downed = false;
      enemy.hasRisen = true;
      enemy.riseIn = 0;
      addLog("🦴 " + _t("{x} est achevé à terre.", { x: _td(enemy.name) }), "normal");
      return false;
    }
    if (!this.canRise(enemy)) return false;
    enemy.downed = true;
    enemy.riseIn = RISE_DOWN_ROUNDS;
    enemy.hp = 1;
    addLog("🦴 " + _t("{x} tombe… et commence à se relever !", { x: _td(enemy.name) }), "event");
    // La cible passe à un ennemi debout : achever demande une décision (règle, Edda, toucher)
    if (window.CombatActors && CombatActors.target() === enemy) CombatActors.retarget(enemy);
    if (typeof renderEnemyHp === "function") renderEnemyHp();
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    return true;
  },

  /* ---------- Garde de enemyTurn ---------- */

  /* Renvoie true si l'ennemi est à terre (il ne joue pas son tour). */
  onEnemyTurn: function (e) {
    if (!e || !e.downed) return false;
    e.riseIn = Number(e.riseIn || 0) - 1;
    if (e.riseIn > 0) return true;
    e.downed = false;
    e.hasRisen = true;
    e.hp = Math.max(1, Math.floor(Number(e.maxHp || 1) * RISE_HP_PCT));
    addLog("🦴 " + _t("{x} se relève !", { x: _td(e.name) }), "event");
    if (e.riseLine) addLog(_td(e.riseLine), "event"); // v3.431.0 : ligne propre (Varrek)
    if (typeof showToast === "function") showToast("🦴 " + _t("{x} se relève !", { x: _td(e.name) }), 1200);
    if (typeof renderEnemyHp === "function") renderEnemyHp();
    return true;   // le round de la relève, il ne frappe pas encore
  },

  /* ---------- Qui peut achever (décision Seb du 04/10/2026, option A) ----------
     Achever est une DÉCISION : le coup du joueur en Tactique, la règle « Un ennemi se relève »,
     un ennemi touché au doigt, ou Le dernier trait d'Edda. Le Grimoire seul et les autres
     compagnons ne frappent pas un ennemi à terre : sans décision, il se relève. */
  _allow: false,

  /* Début d'une action (héros ou compagnon) : true si elle peut achever. */
  beginAction: function (allow) { this._allow = !!allow; },

  /* Garde de dealDamage : true si ce coup ne doit pas toucher l'ennemi à terre. */
  blocksHit: function (foe) {
    if (!foe || !foe.downed || this._allow) return false;
    var c = window.CombatActors ? CombatActors.ensure() : null;
    if (c && c.targetLocked && CombatActors.target() === foe) return false;
    if (foe._riseWaitLog !== (game.combatRound && game.combatRound.number)) {
      foe._riseWaitLog = game.combatRound && game.combatRound.number;
      addLog("🦴 " + _t("{x} est à terre : personne ne l'achève.", { x: _td(foe.name) }), "normal");
    }
    return true;
  },

  /* ---------- Le seuil (héros) ---------- */

  heroHasThreshold: function () {
    return !!(window.StoryQuestManager && typeof StoryQuestManager.getChoice === "function" && StoryQuestManager.getChoice("seuil") === "soi");
  },

  /* Garde de onHeroDefeated : renvoie true si le héros se relève (le combat continue). */
  tryHeroRise: function () {
    if (!this.heroHasThreshold() || !window.CombatActors) return false;
    var c = CombatActors.ensure();
    if (!c || c.heroRose) return false;
    if (!CombatActors.aliveEnemies().length) return false;
    c.heroRose = true;
    game.heroHp = Math.max(1, Math.floor(Number(game.heroMaxHp || 1) * HERO_RISE_HP_PCT));
    addLog("🪨 " + _t("Le seuil : tu tombes, et tu te relèves."), "event");
    if (typeof showToast === "function") showToast("🪨 " + _t("Le seuil : tu te relèves"), 1400);
    if (typeof renderHeroHp === "function") renderHeroHp();
    return true;
  },

  /* ---------- Le Bâtisseur (v3.429.0, Ruines U-3) ----------
     Son télégraphe est celui du bouclier (trait « shielded », contre « Bouclier au prochain
     tour ») ; à l'impact, le mur se pose sur l'allié debout le plus entamé, sur lui s'il est seul.
     wallShield : l'allié profite de la réduction du bouclier (dealDamage). */
  shieldTarget: function (e) {
    if (!e || !this.isSupport(e) || !window.CombatActors) return e;
    var others = CombatActors.standingEnemies().filter(function (o) { return o !== e && Number(o.hp || 0) > 0; });
    if (!others.length) return e;
    others.sort(function (a, b) { return Number(a.hp || 0) / Math.max(1, Number(a.maxHp || 1)) - Number(b.hp || 0) / Math.max(1, Number(b.maxHp || 1)); });
    others[0].wallShield = true;
    return others[0];
  },

  /* ---------- Réglage « Cible » ---------- */

  getPolicy: function () {
    var id = game.grimoireTarget;
    return GRIMOIRE_TARGET_POLICIES.some(function (p) { return p.id === id; }) ? id : "proche";
  },

  setPolicy: function (id) {
    if (!GRIMOIRE_TARGET_POLICIES.some(function (p) { return p.id === id; })) return false;
    game.grimoireTarget = id;
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  getPolicyDef: function (id) {
    for (var i = 0; i < GRIMOIRE_TARGET_POLICIES.length; i++) if (GRIMOIRE_TARGET_POLICIES[i].id === id) return GRIMOIRE_TARGET_POLICIES[i];
    return GRIMOIRE_TARGET_POLICIES[0];
  },

  /* Un ennemi qui renforce ou soigne les autres (donnée `support`). */
  isSupport: function (e) {
    var def = this.defOf(e);
    return !!(e && (e.support || (def && def.support)));
  },

  /* Avant une action automatique du héros : la règle « Un ennemi se relève » vise l'ennemi à
     terre ; sinon le réglage « Cible » choisit parmi les ennemis debout. Une cible touchée au
     doigt (targetLocked) n'est jamais déplacée. */
  aim: function (matchedConditionId) {
    if (!window.CombatActors) return;
    var c = CombatActors.ensure();
    if (!c || !c.enemies.length) return;
    if (matchedConditionId === "enemyRising") {
      var d = this.downedEnemies()[0];
      if (d) { c.targetId = d.actorId; return; }
    }
    if (c.targetLocked && CombatActors.target() && Number(CombatActors.target().hp || 0) > 0) return;
    if (game.combatMode !== "grimoire") return;
    var pick = CombatActors.pickByPolicy(this.getPolicy());
    if (pick) c.targetId = pick.actorId;
  }
};

window.RiseSystem = RiseSystem;
window.RISE_HP_PCT = RISE_HP_PCT;
window.HERO_RISE_HP_PCT = HERO_RISE_HP_PCT;
