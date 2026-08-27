"use strict";
/* systems/well-check-system.js — module PUR de résolution d'une tentative du minijeu
   "maintenir puis relâcher" (jauge de remplissage, timing de relâchement). Aucun accès à
   game, au DOM, à WarehouseManager ou à Math.random. Détail : COMMENTAIRES_ORIGINAUX.md */

var WellCheckSystem = {
  clamp: function (value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  /* fillWindowBonusPct(endurance) -> 0 à 12, même formule que MiningCheckSystem
     (perfectWindowBonusPct) transposée à l'Endurance : élargit les zones correcte/parfaite
     sans jamais les rendre garanties. */
  fillWindowBonusPct: function (endurance) {
    return this.clamp(Number(endurance || 0) * 0.15, 0, 12);
  },

  /* Bornes (en % de remplissage 0-100) de chaque zone, réparties le long de la jauge :
     - [0, tooEarlyMax[ : trop tôt (sous-rempli)
     - [tooEarlyMax, perfectStart[ : correct (montée)
     - [perfectStart, perfectEnd] : parfait, centrée à 70%, largeur de base 10%
       (+bonus/2 de chaque côté, jusqu'à 16% de large avec Endurance max)
     - ]perfectEnd, tooLateMin[ : correct (descente)
     - [tooLateMin, 100] : trop tard (débordement)
     Zone correcte totale : 20% de large de chaque côté de la zone parfaite. */
  getZoneBounds: function (endurance) {
    var bonus = this.fillWindowBonusPct(endurance);
    var perfectHalf = 5 + bonus / 2;
    var perfectCenter = 70;
    var perfectStart = perfectCenter - perfectHalf;
    var perfectEnd = perfectCenter + perfectHalf;
    var correctStart = Math.max(0, perfectStart - 20);
    var correctEnd = Math.min(100, perfectEnd + 20);
    return {
      tooEarlyMax: correctStart,
      perfectStart: perfectStart,
      perfectEnd: perfectEnd,
      tooLateMin: correctEnd
    };
  },

  /* resolveRelease({endurance, fillPct}) -> { result: "tooEarly"|"correct"|"perfect"|"tooLate", ...bounds }
     fillPct doit être fourni par l'appelant (0-100, niveau de remplissage au moment du
     relâchement), jamais recalculé ici. */
  resolveRelease: function (input) {
    var endurance = Number((input && input.endurance) || 0);
    var fillPct = this.clamp(Number((input && input.fillPct) || 0), 0, 100);

    var zones = this.getZoneBounds(endurance);

    var result;
    if (fillPct < zones.tooEarlyMax) {
      result = "tooEarly";
    } else if (fillPct >= zones.perfectStart && fillPct <= zones.perfectEnd) {
      result = "perfect";
    } else if (fillPct >= zones.tooLateMin) {
      result = "tooLate";
    } else {
      result = "correct";
    }

    return {
      result: result,
      tooEarlyMax: zones.tooEarlyMax,
      perfectStart: zones.perfectStart,
      perfectEnd: zones.perfectEnd,
      tooLateMin: zones.tooLateMin
    };
  }
};

window.WellCheckSystem = WellCheckSystem;
