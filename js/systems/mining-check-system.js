"use strict";
/* systems/mining-check-system.js — module PUR de résolution d'un coup du minijeu de minage
   (jauge horizontale, position cliquée comparée aux zones). Aucun accès à game, au DOM, à
   WarehouseManager ou à Math.random. Détail : COMMENTAIRES_ORIGINAUX.md */

var MiningCheckSystem = {
  clamp: function (value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  /* perfectWindowBonusPct(precision) -> 0 à 12, formule du document.
     Élargit la zone parfaite (bleue) sans jamais la rendre garantie. */
  perfectWindowBonusPct: function (precision) {
    return this.clamp(Number(precision || 0) * 0.15, 0, 12);
  },

  /* Demi-largeur (en % de la jauge 0-100) de chaque zone, centrées sur 50.
     Zone bleue : 3% de base (6% de large), +bonus/2 de chaque côté (jusqu'à 9%, soit 18% de large).
     Zone orange : 15% de plus de chaque côté de la zone bleue.
     Au-delà : rouge (raté). */
  getZoneHalfWidths: function (precision) {
    var bonus = this.perfectWindowBonusPct(precision);
    var perfectHalf = 3 + bonus / 2;
    var correctHalf = perfectHalf + 15;
    return { perfectHalf: perfectHalf, correctHalf: correctHalf };
  },

  /* resolveHit({precision, hitPositionPct}) -> { result: "miss"|"correct"|"perfect",
     perfectHalf, correctHalf } — hitPositionPct doit être fourni par l'appelant (0-100),
     jamais recalculé ici. */
  resolveHit: function (input) {
    var precision = Number((input && input.precision) || 0);
    var hitPositionPct = this.clamp(Number((input && input.hitPositionPct) || 0), 0, 100);

    var zones = this.getZoneHalfWidths(precision);
    var distanceFromCenter = Math.abs(hitPositionPct - 50);

    var result;
    if (distanceFromCenter <= zones.perfectHalf) {
      result = "perfect";
    } else if (distanceFromCenter <= zones.correctHalf) {
      result = "correct";
    } else {
      result = "miss";
    }

    return { result: result, perfectHalf: zones.perfectHalf, correctHalf: zones.correctHalf };
  }
};

window.MiningCheckSystem = MiningCheckSystem;
