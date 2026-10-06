"use strict";
/* data/auto-policy-defaults.js — priorités d'action par défaut du mode Simulation auto (bac à sable). Donnée pure. Détail : COMMENTAIRES_ORIGINAUX.md */

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

window.AUTO_POLICY_DEFAULTS = AUTO_POLICY_DEFAULTS;
window.getAutoPolicyDefault = getAutoPolicyDefault;
