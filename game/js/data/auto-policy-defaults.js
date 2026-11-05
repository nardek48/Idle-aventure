"use strict";
/* data/auto-policy-defaults.js — priorités d'action par défaut du mode Simulation auto (bac à sable). Donnée pure. */

var AUTO_POLICY_DEFAULTS = {
  knight: ["skill3", "skill2", "skill1", "defense", "basic"],
  archer: ["skill3", "skill2", "skill1", "defense", "basic"],
  mage:   ["skill3", "skill2", "skill1", "defense", "basic"]
};

function getAutoPolicyDefault(classId) {
  var fallback = ["skill3", "skill2", "skill1", "defense", "basic"];
  if (!classId || typeof classId !== "string") return fallback.slice();
  var found = AUTO_POLICY_DEFAULTS[classId];
  return found ? found.slice() : fallback.slice();
}

/* v3.713.0 (Seb 05/11) : technique « dès que prête » du repli, Concentration gardée pour elle (Tir perforant du Rôdeur).
   Contres d'annonce, Défense et veine passent toujours devant ; une règle explicite du Grimoire prime. */
var AUTO_POLICY_HOLD_SLOT = { archer: "skill3" };

function getAutoPolicyHoldSlot(classId) {
  return (classId && AUTO_POLICY_HOLD_SLOT[classId]) || null;
}

window.AUTO_POLICY_DEFAULTS = AUTO_POLICY_DEFAULTS;
window.AUTO_POLICY_HOLD_SLOT = AUTO_POLICY_HOLD_SLOT;
window.getAutoPolicyHoldSlot = getAutoPolicyHoldSlot;
window.getAutoPolicyDefault = getAutoPolicyDefault;
