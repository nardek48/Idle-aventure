"use strict";
/* systems/tower-system.js — v3.626.0 : règles propres à la Tour (chapitre VI, Conception Tour v0.1).
   Lot T-1 : la braise d'Aeswyn (choix « braise », étape 5). Lue par VeinSystem.bladeMult / onVictory,
   déjà appelés par le moteur : aucun fichier protégé touché. */

var TOWER_BRAISE_HEAL = 0.05;  // garder : 5 % des PV max rendus par combat gagné à la Tour
var TOWER_BRAISE_DMG = 0.10;   // poser : +10 % de dégâts du héros à la Tour

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
