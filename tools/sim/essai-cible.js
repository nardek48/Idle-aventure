"use strict";
/* tools/sim/essai-cible.js — v3.765.0 (C2) : essais de banc sur les cibles de la courbe (target, eliteTarget, bossTarget).
   Multiplicateurs relatifs au réglage d'origine (×1 = inchangé), idempotents (on repart toujours de la cible d'origine). */
function mult(o, cle, kRounds, kHit) {
  if (!o || !o[cle]) return;
  var orig = o[cle + "0"] = o[cle + "0"] || o[cle];
  o[cle] = { rounds: orig.rounds * (Number(kRounds) || 1), hit: orig.hit * (Number(kHit) || 1) };
}
/* Donjon : quoi = "tout" (vagues, élites, boss), "vagues", "boss". */
exports.donjon = function (d, kRounds, kHit, quoi) {
  quoi = quoi || "tout";
  if (quoi === "tout" || quoi === "vagues") { mult(d, "target", kRounds, kHit); mult(d, "eliteTarget", kRounds, kHit); }
  if (quoi === "tout" || quoi === "boss") mult(d, "bossTarget", kRounds, kHit);
};
/* Élite de carte ou de quête (ELITE_DB). */
exports.elite = function (def, kRounds, kHit) { mult(def, "target", kRounds, kHit); };
