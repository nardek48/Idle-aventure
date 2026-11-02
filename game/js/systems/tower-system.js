"use strict";
/* systems/tower-system.js — v3.626.0 : règles propres à la Tour (chapitre VI, Conception Tour v0.1).
   Lot T-1 : la braise d'Aeswyn (choix « braise », étape 5). Lue par VeinSystem.bladeMult / onVictory,
   déjà appelés par le moteur : aucun fichier protégé touché. */

var TOWER_BRAISE_HEAL = 0.05;  // garder : 5 % des PV max rendus par combat gagné à la Tour
var TOWER_BRAISE_DMG = 0.10;   // poser : +10 % de dégâts du héros à la Tour
/* v3.629.0 (lot T-3, TW2) : le miroir. Le Reflet (boss du Sommet interdit) et le Gardien qui répète gardent la
   dernière technique du héros : la même, utilisée juste après contre eux, perd 25 %. Varier garde toute la force. */
var TOWER_MIRROR_PENALTY = 0.25;
/* v3.629.0 (choix « copie », tour_14) : Aeswyn d'avant laissée debout -> le Sommet interdit plus dur et plus riche. */
var TOWER_SUMMIT_HARD = 1.2, TOWER_SUMMIT_LOOT = 2;
/* v3.630.0 (TW6) : le trait que la silhouette prend à chaque classe (un contre connu du Grimoire pour chacun).
   Rôdeur : blindée, pas corruptrice (au banc, la corruption rendait le combat impossible quel que soit le réglage). */
var TOWER_CLASS_ARCHETYPE = { knight: "enraged", ranger: "armored", mage: "silenced" };

var TowerSystem = {
  /* Le héros se bat à la Tour (monde de résidence). */
  atTower: function () {
    var w = window.WORLDS && window.WorldManager ? WORLDS[Number(WorldManager.worldIndex || 0)] : null;
    return !!(w && w.id === "tower");
  },
  braise: function () {
    return (window.StoryQuestManager && typeof StoryQuestManager.getChoice === "function") ? StoryQuestManager.getChoice("braise") : null;
  },
  /* Multiplicateur des dégâts du héros : la braise posée sur le palier. */
  dmgMult: function () {
    return (this.atTower() && this.braise() === "poser") ? 1 + TOWER_BRAISE_DMG : 1;
  },
  /* Le miroir : la cible garde-t-elle tes gestes ? */
  isMirror: function (foe) {
    if (!foe) return false;
    if (foe.mirror) return true; // v3.630.0 : la silhouette, à partir de sa phase « elle garde tes gestes »
    if (foe.isElite && foe.id === "gardien_qui_repete") return true;
    var r = game.dungeonRun;
    return !!(foe.isBoss && !foe.isElite && r && r.active && Number(r.dungeonId) === 6);
  },
  _foeKey: function (foe) { return foe ? String(foe.uid || foe.id || foe.name || "") : ""; },
  /* Multiplicateur de la technique `slot` : 0,75 si c'est la même que la précédente contre ce reflet. */
  mirrorMult: function (slot) {
    var foe = game.enemy, m = game._towerMirror;
    if (!this.isMirror(foe) || !m || m.slot !== slot || m.foe !== this._foeKey(foe)) return 1;
    return 1 - TOWER_MIRROR_PENALTY;
  },
  noteSkill: function (slot) {
    var foe = game.enemy;
    game._towerMirror = this.isMirror(foe) ? { slot: slot, foe: this._foeKey(foe) } : null; // non sauvegardé : propre au combat
  },
  /* Le Sommet interdit selon le choix « copie ». */
  summitLeftStanding: function (dungeon) {
    return !!(dungeon && Number(dungeon.id) === 6 && window.StoryQuestManager && StoryQuestManager.getChoice("copie") === "laisser");
  },
  summitHardMult: function (dungeon) { return this.summitLeftStanding(dungeon) ? TOWER_SUMMIT_HARD : 1; },
  summitLootMult: function (dungeon) { return this.summitLeftStanding(dungeon) ? TOWER_SUMMIT_LOOT : 1; },

  /* v3.630.0 (TW5) : quête ou parcours marqué `solo` en cours -> aucun compagnon (lu par CompanionManager.partyIds). */
  isSolo: function () {
    var q = game.adventureQuestRun, r = game.sceneRun;
    if (q && q.active && q.questId && window.ADVENTURE_QUESTS && ADVENTURE_QUESTS[q.questId] && ADVENTURE_QUESTS[q.questId].solo) return true;
    return !!(r && r.templateId && r.status !== "completed" && window.SCENE_TEMPLATES && SCENE_TEMPLATES[r.templateId] && SCENE_TEMPLATES[r.templateId].solo);
  },
  /* v3.630.0 (TW6) : phases de la silhouette, appelées par BossMomentManager.onPhase. */
  onBossPhase: function (e, ph) {
    if (!e || !ph) return;
    // elle prend le trait de ta classe : posé sur la phase, que checkPhases applique juste après (silence compris)
    if (ph.copyClass) ph.archetype = TOWER_CLASS_ARCHETYPE[game.heroId] || "enraged";
    if (ph.mirror) e.mirror = true;
    if (ph.through) { // la lumière passe à travers elle : le bouclier de boss, tout de suite (round intouchable : plus tard)
      e.shieldTelegraphed = false;
      e.shieldRounds = (typeof BOSS_SHIELD_DURATION_ROUNDS === "number") ? BOSS_SHIELD_DURATION_ROUNDS : 2;
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    }
  },

  /* Combat gagné : la braise gardée rend un peu de PV. */
  onVictory: function () {
    if (!this.atTower() || this.braise() !== "garder" || !(game.heroHp > 0)) return 0;
    var max = Number(game.heroMaxHp || 0), heal = Math.min(Math.floor(max * TOWER_BRAISE_HEAL), Math.max(0, max - game.heroHp));
    if (heal <= 0) return 0;
    game.heroHp += heal;
    if (typeof renderHeroHp === "function") renderHeroHp();
    if (typeof addLog === "function") addLog("🔥 " + _t("La braise d'Aeswyn : +{n} PV.", { n: formatNumber(heal) }), "event");
    return heal;
  }
};

window.TowerSystem = TowerSystem;
window.TOWER_BRAISE_HEAL = TOWER_BRAISE_HEAL;
window.TOWER_BRAISE_DMG = TOWER_BRAISE_DMG;
window.TOWER_MIRROR_PENALTY = TOWER_MIRROR_PENALTY;
window.TOWER_CLASS_ARCHETYPE = TOWER_CLASS_ARCHETYPE;
